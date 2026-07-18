/**
 * === Point d'entrée CLI — import des résultats d'une étape ===
 * Déclenchement manuel (après que l'étape soit terminée). La CLI ne
 * fait qu'afficher le rapport retourné par l'orchestrateur — jamais de
 * logique propre ici.
 */
const admin = require('firebase-admin');
const { PCSStageResultProvider } = require('./providers/PCSStageResultProvider');
const { PCSClassificationProvider } = require('./providers/PCSClassificationProvider');
const { FirestoreResultsRepository } = require('./resultsRepository');
const { runResultsImport } = require('./resultsImport');

async function main() {
  const competitionId = process.env.COMPETITION_ID;
  const stageNumber = Number(process.env.STAGE_NUMBER);
  const pcsRaceSlug = process.env.PCS_RACE_SLUG || 'tour-de-france';
  const year = Number(process.env.PCS_RACE_YEAR || new Date().getFullYear());

  if (!competitionId || !stageNumber) {
    console.log('✗ COMPETITION_ID et STAGE_NUMBER sont obligatoires.');
    process.exitCode = 1;
    return;
  }

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

  const stageResultProviderInstance = new PCSStageResultProvider();
  const classificationProviderInstance = new PCSClassificationProvider();

  const stageResultProvider = {
    name: stageResultProviderInstance.name,
    fetchStageResult: (n) => stageResultProviderInstance.fetchStageResult(pcsRaceSlug, year, n)
  };
  const classificationProvider = {
    name: classificationProviderInstance.name,
    fetchClassification: (n, type) => classificationProviderInstance.fetchClassification(pcsRaceSlug, year, n, type)
  };
  const repository = new FirestoreResultsRepository(db);

  const result = await runResultsImport({
    competitionId, stageNumber, stageResultProvider, classificationProvider, repository
  });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.success ? 0 : 1;
}

main().catch(err => {
  console.log(`✗ Échec inattendu : ${err.message}`);
  process.exitCode = 1;
});
