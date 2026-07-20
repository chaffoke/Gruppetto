/**
 * === Point d'entrée CLI — import de compétition ===
 * Déclenchement manuel. Mode toujours explicite :
 *   MODE=create               -> la compétition ne doit pas exister
 *   MODE=import-into-existing  -> la compétition doit déjà exister
 */
const admin = require('firebase-admin');
const { PCSCompetitionProvider } = require('./providers/PCSCompetitionProvider');
const { PCSStageListProvider } = require('./providers/PCSStageListProvider');
const { PCSStageTimeProvider } = require('./providers/PCSStageTimeProvider');
const { PCSFavoritesProvider } = require('./providers/PCSFavoritesProvider');
const { PCSTeamJerseyProvider } = require('./providers/PCSTeamJerseyProvider');
const { FirestoreCompetitionRepository } = require('./competitionRepository');
const { runCompetitionImport, formatReportSummary } = require('./competitionImport');

async function main() {
  const mode = process.env.MODE;
  const competitionId = process.env.COMPETITION_ID;
  const pcsRaceSlug = process.env.PCS_RACE_SLUG || 'tour-de-france';
  const year = Number(process.env.PCS_RACE_YEAR || new Date().getFullYear());

  if (!mode || !competitionId) {
    console.log('✗ MODE et COMPETITION_ID sont obligatoires (MODE=create|import-into-existing).');
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

  console.log(`Import de compétition démarré — mode=${mode}, competitionId=${competitionId}`);

  const competitionProviderInstance = new PCSCompetitionProvider();
  const stageListProviderInstance = new PCSStageListProvider();
  const stageTimeProviderInstance = new PCSStageTimeProvider();
  const favoritesProviderInstance = new PCSFavoritesProvider();
  const teamJerseyProviderInstance = new PCSTeamJerseyProvider();

  const competitionProvider = { name: competitionProviderInstance.name, fetchCompetition: () => competitionProviderInstance.fetchCompetition(pcsRaceSlug, year) };
  const stageListProvider = { name: stageListProviderInstance.name, fetchStages: () => stageListProviderInstance.fetchStages(pcsRaceSlug, year) };
  const stageTimeProvider = { name: stageTimeProviderInstance.name, delayMs: stageTimeProviderInstance.delayMs, fetchStartTime: (n, stageDate) => stageTimeProviderInstance.fetchStartTime(pcsRaceSlug, year, n, stageDate) };
  const favoritesProvider = { name: favoritesProviderInstance.name, fetchFavorites: () => favoritesProviderInstance.fetchFavorites(pcsRaceSlug, year) };
  const teamJerseyProvider = { name: teamJerseyProviderInstance.name, fetchTeamJerseys: () => teamJerseyProviderInstance.fetchTeamJerseys(pcsRaceSlug, year) };
  const repository = new FirestoreCompetitionRepository(db);

  // Identité par défaut : riderId/teamId Gruppetto == slug PCS dans le
  // cas courant (cf. stableId.js de referenceSync).
  const resolveRiderId = slug => slug;
  const resolveTeamId = slug => slug;

  const result = await runCompetitionImport({
    mode, competitionId, competitionProvider, stageListProvider, stageTimeProvider,
    favoritesProvider, teamJerseyProvider, resolveRiderId, resolveTeamId, repository
  });
  console.log('\n--- Synthèse ---');
  console.log(formatReportSummary(result));
  console.log('\n--- Rapport complet (JSON) ---');
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.completed ? 0 : 1;
}

main().catch(err => {
  console.log(`✗ Échec inattendu : ${err.message}`);
  process.exitCode = 1;
});
