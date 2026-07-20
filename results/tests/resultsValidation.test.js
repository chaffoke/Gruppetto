const {
  validateStageResultEntry, validateStageResults, validateClassificationEntry, validateClassification
} = require('../resultsValidation');

const knownRiderIds = new Set(['tadej-pogacar', 'mauro-schmid', 'harold-tejada']);
const knownTeamIds = new Set(['uae-team-emirates-xrg-2026', 'team-jayco-alula-2026']);

describe('validateStageResultEntry', () => {
  const valid = { rank: 1, riderId: 'mauro-schmid', teamId: 'team-jayco-alula-2026', bib: 118, time: '4:06:58', gap: null, status: 'finished', bonusSeconds: 10, points: 100 };

  test('entrée complète et valide -> aucune erreur', () => {
    const r = validateStageResultEntry(valid, { knownRiderIds, knownTeamIds });
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  test('riderId manquant -> erreur bloquante', () => {
    expect(validateStageResultEntry({ ...valid, riderId: null }, { knownRiderIds }).valid).toBe(false);
  });

  test('coureur inconnu de referenceData -> erreur bloquante', () => {
    const r = validateStageResultEntry({ ...valid, riderId: 'coureur-fantome' }, { knownRiderIds });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('inconnu'))).toBe(true);
  });

  test('équipe inconnue -> erreur bloquante', () => {
    const r = validateStageResultEntry({ ...valid, teamId: 'equipe-fantome' }, { knownTeamIds });
    expect(r.valid).toBe(false);
  });

  test('sans ensembles connus fournis -> vérification ignorée, pas d\'erreur', () => {
    const r = validateStageResultEntry({ ...valid, riderId: 'x-inconnu' });
    expect(r.valid).toBe(true);
  });

  test('statut invalide -> erreur bloquante', () => {
    expect(validateStageResultEntry({ ...valid, status: 'inventé' }).valid).toBe(false);
  });

  test('statut "finished" sans rang -> erreur bloquante', () => {
    expect(validateStageResultEntry({ ...valid, rank: null }).valid).toBe(false);
  });

  test('statut dns/dnf avec rang null -> valide', () => {
    const r = validateStageResultEntry({ ...valid, rank: null, status: 'dns', time: null }, {});
    expect(r.valid).toBe(true);
  });

  test('statut non-finished mais rang présent -> avertissement seulement', () => {
    const r = validateStageResultEntry({ ...valid, status: 'dnf' });
    expect(r.valid).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  test('bonusSeconds ou points négatifs -> erreur bloquante', () => {
    expect(validateStageResultEntry({ ...valid, bonusSeconds: -5 }).valid).toBe(false);
    expect(validateStageResultEntry({ ...valid, points: -1 }).valid).toBe(false);
  });
});

describe('validateStageResults', () => {
  function entry(rank, riderId) {
    return { rank, riderId, teamId: null, bib: rank, time: null, gap: null, status: 'finished', bonusSeconds: null, points: null };
  }

  test('positions dupliquées -> erreur bloquante', () => {
    const r = validateStageResults([entry(1, 'a'), entry(1, 'b')]);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('double'))).toBe(true);
  });

  test('liste non-tableau -> invalide sans exception', () => {
    expect(validateStageResults(null).valid).toBe(false);
  });

  test('agrège les erreurs des entrées individuelles', () => {
    const r = validateStageResults([entry(1, 'a'), { rank: 2, riderId: null, status: 'finished' }]);
    expect(r.valid).toBe(false);
  });
});

describe('validateClassificationEntry', () => {
  test('classement individuel sans riderId -> erreur bloquante', () => {
    expect(validateClassificationEntry('general', { rank: 1, riderId: null }).valid).toBe(false);
  });
  test('classement par équipes sans teamId -> erreur bloquante', () => {
    expect(validateClassificationEntry('teams', { rank: 1, teamId: null }).valid).toBe(false);
  });
  test('classement par équipes avec teamId mais sans riderId -> valide (normal)', () => {
    expect(validateClassificationEntry('teams', { rank: 1, teamId: 'team-jayco-alula-2026', riderId: null }).valid).toBe(true);
  });
});

describe('validateClassification', () => {
  test('type inconnu -> erreur bloquante', () => {
    expect(validateClassification('inventé', []).valid).toBe(false);
  });
  test('positions dupliquées -> erreur bloquante', () => {
    const entries = [{ rank: 1, riderId: 'a' }, { rank: 1, riderId: 'b' }];
    expect(validateClassification('general', entries).valid).toBe(false);
  });
  test('classement valide -> aucune erreur', () => {
    const entries = [{ rank: 1, riderId: 'tadej-pogacar' }, { rank: 2, riderId: 'mauro-schmid' }];
    expect(validateClassification('general', entries).valid).toBe(true);
  });
});
