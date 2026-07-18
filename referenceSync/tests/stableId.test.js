const { slugify, deriveTeamId, deriveRiderId } = require('../providers/stableId');

describe('slugify', () => {
  test('normalise accents et casse', () => {
    expect(slugify('Équipe Fantôme')).toBe('equipe-fantome');
  });
  test('gère le ß allemand (ne se décompose pas via NFD)', () => {
    expect(slugify('GROßSCHARTNER')).toBe('grossschartner');
  });
  test('entrée vide -> chaîne vide', () => {
    expect(slugify('')).toBe('');
    expect(slugify(null)).toBe('');
  });
});

describe('deriveTeamId', () => {
  test('priorité à l\'URL PCS', () => {
    expect(deriveTeamId({ pcsUrl: 'team/uae-team-emirates-xrg-2026', name: 'UAE Team Emirates - XRG (WT)' }))
      .toBe('uae-team-emirates-xrg-2026');
  });
  test('repli sur un slug du nom si l\'URL est absente', () => {
    expect(deriveTeamId({ pcsUrl: null, name: 'Équipe Fantôme' })).toBe('equipe-fantome');
  });
});

describe('deriveRiderId', () => {
  test('priorité à l\'URL PCS', () => {
    expect(deriveRiderId({ sourcePcsUrl: 'rider/tadej-pogacar', lastName: 'POGAČAR', firstName: 'Tadej' })).toBe('tadej-pogacar');
  });
  test('repli sur un slug du nom si l\'URL est absente', () => {
    expect(deriveRiderId({ sourcePcsUrl: null, lastName: 'GROßSCHARTNER', firstName: 'Felix' })).toBe('grossschartner-felix');
  });
  test('deux homonymes gardent des identifiants distincts grâce à l\'URL PCS', () => {
    const a = deriveRiderId({ sourcePcsUrl: 'rider/tobias-halland-johannessen', lastName: 'JOHANNESSEN', firstName: 'Tobias Halland' });
    const b = deriveRiderId({ sourcePcsUrl: 'rider/anders-halland-johannessen', lastName: 'JOHANNESSEN', firstName: 'Anders Halland' });
    expect(a).toBe('tobias-halland-johannessen');
    expect(b).toBe('anders-halland-johannessen');
    expect(a === b).toBe(false);
  });
});
