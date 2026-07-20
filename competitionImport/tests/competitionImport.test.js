const { runCompetitionImport, formatReportSummary } = require('../competitionImport');
const { FakeCompetitionRepository } = require('./FakeCompetitionRepository');

function fakeCompetitionProvider(infoOrError) {
  return {
    name: 'fake-competition',
    async fetchCompetition() {
      if (infoOrError instanceof Error) throw infoOrError;
      return infoOrError;
    }
  };
}
function fakeStageListProvider(stagesOrError) {
  return {
    name: 'fake-stage-list',
    async fetchStages() {
      if (stagesOrError instanceof Error) throw stagesOrError;
      return stagesOrError;
    }
  };
}
function fakeFavoritesProvider(favoritesOrError) {
  return {
    name: 'fake-favorites',
    async fetchFavorites() {
      if (favoritesOrError instanceof Error) throw favoritesOrError;
      return favoritesOrError;
    }
  };
}
function fakeTeamJerseyProvider(teamsOrError) {
  return {
    name: 'fake-team-jersey',
    async fetchTeamJerseys() {
      if (teamsOrError instanceof Error) throw teamsOrError;
      return teamsOrError;
    }
  };
}

const silentLog = () => {};
const identity = s => s;

const sampleCompetitionInfo = {
  name: 'Tour de France', year: 2026, type: 'grand-tour',
  startDate: '2026-07-04', endDate: '2026-07-26', stageCount: 2,
  pcsUrl: 'race/tour-de-france/2026', pcsSlug: 'tour-de-france'
};
const sampleStages = [
  { stageNumber: 1, name: 'Stage 1 (TTT) | Barcelona - Barcelona', date: '2026-07-04', startCity: 'Barcelona', finishCity: 'Barcelona', distanceKm: 19.6, elevationGainM: 167, pcsProfileUrl: 'https://x/1.jpg' },
  { stageNumber: 2, name: 'Stage 2 | Tarragona - Barcelona', date: '2026-07-05', startCity: 'Tarragona', finishCity: 'Barcelona', distanceKm: 168.5, elevationGainM: 2049, pcsStageType: 'Flat', pcsProfileUrl: 'https://x/2.jpg' }
];
const sampleRawFavorites = [{ rank: 1, pcsRiderSlug: 'tadej-pogacar', name: 'POGAČAR Tadej', nationalityCode: 'SI' }];
const sampleRawTeams = [{ pcsTeamSlug: 'uae-team-emirates-xrg-2026', name: 'UAE Team Emirates - XRG (WT)', pcsJerseyUrl: 'https://x/uae.png', pcsJerseySlug: 'uae' }];

describe('runCompetitionImport — garde-fous précoces (toujours bloquants)', () => {
  test('mode invalide -> completed=false, aucune section tentée', async () => {
    const repo = new FakeCompetitionRepository();
    const result = await runCompetitionImport({
      mode: 'invalide', competitionId: 'tdf-2026',
      competitionProvider: fakeCompetitionProvider(sampleCompetitionInfo),
      stageListProvider: fakeStageListProvider(sampleStages),
      repository: repo, log: silentLog
    });
    expect(result.completed).toBe(false);
    expect(result.sections.teams.attempted).toBe(false);
  });

  test('mode "create" sur compétition existante -> refusé avant toute section', async () => {
    const repo = new FakeCompetitionRepository({ existingCompetitionIds: ['tdf-2026'] });
    const result = await runCompetitionImport({
      mode: 'create', competitionId: 'tdf-2026',
      competitionProvider: fakeCompetitionProvider(sampleCompetitionInfo),
      stageListProvider: fakeStageListProvider(sampleStages),
      teamJerseyProvider: fakeTeamJerseyProvider(sampleRawTeams),
      repository: repo, log: silentLog
    });
    expect(result.completed).toBe(false);
    expect(repo.teamWrites).toHaveLength(0);
  });
});

describe('runCompetitionImport — indépendance réelle des sections', () => {
  test('Teams réussit même si CompetitionInfo et StageList échouent complètement', async () => {
    const repo = new FakeCompetitionRepository();
    const result = await runCompetitionImport({
      mode: 'create', competitionId: 'tdf-2026',
      competitionProvider: fakeCompetitionProvider(new Error('page introuvable')),
      stageListProvider: fakeStageListProvider(new Error('page introuvable')),
      teamJerseyProvider: fakeTeamJerseyProvider(sampleRawTeams),
      resolveTeamId: identity,
      repository: repo, log: silentLog
    });
    expect(result.completed).toBe(true);
    expect(result.sections.teams.success).toBe(true);
    expect(result.sections.teams.count).toBe(1);
    expect(repo.teamWrites).toHaveLength(1);
    expect(result.sections.competitionInfo.success).toBe(false);
  });

  test('Favoris réussit même si CompetitionInfo et StageList échouent complètement', async () => {
    const repo = new FakeCompetitionRepository();
    const result = await runCompetitionImport({
      mode: 'create', competitionId: 'tdf-2026',
      competitionProvider: fakeCompetitionProvider(new Error('page introuvable')),
      stageListProvider: fakeStageListProvider(new Error('page introuvable')),
      favoritesProvider: fakeFavoritesProvider(sampleRawFavorites),
      resolveRiderId: identity,
      repository: repo, log: silentLog
    });
    expect(result.completed).toBe(true);
    expect(result.sections.favorites.success).toBe(true);
    expect(repo.favoritesWrites).toHaveLength(1);
    expect(repo.favoritesWrites[0].favoritesDoc.favorites[0].riderId).toBe('tadej-pogacar');
  });

  test('CompetitionInfo réussit même si Teams et Favorites échouent', async () => {
    const repo = new FakeCompetitionRepository();
    const result = await runCompetitionImport({
      mode: 'create', competitionId: 'tdf-2026',
      competitionProvider: fakeCompetitionProvider(sampleCompetitionInfo),
      stageListProvider: fakeStageListProvider(sampleStages),
      teamJerseyProvider: fakeTeamJerseyProvider(new Error('non implémenté')),
      favoritesProvider: fakeFavoritesProvider(new Error('non implémenté')),
      repository: repo, log: silentLog
    });
    expect(result.sections.competitionInfo.success).toBe(true);
    expect(repo.metaWrites).toHaveLength(1);
    expect(result.sections.teams.success).toBe(false);
    expect(result.sections.favorites.success).toBe(false);
  });
});

