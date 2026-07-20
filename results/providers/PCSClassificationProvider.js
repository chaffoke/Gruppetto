const cheerio = require('cheerio');

/**
 * === PCSClassificationProvider ===
 * Pages confirmées (URLs réelles) :
 *   race/{slug}/{année}/stage-{N}-gc         -> general
 *   race/{slug}/{année}/stage-{N}-points     -> points
 *   race/{slug}/{année}/stage-{N}-kom        -> mountain
 *   race/{slug}/{année}/stage-{N}-youth      -> youth
 *   race/{slug}/{année}/stage-{N}-teams-gc   -> teams
 *
 * Structure de table vérifiée contre le vrai HTML pour les classements
 * INDIVIDUELS (general/points/mountain/youth) — même gabarit que
 * PCSStageResultProvider (table.results, td.ridername, td.cu600 a[href]).
 *
 * Classement "teams" — structure CONFIRMÉE (data-code="teamline"),
 * vérifiée via l'inspecteur du navigateur sur le DOM réellement rendu.
 *
 * ⚠️ Point d'incertitude réel, à confirmer par un vrai test : ce
 * contenu n'était PAS présent dans un premier "voir le code source" de
 * cette même URL — seulement visible via l'inspecteur (DOM après
 * rendu). Il est possible qu'une simple requête HTTP sans exécution
 * JavaScript (ce que fait ce provider) ne le reçoive pas. Si un import
 * réel échoue ou renvoie une liste vide pour "teams" alors que la page
 * existe bien, ce sera la confirmation qu'il faut une approche
 * différente (navigateur automatisé), pas un défaut de sélecteur.
 */
class PCSClassificationProvider {
  constructor({ fetchImpl = globalThis.fetch, userAgent = 'Gruppetto-ResultsImport/1.0 (usage personnel non commercial)' } = {}) {
    this.name = 'pcs-classification';
    this.fetchImpl = fetchImpl;
    this.userAgent = userAgent;
  }

  async fetchClassification(pcsRaceSlug, year, stageNumber, type) {
    const suffix = { general: 'gc', points: 'points', mountain: 'kom', youth: 'youth', teams: 'teams-gc' }[type];
    if (!suffix) throw new Error(`PCSClassificationProvider: type de classement inconnu "${type}"`);

    const url = `https://www.procyclingstats.com/race/${pcsRaceSlug}/${year}/stage-${stageNumber}-${suffix}`;
    const res = await this.fetchImpl(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
      }
    });
    if (!res.ok) {
      throw new Error(`PCSClassificationProvider: réponse HTTP ${res.status} pour ${url}`);
    }
    const html = await res.text();
    return type === 'teams' ? this.parseTeamsClassificationHtml(html) : this.parseClassificationHtml(html);
  }

  /** Séparée de fetchClassification() pour être testable sur une fixture, sans réseau. */
  parseClassificationHtml(html) {
    const $ = cheerio.load(html);
    const entries = [];

    $('table.results').first().find('tbody > tr').each((_, row) => {
      const $row = $(row);
      const rankRaw = $row.find('> td').first().text().trim();
      if (!/^\d+$/.test(rankRaw)) return; // un classement n'a normalement pas de DNS/DNF listés

      const riderLink = $row.find('td.ridername a[href^="rider/"]').first();
      const pcsRiderSlug = riderLink.attr('href') ? riderLink.attr('href').replace('rider/', '') : null;
      if (!pcsRiderSlug) return;

      const teamLink = $row.find('td.cu600 a[href^="team/"]').first();
      const pcsTeamSlug = teamLink.attr('href') ? teamLink.attr('href').replace('team/', '') : null;

      const timeHidden = $row.find('td.time .hide').first().text().trim();
      const pntText = $row.find('td.pnt').first().text().trim();

      entries.push({
        rank: parseInt(rankRaw, 10),
        pcsRiderSlug,
        pcsTeamSlug,
        time: timeHidden || null,
        gap: null, // même remarque que PCSStageResultProvider : la valeur "hide" sert de repère unique, pas encore séparée gap/temps absolu de façon fiable pour un classement général
        points: pntText ? parseInt(pntText, 10) : null
      });
    });

    return entries;
  }

  /**
   * Séparée car la structure diffère réellement de parseClassificationHtml
   * (colonne teamline unique : drapeau + lien équipe, pas de coureur).
   */
  parseTeamsClassificationHtml(html) {
    const $ = cheerio.load(html);
    const entries = [];

    $('table.results').first().find('tbody > tr').each((_, row) => {
      const $row = $(row);
      const tds = $row.find('> td');
      const rankRaw = tds.eq(0).text().trim();
      if (!/^\d+$/.test(rankRaw)) return;

      const teamLink = $row.find('a[href^="team/"]').first();
      const pcsTeamSlug = teamLink.attr('href') ? teamLink.attr('href').replace('team/', '') : null;
      if (!pcsTeamSlug) return;

      const timeHidden = $row.find('td.time .hide').first().text().trim();

      entries.push({
        rank: parseInt(rankRaw, 10),
        pcsRiderSlug: null, // classement par équipes : jamais de coureur individuel
        pcsTeamSlug,
        time: timeHidden || null,
        points: null
      });
    });

    return entries;
  }
}

module.exports = { PCSClassificationProvider };
