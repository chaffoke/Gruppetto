const cheerio = require('cheerio');

/**
 * === PCSTeamJerseyProvider ===
 * Page confirmée et sélecteurs déjà vérifiés lors du chantier
 * referenceSync : race/{slug}/{année}/startlist
 *
 * Structure confirmée :
 * <li><div class="shirtCont"><a href="team/{slug}"><img src="images/shirts/bx/eb/{slug}[-nN].png" /></a></div>
 *     <div class="ridersCont"><div><a class="team" href="team/{slug}">Nom Équipe (WT)</a>...
 *
 * ⚠️ Chevauchement connu avec referenceSync, qui a déjà un champ
 * `jerseyUrl` réservé sur ses équipes, parsant potentiellement la même
 * page. Signalé explicitement à l'utilisateur — ce provider existe
 * volontairement ici en attendant une éventuelle consolidation.
 *
 * L'image elle-même n'est jamais copiée/hébergée par Gruppetto — seul
 * le lien PCS est conservé (pcsJerseyUrl).
 */
class PCSTeamJerseyProvider {
  constructor({ fetchImpl = globalThis.fetch, userAgent = 'Gruppetto-CompetitionImport/1.0 (usage personnel non commercial)' } = {}) {
    this.name = 'pcs-team-jersey';
    this.fetchImpl = fetchImpl;
    this.userAgent = userAgent;
  }

  async fetchTeamJerseys(pcsRaceSlug, year) {
    const url = `https://www.procyclingstats.com/race/${pcsRaceSlug}/${year}/startlist`;
    const res = await this.fetchImpl(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
      }
    });
    if (!res.ok) {
      throw new Error(`PCSTeamJerseyProvider: réponse HTTP ${res.status} pour ${url}`);
    }
    const html = await res.text();
    return this.parseTeamJerseysHtml(html);
  }

  /**
   * Séparée de fetchTeamJerseys() pour être testable sur une fixture, sans réseau.
   * @returns {Array<{ pcsTeamSlug: string, name: string, pcsJerseyUrl: string|null, pcsJerseySlug: string|null }>}
   */
  parseTeamJerseysHtml(html) {
    const $ = cheerio.load(html);
    const entries = [];

    $('ul.startlist_v4 > li').each((_, li) => {
      const $li = $(li);
      const teamLink = $li.find('.ridersCont > div > a.team').first();
      const teamHref = teamLink.attr('href');
      if (!teamHref) return;
      const pcsTeamSlug = teamHref.replace('team/', '');
      const name = teamLink.text().trim();

      const imgSrc = $li.find('.shirtCont img').first().attr('src') || null;
      const pcsJerseyUrl = imgSrc ? `https://www.procyclingstats.com/${imgSrc}` : null;
      // Slug = nom de fichier sans extension — plus pérenne que l'URL
      // complète (cache local, CDN, renommage de ressources plus tard).
      const pcsJerseySlug = imgSrc ? imgSrc.split('/').pop().replace(/\.[a-z0-9]+$/i, '') : null;

      entries.push({ pcsTeamSlug, name, pcsJerseyUrl, pcsJerseySlug });
    });

    return entries;
  }
}

module.exports = { PCSTeamJerseyProvider };
