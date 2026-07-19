/**
 * === PCSCompetitionProvider (SQUELETTE — non fonctionnel) ===
 *
 * ⚠️ IMPORTANT : tout ce que j'ai récupéré pour le PoC (pages
 * route/stage-profiles, stage-N/info/time-table) l'a été via un outil
 * qui restitue le contenu déjà transformé en texte/Markdown — jamais le
 * HTML brut avec ses balises et attributs réels. J'ai donc confirmé le
 * CONTENU (quelles données existent, sous quel libellé), mais PAS la
 * structure HTML exacte à cibler avec Cheerio. Écrire des sélecteurs
 * maintenant serait deviner — exactement l'erreur qu'on a déjà commise
 * une fois avec PCSDirectProvider, corrigée ensuite avec le vrai HTML.
 *
 * Avant de compléter ce fichier, il faudra un vrai "Voir le code
 * source" (ou export réseau) d'au moins :
 *   - race/{slug}/{année}          (nom, dates, distance totale)
 *   - route/stage-profiles          (données par étape + images)
 *   - stage-N/info/time-table       (heure de départ)
 *
 * Forme de sortie attendue (déjà validée avec le PoC, contrat figé) :
 * {
 *   name: string, year: number, type: string|null,
 *   startDate: string|null, endDate: string|null,
 *   stageCount: number,
 *   pcsUrl: string, pcsSlug: string,
 *   extra: {}
 * }
 */
class PCSCompetitionProvider {
  constructor({ fetchImpl = globalThis.fetch, userAgent = 'Gruppetto-CompetitionImport/1.0 (usage personnel non commercial)' } = {}) {
    this.name = 'pcs-competition';
    this.fetchImpl = fetchImpl;
    this.userAgent = userAgent;
  }

  async fetchCompetition(pcsRaceSlug, year) {
    throw new Error(
      'PCSCompetitionProvider.fetchCompetition() non implémentée — en attente du vrai HTML ' +
      '(voir le contrat documenté en tête de ce fichier).'
    );
  }
}

module.exports = { PCSCompetitionProvider };
