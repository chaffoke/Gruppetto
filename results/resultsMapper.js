/**
 * === resultsMapper ===
 * Traduit la sortie brute d'un provider (pcsRiderSlug, pcsTeamSlug,
 * pcsRawStatus...) vers le modèle métier Gruppetto (riderId, teamId,
 * status). Fonction pure — la résolution effective des identifiants est
 * injectée (resolveRiderId/resolveTeamId), jamais lue directement ici :
 * ce fichier ignore tout de referenceData ou de Firestore.
 */
const { STAGE_RESULT_STATUSES } = require('./models');

const PCS_STATUS_TO_GRUPPETTO = {
  DNS: STAGE_RESULT_STATUSES.DNS,
  DNF: STAGE_RESULT_STATUSES.DNF,
  DSQ: STAGE_RESULT_STATUSES.DSQ,
  OTL: STAGE_RESULT_STATUSES.OTL,
  DF: STAGE_RESULT_STATUSES.DF
};

function mapPcsStatus(pcsRawStatus, rank) {
  if (pcsRawStatus && PCS_STATUS_TO_GRUPPETTO[pcsRawStatus]) return PCS_STATUS_TO_GRUPPETTO[pcsRawStatus];
  if (rank != null) return STAGE_RESULT_STATUSES.FINISHED;
  return STAGE_RESULT_STATUSES.DNF; // repli prudent : ni rang ni statut reconnu, jamais deviner "finished"
}

/**
 * @param {Object} rawEntry - sortie brute de PCSStageResultProvider.parseStageResultHtml()
 * @param {{ resolveRiderId: (slug:string)=>string|null, resolveTeamId: (slug:string)=>string|null }} resolvers
 * @returns {import('./models').StageResultEntry}
 */
function mapPcsStageResultEntry(rawEntry, { resolveRiderId, resolveTeamId } = {}) {
  const riderId = resolveRiderId ? resolveRiderId(rawEntry.pcsRiderSlug) : rawEntry.pcsRiderSlug;
  const teamId = rawEntry.pcsTeamSlug ? (resolveTeamId ? resolveTeamId(rawEntry.pcsTeamSlug) : rawEntry.pcsTeamSlug) : null;

  return {
    rank: rawEntry.rank != null ? rawEntry.rank : null,
    riderId,
    teamId,
    bib: rawEntry.bib != null ? rawEntry.bib : null,
    time: rawEntry.time || null,
    gap: rawEntry.gap || null,
    status: mapPcsStatus(rawEntry.pcsRawStatus, rawEntry.rank),
    bonusSeconds: rawEntry.bonusSeconds != null ? rawEntry.bonusSeconds : null,
    points: rawEntry.points != null ? rawEntry.points : null,
    extra: {
      pcsRiderSlug: rawEntry.pcsRiderSlug || null,
      pcsTeamSlug: rawEntry.pcsTeamSlug || null,
      pcsRawStatus: rawEntry.pcsRawStatus || null
    }
  };
}

module.exports = { mapPcsStatus, mapPcsStageResultEntry, PCS_STATUS_TO_GRUPPETTO };
