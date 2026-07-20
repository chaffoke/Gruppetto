/**
 * === StageResultAssembler ===
 * Traduit le DTO brut de PCSStageResultProvider vers le modèle métier
 * StageResultEntry (models.js). Seule responsabilité : cette
 * transformation — la résolution effective des identifiants est
 * injectée (resolveRiderId/resolveTeamId), jamais lue directement ici.
 * Ne connaît rien de Firestore ni de referenceData.
 */
const { STAGE_RESULT_STATUSES } = require('../models');

const PCS_STATUS_TO_GRUPPETTO = {
  DNS: STAGE_RESULT_STATUSES.DNS,
  DNF: STAGE_RESULT_STATUSES.DNF,
  DSQ: STAGE_RESULT_STATUSES.DSQ,
  OTL: STAGE_RESULT_STATUSES.OTL,
  DF: STAGE_RESULT_STATUSES.DF
};

function mapStatus(pcsRawStatus, rank) {
  if (pcsRawStatus && PCS_STATUS_TO_GRUPPETTO[pcsRawStatus]) return PCS_STATUS_TO_GRUPPETTO[pcsRawStatus];
  if (rank != null) return STAGE_RESULT_STATUSES.FINISHED;
  return STAGE_RESULT_STATUSES.DNF; // repli prudent : ni rang ni statut reconnu, jamais deviner "finished"
}

/**
 * @param {Array<Object>} rawEntries - sortie brute de PCSStageResultProvider.parseStageResultHtml()
 * @param {{ resolveRiderId: (slug:string)=>string|null, resolveTeamId: (slug:string)=>string|null }} resolvers
 * @returns {Array<import('../models').StageResultEntry>}
 */
function assembleStageResults(rawEntries, { resolveRiderId, resolveTeamId } = {}) {
  return (rawEntries || []).map(raw => {
    const riderId = resolveRiderId ? resolveRiderId(raw.pcsRiderSlug) : raw.pcsRiderSlug;
    const teamId = raw.pcsTeamSlug ? (resolveTeamId ? resolveTeamId(raw.pcsTeamSlug) : raw.pcsTeamSlug) : null;

    return {
      rank: raw.rank != null ? raw.rank : null,
      riderId,
      teamId,
      bib: raw.bib != null ? raw.bib : null,
      time: raw.time || null,
      gap: raw.gap || null,
      status: mapStatus(raw.pcsRawStatus, raw.rank),
      bonusSeconds: raw.bonusSeconds != null ? raw.bonusSeconds : null,
      points: raw.points != null ? raw.points : null,
      extra: {
        pcsRiderSlug: raw.pcsRiderSlug || null,
        pcsTeamSlug: raw.pcsTeamSlug || null,
        pcsRawStatus: raw.pcsRawStatus || null
      }
    };
  });
}

module.exports = { assembleStageResults, mapStatus, PCS_STATUS_TO_GRUPPETTO };
