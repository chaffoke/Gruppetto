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

/**
 * Hors des dates réelles de la compétition (avant le départ, après
 * l'arrivée), il n'y a jamais rien à synchroniser — inutile de
 * solliciter PCS (et de risquer un 403 qui déclenche un mail d'échec)
 * tous les jours, toute l'année. S'appuie sur les VRAIES dates déjà
 * connues de Gruppetto (competitions/{id}/stages), pas une date codée en
 * dur à maintenir à part chaque année.
 *
 * Marge de 2 jours de chaque côté : un peu large avant le départ (aucun
 * risque), utile après l'arrivée pour laisser le temps à un abandon de
 * dernière minute d'être confirmé.
 */
async function isWithinCompetitionWindow(db, competitionId) {
  if (!competitionId) return true; // pas de compétition renseignée -> comportement historique conservé, on ne bloque rien
  const snapshot = await db.collection('competitions').doc(competitionId).collection('stages').get();
  const dates = snapshot.docs.map(d => d.data().date).filter(Boolean).sort();
  if (dates.length === 0) return true; // aucune étape connue -> mieux vaut un run inutile qu'un silence permanent par erreur de config

  const bufferMs = 2 * 24 * 60 * 60 * 1000;
  const windowStart = new Date(new Date(dates[0]).getTime() - bufferMs);
  const windowEnd = new Date(new Date(dates[dates.length - 1]).getTime() + bufferMs);
  const now = new Date();
  return now >= windowStart && now <= windowEnd;
}

async function main() {
  const raceId = process.env.SYNC_RACE_ID || 'tour-de-france/2026';
  const competitionId = process.env.COMPETITION_ID || null;

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

  if (!(await isWithinCompetitionWindow(db, competitionId))) {
    console.log(`Hors période de la compétition (${competitionId}) — rien à synchroniser, ce n'est pas une erreur.`);
    process.exitCode = 0;
    return;
  }

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
