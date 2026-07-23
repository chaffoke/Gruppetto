/**
 * === runCompetitionImport — orchestrateur résilient ===
 *
 * Chaque section s'exécute indépendamment, sauf lorsqu'une vraie
 * dépendance technique l'exige :
 *   - Teams (maillots d'équipe)   : totalement indépendant
 *   - Favorites (Top competitors) : totalement indépendant
 *   - CompetitionInfo             : indépendant
 *   - Stages                      : dépend de CompetitionInfo (stageCount,
 *                                    pour valider le nombre d'étapes reçu) —
 *                                    seule dépendance technique réelle du
 *                                    pipeline.
 *
 * Un provider manquant ou en échec n'empêche jamais les autres sections
 * de s'exécuter et de persister leurs données. Le rapport détaille
 * précisément quelle section a réussi, échoué, ou n'a pas été tentée —
 * jamais un simple succès/échec global masquant ce qui s'est réellement
 * passé.
 */
const { mapStageType } = require('./providers/StageTypeMapper');
const { validateCompetitionInfo, validateStageList, validateStageTime } = require('./competitionImportValidation');
const { assembleFavorites } = require('./assemblers/FavoritesAssembler');
const { assembleTeams } = require('./assemblers/TeamAssembler');
const { downloadJerseyDataUri } = require('./jerseyImageDownloader');

function providerLabel(provider) {
  return provider ? (provider.name || 'unknown') : null;
}

function createSection() {
  return { attempted: false, success: false, count: 0, error: null };
}

function createReport({ competitionId, providers, startedAt }) {
  return {
    completed: false, // le run est-il allé jusqu'au bout, sans erreur bloquante précoce (mode/competitionId/existence) ?
    action: null,      // 'created' | 'updated' | null
    competitionId: competitionId || null,
    sections: {
      teams: createSection(),
      favorites: createSection(),
      competitionInfo: createSection(),
      stages: createSection()
    },
    warnings: [],
    errors: [],
    durationMs: 0,
    providersUsed: {
      competitionProvider: providerLabel(providers.competitionProvider),
      stageListProvider: providerLabel(providers.stageListProvider),
      stageTimeProvider: providerLabel(providers.stageTimeProvider),
      favoritesProvider: providerLabel(providers.favoritesProvider),
      teamJerseyProvider: providerLabel(providers.teamJerseyProvider)
    },
    startedAt: startedAt.toISOString(),
    finishedAt: null
  };
}

/**
 * Construit les lignes de synthèse demandées, du type :
 *   ✓ Teams importés
 *   ✓ Favoris importés
 *   ✗ CompetitionInfo non disponible
 *   ✗ StageList non disponible
 *   → Étapes non importées
 */
function formatReportSummary(report) {
  const lines = [];
  const s = report.sections;

  if (s.teams.attempted) lines.push(s.teams.success ? `✓ Teams importés (${s.teams.count})` : `✗ Teams non importés : ${s.teams.error}`);
  if (s.favorites.attempted) lines.push(s.favorites.success ? `✓ Favoris importés (${s.favorites.count})` : `✗ Favoris non importés : ${s.favorites.error}`);
  if (s.competitionInfo.attempted) lines.push(s.competitionInfo.success ? `✓ CompetitionInfo récupérée` : `✗ CompetitionInfo non disponible : ${s.competitionInfo.error}`);

  if (s.stages.attempted) {
    lines.push(s.stages.success ? `✓ Étapes importées (${s.stages.count})` : `✗ StageList non disponible : ${s.stages.error}`);
  }
  if (!s.stages.success) lines.push('→ Étapes non importées');

  return lines.join('\n');
}

