/**
 * === runResultsImport — orchestrateur ===
 * Retourne SYSTÉMATIQUEMENT un rapport structuré — mêmes principes que
 * competitionImport. Le résultat d'étape est la donnée primaire (son
 * échec bloque tout) ; les classements sont secondaires ("lorsque PCS
 * les fournit") — l'absence ou l'invalidité d'UN classement produit un
 * avertissement, jamais un échec de l'import entier.
 */
const { CLASSIFICATION_TYPES } = require('./models');
const { stageNotFoundError } = require('./resultsErrors');
const { validateStageResults, validateClassification } = require('./resultsValidation');

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
  knownRiderIds,  // Set optionnel — idéalement dérivé de referenceData déjà importé
  knownTeamIds,   // Set optionnel
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

  let stageResultEntries;
  try {
    stageResultEntries = await stageResultProvider.fetchStageResult(stageNumber);
  } catch (err) {
    return fail(`Récupération du résultat d'étape impossible : ${err.message}`);
  }

  const stageResultValidation = validateStageResults(stageResultEntries, { knownRiderIds, knownTeamIds });
  stageResultValidation.warnings.forEach(w => { report.warnings.push(w); log(`⚠ ${w}`); });
  if (!stageResultValidation.valid) {
    stageResultValidation.errors.forEach(e => { report.errors.push(e); log(`✗ ${e}`); });
    return finish();
  }

  const classifications = {};
  for (const type of Object.values(CLASSIFICATION_TYPES)) {
    let entries;
    try {
      entries = await classificationProvider.fetchClassification(stageNumber, type);
    } catch (err) {
      const w = `Classement "${type}" introuvable ou non disponible : ${err.message}`;
      report.warnings.push(w);
      log(`⚠ ${w}`);
      continue;
    }

    const classificationValidation = validateClassification(type, entries);
    classificationValidation.warnings.forEach(w => { report.warnings.push(w); log(`⚠ ${w}`); });
    if (!classificationValidation.valid) {
      // Un classement invalide est signalé et ignoré — pas bloquant pour
      // l'ensemble de l'import (le résultat d'étape reste la donnée
      // primaire).
      classificationValidation.errors.forEach(e => {
        const w = `Classement "${type}" ignoré (invalide) : ${e}`;
        report.warnings.push(w);
        log(`⚠ ${w}`);
      });
      continue;
    }

    classifications[type] = entries;
  }

  await repository.writeStageResults(competitionId, stageNumber, {
    stageNumber,
    results: stageResultEntries,
    lastSynced: startedAt.toISOString()
  });
  report.resultsImported = stageResultEntries.length;

  for (const [type, entries] of Object.entries(classifications)) {
    await repository.writeClassification(competitionId, stageNumber, type, {
      stageNumber, type, standings: entries, lastSynced: startedAt.toISOString()
    });
    report.classificationsImported++;
  }

  report.success = true;
  log(`✓ Résultats importés : competitions/${competitionId}/stageResults/${stageNumber} (${report.resultsImported} résultat(s), ${report.classificationsImported} classement(s))`);
  return finish();
}

module.exports = { runResultsImport };
