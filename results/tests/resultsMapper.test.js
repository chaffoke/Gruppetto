const { mapPcsStatus, mapPcsStageResultEntry } = require('../resultsMapper');

describe('mapPcsStatus', () => {
  test('mappe chaque statut PCS confirmé vers le vocabulaire Gruppetto', () => {
    expect(mapPcsStatus('DNS', null)).toBe('dns');
    expect(mapPcsStatus('DNF', null)).toBe('dnf');
    expect(mapPcsStatus('DSQ', null)).toBe('dsq');
    expect(mapPcsStatus('OTL', null)).toBe('otl');
    expect(mapPcsStatus('DF', null)).toBe('df');
  });
  test('rang présent, pas de statut brut -> finished', () => {
    expect(mapPcsStatus(null, 1)).toBe('finished');
  });
  test('ni rang ni statut reconnu -> repli prudent dnf, jamais "finished" par défaut', () => {
    expect(mapPcsStatus(null, null)).toBe('dnf');
    expect(mapPcsStatus('STATUT_INCONNU', null)).toBe('dnf');
  });
});

describe('mapPcsStageResultEntry', () => {
  const resolvers = {
    resolveRiderId: slug => (slug === 'mauro-schmid' ? 'mauro-schmid' : null),
    resolveTeamId: slug => (slug === 'team-jayco-alula-2026' ? 'team-jayco-alula-2026' : null)
  };

  test('mappe une entrée classée complète', () => {
    const raw = { rank: 1, bib: 118, pcsRiderSlug: 'mauro-schmid', pcsTeamSlug: 'team-jayco-alula-2026', time: '4:06:58', gap: null, pcsRawStatus: null, bonusSeconds: 10, points: 100 };
    const mapped = mapPcsStageResultEntry(raw, resolvers);
    expect(mapped).toMatchObject({ rank: 1, riderId: 'mauro-schmid', teamId: 'team-jayco-alula-2026', status: 'finished', bonusSeconds: 10, points: 100 });
    expect(mapped.extra.pcsRiderSlug).toBe('mauro-schmid');
  });

  test('mappe une entrée DNS', () => {
    const raw = { rank: null, bib: 221, pcsRiderSlug: 'fernando-gaviria', pcsTeamSlug: 'caja-rural-seguros-rga-2026', time: null, gap: null, pcsRawStatus: 'DNS', bonusSeconds: null, points: null };
    const mapped = mapPcsStageResultEntry(raw, { resolveRiderId: s => s, resolveTeamId: s => s });
    expect(mapped.status).toBe('dns');
    expect(mapped.rank).toBeNull();
  });

  test('sans résolveurs fournis -> repli sur le slug brut tel quel', () => {
    const raw = { rank: 1, bib: 1, pcsRiderSlug: 'x', pcsTeamSlug: 'y', time: '1:00:00', gap: null, pcsRawStatus: null, bonusSeconds: null, points: null };
    const mapped = mapPcsStageResultEntry(raw, {});
    expect(mapped.riderId).toBe('x');
    expect(mapped.teamId).toBe('y');
  });
});
