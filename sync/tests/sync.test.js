const { runSync } = require('../sync');
const { FakeRiderStore } = require('./FakeRiderStore');

function makeRoster(n, team = 'Soudal Quick-Step') {
  return Array.from({ length: n }, (_, i) => ({
    firstName: 'X', lastName: `R${i}`, team,
    status: 'active', sinceStage: null, sourceRiderId: `/rider/${i}`
  }));
}

function fullPreviousState(n, overrides = {}) {
  const state = {};
  for (let i = 0; i < n; i++) state[`/rider/${i}`] = { status: 'active', sinceStage: null };
  return { ...state, ...overrides };
}

function fakeProvider(rosterOrError, name = 'fake-provider') {
  return {
    name,
    async fetchRoster() {
      if (rosterOrError instanceof Error) throw rosterOrError;
      return rosterOrError;
    }
  };
}

const silentLog = () => {};

describe('runSync — chemin de succès', () => {
  test('écrit les statuts ET l\'historique en un seul commitSuccess, jamais commitFailure', async () => {
    const riders = makeRoster(23);
    const provider = fakeProvider({ raceId: 'x/2026', riders });
    const store = new FakeRiderStore(fullPreviousState(23));

    const result = await runSync({ provider, raceId: 'x/2026', store, expectedTeams: [], log: silentLog });

    expect(result.success).toBe(true);
    expect(store.commitSuccessCalls).toHaveLength(1);
    expect(store.commitFailureCalls).toHaveLength(0);
  });

  test('détecte un changement bidirectionnel dnf -> active (réintégration)', async () => {
    const riders = makeRoster(23);
    riders[0].status = 'active';
    const provider = fakeProvider({ raceId: 'x/2026', riders });
    const store = new FakeRiderStore(fullPreviousState(23, { '/rider/0': { status: 'dnf', sinceStage: 5 } }));

    const result = await runSync({ provider, raceId: 'x/2026', store, expectedTeams: [], log: silentLog });

    expect(result.success).toBe(true);
    const change = result.changes.find(c => c.sourceRiderId === '/rider/0');
    expect(change).toMatchObject({ from: 'dnf', to: 'active' });
  });

  test('détecte aussi bien active -> dnf que dnf -> active dans la même synchronisation', async () => {
    const riders = makeRoster(25);
    riders[0].status = 'dnf'; riders[0].sinceStage = 9;
    riders[1].status = 'active';
    const provider = fakeProvider({ raceId: 'x/2026', riders });
    const store = new FakeRiderStore(fullPreviousState(25, {
      '/rider/1': { status: 'dsq', sinceStage: 3 }
    }));

    const result = await runSync({ provider, raceId: 'x/2026', store, expectedTeams: [], log: silentLog });

    expect(result.success).toBe(true);
    expect(result.changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceRiderId: '/rider/0', from: 'active', to: 'dnf' }),
      expect.objectContaining({ sourceRiderId: '/rider/1', from: 'dsq', to: 'active' })
    ]));
  });
});

describe('runSync — atomicité en cas d\'échec de validation', () => {
  test('équipe incomplète -> commitFailure seulement, commitSuccess jamais appelé', async () => {
    const riders = makeRoster(6).map(r => ({ ...r, status: 'dnf' }));
    const provider = fakeProvider({ raceId: 'x/2026', riders });
    const store = new FakeRiderStore(fullPreviousState(6));

    const result = await runSync({
      provider, raceId: 'x/2026', store,
      expectedTeams: ['Soudal Quick-Step'], expectedTeamSize: 8, minRiders: 1, log: silentLog
    });

    expect(result.success).toBe(false);
    expect(store.commitSuccessCalls).toHaveLength(0);
    expect(store.commitFailureCalls).toHaveLength(1);
    expect(store.commitFailureCalls[0].success).toBe(false);
    expect(store.commitFailureCalls[0].errorMessage).toMatch(/incomplète/);
  });

  test('l\'état précédent reste intact après un échec', async () => {
    const badRiders = makeRoster(6).map(r => ({ ...r, status: 'dnf' }));
    const provider = fakeProvider({ raceId: 'x/2026', riders: badRiders });
    const store = new FakeRiderStore(fullPreviousState(6, { '/rider/0': { status: 'active', sinceStage: null } }));

    await runSync({
      provider, raceId: 'x/2026', store,
      expectedTeams: ['Soudal Quick-Step'], expectedTeamSize: 8, minRiders: 1, log: silentLog
    });

    const statuses = await store.readCurrentStatuses();
    expect(statuses['/rider/0']).toEqual({ status: 'active', sinceStage: null });
  });

  test('échec réseau -> commitFailure seulement, jamais commitSuccess', async () => {
    const provider = fakeProvider(new Error('Timeout réseau'));
    const store = new FakeRiderStore();

    const result = await runSync({ provider, raceId: 'x/2026', store, expectedTeams: [], log: silentLog });

    expect(result.success).toBe(false);
    expect(store.commitSuccessCalls).toHaveLength(0);
    expect(store.commitFailureCalls).toHaveLength(1);
    expect(store.commitFailureCalls[0].errorMessage).toMatch(/Récupération impossible/);
  });

  test('l\'entrée d\'historique d\'échec ne contient aucune écriture de coureur', async () => {
    const riders = makeRoster(3); // sous le minimum par défaut (20) -> déclenche un échec
    const provider = fakeProvider({ raceId: 'x/2026', riders });
    const store = new FakeRiderStore(fullPreviousState(3));

    await runSync({ provider, raceId: 'x/2026', store, expectedTeams: [], log: silentLog });

    expect(store.commitFailureCalls).toHaveLength(1);
    const entry = store.commitFailureCalls[0];
    expect(entry).not.toHaveProperty('riders');
    expect(entry.success).toBe(false);
  });
});
