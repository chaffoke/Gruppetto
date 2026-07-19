const { assembleTeams } = require('../assemblers/TeamAssembler');

describe('assembleTeams', () => {
  test('assemble une équipe complète', () => {
    const raw = [{ pcsTeamSlug: 'uae-team-emirates-xrg-2026', name: 'UAE Team Emirates - XRG (WT)', pcsJerseyUrl: 'https://x/uae.png' }];
    const result = assembleTeams(raw, { resolveTeamId: s => s });
    expect(result[0]).toEqual({ id: 'uae-team-emirates-xrg-2026', pcsSlug: 'uae-team-emirates-xrg-2026', name: 'UAE Team Emirates - XRG (WT)', pcsJerseyUrl: 'https://x/uae.png' });
  });

  test('sans résolveur -> repli sur le slug brut', () => {
    const raw = [{ pcsTeamSlug: 'x', name: 'X', pcsJerseyUrl: null }];
    const result = assembleTeams(raw, {});
    expect(result[0].id).toBe('x');
  });

  test('liste vide ou absente -> tableau vide', () => {
    expect(assembleTeams([], {})).toEqual([]);
    expect(assembleTeams(null, {})).toEqual([]);
  });
});
