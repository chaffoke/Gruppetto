const { extractBib, extractNationality } = require('../providers/pcsRosterNormalize');

describe('extractBib', () => {
  test('extrait le dossard en tête de texte', () => {
    expect(extractBib('96VAN LERBERGHE Bert (DNF #6)')).toBe(96);
    expect(extractBib('1POGAČAR Tadej')).toBe(1);
  });
  test('aucun dossard -> null', () => {
    expect(extractBib('sans dossard')).toBeNull();
  });
});

describe('extractNationality', () => {
  test('extrait le code pays en majuscules', () => {
    expect(extractNationality('flag si')).toBe('SI');
    expect(extractNationality('flag mx')).toBe('MX');
  });
  test('classe absente ou vide -> null', () => {
    expect(extractNationality('')).toBeNull();
    expect(extractNationality(null)).toBeNull();
  });
});
