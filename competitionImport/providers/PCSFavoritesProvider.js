const cheerio = require('cheerio');

/**
 * === PCSFavoritesProvider ===
 * Page confirmée et sélecteurs vérifiés contre le vrai HTML :
 * race/{slug}/{année} (page de la course elle-même, section "Top competitors")
 *
 * Fournit uniquement un DTO PCS — le rang correspond à l'ordre
 * d'apparition dans la liste (pas de numéro explicite dans le HTML).
 * Aucune résolution riderId ici : c'est FavoritesAssembler qui s'en charge.
 */
class PCSFavoritesProvider {
  constructor({ fetchImpl = globalThis.fetch, userAgent = 'Gruppetto-CompetitionImport/1.0 (usage personnel non commercial)' } = {}) {
    this.name = 'pcs-favorites';
    this.fetchImpl = fetchImpl;
    this.userAgent = userAgent;
  }

  async fetchFavorites(pcsRaceSlug, year) {
    const url = `https://www.procyclingstats.com/race/${pcsRaceSlug}/${year}`;
    const res = await this.fetchImpl(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
      }
    });
    if (!res.ok) {
      throw new Error(`PCSFavoritesProvider: réponse HTTP ${res.status} pour ${url}`);
    }
    const html = await res.text();
    return this.parseFavoritesHtml(html);
  }

  /** Séparée de fetchFavorites() pour être testable sur une fixture, sans réseau. */
  parseFavoritesHtml(html) {
    const $ = cheerio.load(html);
    const entries = [];

    const h4 = $('h4').filter((_, el) => $(el).text().trim() === 'Top competitors').first();
    const list = h4.next('ul.list');

    list.find('li').each((i, li) => {
      const $li = $(li);
      const flagClass = $li.find('span.flag').first().attr('class') || '';
      const match = flagClass.match(/\bflag\s+c16\s+([a-z]{2})\b/);
      const nationalityCode = match ? match[1].toUpperCase() : null;

      const link = $li.find('a[href^="rider/"]').first();
      const pcsRiderSlug = link.attr('href') ? link.attr('href').replace('rider/', '') : null;
      const name = link.text().trim();

      if (pcsRiderSlug) {
        entries.push({ rank: i + 1, pcsRiderSlug, name, nationalityCode });
      }
    });

    return entries;
  }
}

module.exports = { PCSFavoritesProvider };
