const { deriveJerseyHolders } = require('../jerseys');

describe('deriveJerseyHolders', () => {
  test('dérive chaque maillot du rang 1 du classement correspondant', () => {
    const result = deriveJerseyHolders({
      general: [{ rank: 1, riderId: 'tadej-pogacar' }, { rank: 2, riderId: 'jonas-vingegaard' }],
      points: [{ rank: 1, riderId: 'jasper-philipsen' }],
      mountain: [{ rank: 1, riderId: 'paul-seixas' }],
      youth: [{ rank: 1, riderId: 'paul-seixas' }]
    });
    expect(result).toEqual({
      yellow: 'tadej-pogacar', green: 'jasper-philipsen', polka: 'paul-seixas', white: 'paul-seixas'
    });
  });

  test('classement absent -> null, jamais une exception', () => {
    expect(deriveJerseyHolders({})).toEqual({ yellow: null, green: null, polka: null, white: null });
    expect(deriveJerseyHolders()).toEqual({ yellow: null, green: null, polka: null, white: null });
  });

  test('classement vide (tableau sans élément) -> null', () => {
    const result = deriveJerseyHolders({ general: [] });
    expect(result.yellow).toBeNull();
  });
});
