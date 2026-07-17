/**
 * === Entrées de syncHistory — construction pure ===
 * Ne touche jamais Firestore elle-même : construit juste l'objet à
 * écrire. sync.js décide où et quand l'écrire (jamais avant la validation
 * complète pour une entrée de succès ; toujours indépendamment de l'état
 * de production pour une entrée d'échec).
 */
function buildSuccessHistoryEntry({ raceId, providerName, riderCount, changes, startedAt, finishedAt }) {
  return {
    timestamp: startedAt.toISOString(),
    provider: providerName,
    raceId,
    riderCount,
    changesCount: changes.length,
    changes,
    success: true,
    errorMessage: null,
    durationMs: finishedAt.getTime() - startedAt.getTime()
  };
}

function buildFailureHistoryEntry({ raceId, providerName, riderCount = null, errorMessage, startedAt, finishedAt }) {
  return {
    timestamp: startedAt.toISOString(),
    provider: providerName,
    raceId,
    riderCount,
    changesCount: 0,
    changes: [],
    success: false,
    errorMessage,
    durationMs: finishedAt.getTime() - startedAt.getTime()
  };
}

module.exports = { buildSuccessHistoryEntry, buildFailureHistoryEntry };
