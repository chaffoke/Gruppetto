const cheerio = require('cheerio');
const { splitPcsName } = require('../../sync/providers/pcsNormalize');
const { extractBib, extractNationality } = require('./pcsRosterNormalize');
const { deriveTeamId, deriveRiderId } = require('./stableId');

/**
 * === PCSTeamRosterProvider ===
 * Récupère la composition de référence des équipes (identifiant stable,
 * nom, dossard, coureurs, nationalité, lien PCS) depuis la même page
 * startlist publique que sync/providers/PCSDirectProvider.js — mêmes
 * sélecteurs, déjà vérifiés contre le vrai HTML.
 *
 * Module VOLONTAIREMENT indépendant de sync/ dans son cycle de vie
 * (déclenchement manuel, pas de cron, pas de diff/historique) — seules
 * les fonctions pures splitPcsName() et checkRosterConsistency() sont
 * partagées, pour éviter de dupliquer une logique déjà écrite et testée.
 *
 * Ne récupère PAS le statut (dnf/dns/dsq) — c'est le rôle de sync/,
 * volontairement laissé de côté ici.
 *
 * jerseyUrl est un champ RÉSERVÉ, toujours null aujourd'hui — l'usage
 * des maillots officiels PCS n'est pas encore validé (droits à vérifier
 * par l'utilisateur). Le champ existe dans le modèle pour ne pas devoir
 * migrer les données plus tard si la décision est favorable.
 */
class PCSTeamRosterProvider {
  constructor({ fetchImpl = globalThis.fetch, userAgent = 'Gruppetto-ReferenceSync/1.0 (usage personnel non commercial)' } = {}) {
    this.name = 'pcs-team-roster';
    this.fetchImpl = fetchImpl;
    this.userAgent = userAgent;
  }

  async fetchRoster(raceId) {
    const url = `https://www.procyclingstats.com/race/${raceId}/startlist`;
    const res = await this.fetchImpl(url, { headers: { 'User-Agent': this.userAgent } });
    if (!res.ok) {
      throw new Error(`PCSTeamRosterProvider: réponse HTTP ${res.status} pour ${url}`);
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
    const teams = [];

    $('ul.startlist_v4 > li').each((_, teamEl) => {
      const $team = $(teamEl);
      const teamName = $team.find('.ridersCont > div > a.team').first().text().trim();
      const teamPcsUrl = $team.find('.ridersCont > div > a.team').first().attr('href') || null;
      const teamId = deriveTeamId({ pcsUrl: teamPcsUrl, name: teamName });

      const riders = [];
      $team.find('.ridersCont > ul > li').each((__, riderEl) => {
        const $rider = $(riderEl);
        const link = $rider.find('a').first();
        const rawName = link.text().trim();
        if (!rawName) return;

        const fullText = $rider.text().replace(/\s+/g, ' ').trim();
        const { lastName, firstName } = splitPcsName(rawName);
        const flagClass = $rider.find('span.flag').first().attr('class') || '';
        const sourcePcsUrl = link.attr('href') || null;
        const riderId = deriveRiderId({ sourcePcsUrl, lastName, firstName });

        riders.push({
          id: riderId,
          bib: extractBib(fullText),
          firstName,
          lastName,
          nationality: extractNationality(flagClass),
          sourcePcsUrl
        });
      });

      teams.push({
        id: teamId,
        name: teamName || null,
        pcsUrl: teamPcsUrl,
        jerseyUrl: null, // réservé — voir note en tête de fichier
        riders
      });
    });

    return {
      raceId,
      fetchedAt: new Date().toISOString(),
      teams
    };
  }
}

module.exports = { PCSTeamRosterProvider };
