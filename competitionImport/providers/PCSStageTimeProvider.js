/**
 * === PCSStageTimeProvider (SQUELETTE — non fonctionnel) ===
 *
 * ⚠️ Même avertissement. Le PoC a confirmé QUE l'heure de départ existe
 * et OÙ (ligne "Start" du tableau time-table, identique sur les 3
 * colonnes de vitesse — signature d'une heure fixe, pas une estimation),
 * mais pas la structure HTML du tableau lui-même.
 *
 * Point d'attention non résolu par le PoC, à vérifier avant
 * implémentation finale :
 *  - Fuseau horaire exact de l'heure affichée (probable heure locale
 *    française, non confirmé formellement).
 *  - Disponibilité de cette donnée aussi longtemps à l'avance pour une
 *    étape qui n'a pas encore eu lieu (le PoC portait sur une étape déjà
 *    courue).
 *
 * Coût réseau : UN appel par étape (21 pour le Tour de France) — à
 * espacer poliment (léger délai entre requêtes), cohérent avec l'usage
 * "bon citoyen du web" déjà appliqué ailleurs dans le projet.
 *
 * Forme de sortie attendue :
 * { officialStartTime: string|null }  // ISO 8601 une fois le fuseau confirmé — TOUJOURS un objet, jamais une chaîne brute (cohérent avec validateStageTime)
 */
class PCSStageTimeProvider {
  constructor({ fetchImpl = globalThis.fetch, userAgent = 'Gruppetto-CompetitionImport/1.0 (usage personnel non commercial)', delayMs = 500 } = {}) {
    this.name = 'pcs-stage-time';
    this.fetchImpl = fetchImpl;
    this.userAgent = userAgent;
    this.delayMs = delayMs; // délai poli entre deux requêtes successives
  }

  /** @returns {Promise<{ officialStartTime: string|null }>} */
  async fetchStartTime(pcsRaceSlug, year, stageNumber) {
    throw new Error(
      'PCSStageTimeProvider.fetchStartTime() non implémentée — en attente du vrai HTML ' +
      '(voir le contrat documenté en tête de ce fichier).'
    );
  }
}

module.exports = { PCSStageTimeProvider };
