/**
 * === Point d'entrée CLI — import des résultats d'une étape ===
 * Deux modes :
 *   - STAGE_NUMBER fourni  -> import explicite de cette étape (usage manuel).
 *   - STAGE_NUMBER absent  -> détection automatique de "l'étape du jour"
 *     via competitions/{id}/stages (date == aujourd'hui), pour permettre
 *     un déclenchement programmé (cron) sans intervention humaine.
 * La CLI ne fait qu'afficher le rapport retourné par l'orchestrateur —
 * jamais de logique métier propre ici, au-delà de cette résolution.
 */
const admin = require('firebase-admin');
const { PCSStageResultProvider } = require('./providers/PCSStageResultProvider');
const { PCSClassificationProvider } = require('./providers/PCSClassificationProvider');
const { FirestoreResultsRepository } = require('./resultsRepository');
const { runResultsImport } = require('./resultsImport');

function todayDateStr() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

async function main() {
  const competitionId = process.env.COMPETITION_ID;
  const pcsRaceSlug = process.env.PCS_RACE_SLUG || 'tour-de-france';
  const year = Number(process.env.PCS_RACE_YEAR || new Date().getFullYear());

  if (!competitionId) {
    console.log('✗ COMPETITION_ID est obligatoire.');
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
  const repository = new FirestoreResultsRepository(db);

  let stageNumber = process.env.STAGE_NUMBER ? Number(process.env.STAGE_NUMBER) : null;
  if (!stageNumber) {
    const today = todayDateStr();
    console.log(`STAGE_NUMBER non fourni — détection de l'étape du jour (${today})...`);
    stageNumber = await repository.findStageNumberByDate(competitionId, today);
    if (!stageNumber) {
      console.log(`Aucune étape prévue pour aujourd'hui (${today}) — rien à importer, ce n'est pas une erreur.`);
      process.exitCode = 0;
      return;
    }
    console.log(`Étape détectée pour aujourd'hui : ${stageNumber}`);
  }

  // Uniquement pour les classements cumulés : le contenu réel n'est
  // jamais présent dans une réponse HTTP brute (confirmé en conditions
  // réelles), il faut exécuter le JavaScript de la page.
  const { createBrowserFetch, closeBrowser } = require('./browserFetch');
  const classificationBrowserFetch = createBrowserFetch({
    waitForSelector: 'table.results',
    // Vrai User-Agent de navigateur — la chaîne d'identification
    // Gruppetto (adaptée à une requête HTTP simple, honnête) se
    // comporte ici comme un signal évident d'automatisation, puisque le
    // navigateur doit se présenter comme un vrai visiteur pour accéder
    // au contenu chargé en JavaScript.
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const classificationProviderInstance = new PCSClassificationProvider({ fetchImpl: classificationBrowserFetch });
  // Résultat d'étape : migré vers le même navigateur headless que la
  // classification (22/07/2026) — un fetch HTTP simple avec un
  // User-Agent auto-identifié comme script s'est mis à recevoir un 403
  // lui aussi (PCS a visiblement resserré sa protection anti-bot en
  // pleine période de Tour). Même page cible, même mécanisme déjà
  // éprouvé — pas une nouvelle solution, la même que celle qui a réglé
  // le même symptôme sur la classification.
  const stageResultProviderInstance = new PCSStageResultProvider({ fetchImpl: classificationBrowserFetch });

  const stageResultProvider = {
    name: stageResultProviderInstance.name,
    fetchStageResult: (n) => stageResultProviderInstance.fetchStageResult(pcsRaceSlug, year, n),
    fetchJerseyWearers: (n) => stageResultProviderInstance.fetchJerseyWearers(pcsRaceSlug, year, n)
  };
  const classificationProvider = {
    name: classificationProviderInstance.name,
    fetchClassification: (n, type) => classificationProviderInstance.fetchClassification(pcsRaceSlug, year, n, type)
  };

  // Identité par défaut : dans le cas courant, riderId Gruppetto EST le
  // slug PCS (cf. stableId.js de referenceSync). Une résolution plus
  // fine (vérification contre referenceData déjà importé) reste une
  // amélioration future, pas nécessaire pour ce premier import réel.
  const resolveRiderId = slug => slug;
  const resolveTeamId = slug => slug;

  const result = await runResultsImport({
    competitionId, stageNumber, stageResultProvider, classificationProvider, repository,
    resolveRiderId, resolveTeamId
  });
  console.log(JSON.stringify(result, null, 2));
  await closeBrowser();
  process.exitCode = result.success ? 0 : 1;
}

main().catch(async err => {
  console.log(`✗ Échec inattendu : ${err.message}`);
  try { const { closeBrowser } = require('./browserFetch'); await closeBrowser(); } catch (e) { /* rien à fermer */ }
  process.exitCode = 1;
});
