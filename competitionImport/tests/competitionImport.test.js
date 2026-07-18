const { runCompetitionImport } = require('../competitionImport');
const { FakeCompetitionRepository } = require('./FakeCompetitionRepository');

function fakeCompetitionProvider(info) {
  return { name: 'fake-competition', async fetchCompetition() { return info; } };
}
function fakeStageListProvider(stages) {
  return { name: 'fake-stage-list', async fetchStages() { return stages; } };
}

const silentLog = () => {};

const sampleCompetitionInfo = {
  name: 'Tour de France', year: 2026, type: 'grand-tour',
  startDate: '2026-07-04', endDate: '2026-07-26', stageCount: 2,
  pcsUrl: 'race/tour-de-france/2026', pcsSlug: 'tour-de-france'
};
const sampleStages = [
  { stageNumber: 1, name: 'Stage 1 (TTT) | Barcelona - Barcelona', date: '2026-07-04', startCity: 'Barcelona', finishCity: 'Barcelona', distanceKm: 19.6, elevationGainM: 167, pcsStageType: null, profileScore: 16, pcsProfileUrl: 'https://x/stage-1-profile.jpg', pcsStageUrl: 'race/tour-de-france/2026/stage-1' },
  { stageNumber: 2, name: 'Stage 2 | Tarragona - Barcelona', date: '2026-07-05', startCity: 'Tarragona', finishCity: 'Barcelona', distanceKm: 168.5, elevationGainM: 2049, pcsStageType: 'Flat', profileScore: 137, pcsProfileUrl: 'https://x/stage-2-profile.jpg', pcsStageUrl: 'race/tour-de-france/2026/stage-2' }
];

