/**
 * === runResultsImport — orchestrateur ===
 * Seul responsable de combiner les providers (chacun indépendant,
 * produisant uniquement des DTO PCS) et les Assemblers (chacun
 * responsable d'une seule transformation DTO -> modèle métier). Aucune
 * logique métier ici au-delà de l'enchaînement et de la validation.
 */
const { CLASSIFICATION_TYPES, JERSEY_TYPES } = require('./models');
const { stageNotFoundError } = require('./resultsErrors');
const { validateStageResults, validateClassification } = require('./resultsValidation');
const { assembleStageResults } = require('./assemblers/StageResultAssembler');
const { assembleClassification } = require('./assemblers/ClassificationAssembler');
const { assembleJerseyWearers } = require('./assemblers/JerseyAssembler');

function providerLabel(provider) {
  return provider ? (provider.name || 'unknown') : null;
}

function createReport({ competitionId, stageNumber, stageResultProvider, classificationProvider, startedAt }) {
  return {
    success: false,
    competitionId: competitionId || null,
    stageNumber: stageNumber != null ? stageNumber : null,
    resultsImported: 0,
    classificationsImported: 0,
    jerseyWearersImported: 0,
    warnings: [],
    errors: [],
    durationMs: 0,
    providersUsed: {
      stageResultProvider: providerLabel(stageResultProvider),
      classificationProvider: providerLabel(classificationProvider)
    },
    importedAt: startedAt.toISOString(),
    finishedAt: null
  };
}

async function runResultsImport({
  competitionId,
  stageNumber,
  stageResultProvider,
  classificationProvider,
  repository,
  resolveRiderId,  // (pcsSlug) => riderId|null — typiquement issu de referenceData déjà importé
  resolveTeamId,   // (pcsSlug) => teamId|null
  knownRiderIds,   // Set optionnel, pour validation
  knownTeamIds,    // Set optionnel, pour validation
  log = console.log
}) {
  const startedAt = new Date();
  const report = createReport({ competitionId, stageNumber, stageResultProvider, classificationProvider, startedAt });

  function finish() {
    report.finishedAt = new Date().toISOString();
    report.durationMs = Date.now() - startedAt.getTime();
    return report;
  }
  function fail(message) {
    report.errors.push(message);
    log(`✗ ${message}`);
    return finish();
  }

  if (!competitionId) return fail('competitionId requis');
  if (stageNumber == null) return fail('stageNumber requis');

  const stageExists = await repository.stageExists(competitionId, stageNumber);
  if (!stageExists) return fail(stageNotFoundError(competitionId, stageNumber).message);

  // --- Résultat d'étape (donnée primaire, bloquante) ---
  let rawStageResults;
  try {
    rawStageResults = await stageResultProvider.fetchStageResult(stageNumber);
  } catch (err) {
    return fail(`Récupération du résultat d'étape impossible : ${err.message}`);
  }

  const stageResults = assembleStageResults(rawStageResults, { resolveRiderId, resolveTeamId });

  const stageResultValidation = validateStageResults(stageResults, { knownRiderIds, knownTeamIds });
  stageResultValidation.warnings.forEach(w => { report.warnings.push(w); log(`⚠ ${w}`); });
  if (!stageResultValidation.valid) {
    stageResultValidation.errors.forEach(e => { report.errors.push(e); log(`✗ ${e}`); });
    return finish();
  }

  // --- Classements (secondaires, tolérants) ---
  const classifications = {};
  for (const type of Object.values(CLASSIFICATION_TYPES)) {
    let rawEntries;
    try {
      rawEntries = await classificationProvider.fetchClassification(stageNumber, type);
    } catch (err) {
      const w = `Classement "${type}" introuvable ou non disponible : ${err.message}`;
      report.warnings.push(w);
      log(`⚠ ${w}`);
      continue;
    }

    if (!rawEntries || rawEntries.length === 0) {
      const w = `Classement "${type}" non disponible (structure attendue non trouvée sur la page).`;
      report.warnings.push(w);
      log(`⚠ ${w}`);
      continue;
    }

    const assembled = assembleClassification(rawEntries, { resolveRiderId, resolveTeamId });
    const classificationValidation = validateClassification(type, assembled);
    classificationValidation.warnings.forEach(w => { report.warnings.push(w); log(`⚠ ${w}`); });
    if (!classificationValidation.valid) {
      classificationValidation.errors.forEach(e => {
        const w = `Classement "${type}" ignoré (invalide) : ${e}`;
        report.warnings.push(w);
        log(`⚠ ${w}`);
      });
      continue;
    }
    classifications[type] = assembled;
  }

  // --- Porteurs de maillots (dérivés, tolérants — jamais bloquants) ---
  let jerseyWearers = [];
  if (stageResultProvider.fetchJerseyWearers) {
    try {
      const rawJerseyWearers = await stageResultProvider.fetchJerseyWearers(stageNumber);
      jerseyWearers = assembleJerseyWearers(rawJerseyWearers, classifications, { resolveRiderId });
    } catch (err) {
      const w = `Porteurs de maillots introuvables : ${err.message}`;
      report.warnings.push(w);
      log(`⚠ ${w}`);
    }
  }

  // --- Écriture ---
  await repository.writeStageResults(competitionId, stageNumber, {
    stageNumber, results: stageResults, lastSynced: startedAt.toISOString()
  });
  report.resultsImported = stageResults.length;

  for (const [type, entries] of Object.entries(classifications)) {
    await repository.writeClassification(competitionId, stageNumber, type, {
      stageNumber, type, standings: entries, lastSynced: startedAt.toISOString()
    });
    report.classificationsImported++;
  }

  if (jerseyWearers.length > 0 && repository.writeJerseyWearers) {
    await repository.writeJerseyWearers(competitionId, stageNumber, {
      stageNumber, jerseyWearers, lastSynced: startedAt.toISOString()
    });
    report.jerseyWearersImported = jerseyWearers.length;
  }

  report.success = true;
  log(`✓ Résultats importés : competitions/${competitionId}/stageResults/${stageNumber} (${report.resultsImported} résultat(s), ${report.classificationsImported} classement(s), ${report.jerseyWearersImported} maillot(s))`);
  return finish();
}

module.exports = { runResultsImport };