describe('runCompetitionImport — Stages : vraie dépendance technique à CompetitionInfo', () => {
  test('CompetitionInfo échoue -> Stages jamais TENTÉES (pas juste échouées)', async () => {
    const repo = new FakeCompetitionRepository();
    const result = await runCompetitionImport({
      mode: 'create', competitionId: 'tdf-2026',
      competitionProvider: fakeCompetitionProvider(new Error('page introuvable')),
      stageListProvider: fakeStageListProvider(sampleStages), // fonctionnerait, mais ne doit jamais être appelé
      repository: repo, log: silentLog
    });
    expect(result.sections.stages.attempted).toBe(false);
    expect(repo.stageWrites).toHaveLength(0);
  });

  test('CompetitionInfo réussit mais StageList échoue -> Stages attemptée puis en échec', async () => {
    const repo = new FakeCompetitionRepository();
    const result = await runCompetitionImport({
      mode: 'create', competitionId: 'tdf-2026',
      competitionProvider: fakeCompetitionProvider(sampleCompetitionInfo),
      stageListProvider: fakeStageListProvider(new Error('route/stage-profiles non implémenté')),
      repository: repo, log: silentLog
    });
    expect(result.sections.competitionInfo.success).toBe(true);
    expect(result.sections.stages.attempted).toBe(true);
    expect(result.sections.stages.success).toBe(false);
    expect(repo.stageWrites).toHaveLength(0);
  });

  test('CompetitionInfo et StageList réussissent -> Stages importées normalement', async () => {
    const repo = new FakeCompetitionRepository();
    const result = await runCompetitionImport({
      mode: 'create', competitionId: 'tdf-2026',
      competitionProvider: fakeCompetitionProvider(sampleCompetitionInfo),
      stageListProvider: fakeStageListProvider(sampleStages),
      repository: repo, log: silentLog
    });
    expect(result.sections.stages.success).toBe(true);
    expect(result.sections.stages.count).toBe(2);
    expect(repo.stageWrites).toHaveLength(2);
  });
});

describe('runCompetitionImport — scénario complet (celui décrit explicitement)', () => {
  test('Teams ✓, Favoris ✓, CompetitionInfo ✗, StageList jamais tentée -> import "réussi" globalement, chaque section correctement rapportée', async () => {
    const repo = new FakeCompetitionRepository();
    const result = await runCompetitionImport({
      mode: 'create', competitionId: 'tdf-2026',
      competitionProvider: fakeCompetitionProvider(new Error('PCSCompetitionProvider non implémentée')),
      stageListProvider: fakeStageListProvider(new Error('PCSStageListProvider non implémentée')),
      teamJerseyProvider: fakeTeamJerseyProvider(sampleRawTeams),
      favoritesProvider: fakeFavoritesProvider(sampleRawFavorites),
      resolveRiderId: identity, resolveTeamId: identity,
      repository: repo, log: silentLog
    });

    expect(result.completed).toBe(true); // le run va au bout, malgré les échecs partiels
    expect(result.sections.teams.success).toBe(true);
    expect(result.sections.favorites.success).toBe(true);
    expect(result.sections.competitionInfo.success).toBe(false);
    expect(result.sections.stages.attempted).toBe(false);

    const summary = formatReportSummary(result);
    expect(summary).toMatch(/✓ Teams importés/);
    expect(summary).toMatch(/✓ Favoris importés/);
    expect(summary).toMatch(/✗ CompetitionInfo non disponible/);
    expect(summary).toMatch(/→ Étapes non importées/);
  });
});

describe('formatReportSummary', () => {
  test('import totalement réussi -> pas de ligne "Étapes non importées"', async () => {
    const repo = new FakeCompetitionRepository();
    const result = await runCompetitionImport({
      mode: 'create', competitionId: 'tdf-2026',
      competitionProvider: fakeCompetitionProvider(sampleCompetitionInfo),
      stageListProvider: fakeStageListProvider(sampleStages),
      teamJerseyProvider: fakeTeamJerseyProvider(sampleRawTeams),
      favoritesProvider: fakeFavoritesProvider(sampleRawFavorites),
      resolveRiderId: identity, resolveTeamId: identity,
      repository: repo, log: silentLog
    });
    const summary = formatReportSummary(result);
    expect(summary).not.toMatch(/Étapes non importées/);
    expect(summary).toMatch(/✓ Étapes importées/);
  });
});