async function runCompetitionImport({
  mode,
  competitionId,
  competitionProvider,
  stageListProvider,
  stageTimeProvider = null,
  favoritesProvider = null,
  teamJerseyProvider = null,
  jerseyImageFetchImpl = null,
  resolveRiderId,
  resolveTeamId,
  repository,
  log = console.log
}) {
  const startedAt = new Date();
  const report = createReport({
    competitionId,
    providers: { competitionProvider, stageListProvider, stageTimeProvider, favoritesProvider, teamJerseyProvider },
    startedAt
  });

  function finish() {
    report.finishedAt = new Date().toISOString();
    report.durationMs = Date.now() - startedAt.getTime();
    return report;
  }
  function failEarly(message) {
    report.errors.push(message);
    log(`✗ ${message}`);
    return finish();
  }

  // --- Garde-fous précoces : ceux-ci restent bloquants, aucune section
  // n'a de sens sans un mode et un competitionId valides. ---
  if (mode !== 'create' && mode !== 'import-into-existing') {
    return failEarly(`mode invalide : "${mode}" (attendu "create" ou "import-into-existing")`);
  }
  if (!competitionId) return failEarly('competitionId requis');

  const exists = await repository.competitionExists(competitionId);
  if (mode === 'create' && exists) {
    return failEarly(`La compétition "${competitionId}" existe déjà — utilisez le mode "import-into-existing" pour l'enrichir.`);
  }
  if (mode === 'import-into-existing' && !exists) {
    return failEarly(`La compétition "${competitionId}" n'existe pas encore — utilisez le mode "create" pour la créer d'abord.`);
  }
  report.action = mode === 'create' ? 'created' : 'updated';

  // --- Section Teams (indépendante) ---
  if (teamJerseyProvider) {
    report.sections.teams.attempted = true;
    try {
      const rawTeams = await teamJerseyProvider.fetchTeamJerseys();
      const teams = assembleTeams(rawTeams, { resolveTeamId });
      let imagesDownloaded = 0;
      for (const team of teams) {
        // Image téléchargée côté serveur (contourne l'anti-hotlink PCS côté
        // navigateur) et stockée en data URI — jamais bloquant : un échec
        // sur UNE image garde simplement `jersey.url` en repli, n'empêche
        // jamais l'import du reste des équipes.
        if (team.jersey && team.jersey.url) {
          try {
            team.jersey.dataUri = await downloadJerseyDataUri(team.jersey.url, jerseyImageFetchImpl ? { fetchImpl: jerseyImageFetchImpl } : {});
            imagesDownloaded++;
          } catch (err) {
            const w = `Image du maillot non téléchargée pour ${team.name} : ${err.message}`;
            report.warnings.push(w);
            log(`⚠ ${w}`);
          }
        }
        await repository.writeTeam(competitionId, team.id, team);
      }
      report.sections.teams.success = true;
      report.sections.teams.count = teams.length;
      log(`✓ Teams importés (${teams.length}), ${imagesDownloaded} image(s) de maillot téléchargée(s)`);
    } catch (err) {
      report.sections.teams.error = err.message;
      report.warnings.push(`Teams non importés : ${err.message}`);
      log(`✗ Teams non importés : ${err.message}`);
    }
  }

  // --- Section Favorites (indépendante — document meta/favorites séparé) ---
  if (favoritesProvider) {
    report.sections.favorites.attempted = true;
    try {
      const rawFavorites = await favoritesProvider.fetchFavorites();
      const favorites = assembleFavorites(rawFavorites, { resolveRiderId });
      await repository.writeFavorites(competitionId, { favorites, lastSynced: startedAt.toISOString() });
      report.sections.favorites.success = true;
      report.sections.favorites.count = favorites.length;
      log(`✓ Favoris importés (${favorites.length})`);
    } catch (err) {
      report.sections.favorites.error = err.message;
      report.warnings.push(`Favoris non importés : ${err.message}`);
      log(`✗ Favoris non importés : ${err.message}`);
    }
  }

  // --- Section CompetitionInfo (indépendante des deux précédentes,
  // mais condition nécessaire pour Stages ci-dessous) ---
  report.sections.competitionInfo.attempted = true;
  let competitionInfo = null;
  try {
    competitionInfo = await competitionProvider.fetchCompetition();
    const validation = validateCompetitionInfo(competitionInfo);
    validation.warnings.forEach(w => { report.warnings.push(w); log(`⚠ ${w}`); });
    if (!validation.valid) throw new Error(validation.errors.join(' | '));

    report.sections.competitionInfo.success = true;
    log(`✓ CompetitionInfo récupérée : ${competitionInfo.name} ${competitionInfo.year}`);

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
  } catch (err) {
    competitionInfo = null;
    report.sections.competitionInfo.error = err.message;
    report.errors.push(`CompetitionInfo non disponible : ${err.message}`);
    log(`✗ CompetitionInfo non disponible : ${err.message}`);
  }

  // --- Section Stages — VRAIE dépendance technique : a besoin de
  // competitionInfo.stageCount pour valider le nombre d'étapes reçu. ---
  if (!competitionInfo) {
    report.errors.push('Étapes non importées : CompetitionInfo indisponible (dépendance réelle).');
    log('→ Étapes non importées (CompetitionInfo manquant)');
  } else {
    report.sections.stages.attempted = true;
    try {
      const stages = await stageListProvider.fetchStages();
      const stageListValidation = validateStageList(stages, competitionInfo.stageCount);
      stageListValidation.warnings.forEach(w => { report.warnings.push(w); log(`⚠ ${w}`); });
      if (!stageListValidation.valid) throw new Error(stageListValidation.errors.join(' | '));

      const stagesWithStartTime = [];
      for (const stage of stages) {
        let timeResult = { officialStartTime: stage.officialStartTime || null };
        if (stageTimeProvider) {
          try {
            timeResult = await stageTimeProvider.fetchStartTime(stage.stageNumber, stage.date);
          } catch (err) {
            const w = `Heure de départ introuvable pour l'étape ${stage.stageNumber} : ${err.message}`;
            report.warnings.push(w);
            log(`⚠ ${w}`);
            timeResult = { officialStartTime: null };
          }
          // Délai poli entre deux requêtes successives — sans lui, PCS a
          // renvoyé un 429 (trop de requêtes) à partir de la 11e étape
          // sur 21, confirmé en conditions réelles. delayMs exposé par le
          // provider (déjà prévu, jamais câblé jusqu'ici).
          const delayMs = stageTimeProvider.delayMs || 0;
          if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        const timeValidation = validateStageTime(stage.stageNumber, timeResult);
        timeValidation.warnings.forEach(w => { report.warnings.push(w); log(`⚠ ${w}`); });
        if (!timeValidation.valid) throw new Error(timeValidation.errors.join(' | '));
        stagesWithStartTime.push({ ...stage, officialStartTime: timeResult.officialStartTime });
      }

      for (const stage of stagesWithStartTime) {
        const stageType = mapStageType({ pcsStageType: stage.pcsStageType, stageName: stage.name });

        // Même mécanisme que les maillots d'équipe (downloadJerseyDataUri est
        // générique malgré son nom — télécharge n'importe quelle image en data
        // URI) : l'image de profil d'étape est elle aussi hébergée directement
        // chez PCS et soumise au même anti-hotlink. Jamais bloquant : un échec
        // garde simplement pcsProfileUrl en repli.
        let pcsProfileDataUri = null;
        if (stage.pcsProfileUrl) {
          try {
            pcsProfileDataUri = await downloadJerseyDataUri(stage.pcsProfileUrl, {});
          } catch (err) {
            const w = `Image de profil non téléchargée pour l'étape ${stage.stageNumber} : ${err.message}`;
            report.warnings.push(w);
            log(`⚠ ${w}`);
          }
        }

        await repository.writeStage(competitionId, stage.stageNumber, {
          stageNumber: stage.stageNumber,
          name: stage.name || null,
          date: stage.date || null,
          officialStartTime: stage.officialStartTime,
          predictionDeadline: stage.officialStartTime,
          startCity: stage.startCity || null,
          finishCity: stage.finishCity || null,
          distanceKm: stage.distanceKm != null ? stage.distanceKm : null,
          elevationGainM: stage.elevationGainM != null ? stage.elevationGainM : null,
          stageType,
          pcsStageType: stage.pcsStageType || null,
          profileScore: stage.profileScore != null ? stage.profileScore : null,
          pcsProfileUrl: stage.pcsProfileUrl || null,
          pcsProfileDataUri,
          pcsStageUrl: stage.pcsStageUrl || null,
          extra: stage.extra || {}
        });
      }

      report.sections.stages.success = true;
      report.sections.stages.count = stagesWithStartTime.length;
      log(`✓ Étapes importées (${stagesWithStartTime.length})`);
    } catch (err) {
      report.sections.stages.error = err.message;
      report.errors.push(`StageList non disponible : ${err.message}`);
      log(`✗ StageList non disponible : ${err.message}`);
      log('→ Étapes non importées');
    }
  }

  report.completed = true;
  return finish();
}

module.exports = { runCompetitionImport, formatReportSummary };
