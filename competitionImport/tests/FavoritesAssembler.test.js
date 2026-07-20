const { assembleFavorites } = require('../assemblers/FavoritesAssembler');

describe('assembleFavorites', () => {
  test('assemble un favori complet', () => {
    const raw = [{ rank: 1, pcsRiderSlug: 'tadej-pogacar', name: 'POGAČAR Tadej', nationalityCode: 'SI' }];
    const result = assembleFavorites(raw, { resolveRiderId: s => s });
    expect(result[0]).toEqual({ riderId: 'tadej-pogacar', pcsSlug: 'tadej-pogacar', name: 'POGAČAR Tadej', nationality: 'SI', pcsRank: 1 });
  });

  test('sans résolveur -> repli sur le slug brut', () => {
    const raw = [{ rank: 1, pcsRiderSlug: 'x', name: 'X Y', nationalityCode: null }];
    const result = assembleFavorites(raw, {});
    expect(result[0].riderId).toBe('x');
  });

  test('liste vide ou absente -> tableau vide', () => {
    expect(assembleFavorites([], {})).toEqual([]);
    expect(assembleFavorites(null, {})).toEqual([]);
  });

  test('conserve l\'ordre (pcsRank croissant)', () => {
    const raw = [{ rank: 1, pcsRiderSlug: 'a', name: 'A', nationalityCode: 'FR' }, { rank: 2, pcsRiderSlug: 'b', name: 'B', nationalityCode: 'BE' }];
    const result = assembleFavorites(raw, { resolveRiderId: s => s });
    expect(result.map(f => f.pcsRank)).toEqual([1, 2]);
  });
});
