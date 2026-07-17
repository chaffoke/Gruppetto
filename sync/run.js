/**
 * === Point d'entrée CLI ===
 * Câble les vraies implémentations (PCSDirectProvider, FirestoreRiderStore)
 * derrière l'orchestrateur runSync(). N'ajoute aucune logique propre — la
 * moindre règle métier vit dans sync.js, monitoring.js ou rosterConsistency.js,
 * jamais ici.
 */
const admin = require('firebase-admin');
const { PCSDirectProvider } = require('./providers/PCSDirectProvider');
const { FirestoreRiderStore } = require('./firestoreRiderStore');
const { runSync } = require('./sync');
const { KNOWN_RIDERS, EXPECTED_TEAMS } = require('./config/raceConfig');

async function main() {
  const raceId = process.env.SYNC_RACE_ID || 'tour-de-france/2026';

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    console.error('✗ Variable d\'environnement FIREBASE_SERVICE_ACCOUNT manquante.');
    process.exitCode = 1;
    return;
  }

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(serviceAccountJson)) });
  }
  const db = admin.firestore();

  const provider = new PCSDirectProvider();
  const store = new FirestoreRiderStore(db);

  console.log(`Synchronisation démarrée (${raceId})`);
  const result = await runSync({
    provider, raceId, store,
    expectedTeams: EXPECTED_TEAMS, expectedTeamSize: 8, knownRiders: KNOWN_RIDERS
  });

  process.exitCode = result.success ? 0 : 1;
}

main().catch(err => {
  console.error('✗ Échec inattendu :', err.message);
  process.exitCode = 1;
});
