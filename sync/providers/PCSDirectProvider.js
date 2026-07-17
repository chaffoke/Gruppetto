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
   */
  parseRosterHtml(html, raceId) {
    const $ = cheerio.load(html);
    const riders = [];

    // Chaque équipe est un bloc de liste de premier niveau contenant un lien
    // vers l'équipe puis une sous-liste de coureurs (structure observée sur
    // la page startlist). Ne dépend d'aucun texte, uniquement de la forme.
    $('.startlist > li, ul.startlist_v3 > li').each((_, teamEl) => {
      const $team = $(teamEl);
      const teamName = $team.find('> a').first().text().trim()
        || $team.find('a').first().text().trim();

      $team.find('li').each((__, riderEl) => {
        const $rider = $(riderEl);
        const link = $rider.find('a').first();
        const rawName = link.text().trim();
        if (!rawName) return; // ignore les entrées sans lien coureur (ex. "DS")

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
