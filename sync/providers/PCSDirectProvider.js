const cheerio = require('cheerio');
const { CyclingDataProvider } = require('./CyclingDataProvider');
const { splitPcsName, extractStatus } = require('./pcsNormalize');

/**
 * === PCSDirectProvider ===
 * Récupère la startlist publique de ProCyclingStats.com et en extrait le
 * statut de chaque coureur (actif/DNS/DNF/DSQ), déjà présent en clair dans
 * la page (confirmé lors du PoC : "(DNF #6)", "(DNS #7)", etc.).
 *
 * Aucune clé, aucun compte — page publique. Usage prévu : une requête par
 * jour maximum, avec un User-Agent identifiable, en bon citoyen du web.
 *
 * ⚠️ Point à valider avant activation planifiée : les sélecteurs CSS
 * ci-dessous sont construits à partir du rendu textuel de la page observé
 * pendant le PoC, pas d'une inspection du DOM brut. Un premier run réel
 * (voir tests/manual-check.js) doit confirmer qu'ils correspondent bien à
 * la structure HTML réelle avant toute planification automatique.
 */
class PCSDirectProvider extends CyclingDataProvider {
  constructor({ fetchImpl = globalThis.fetch, userAgent = 'Gruppetto-Sync/1.0 (usage personnel non commercial)' } = {}) {
    super();
    this.name = 'pcs-direct';
    this.fetchImpl = fetchImpl;
    this.userAgent = userAgent;
  }

  async fetchRoster(raceId) {
    const url = `https://www.procyclingstats.com/race/${raceId}/startlist`;
    const res = await this.fetchImpl(url, { headers: { 'User-Agent': this.userAgent } });
    if (!res.ok) {
      throw new Error(`PCSDirectProvider: réponse HTTP ${res.status} pour ${url}`);
    }
    const html = await res.text();
    return this.parseRosterHtml(html, raceId);
  }

  /**
   * Séparée de fetchRoster() pour être testable sur une page HTML
   * sauvegardée (fixture), sans réseau.
   *
   * Sélecteurs confirmés contre le vrai HTML de la page (vue source,
   * pas une conversion texte) le 17/07/2026 :
   * <ul class="startlist_v4">
   *   <li>
   *     <div class="shirtCont">...</div>
   *     <div class="ridersCont">
   *       <div><a class="team" href="...">NOM ÉQUIPE (WT)</a>...</div>
   *       <ul>
   *         <li class="dropout "><span class="bib">96</span><span class="flag be"></span>
   *             <a href="rider/...">SURNOM Prénom</a> (DNF #6)</li>
   *         ...
   *       </ul>
   *       <div class="dsCont">...</div>
   *     </div>
   *   </li>
   *   ...
   * </ul>
   * La classe "dropout" sur le <li> d'un coureur est un signal redondant
   * avec le texte "(DNF #N)" — non utilisé ici, le texte suffit et reste
   * la source déjà testée dans pcsNormalize.js.
   */
  parseRosterHtml(html, raceId) {
    const $ = cheerio.load(html);
    const riders = [];

    $('ul.startlist_v4 > li').each((_, teamEl) => {
      const $team = $(teamEl);
      const teamName = $team.find('.ridersCont > div > a.team').first().text().trim();

      $team.find('.ridersCont > ul > li').each((__, riderEl) => {
        const $rider = $(riderEl);
        const link = $rider.find('a').first();
        const rawName = link.text().trim();
        if (!rawName) return; // ignore une entrée sans lien coureur (garde défensive)

        const fullText = $rider.text().replace(/\s+/g, ' ').trim();
        const { lastName, firstName } = splitPcsName(rawName);
        const { status, sinceStage } = extractStatus(fullText);

        riders.push({
          firstName,
          lastName,
          team: teamName || null,
          status,
          sinceStage,
          sourceRiderId: link.attr('href') || null
        });
      });
    });

    return {
      raceId,
      fetchedAt: new Date().toISOString(),
      riders
    };
  }
}

module.exports = { PCSDirectProvider };
