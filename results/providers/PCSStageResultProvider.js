/**
 * === PCSStageResultProvider (SQUELETTE — non fonctionnel) ===
 *
 * ⚠️ Le contenu de la page de résultat d'étape a été confirmé (colonnes,
 * URLs, statuts DNS visibles) via un outil qui restitue un Markdown
 * reconstruit — pas le HTML brut. Des incohérences d'alignement ont
 * même été observées dans cette reconstruction (nom associé à la
 * mauvaise équipe) — la preuve qu'il ne faut pas écrire de sélecteurs
 * sur cette base. Attendre le vrai "Voir le code source" avant de
 * compléter ce fichier.
 *
 * Page confirmée : race/{slug}/{année}/stage-{N}
 *
 * Le riderId/teamId Gruppetto NE SONT PAS déterminés ici — ce parseur
 * produit un pcsSlug brut par ligne ; c'est l'orchestrateur (ou un
 * mapper dédié à écrire au même moment que les sélecteurs) qui fera la
 * correspondance vers referenceData, en réutilisant stableId.js déjà
 * existant.
 *
 * Forme de sortie attendue par entrée (avant résolution riderId/teamId) :
 * {
 *   rank: number|null,       // null si DNS/DNF/DSQ (confirmé : "DNS" apparaît à la place du rang)
 *   bib: number|null,
 *   pcsRiderSlug: string,    // ex. "mauro-schmid" — résolu en riderId ensuite
 *   pcsTeamSlug: string|null,
 *   time: string|null,
 *   gap: string|null,
 *   pcsRawStatus: string|null,  // "DNS" tel quel si présent — jamais utilisé pour la logique, juste diagnostic
 *   bonusSeconds: number|null,  // confirmé présent (ex. "10″", lien "most-bonifications")
 *   points: number|null
 * }
 */
class PCSStageResultProvider {
  constructor({ fetchImpl = globalThis.fetch, userAgent = 'Gruppetto-ResultsImport/1.0 (usage personnel non commercial)' } = {}) {
    this.name = 'pcs-stage-result';
    this.fetchImpl = fetchImpl;
    this.userAgent = userAgent;
  }

  async fetchStageResult(pcsRaceSlug, year, stageNumber) {
    throw new Error(
      'PCSStageResultProvider.fetchStageResult() non implémentée — en attente du vrai HTML ' +
      '(voir le contrat documenté en tête de ce fichier).'
    );
  }
}

module.exports = { PCSStageResultProvider };
