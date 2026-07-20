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

    // Sélecteur d'attente précis, pas "table.results" générique — ce
    // dernier est déjà présent dès le chargement initial (table de
    // l'étape), avant même que le vrai tableau cumulé (prev/teamline)
    // n'ait fini de se charger. Confirmé en conditions réelles : un
    // run de 6,6s pour 5 pages est bien trop rapide pour de vraies
    // navigations Puppeteer avec attente utile.
    const waitForSelector = type === 'teams' ? 'th[data-code="teamline"]' : 'th[data-code="prev"]';

    const url = `https://www.procyclingstats.com/race/${pcsRaceSlug}/${year}/stage-${stageNumber}-${suffix}`;
    const res = await this.fetchImpl(url, {
      waitForSelector,
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
  /**
   * ⚠️ Même défaut structurel que pour les équipes, découvert en
   * conditions réelles : le tableau récupéré par une simple requête
   * HTTP sur les URLs -gc/-points/-kom/-youth n'est pas toujours le
   * vrai classement cumulé — il peut retomber sur le tableau de
   * résultat d'étape de la même page (colonnes "gc"/"pnt" au lieu de
   * "prev"/"delta"). Confirmé par une vraie donnée en base : des points
   * 100/70/50/40 (barème d'étape) et des temps identiques à un résultat
   * d'étape, sous la clé "classifications/{n}_general". Ce garde-fou
   * vérifie la présence de data-code="prev" (uniquement sur un vrai
   * tableau de classement cumulé) avant de parser.
   */
  parseClassificationHtml(html) {
    const $ = cheerio.load(html);
    const table = $('table.results').first();

    const isCumulativeTable = table.find('th[data-code="prev"]').length > 0;
    if (!isCumulativeTable) return [];

    const entries = [];
    table.find('tbody > tr').each((_, row) => {
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
  /**
   * ⚠️ Confirmé en conditions réelles : le vrai tableau équipe
   * (data-code="teamline") n'est PAS présent dans une simple requête
   * HTTP — il est injecté par JavaScript après chargement (visible
   * seulement via l'inspecteur du navigateur). Une requête HTTP simple
   * ne reçoit que le tableau individuel de la même page. Ce garde-fou
   * vérifie qu'on a bien affaire à un tableau équipe avant de le
   * parser — sinon, on renvoie une liste vide plutôt que d'extraire à
   * tort une entrée par coureur (bug réel constaté : 166 lignes au lieu
   * de 23, riderId toujours null mais teamId rempli pour chaque coureur).
   */
  parseTeamsClassificationHtml(html) {
    const $ = cheerio.load(html);
    const table = $('table.results').first();

    const isTeamsTable = table.find('th[data-code="teamline"]').length > 0;
    if (!isTeamsTable) return [];

    const entries = [];
    table.find('tbody > tr').each((_, row) => {
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
