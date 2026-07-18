/**
 * === runReferenceSync — orchestrateur ===
 * Sépare la logique (récupération -> validation -> écriture) du point
 * d'entrée réel (run.js), pour rester testable avec un faux provider et
 * un faux store, sans réseau ni Firebase.
 *
 * raceId (PCS, ex. "tour-de-france/2026") et competitionId (Gruppetto,
 * ex. "tdf-2026") sont volontairement deux paramètres distincts : le
 * premier sert à récupérer la donnée, le second à savoir où l'écrire.
 */
const { validateRoster } = require('./referenceDataStore');

async function runReferenceSync({ provider, raceId, competitionId, store, expectedTeams = [], expectedTeamSize = 8, log = console.log }) {
  let referenceData;
  try {
    referenceData = await provider.fetchRoster(raceId);
  } catch (err) {
    log(`✗ Récupération impossible : ${err.message}`);
    return { success: false, reason: err.message };
  }

  const totalRiders = referenceData.teams.reduce((sum, t) => sum + t.riders.length, 0);
  log(`${referenceData.teams.length} équipe(s), ${totalRiders} coureur(s) récupéré(s)`);

  const { passed, checks } = validateRoster(referenceData, expectedTeams, expectedTeamSize);
  checks.forEach(c => log(`${c.ok ? '✓' : '✗'} ${c.message}`));

  if (!passed) {
    log('Synchronisation annulée — aucune écriture Firestore.');
    return { success: false, reason: checks.filter(c => !c.ok).map(c => c.message).join(' | ') };
  }

  await store.writeReferenceData(competitionId, referenceData);
  log(`✓ referenceData/${competitionId} mis à jour`);
  log('Synchronisation terminée.');

  return { success: true, referenceData };
}

module.exports = { runReferenceSync };
