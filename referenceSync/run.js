/**
 * === Point d'entrée CLI — synchronisation ponctuelle des données de référence ===
 * Déclenchement manuel uniquement : lors de la création d'une
 * compétition, de l'import d'une nouvelle édition, ou via un bouton
 * "Mettre à jour les équipes" côté Gruppetto (non construit ici).
 *
 * Deux identifiants distincts à fournir :
 *   - raceId       : identifiant PCS (ex. "tour-de-france/2026")
 *   - competitionId : identifiant Gruppetto (ex. "tdf-2026")
 */
const admin = require('firebase-admin');
const { PCSTeamRosterProvider } = require('./providers/PCSTeamRosterProvider');
const { FirestoreReferenceDataStore } = require('./referenceDataStore');
const { runReferenceSync } = require('./referenceSync');
const { EXPECTED_TEAMS } = require('../sync/config/raceConfig');

async function main() {
  const raceId = process.env.PCS_RACE_ID || 'tour-de-france/2026';
  const competitionId = process.env.COMPETITION_ID || 'tdf-2026';

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    console.log('✗ Variable d\'environnement FIREBASE_SERVICE_ACCOUNT manquante.');
    process.exitCode = 1;
    return;
  }
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(serviceAccountJson)) });
  }
  const db = admin.firestore();

  console.log(`Synchronisation des données de référence démarrée (PCS: ${raceId} -> competitions/${competitionId})`);

  const provider = new PCSTeamRosterProvider();
  const store = new FirestoreReferenceDataStore(db);

  const result = await runReferenceSync({ provider, raceId, competitionId, store, expectedTeams: EXPECTED_TEAMS });
  process.exitCode = result.success ? 0 : 1;
}

main().catch(err => {
  console.log(`✗ Échec inattendu : ${err.message}`);
  process.exitCode = 1;
});
