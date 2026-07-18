/**
 * === runCompetitionImport — orchestrateur ===
 * Retourne SYSTÉMATIQUEMENT un rapport structuré (jamais un simple
 * succès/échec) — la console (log) n'est qu'un affichage en direct,
 * facultatif ; le rapport retourné est la source de vérité, exploitable
 * par une CLI, une interface d'admin, GitHub Actions, ou un test.
 *
 * Deux modes explicites, toujours fournis par l'appelant — jamais
 * déduits automatiquement :
 *   - 'create'              : la compétition ne doit PAS déjà exister
 *   - 'import-into-existing': la compétition DOIT déjà exister
 *
 * Seul responsable de combiner les trois providers (chacun indépendant
 * des autres) ET de valider leur sortie avant toute écriture — les
 * providers eux-mêmes ne valident rien, ce sont de simples adaptateurs
 * HTML -> objet.
 */
const { mapStageType } = require('./providers/StageTypeMapper');
const { validateCompetitionInfo, validateStageList, validateStageTime } = require('./competitionImportValidation');

function providerLabel(provider) {
  return provider ? (provider.name || 'unknown') : null;
}

function createReport({ competitionId, competitionProvider, stageListProvider, stageTimeProvider, startedAt }) {
  return {
    success: false,
    action: null,               // 'created' | 'updated' | null si échec avant résolution du mode
    competitionId: competitionId || null,
    stageCount: 0,
    imagesFound: 0,
    startTimesFound: 0,
    warnings: [],
    errors: [],
    durationMs: 0,
    providers: {
      competitionProvider: providerLabel(competitionProvider),
      stageListProvider: providerLabel(stageListProvider),
      stageTimeProvider: providerLabel(stageTimeProvider)
    },
    startedAt: startedAt.toISOString(),
    finishedAt: null
  };
}

async function runCompetitionImport({
  mode,
  competitionId,
  competitionProvider,
  stageListProvider,
  stageTimeProvider = null, // optionnel — en attente d'implémentation réelle (HTML pas encore vérifié)
  repository,
  log = console.log
}) {
  const startedAt = new Date();
  const report = createReport({ competitionId, competitionProvider, stageListProvider, stageTimeProvider, startedAt });

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

  if (mode !== 'create' && mode !== 'import-into-existing') {
    return fail(`mode invalide : "${mode}" (attendu "create" ou "import-into-existing")`);
  }
  if (!competitionId) {
    return fail('competitionId requis');
  }

  const exists = await repository.competitionExists(competitionId);
  if (mode === 'create' && exists) {
    return fail(`La compétition "${competitionId}" existe déjà — utilisez le mode "import-into-existing" pour l'enrichir.`);
  }
  if (mode === 'import-into-existing' && !exists) {
    return fail(`La compétition "${competitionId}" n'existe pas encore — utilisez le mode "create" pour la créer d'abord.`);
  }
  report.action = mode === 'create' ? 'created' : 'updated';

  let competitionInfo;
  try {
    competitionInfo = await competitionProvider.fetchCompetition();
  } catch (err) {
    return fail(`Récupération de la compétition impossible : ${err.message}`);
  }

  const competitionValidation = validateCompetitionInfo(competitionInfo);
  competitionValidation.warnings.forEach(w => { report.warnings.push(w); log(`⚠ ${w}`); });
  if (!competitionValidation.valid) {
    competitionValidation.errors.forEach(e => { report.errors.push(e); log(`✗ ${e}`); });
    return finish();
  }

  let stages;
  try {
    stages = await stageListProvider.fetchStages();
  } catch (err) {
    return fail(`Récupération des étapes impossible : ${err.message}`);
  }

  log(`${competitionInfo.name} ${competitionInfo.year} — ${stages.length} étape(s) récupérée(s)`);

  const stageListValidation = validateStageList(stages, competitionInfo.stageCount);
  stageListValidation.warnings.forEach(w => { report.warnings.push(w); log(`⚠ ${w}`); });
  if (!stageListValidation.valid) {
    stageListValidation.errors.forEach(e => { report.errors.push(e); log(`✗ ${e}`); });
    return finish();
  }

  const stagesWithStartTime = [];
  for (const stage of stages) {
    let timeResult = { officialStartTime: stage.officialStartTime || null };

    if (stageTimeProvider) {
      try {
        timeResult = await stageTimeProvider.fetchStartTime(stage.stageNumber);
      } catch (err) {
        const w = `Heure de départ introuvable pour l'étape ${stage.stageNumber} : ${err.message}`;
        report.warnings.push(w);
        log(`⚠ ${w}`);
        timeResult = { officialStartTime: null };
      }
    }

    const timeValidation = validateStageTime(stage.stageNumber, timeResult);
    timeValidation.warnings.forEach(w => { report.warnings.push(w); log(`⚠ ${w}`); });
    if (!timeValidation.valid) {
      timeValidation.errors.forEach(e => { report.errors.push(e); log(`✗ ${e}`); });
      return finish();
    }

    stagesWithStartTime.push({ ...stage, officialStartTime: timeResult.officialStartTime });
  }

  const meta = {
    name: competitionInfo.name,
    year: competitionInfo.year,
    type: competitionInfo.type || null,
    startDate: competitionInfo.startDate || null,
    endDate: competitionInfo.endDate || null,
    stageCount: competitionInfo.stageCount,
    pcsUrl: competitionInfo.pcsUrl || null,
    pcsSlug: competitionInfo.pcsSlug || null,
    lastSynced: startedAt.toISOString(),
    extra: competitionInfo.extra || {}
  };
  await repository.writeCompetitionMeta(competitionId, meta);

  for (const stage of stagesWithStartTime) {
    const stageType = mapStageType({ pcsStageType: stage.pcsStageType, stageName: stage.name });
    await repository.writeStage(competitionId, stage.stageNumber, {
      stageNumber: stage.stageNumber,
      name: stage.name || null,
      date: stage.date || null,
      officialStartTime: stage.officialStartTime,
      // Séparé de officialStartTime dès la création : l'admin pourra le
      // modifier ensuite sans jamais toucher la donnée brute PCS.
      predictionDeadline: stage.officialStartTime,
      startCity: stage.startCity || null,
      finishCity: stage.finishCity || null,
      distanceKm: stage.distanceKm != null ? stage.distanceKm : null,
      elevationGainM: stage.elevationGainM != null ? stage.elevationGainM : null,
      stageType, // modèle métier Gruppetto — jamais le libellé PCS brut
      pcsStageType: stage.pcsStageType || null, // conservé, information complémentaire seulement
      profileScore: stage.profileScore != null ? stage.profileScore : null, // idem, jamais utilisé pour la logique
      pcsProfileUrl: stage.pcsProfileUrl || null, // lien uniquement — jamais l'image elle-même par défaut
      pcsStageUrl: stage.pcsStageUrl || null,
      extra: stage.extra || {}
    });

    if (stage.pcsProfileUrl) report.imagesFound++;
    if (stage.officialStartTime) report.startTimesFound++;
  }

  report.stageCount = stagesWithStartTime.length;
  report.success = true;
  log(`✓ ${report.action === 'created' ? 'Compétition créée' : 'Compétition enrichie'} : competitions/${competitionId}`);
  return finish();
}

module.exports = { runCompetitionImport };
