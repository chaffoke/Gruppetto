/**
 * === ClassificationAssembler ===
 * Traduit le DTO brut de PCSClassificationProvider vers ClassificationEntry
 * (models.js). Même principe que StageResultAssembler : résolution des
 * identifiants injectée, jamais lue directement ici.
 */
function assembleClassification(rawEntries, { resolveRiderId, resolveTeamId } = {}) {
  return (rawEntries || []).map(raw => ({
    rank: raw.rank,
    riderId: raw.pcsRiderSlug ? (resolveRiderId ? resolveRiderId(raw.pcsRiderSlug) : raw.pcsRiderSlug) : null,
    teamId: raw.pcsTeamSlug ? (resolveTeamId ? resolveTeamId(raw.pcsTeamSlug) : raw.pcsTeamSlug) : null,
    time: raw.time || null,
    gap: raw.gap || null,
    points: raw.points != null ? raw.points : null,
    extra: {
      pcsRiderSlug: raw.pcsRiderSlug || null,
      pcsTeamSlug: raw.pcsTeamSlug || null
    }
  }));
}

module.exports = { assembleClassification };
