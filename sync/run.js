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

  const { createBrowserFetch, closeBrowser } = require('./browserFetch');
  // Même correctif que pour results/ : un fetch HTTP simple avec un
  // User-Agent auto-identifié comme script a fini par recevoir un 403
  // sur cette page aussi (PCS a visiblement resserré sa protection
  // anti-bot en pleine période de Tour) — migration vers le même
  // navigateur headless + stealth, déjà éprouvé sur results/.
  const rosterBrowserFetch = createBrowserFetch({
    waitForSelector: 'ul.startlist_v4',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const provider = new PCSDirectProvider({ fetchImpl: rosterBrowserFetch });
  const store = new FirestoreRiderStore(db);

  console.log(`Synchronisation démarrée (${raceId})`);
  const result = await runSync({
    provider, raceId, store,
    expectedTeams: EXPECTED_TEAMS, expectedTeamSize: 8, knownRiders: KNOWN_RIDERS
  });

  await closeBrowser();
  process.exitCode = result.success ? 0 : 1;
}

main().catch(async err => {
  console.error('✗ Échec inattendu :', err.message);
  try { const { closeBrowser } = require('./browserFetch'); await closeBrowser(); } catch (e) { /* rien à fermer */ }
  process.exitCode = 1;
});
