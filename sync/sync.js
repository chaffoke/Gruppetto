const { validateSnapshot } = require('./monitoring');
const { checkRosterConsistency } = require('./rosterConsistency');
const { computeRiderDiff } = require('./diff');
const { buildSuccessHistoryEntry, buildFailureHistoryEntry } = require('./syncHistoryEntry');

/**
 * === sync.js — orchestrateur ===
 *
 * Garantie d'atomicité par CONSTRUCTION, pas par convention : la seule
 * ligne de ce fichier qui écrit dans la collection `riders` est
 * `store.commitSuccess(...)`, et elle n'est atteignable que si les DEUX
 * validations (validateSnapshot + checkRosterConsistency) ont réussi.
 * Tout chemin d'échec (récupération impossible, validation en échec)
 * passe exclusivement par `store.commitFailure(...)`, qui n'écrit jamais
 * ailleurs que dans syncHistory.
 *
 * `store` est injecté (voir firestoreRiderStore.js pour la vraie
 * implémentation Firestore) — ce qui permet de tester l'intégralité de
 * cette logique avec un faux store en mémoire, sans jamais toucher un
 * vrai projet Firebase.
 */
async function runSync({
  provider,
  raceId,
  store,
  expectedTeams = [],
  knownRiders = [],
  expectedTeamSize = 8,
  minRiders = 20,
  tolerance = 10,
  now = () => new Date(),
  log = console.log
}) {
  const startedAt = now();

  let snapshot;
  try {
    snapshot = await provider.fetchRoster(raceId);
  } catch (err) {
    const entry = buildFailureHistoryEntry({
      raceId, providerName: provider.name,
      errorMessage: `Récupération impossible : ${err.message}`,
      startedAt, finishedAt: now()
    });
    await store.commitFailure(entry);
    log(`✗ ${entry.errorMessage}`);
    log('Synchronisation annulée — aucune donnée de production modifiée.');
    return { success: false, reason: entry.errorMessage };
  }

  log(`${snapshot.riders.length} coureur(s) récupéré(s) depuis ${provider.name}`);

  const previousStatuses = await store.readCurrentStatuses(raceId);
  const previousCount = Object.keys(previousStatuses).length || null;

  const { errors: globalErrors } = validateSnapshot(snapshot, previousCount, { minRiders, tolerance });
  const { passed: structurallyValid, checks } = checkRosterConsistency(snapshot, {
    expectedTeams, expectedTeamSize, knownRiders
  });

  checks.forEach(c => log(`${c.ok ? '✓' : '✗'} ${c.message}`));
  globalErrors.forEach(e => log(`✗ ${e}`));

  const allValid = structurallyValid && globalErrors.length === 0;

  if (!allValid) {
    const reason = [...checks.filter(c => !c.ok).map(c => c.message), ...globalErrors].join(' | ');
    const entry = buildFailureHistoryEntry({
      raceId, providerName: provider.name, riderCount: snapshot.riders.length,
      errorMessage: reason, startedAt, finishedAt: now()
    });
    await store.commitFailure(entry);
    log('Synchronisation annulée — aucune donnée de production modifiée.');
    return { success: false, reason };
  }

  // À partir d'ici, tout est validé : c'est le SEUL point du fichier où
  // une écriture de production est déclenchée.
  const changes = computeRiderDiff(snapshot.riders, previousStatuses);
  const historyEntry = buildSuccessHistoryEntry({
    raceId, providerName: provider.name, riderCount: snapshot.riders.length,
    changes, startedAt, finishedAt: now()
  });

  await store.commitSuccess({ raceId, riders: snapshot.riders, historyEntry, now: now() });

  log('✓ Validation réussie');
  log(`${changes.length} changement(s) détecté(s)`);
  changes.forEach(c => log(`  - ${c.lastName} ${c.firstName || ''} : ${c.from || 'nouveau'} → ${c.to}`));
  log('✓ Firestore mis à jour (écriture atomique)');
  log('Synchronisation terminée.');

  return { success: true, changes };
}

module.exports = { runSync };
