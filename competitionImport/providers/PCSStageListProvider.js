/**
 * === PCSStageListProvider (SQUELETTE — non fonctionnel) ===
 *
 * ⚠️ Même avertissement que PCSCompetitionProvider : le contenu de
 * route/stage-profiles a été confirmé (colonnes, images, filtre "Profile
 * type"), mais pas sa structure HTML réelle. Sélecteurs à écrire une
 * fois le vrai code source récupéré.
 *
 * Forme de sortie attendue par étape (contrat figé, validé par le PoC) :
 * {
 *   stageNumber: number,
 *   name: string,              // ex. "Stage 13 | Dole - Belfort" — le suffixe (TTT)/(ITT) y reste, utilisé par StageTypeMapper
 *   date: string|null,         // format brut PCS observé : "17/07" — à convertir en date complète avec l'année de la compétition
 *   startCity: string|null,
 *   finishCity: string|null,
 *   distanceKm: number|null,
 *   elevationGainM: number|null,   // "Vertical meters", confirmé
 *   pcsStageType: string|null,     // ex. "Flat", "Mountains, uphill finish" — valeur brute, jamais transformée ici
 *   profileScore: number|null,     // confirmé présent, jamais utilisé pour la logique métier
 *   pcsProfileUrl: string|null,    // lien vers l'image PCS — jamais l'image elle-même par défaut (mêmes réserves que les maillots)
 *   pcsStageUrl: string|null,
 *   extra: {}
 * }
 */
class PCSStageListProvider {
  constructor({ fetchImpl = globalThis.fetch, userAgent = 'Gruppetto-CompetitionImport/1.0 (usage personnel non commercial)' } = {}) {
    this.name = 'pcs-stage-list';
    this.fetchImpl = fetchImpl;
    this.userAgent = userAgent;
  }

  async fetchStages(pcsRaceSlug, year) {
    throw new Error(
      'PCSStageListProvider.fetchStages() non implémentée — en attente du vrai HTML ' +
      '(voir le contrat documenté en tête de ce fichier).'
    );
  }
}

module.exports = { PCSStageListProvider };
