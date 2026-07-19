const { runResultsImport } = require('../resultsImport');
const { FakeResultsRepository } = require('./FakeResultsRepository');
const { CLASSIFICATION_TYPES } = require('../models');

function fakeStageResultProvider(entries) {
  return { name: 'fake-stage-result', async fetchStageResult() { return entries; } };
}
function fakeClassificationProvider(byType) {
  return {
    name: 'fake-classification',
    async fetchClassification(stageNumber, type) {
      if (!byType[type]) throw new Error(`classement "${type}" non disponible`);
      return byType[type];
    }
  };
}

const silentLog = () => {};

const validResults = [
  { rank: 1, riderId: 'mauro-schmid', teamId: 'team-jayco-alula-2026', bib: 118, time: '4:06:58', gap: null, status: 'finished', bonusSeconds: 10, points: 100 },
  { rank: 2, riderId: 'harold-tejada', teamId: 'xds-astana-team-2026', bib: 65, time: '4:06:58', gap: '0:00', status: 'finished', bonusSeconds: 6, points: 70 },
  { rank: null, riderId: 'fernando-gaviria', teamId: 'caja-rural-seguros-rga-2026', bib: 221, time: null, gap: null, status: 'dns', bonusSeconds: null, points: null }
];

const allClassifications = {
  general: [{ rank: 1, riderId: 'tadej-pogacar' }, { rank: 2, riderId: 'jonas-vingegaard' }],
  points: [{ rank: 1, riderId: 'jasper-philipsen' }],
  mountain: [{ rank: 1, riderId: 'paul-seixas' }],
  youth: [{ rank: 1, riderId: 'paul-seixas' }],
  teams: [{ rank: 1, teamId: 'uae-team-emirates-xrg-2026', riderId: null }]
};

describe('runResultsImport — garde-fous', () => {
  test('competitionId manquant -> refusé', async () => {
    const repo = new FakeResultsRepository({ existingStages: [13] });
    const result = await runResultsImport({
      stageNumber: 13, competitionId: null,
      stageResultProvider: fakeStageResultProvider(validResults),
      classificationProvider: fakeClassificationProvider(allClassifications),
      repository: repo, log: silentLog
    });
    expect(result.success).toBe(false);
  });

  test('stageNumber manquant -> refusé', async () => {
    const repo = new FakeResultsRepository({ existingStages: [13] });
    const result = await runResultsImport({
      competitionId: 'tdf-2026', stageNumber: null,
      stageResultProvider: fakeStageResultProvider(validResults),
      classificationProvider: fakeClassificationProvider(allClassifications),
      repository: repo, log: silentLog
    });
    expect(result.success).toBe(false);
  });

  test('étape inexistante (jamais importée par competitionImport) -> refusé, aucune écriture', async () => {
    const repo = new FakeResultsRepository({ existingStages: [] }); // aucune étape connue
    const result = await runResultsImport({
      competitionId: 'tdf-2026', stageNumber: 13,
      stageResultProvider: fakeStageResultProvider(validResults),
      classificationProvider: fakeClassificationProvider(allClassifications),
      repository: repo, log: silentLog
    });
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('introuvable'))).toBe(true);
    expect(repo.stageResultsWrites).toHaveLength(0);
  });
});

