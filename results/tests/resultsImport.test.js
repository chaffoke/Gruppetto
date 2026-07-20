const { runResultsImport } = require('../resultsImport');
const { FakeResultsRepository } = require('./FakeResultsRepository');

function fakeStageResultProvider(entries) {
  return { name: 'fake-stage-result', async fetchStageResult() { return entries; } };
}
function fakeStageResultProviderWithJerseys(entries, jerseyWearers) {
  return {
    name: 'fake-stage-result',
    async fetchStageResult() { return entries; },
    async fetchJerseyWearers() { return jerseyWearers; }
  };
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
const identityResolvers = { resolveRiderId: s => s, resolveTeamId: s => s };

const validResults = [
  { rank: 1, pcsRiderSlug: 'mauro-schmid', pcsTeamSlug: 'team-jayco-alula-2026', bib: 118, time: '4:06:58', gap: null, pcsRawStatus: null, bonusSeconds: 10, points: 100 },
  { rank: 2, pcsRiderSlug: 'harold-tejada', pcsTeamSlug: 'xds-astana-team-2026', bib: 65, time: null, gap: '0:00', pcsRawStatus: null, bonusSeconds: 6, points: 70 },
  { rank: null, pcsRiderSlug: 'fernando-gaviria', pcsTeamSlug: 'caja-rural-seguros-rga-2026', bib: 221, time: null, gap: null, pcsRawStatus: 'DNS', bonusSeconds: null, points: null }
];

const allClassifications = {
  general: [{ rank: 1, pcsRiderSlug: 'tadej-pogacar' }, { rank: 2, pcsRiderSlug: 'jonas-vingegaard' }],
  points: [{ rank: 1, pcsRiderSlug: 'jasper-philipsen' }],
  mountain: [{ rank: 1, pcsRiderSlug: 'paul-seixas' }],
  youth: [{ rank: 1, pcsRiderSlug: 'paul-seixas' }],
  teams: [{ rank: 1, pcsTeamSlug: 'uae-team-emirates-xrg-2026' }]
};

describe('runResultsImport — garde-fous', () => {
  test('competitionId manquant -> refusé', async () => {
    const repo = new FakeResultsRepository({ existingStages: [13] });
    const result = await runResultsImport({
      stageNumber: 13, competitionId: null,
      stageResultProvider: fakeStageResultProvider(validResults),
      classificationProvider: fakeClassificationProvider(allClassifications),
      ...identityResolvers, repository: repo, log: silentLog
    });
    expect(result.success).toBe(false);
  });

  test('stageNumber manquant -> refusé', async () => {
    const repo = new FakeResultsRepository({ existingStages: [13] });
    const result = await runResultsImport({
      competitionId: 'tdf-2026', stageNumber: null,
      stageResultProvider: fakeStageResultProvider(validResults),
      classificationProvider: fakeClassificationProvider(allClassifications),
      ...identityResolvers, repository: repo, log: silentLog
    });
    expect(result.success).toBe(false);
  });

  test('étape inexistante (jamais importée par competitionImport) -> refusé, aucune écriture', async () => {
    const repo = new FakeResultsRepository({ existingStages: [] });
    const result = await runResultsImport({
      competitionId: 'tdf-2026', stageNumber: 13,
      stageResultProvider: fakeStageResultProvider(validResults),
      classificationProvider: fakeClassificationProvider(allClassifications),
      ...identityResolvers, repository: repo, log: silentLog
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
      ...identityResolvers, repository: repo, log: silentLog
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
    delete partial.mountain;
    const result = await runResultsImport({
      competitionId: 'tdf-2026', stageNumber: 13,
      stageResultProvider: fakeStageResultProvider(validResults),
      classificationProvider: fakeClassificationProvider(partial),
      ...identityResolvers, repository: repo, log: silentLog
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
      ...identityResolvers, repository: repo, log: silentLog
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
      { rank: 1, pcsRiderSlug: 'a', pcsTeamSlug: null, bib: 1, time: null, gap: null, pcsRawStatus: null },
      { rank: 1, pcsRiderSlug: 'b', pcsTeamSlug: null, bib: 2, time: null, gap: null, pcsRawStatus: null }
    ];
    const result = await runResultsImport({
      competitionId: 'tdf-2026', stageNumber: 13,
      stageResultProvider: fakeStageResultProvider(badResults),
      classificationProvider: fakeClassificationProvider(allClassifications),
      ...identityResolvers, repository: repo, log: silentLog
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
      knownRiderIds: new Set(['mauro-schmid']),
      ...identityResolvers, repository: repo, log: silentLog
    });
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('inconnu'))).toBe(true);
  });
});

describe('runResultsImport — porteurs de maillots', () => {
  test('maillots importés quand le provider les fournit, avec distinction porteur/leader', async () => {
    const repo = new FakeResultsRepository({ existingStages: [13] });
    const rawJerseys = [
      { jerseyType: 'general', pcsWearerSlug: 'tadej-pogacar', pcsJerseyClass: 'yellow' },
      { jerseyType: 'mountain', pcsWearerSlug: 'jonas-vingegaard', pcsJerseyClass: 'polkadot' }
    ];
    const classificationsWithLeader = {
      general: [{ rank: 1, pcsRiderSlug: 'tadej-pogacar' }],
      points: [{ rank: 1, pcsRiderSlug: 'jasper-philipsen' }],
      mountain: [{ rank: 1, pcsRiderSlug: 'tadej-pogacar' }, { rank: 2, pcsRiderSlug: 'jonas-vingegaard' }],
      youth: [{ rank: 1, pcsRiderSlug: 'paul-seixas' }],
      teams: [{ rank: 1, pcsTeamSlug: 'uae-team-emirates-xrg-2026' }]
    };
    const result = await runResultsImport({
      competitionId: 'tdf-2026', stageNumber: 13,
      stageResultProvider: fakeStageResultProviderWithJerseys(validResults, rawJerseys),
      classificationProvider: fakeClassificationProvider(classificationsWithLeader),
      ...identityResolvers, repository: repo, log: silentLog
    });
    expect(result.success).toBe(true);
    expect(result.jerseyWearersImported).toBe(2);
    expect(repo.jerseyWearersWrites).toHaveLength(1);
    const written = repo.jerseyWearersWrites[0].jerseyWearersDoc.jerseyWearers;
    expect(written.find(j => j.jerseyType === 'general').classificationLeaderId).toBeNull();
    expect(written.find(j => j.jerseyType === 'mountain').classificationLeaderId).toBe('tadej-pogacar');
  });

  test('provider sans fetchJerseyWearers -> aucun maillot importé, pas d\'exception', async () => {
    const repo = new FakeResultsRepository({ existingStages: [13] });
    const result = await runResultsImport({
      competitionId: 'tdf-2026', stageNumber: 13,
      stageResultProvider: fakeStageResultProvider(validResults),
      classificationProvider: fakeClassificationProvider(allClassifications),
      ...identityResolvers, repository: repo, log: silentLog
    });
    expect(result.success).toBe(true);
    expect(result.jerseyWearersImported).toBe(0);
    expect(repo.jerseyWearersWrites).toHaveLength(0);
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
      ...identityResolvers, repository: repo, log: silentLog
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
      ...identityResolvers, repository: repo, log: silentLog
    });
    const riderResults = await repo.getResultsByRider('tdf-2026', 'mauro-schmid');
    expect(riderResults).toHaveLength(1);
    expect(riderResults[0].stageNumber).toBe(13);
    expect(riderResults[0].rank).toBe(1);
  });
});
