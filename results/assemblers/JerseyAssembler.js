/**
 * === JerseyAssembler ===
 * Combine deux sources déjà obtenues séparément :
 *   - le DTO brut des porteurs de maillots (PCSStageResultProvider.parseJerseyWearersHtml)
 *   - les classements DÉJÀ ASSEMBLÉS (ClassificationAssembler), qui ont un
 *     riderId fiable pour le rang 1
 *
 * Le "leader du classement" n'est JAMAIS déduit du texte "(leader)" vu
 * sur la page (ce texte n'a pas de lien vers le coureur — invérifiable
 * de façon fiable). Le rang 1 du classement déjà assemblé est la seule
 * source de vérité utilisée ici pour le leader.
 *
 * @param {Array<{ jerseyType: string, pcsWearerSlug: string, pcsJerseyClass: string }>} rawJerseyWearers
 * @param {{ general?: Array, points?: Array, mountain?: Array, youth?: Array }} classifications - déjà assemblées (ClassificationEntry[])
 * @param {{ resolveRiderId?: (slug:string)=>string|null }} resolvers
 * @returns {Array<import('../models').JerseyWearer>}
 */
function assembleJerseyWearers(rawJerseyWearers, classifications = {}, { resolveRiderId } = {}) {
  return (rawJerseyWearers || []).map(raw => {
    const wearerId = resolveRiderId ? resolveRiderId(raw.pcsWearerSlug) : raw.pcsWearerSlug;

    const classificationEntries = classifications[raw.jerseyType] || [];
    const leaderEntry = classificationEntries.find(e => e.rank === 1);
    const classificationLeaderId = (leaderEntry && leaderEntry.riderId && leaderEntry.riderId !== wearerId)
      ? leaderEntry.riderId
      : null;

    return {
      jerseyType: raw.jerseyType,
      wearerId,
      classificationLeaderId,
      pcsJerseyClass: raw.pcsJerseyClass
    };
  });
}

module.exports = { assembleJerseyWearers };
