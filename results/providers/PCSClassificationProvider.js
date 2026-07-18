/**
 * === PCSClassificationProvider (SQUELETTE — non fonctionnel) ===
 *
 * ⚠️ Même avertissement que PCSStageResultProvider — pages confirmées
 * dans leur existence et leur URL, pas dans leur structure HTML exacte.
 *
 * Pages confirmées (URLs réelles, vues dans la navigation d'une vraie
 * page récupérée) :
 *   race/{slug}/{année}/stage-{N}-gc         -> general
 *   race/{slug}/{année}/stage-{N}-points     -> points
 *   race/{slug}/{année}/stage-{N}-kom        -> mountain
 *   race/{slug}/{année}/stage-{N}-youth      -> youth
 *   race/{slug}/{année}/stage-{N}-teams-gc   -> teams
 *
 * Un seul provider, paramétré par type — pas cinq providers séparés,
 * conformément à la demande.
 *
 * Forme de sortie attendue par entrée (avant résolution riderId/teamId) :
 * {
 *   rank: number,
 *   pcsRiderSlug: string|null,   // null uniquement pour le classement "teams"
 *   pcsTeamSlug: string|null,
 *   time: string|null,
 *   gap: string|null,
 *   points: number|null
 * }
 */
class PCSClassificationProvider {
  constructor({ fetchImpl = globalThis.fetch, userAgent = 'Gruppetto-ResultsImport/1.0 (usage personnel non commercial)' } = {}) {
    this.name = 'pcs-classification';
    this.fetchImpl = fetchImpl;
    this.userAgent = userAgent;
  }

  /**
   * @param {string} type - une valeur de CLASSIFICATION_TYPES ('general'|'points'|'mountain'|'youth'|'teams')
   */
  async fetchClassification(pcsRaceSlug, year, stageNumber, type) {
    throw new Error(
      'PCSClassificationProvider.fetchClassification() non implémentée — en attente du vrai HTML ' +
      '(voir le contrat documenté en tête de ce fichier).'
    );
  }
}

module.exports = { PCSClassificationProvider };
