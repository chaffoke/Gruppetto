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
 * ⚠️ Le classement "teams" utilise une structure différente
 * (data-code="teamline", pas de td.ridername) — NON encore vérifiée sur
 * un vrai extrait avec son contenu réel. fetchClassification() lève une
 * erreur explicite pour ce type plutôt que de deviner ses sélecteurs.
 */
class PCSClassificationProvider {
  constructor({ fetchImpl = globalThis.fetch, userAgent = 'Gruppetto-ResultsImport/1.0 (usage personnel non commercial)' } = {}) {
    this.name = 'pcs-classification';
    this.fetchImpl = fetchImpl;
    this.userAgent = userAgent;
  }

  async fetchClassification(pcsRaceSlug, year, stageNumber, type) {
    if (type === 'teams') {
      throw new Error('PCSClassificationProvider: classement "teams" non implémenté — structure HTML pas encore vérifiée sur données réelles.');
    }
    const suffix = { general: 'gc', points: 'points', mountain: 'kom', youth: 'youth' }[type];
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
    return this.parseClassificationHtml(html);
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
}

module.exports = { PCSClassificationProvider };