describe('runResultsImport — succès', () => {
  test('import complet : résultats + 5 classements', async () => {
    const repo = new FakeResultsRepository({ existingStages: [13] });
    const result = await runResultsImport({
      competitionId: 'tdf-2026', stageNumber: 13,
      stageResultProvider: fakeStageResultProvider(validResults),
      classificationProvider: fakeClassificationProvider(allClassifications),
      repository: repo, log: silentLog
    });
    expect(result.success).toBe(true);
    expect(result.resultsImported).toBe(3);
    expect(result.classificationsImported).toBe(5);
    expect(repo.stageResultsWrites).toHaveLength(1);
    expect(repo.classificationWrites).toHaveLength(5);
  });

  test('un classement absent -> avertissement seulement, import réussit quand même', async () => {
    const repo = new FakeResultsRepository({ existingStages: [13] });
    const partial = { ...allClassifications };
    delete partial.mountain; // pas encore publié par PCS
    const result = await runResultsImport({
      competitionId: 'tdf-2026', stageNumber: 13,
      stageResultProvider: fakeStageResultProvider(validResults),
      classificationProvider: fakeClassificationProvider(partial),
      repository: repo, log: silentLog
    });
    expect(result.success).toBe(true);
    expect(result.classificationsImported).toBe(4);
    expect(result.warnings.some(w => w.includes('mountain'))).toBe(true);
  });

  test('rapport contient tous les champs demandés', async () => {
    const repo = new FakeResultsRepository({ existingStages: [13] });
    const result = await runResultsImport({
      competitionId: 'tdf-2026', stageNumber: 13,
      stageResultProvider: fakeStageResultProvider(validResults),
      classificationProvider: fakeClassificationProvider(allClassifications),
      repository: repo, log: silentLog
    });
    expect(result.competitionId).toBe('tdf-2026');
    expect(result.stageNumber).toBe(13);
    expect(typeof result.durationMs).toBe('number');
    expect(result.providersUsed.stageResultProvider).toBe('fake-stage-result');
    expect(result.providersUsed.classificationProvider).toBe('fake-classification');
    expect(new Date(result.importedAt).toString()).not.toBe('Invalid Date');
    expect(new Date(result.finishedAt).toString()).not.toBe('Invalid Date');
  });
});

describe('runResultsImport — résultat d\'étape bloquant', () => {
  test('positions dupliquées dans le résultat -> import refusé entièrement, aucune écriture', async () => {
    const repo = new FakeResultsRepository({ existingStages: [13] });
    const badResults = [
      { rank: 1, riderId: 'a', teamId: null, bib: 1, time: null, gap: null, status: 'finished' },
      { rank: 1, riderId: 'b', teamId: null, bib: 2, time: null, gap: null, status: 'finished' }
    ];
    const result = await runResultsImport({
      competitionId: 'tdf-2026', stageNumber: 13,
      stageResultProvider: fakeStageResultProvider(badResults),
      classificationProvider: fakeClassificationProvider(allClassifications),
      repository: repo, log: silentLog
    });
    expect(result.success).toBe(false);
    expect(repo.stageResultsWrites).toHaveLength(0);
    expect(repo.classificationWrites).toHaveLength(0);
  });

  test('coureur inconnu de referenceData (knownRiderIds fourni) -> import refusé', async () => {
    const repo = new FakeResultsRepository({ existingStages: [13] });
    const result = await runResultsImport({
      competitionId: 'tdf-2026', stageNumber: 13,
      stageResultProvider: fakeStageResultProvider(validResults),
      classificationProvider: fakeClassificationProvider(allClassifications),
      knownRiderIds: new Set(['mauro-schmid']), // 'harold-tejada' et 'fernando-gaviria' absents
      repository: repo, log: silentLog
    });
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('inconnu'))).toBe(true);
  });
});

describe('runResultsImport — erreur réseau sur le résultat d\'étape', () => {
  test('échec de récupération -> aucune écriture', async () => {
    const repo = new FakeResultsRepository({ existingStages: [13] });
    const failingProvider = { name: 'failing', async fetchStageResult() { throw new Error('Timeout réseau'); } };
    const result = await runResultsImport({
      competitionId: 'tdf-2026', stageNumber: 13,
      stageResultProvider: failingProvider,
      classificationProvider: fakeClassificationProvider(allClassifications),
      repository: repo, log: silentLog
    });
    expect(result.success).toBe(false);
    expect(repo.stageResultsWrites).toHaveLength(0);
  });
});

describe('runResultsImport — getResultsByRider (double lecture)', () => {
  test('après import, getResultsByRider retrouve bien le résultat du coureur', async () => {
    const repo = new FakeResultsRepository({ existingStages: [13] });
    await runResultsImport({
      competitionId: 'tdf-2026', stageNumber: 13,
      stageResultProvider: fakeStageResultProvider(validResults),
      classificationProvider: fakeClassificationProvider(allClassifications),
      repository: repo, log: silentLog
    });
    const riderResults = await repo.getResultsByRider('tdf-2026', 'mauro-schmid');
    expect(riderResults).toHaveLength(1);
    expect(riderResults[0].stageNumber).toBe(13);
    expect(riderResults[0].rank).toBe(1);
  });
});
