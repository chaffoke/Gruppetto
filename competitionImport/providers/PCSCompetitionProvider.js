const cheerio = require('cheerio');

/**
 * === PCSCompetitionProvider ===
 * Page confirmée et sélecteurs vérifiés contre le vrai HTML :
 * race/{slug}/{année}
 *
 * name/year extraits du <title> ("Tour de France 2026" -> name="Tour de
 * France", year=2026). startDate/endDate lus directement au format ISO
 * (confirmé "2026-07-04", pas de conversion nécessaire). stageCount
 * compté depuis le même tableau "Stages" que PCSStageListProvider
 * utilise en détail — ici on ne fait QUE compter (une ligne sans lien
 * <a href> est un jour de repos ou une ligne de total, exclue).
 */
class PCSCompetitionProvider {
  constructor({ fetchImpl = globalThis.fetch, userAgent = 'Gruppetto-CompetitionImport/1.0 (usage personnel non commercial)' } = {}) {
    this.name = 'pcs-competition';
    this.fetchImpl = fetchImpl;
    this.userAgent = userAgent;
  }

  async fetchCompetition(pcsRaceSlug, year) {
    const url = `https://www.procyclingstats.com/race/${pcsRaceSlug}/${year}`;
    const res = await this.fetchImpl(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
      }
    });
    if (!res.ok) {
      throw new Error(`PCSCompetitionProvider: réponse HTTP ${res.status} pour ${url}`);
    }
    const html = await res.text();
    return this.parseCompetitionHtml(html, pcsRaceSlug, year);
  }

  /** Séparée de fetchCompetition() pour être testable sur une fixture, sans réseau. */
  parseCompetitionHtml(html, pcsRaceSlug, year) {
    const $ = cheerio.load(html);

    const title = $('title').text().trim();
    const titleMatch = title.match(/^(.*?)\s+(\d{4})$/);
    const name = titleMatch ? titleMatch[1] : title;
    const parsedYear = titleMatch ? parseInt(titleMatch[2], 10) : (year || null);

    const info = {};
    $('ul.keyvalueList li').each((_, li) => {
      const $li = $(li);
      const key = $li.find('.title').text().trim().replace(/:$/, '');
      const value = $li.find('.value').text().trim();
      if (key) info[key] = value;
    });

    const stageRows = $('table.basic tbody tr');
    let stageCount = 0;
    stageRows.each((_, tr) => {
      const href = $(tr).find('td a').attr('href');
      if (href) stageCount++;
    });

    return {
      name,
      year: parsedYear,
      type: info['Classification'] || null,
      startDate: info['Startdate'] || null,
      endDate: info['Enddate'] || null,
      stageCount: stageCount || null,
      pcsUrl: `race/${pcsRaceSlug}/${year}`,
      pcsSlug: pcsRaceSlug,
      extra: {
        category: info['Category'] || null,
        uciTour: info['UCI Tour'] || null,
        totalDistanceKm: info['Total distance'] ? parseFloat(info['Total distance']) : null
      }
    };
  }
}

module.exports = { PCSCompetitionProvider };
