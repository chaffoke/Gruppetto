const { mapStageType } = require('../providers/StageTypeMapper');

describe('mapStageType', () => {
  test('Flat -> flat', () => {
    expect(mapStageType({ pcsStageType: 'Flat', stageName: 'Stage 2' })).toBe('flat');
  });
  test('Hills, flat finish -> hilly', () => {
    expect(mapStageType({ pcsStageType: 'Hills, flat finish', stageName: 'Stage 9' })).toBe('hilly');
  });
  test('Hills, uphill finish -> hilly (pas de distinction haute montagne)', () => {
    expect(mapStageType({ pcsStageType: 'Hills, uphill finish', stageName: 'Stage 4' })).toBe('hilly');
  });
  test('Mountains, uphill finish -> mountain', () => {
    expect(mapStageType({ pcsStageType: 'Mountains, uphill finish', stageName: 'Stage 20' })).toBe('mountain');
  });
  test('TTT détecté via le nom d\'étape, pas via le profile type', () => {
    expect(mapStageType({ pcsStageType: null, stageName: 'Stage 1 (TTT) | Barcelona - Barcelona' })).toBe('ttt');
  });
  test('ITT détecté via le nom d\'étape', () => {
    expect(mapStageType({ pcsStageType: null, stageName: 'Stage 16 (ITT) | Évian-les-Bains - Thonon-les-Bains' })).toBe('itt');
  });
  test('le nom d\'étape l\'emporte sur un profile type incohérent', () => {
    expect(mapStageType({ pcsStageType: 'Flat', stageName: 'Stage 16 (ITT) | X' })).toBe('itt');
  });
  test('Prologue détecté via le nom', () => {
    expect(mapStageType({ pcsStageType: 'Prologue', stageName: 'Prologue | X' })).toBe('prologue');
  });
  test('valeur PCS inconnue -> unknown, jamais une exception', () => {
    expect(mapStageType({ pcsStageType: 'Nouveau libellé PCS jamais vu', stageName: 'Stage 5' })).toBe('unknown');
  });
  test('entrée vide -> unknown', () => {
    expect(mapStageType({})).toBe('unknown');
    expect(mapStageType()).toBe('unknown');
  });
});
