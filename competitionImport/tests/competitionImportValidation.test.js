const {
  validateCompetitionInfo, validateStageListEntry, validateStageList, validateStageTime
} = require('../competitionImportValidation');

describe('validateCompetitionInfo', () => {
  const valid = {
    name: 'Tour de France', year: 2026, stageCount: 21,
    pcsUrl: 'race/tour-de-france/2026', pcsSlug: 'tour-de-france',
    startDate: '2026-07-04', endDate: '2026-07-26'
  };

  test('objet complet et valide -> valid=true, aucune erreur ni avertissement', () => {
    const r = validateCompetitionInfo(valid);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
    expect(r.warnings).toHaveLength(0);
  });

  test('objet manquant -> invalide', () => {
    expect(validateCompetitionInfo(null).valid).toBe(false);
    expect(validateCompetitionInfo(undefined).valid).toBe(false);
  });

  test('name manquant -> erreur bloquante', () => {
    const r = validateCompetitionInfo({ ...valid, name: null });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('name'))).toBe(true);
  });

  test('year manquant ou de mauvais type -> erreur bloquante', () => {
    expect(validateCompetitionInfo({ ...valid, year: null }).valid).toBe(false);
    expect(validateCompetitionInfo({ ...valid, year: '2026' }).valid).toBe(false); // string, pas number
  });

  test('stageCount absent ou <= 0 -> erreur bloquante (nombre d\'étapes incohérent en amont)', () => {
    expect(validateCompetitionInfo({ ...valid, stageCount: null }).valid).toBe(false);
    expect(validateCompetitionInfo({ ...valid, stageCount: 0 }).valid).toBe(false);
    expect(validateCompetitionInfo({ ...valid, stageCount: -1 }).valid).toBe(false);
  });

  test('pcsUrl/pcsSlug absents -> avertissement seulement, pas bloquant', () => {
    const r = validateCompetitionInfo({ ...valid, pcsUrl: null, pcsSlug: null });
    expect(r.valid).toBe(true);
    expect(r.warnings).toHaveLength(2);
  });

  test('date invalide -> erreur bloquante', () => {
    const r = validateCompetitionInfo({ ...valid, startDate: 'pas-une-date' });
    expect(r.valid).toBe(false);
  });
});

describe('validateStageListEntry', () => {
  const validStage = {
    stageNumber: 13, name: 'Stage 13 | Dole - Belfort', date: '2026-07-17',
    startCity: 'Dole', finishCity: 'Belfort', distanceKm: 205.8, elevationGainM: 2309,
    pcsProfileUrl: 'https://x/stage-13-profile.jpg'
  };

  test('étape complète et valide -> aucune erreur ni avertissement', () => {
    const r = validateStageListEntry(validStage);
    expect(r.valid).toBe(true);
    expect(r.warnings).toHaveLength(0);
  });

  test('stageNumber manquant ou invalide -> erreur bloquante', () => {
    expect(validateStageListEntry({ ...validStage, stageNumber: null }).valid).toBe(false);
    expect(validateStageListEntry({ ...validStage, stageNumber: 0 }).valid).toBe(false);
    expect(validateStageListEntry({ ...validStage, stageNumber: -3 }).valid).toBe(false);
  });

  test('name manquant -> erreur bloquante', () => {
    expect(validateStageListEntry({ ...validStage, name: null }).valid).toBe(false);
  });

  test('distanceKm ou elevationGainM incohérents -> erreur bloquante', () => {
    expect(validateStageListEntry({ ...validStage, distanceKm: -5 }).valid).toBe(false);
    expect(validateStageListEntry({ ...validStage, distanceKm: 0 }).valid).toBe(false);
    expect(validateStageListEntry({ ...validStage, elevationGainM: -1 }).valid).toBe(false);
  });

  test('date invalide -> erreur bloquante', () => {
    expect(validateStageListEntry({ ...validStage, date: 'lundi prochain' }).valid).toBe(false);
  });

  test('image de profil absente -> avertissement seulement, pas bloquant (droits non confirmés, absence tolérée)', () => {
    const r = validateStageListEntry({ ...validStage, pcsProfileUrl: null });
    expect(r.valid).toBe(true);
    expect(r.warnings.some(w => w.includes('Image de profil introuvable'))).toBe(true);
  });

  test('ville de départ/arrivée manquante -> avertissement seulement', () => {
    const r = validateStageListEntry({ ...validStage, startCity: null });
    expect(r.valid).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe('validateStageList', () => {
  function stage(n) {
    return { stageNumber: n, name: `Stage ${n}`, startCity: 'A', finishCity: 'B', pcsProfileUrl: 'x' };
  }

  test('liste cohérente avec le nombre attendu -> valide', () => {
    const r = validateStageList([stage(1), stage(2), stage(3)], 3);
    expect(r.valid).toBe(true);
  });

  test('nombre d\'étapes incohérent avec la page course -> erreur bloquante', () => {
    const r = validateStageList([stage(1), stage(2)], 21);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('incohérent'))).toBe(true);
  });

  test('numéros d\'étape en double -> erreur bloquante', () => {
    const r = validateStageList([stage(1), stage(2), stage(2)], 3);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('double'))).toBe(true);
  });

  test('liste non-tableau -> invalide, sans exception', () => {
    expect(validateStageList(null, 3).valid).toBe(false);
    expect(validateStageList('pas un tableau', 3).valid).toBe(false);
  });

  test('agrège aussi les erreurs/avertissements de chaque étape individuelle', () => {
    const badStage = { stageNumber: 5, name: null }; // name manquant
    const r = validateStageList([stage(1), badStage], 2);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('name'))).toBe(true);
  });
});

describe('validateStageTime', () => {
  test('heure de départ présente et valide -> aucune erreur ni avertissement', () => {
    const r = validateStageTime(13, { officialStartTime: '2026-07-17T13:20:00' });
    expect(r.valid).toBe(true);
    expect(r.warnings).toHaveLength(0);
  });

  test('heure de départ absente -> avertissement seulement, PAS bloquant', () => {
    const r = validateStageTime(13, { officialStartTime: null });
    expect(r.valid).toBe(true);
    expect(r.warnings.some(w => w.includes('Heure de départ introuvable'))).toBe(true);
  });

  test('résultat entièrement absent -> avertissement seulement', () => {
    const r = validateStageTime(13, null);
    expect(r.valid).toBe(true);
    expect(r.warnings).toHaveLength(1);
  });

  test('heure présente mais mal formée -> erreur bloquante (donnée corrompue, pas absente)', () => {
    const r = validateStageTime(13, { officialStartTime: 'pas une heure valide' });
    expect(r.valid).toBe(false);
  });

  test('numéro d\'étape invalide -> erreur bloquante', () => {
    const r = validateStageTime(null, { officialStartTime: '2026-07-17T13:20:00' });
    expect(r.valid).toBe(false);
  });
});
