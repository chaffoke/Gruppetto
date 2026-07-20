const { assembleStageResults, mapStatus } = require('../assemblers/StageResultAssembler');
const { assembleClassification } = require('../assemblers/ClassificationAssembler');
const { assembleJerseyWearers } = require('../assemblers/JerseyAssembler');

describe('StageResultAssembler.mapStatus', () => {
  test('mappe chaque statut PCS confirmé', () => {
    expect(mapStatus('DNS', null)).toBe('dns');
    expect(mapStatus('DNF', null)).toBe('dnf');
    expect(mapStatus('DSQ', null)).toBe('dsq');
    expect(mapStatus('OTL', null)).toBe('otl');
    expect(mapStatus('DF', null)).toBe('df');
  });
  test('rang présent sans statut brut -> finished', () => {
    expect(mapStatus(null, 1)).toBe('finished');
  });
  test('ni rang ni statut -> repli prudent dnf', () => {
    expect(mapStatus(null, null)).toBe('dnf');
  });
});

describe('StageResultAssembler.assembleStageResults', () => {
  const resolvers = { resolveRiderId: s => (s === 'mauro-schmid' ? 'mauro-schmid' : null), resolveTeamId: s => s };

  test('assemble une entrée classée complète', () => {
    const raw = [{ rank: 1, bib: 118, pcsRiderSlug: 'mauro-schmid', pcsTeamSlug: 'team-jayco-alula-2026', time: '4:06:58', gap: null, pcsRawStatus: null, bonusSeconds: 10, points: 100 }];
    const result = assembleStageResults(raw, resolvers);
    expect(result[0]).toMatchObject({ rank: 1, riderId: 'mauro-schmid', teamId: 'team-jayco-alula-2026', status: 'finished', bonusSeconds: 10 });
  });

  test('assemble une entrée DNS', () => {
    const raw = [{ rank: null, bib: 221, pcsRiderSlug: 'x', pcsTeamSlug: 'y', pcsRawStatus: 'DNS' }];
    const result = assembleStageResults(raw, { resolveRiderId: s => s, resolveTeamId: s => s });
    expect(result[0].status).toBe('dns');
  });

  test('liste vide ou absente -> tableau vide, pas d\'exception', () => {
    expect(assembleStageResults([], {})).toEqual([]);
    expect(assembleStageResults(null, {})).toEqual([]);
  });
});

describe('ClassificationAssembler.assembleClassification', () => {
  test('assemble un classement individuel', () => {
    const raw = [{ rank: 1, pcsRiderSlug: 'tadej-pogacar', pcsTeamSlug: 'uae-team-emirates-xrg-2026', time: '62:14:08', points: 0 }];
    const result = assembleClassification(raw, { resolveRiderId: s => s, resolveTeamId: s => s });
    expect(result[0]).toMatchObject({ rank: 1, riderId: 'tadej-pogacar', teamId: 'uae-team-emirates-xrg-2026', time: '62:14:08' });
  });
});

describe('JerseyAssembler.assembleJerseyWearers', () => {
  const identity = s => s;

  test('porteur et leader identiques -> classificationLeaderId reste null', () => {
    const raw = [{ jerseyType: 'general', pcsWearerSlug: 'tadej-pogacar', pcsJerseyClass: 'yellow' }];
    const classifications = { general: [{ rank: 1, riderId: 'tadej-pogacar' }] };
    const result = assembleJerseyWearers(raw, classifications, { resolveRiderId: identity });
    expect(result[0]).toEqual({ jerseyType: 'general', wearerId: 'tadej-pogacar', classificationLeaderId: null, pcsJerseyClass: 'yellow' });
  });

  test('porteur et leader différents -> classificationLeaderId renseigné (cas réel Vingegaard/Pogačar)', () => {
    const raw = [{ jerseyType: 'mountain', pcsWearerSlug: 'jonas-vingegaard', pcsJerseyClass: 'polkadot' }];
    const classifications = { mountain: [{ rank: 1, riderId: 'tadej-pogacar' }, { rank: 2, riderId: 'jonas-vingegaard' }] };
    const result = assembleJerseyWearers(raw, classifications, { resolveRiderId: identity });
    expect(result[0]).toEqual({ jerseyType: 'mountain', wearerId: 'jonas-vingegaard', classificationLeaderId: 'tadej-pogacar', pcsJerseyClass: 'polkadot' });
  });

  test('classement absent pour ce type -> classificationLeaderId null, pas d\'exception', () => {
    const raw = [{ jerseyType: 'youth', pcsWearerSlug: 'juan-ayuso-pesquera', pcsJerseyClass: 'white' }];
    const result = assembleJerseyWearers(raw, {}, { resolveRiderId: identity });
    expect(result[0].classificationLeaderId).toBeNull();
  });

  test('tableau vide -> tableau vide', () => {
    expect(assembleJerseyWearers([], {}, {})).toEqual([]);
  });
});