describe('runCompetitionImport — validation des modes (garde-fous)', () => {
  test('mode manquant ou invalide -> refusé, aucune écriture', async () => {
    const repo = new FakeCompetitionRepository();
    const result = await runCompetitionImport({
      mode: 'autre', competitionId: 'tdf-2026',
      competitionProvider: fakeCompetitionProvider(sampleCompetitionInfo),
      stageListProvider: fakeStageListProvider(sampleStages),
      repository: repo, log: silentLog
    });
    expect(result.success).toBe(false);
    expect(repo.metaWrites).toHaveLength(0);
  });

  test('competitionId manquant -> refusé', async () => {
    const repo = new FakeCompetitionRepository();
    const result = await runCompetitionImport({
      mode: 'create', competitionId: null,
      competitionProvider: fakeCompetitionProvider(sampleCompetitionInfo),
      stageListProvider: fakeStageListProvider(sampleStages),
      repository: repo, log: silentLog
    });
    expect(result.success).toBe(false);
  });

  test('mode "create" sur une compétition déjà existante -> refusé, aucune écriture', async () => {
    const repo = new FakeCompetitionRepository({ existingCompetitionIds: ['tdf-2026'] });
    const result = await runCompetitionImport({
      mode: 'create', competitionId: 'tdf-2026',
      competitionProvider: fakeCompetitionProvider(sampleCompetitionInfo),
      stageListProvider: fakeStageListProvider(sampleStages),
      repository: repo, log: silentLog
    });
    expect(result.success).toBe(false);
    expect(result.errors.some(e => /existe déjà/.test(e))).toBe(true);
    expect(repo.metaWrites).toHaveLength(0);
  });

  test('mode "import-into-existing" sur une compétition inexistante -> refusé, aucune écriture', async () => {
    const repo = new FakeCompetitionRepository(); // aucune compétition existante
    const result = await runCompetitionImport({
      mode: 'import-into-existing', competitionId: 'tdf-2026',
      competitionProvider: fakeCompetitionProvider(sampleCompetitionInfo),
      stageListProvider: fakeStageListProvider(sampleStages),
      repository: repo, log: silentLog
    });
    expect(result.success).toBe(false);
    expect(result.errors.some(e => /n'existe pas encore/.test(e))).toBe(true);
    expect(repo.metaWrites).toHaveLength(0);
  });
});

describe('runCompetitionImport — succès', () => {
  test('mode "create" sur une compétition inexistante -> écrit meta + étapes', async () => {
    const repo = new FakeCompetitionRepository();
    const result = await runCompetitionImport({
      mode: 'create', competitionId: 'tdf-2026',
      competitionProvider: fakeCompetitionProvider(sampleCompetitionInfo),
      stageListProvider: fakeStageListProvider(sampleStages),
      repository: repo, log: silentLog
    });
    expect(result.success).toBe(true);
    expect(repo.metaWrites).toHaveLength(1);
    expect(repo.metaWrites[0].meta.name).toBe('Tour de France');
    expect(repo.stageWrites).toHaveLength(2);
  });

  test('mode "import-into-existing" sur une compétition déjà existante -> écrit sans erreur', async () => {
    const repo = new FakeCompetitionRepository({ existingCompetitionIds: ['tdf-2026'] });
    const result = await runCompetitionImport({
      mode: 'import-into-existing', competitionId: 'tdf-2026',
      competitionProvider: fakeCompetitionProvider(sampleCompetitionInfo),
      stageListProvider: fakeStageListProvider(sampleStages),
      repository: repo, log: silentLog
    });
    expect(result.success).toBe(true);
  });

  test('predictionDeadline = officialStartTime à l\'import', async () => {
    const repo = new FakeCompetitionRepository();
    const stagesWithTime = [{ ...sampleStages[0], officialStartTime: '2026-07-04T13:20:00' }];
    await runCompetitionImport({
      mode: 'create', competitionId: 'tdf-2026',
      competitionProvider: fakeCompetitionProvider({ ...sampleCompetitionInfo, stageCount: 1 }),
      stageListProvider: fakeStageListProvider(stagesWithTime),
      repository: repo, log: silentLog
    });
    const written = repo.stageWrites[0].stage;
    expect(written.officialStartTime).toBe('2026-07-04T13:20:00');
    expect(written.predictionDeadline).toBe('2026-07-04T13:20:00');
  });

  test('stageType calculé via StageTypeMapper, jamais le libellé PCS brut utilisé tel quel', async () => {
    const repo = new FakeCompetitionRepository();
    await runCompetitionImport({
      mode: 'create', competitionId: 'tdf-2026',
      competitionProvider: fakeCompetitionProvider(sampleCompetitionInfo),
      stageListProvider: fakeStageListProvider(sampleStages),
      repository: repo, log: silentLog
    });
    const stage1 = repo.stageWrites.find(s => s.stageNumber === 1).stage; // TTT via le nom
    const stage2 = repo.stageWrites.find(s => s.stageNumber === 2).stage; // Flat via pcsStageType
    expect(stage1.stageType).toBe('ttt');
    expect(stage2.stageType).toBe('flat');
    // pcsStageType et profileScore conservés, mais distincts de stageType
    expect(stage2.pcsStageType).toBe('Flat');
    expect(stage2.profileScore).toBe(137);
  });

  test('nombre d\'étapes incohérent entre la page course et la liste -> refusé', async () => {
    const repo = new FakeCompetitionRepository();
    const result = await runCompetitionImport({
      mode: 'create', competitionId: 'tdf-2026',
      competitionProvider: fakeCompetitionProvider({ ...sampleCompetitionInfo, stageCount: 21 }), // annonce 21
      stageListProvider: fakeStageListProvider(sampleStages), // mais seulement 2 récupérées
      repository: repo, log: silentLog
    });
    expect(result.success).toBe(false);
    expect(repo.metaWrites).toHaveLength(0);
  });
});

describe('runCompetitionImport — stageTimeProvider', () => {
  test('heure de départ récupérée via stageTimeProvider -> propagée correctement', async () => {
    const repo = new FakeCompetitionRepository();
    const stageTimeProvider = { async fetchStartTime(n) { return { officialStartTime: `2026-07-0${n}T13:20:00` }; } };
    await runCompetitionImport({
      mode: 'create', competitionId: 'tdf-2026',
      competitionProvider: fakeCompetitionProvider(sampleCompetitionInfo),
      stageListProvider: fakeStageListProvider(sampleStages),
      stageTimeProvider, repository: repo, log: silentLog
    });
    const stage1 = repo.stageWrites.find(s => s.stageNumber === 1).stage;
    expect(stage1.officialStartTime).toBe('2026-07-01T13:20:00');
    expect(stage1.predictionDeadline).toBe('2026-07-01T13:20:00');
  });

  test('heure absente via stageTimeProvider -> avertissement seulement, import réussit quand même', async () => {
    const repo = new FakeCompetitionRepository();
    const stageTimeProvider = { async fetchStartTime() { return { officialStartTime: null }; } };
    const result = await runCompetitionImport({
      mode: 'create', competitionId: 'tdf-2026',
      competitionProvider: fakeCompetitionProvider(sampleCompetitionInfo),
      stageListProvider: fakeStageListProvider(sampleStages),
      stageTimeProvider, repository: repo, log: silentLog
    });
    expect(result.success).toBe(true);
    expect(repo.stageWrites[0].stage.officialStartTime).toBeNull();
  });

  test('heure présente mais mal formée -> import refusé, aucune écriture', async () => {
    const repo = new FakeCompetitionRepository();
    const stageTimeProvider = { async fetchStartTime() { return { officialStartTime: 'pas une heure' }; } };
    const result = await runCompetitionImport({
      mode: 'create', competitionId: 'tdf-2026',
      competitionProvider: fakeCompetitionProvider(sampleCompetitionInfo),
      stageListProvider: fakeStageListProvider(sampleStages),
      stageTimeProvider, repository: repo, log: silentLog
    });
    expect(result.success).toBe(false);
    expect(repo.metaWrites).toHaveLength(0);
    expect(repo.stageWrites).toHaveLength(0);
  });
});

describe('runCompetitionImport — rapport d\'exécution structuré', () => {
  test('rapport complet sur un import réussi : tous les champs demandés sont présents et corrects', async () => {
    const repo = new FakeCompetitionRepository();
    const stagesWithData = [
      { ...sampleStages[0], pcsProfileUrl: 'https://x/1.jpg', officialStartTime: '2026-07-04T13:20:00' },
      { ...sampleStages[1], pcsProfileUrl: null, officialStartTime: null } // pas d'image ni d'heure pour celle-ci
    ];
    const result = await runCompetitionImport({
      mode: 'create', competitionId: 'tdf-2026',
      competitionProvider: fakeCompetitionProvider(sampleCompetitionInfo),
      stageListProvider: fakeStageListProvider(stagesWithData),
      repository: repo, log: silentLog
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe('created');
    expect(result.competitionId).toBe('tdf-2026');
    expect(result.stageCount).toBe(2);
    expect(result.imagesFound).toBe(1);       // une seule des deux avait pcsProfileUrl
    expect(result.startTimesFound).toBe(1);   // une seule avait officialStartTime
    expect(result.warnings.length).toBeGreaterThan(0); // avertissements attendus (image/heure absentes sur la 2e étape)
    expect(result.errors).toHaveLength(0);
    expect(typeof result.durationMs).toBe('number');
    expect(result.providers.competitionProvider).toBe('fake-competition');
    expect(result.providers.stageListProvider).toBe('fake-stage-list');
    expect(new Date(result.startedAt).toString()).not.toBe('Invalid Date');
    expect(new Date(result.finishedAt).toString()).not.toBe('Invalid Date');
  });

  test('action="updated" en mode import-into-existing', async () => {
    const repo = new FakeCompetitionRepository({ existingCompetitionIds: ['tdf-2026'] });
    const result = await runCompetitionImport({
      mode: 'import-into-existing', competitionId: 'tdf-2026',
      competitionProvider: fakeCompetitionProvider(sampleCompetitionInfo),
      stageListProvider: fakeStageListProvider(sampleStages),
      repository: repo, log: silentLog
    });
    expect(result.action).toBe('updated');
  });

  test('rapport retourné même en cas d\'échec précoce (mode invalide) — jamais un simple booléen', async () => {
    const repo = new FakeCompetitionRepository();
    const result = await runCompetitionImport({
      mode: 'invalide', competitionId: 'tdf-2026',
      competitionProvider: fakeCompetitionProvider(sampleCompetitionInfo),
      stageListProvider: fakeStageListProvider(sampleStages),
      repository: repo, log: silentLog
    });
    expect(result.success).toBe(false);
    expect(result.action).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(typeof result.durationMs).toBe('number');
    expect(new Date(result.startedAt).toString()).not.toBe('Invalid Date');
    expect(new Date(result.finishedAt).toString()).not.toBe('Invalid Date');
  });

  test('providers non fournis (ex. stageTimeProvider absent) -> null dans le rapport, pas une exception', async () => {
    const repo = new FakeCompetitionRepository();
    const result = await runCompetitionImport({
      mode: 'create', competitionId: 'tdf-2026',
      competitionProvider: fakeCompetitionProvider(sampleCompetitionInfo),
      stageListProvider: fakeStageListProvider(sampleStages),
      repository: repo, log: silentLog
      // pas de stageTimeProvider fourni
    });
    expect(result.providers.stageTimeProvider).toBeNull();
  });
});

describe('runCompetitionImport — erreurs réseau', () => {
  test('échec de récupération de la compétition -> aucune écriture', async () => {
    const repo = new FakeCompetitionRepository();
    const failingProvider = { async fetchCompetition() { throw new Error('Timeout réseau'); } };
    const result = await runCompetitionImport({
      mode: 'create', competitionId: 'tdf-2026',
      competitionProvider: failingProvider,
      stageListProvider: fakeStageListProvider(sampleStages),
      repository: repo, log: silentLog
    });
    expect(result.success).toBe(false);
    expect(repo.metaWrites).toHaveLength(0);
  });
});
