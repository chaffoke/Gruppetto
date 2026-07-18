const { runReferenceSync } = require('../referenceSync');
const { FakeReferenceRosterStore } = require('./FakeReferenceRosterStore');

function fakeProvider(rosterOrError, name = 'fake-provider') {
  return {
    name,
    async fetchRoster() {
      if (rosterOrError instanceof Error) throw rosterOrError;
      return rosterOrError;
    }
  };
}

function makeReferenceData(teamsSpec) {
  return {
    raceId: 'x/2026',
    fetchedAt: new Date().toISOString(),
    teams: teamsSpec.map(([name, riderCount]) => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name, pcsUrl: `team/${name}`, jerseyUrl: null,
      riders: Array.from({ length: riderCount }, (_, i) => ({
        id: `${name}-${i}`.toLowerCase(),
        bib: i, firstName: 'X', lastName: `R${i}`, nationality: 'FR', sourcePcsUrl: `rider/${name}-${i}`
      }))
    }))
  };
}

const silentLog = () => {};

describe('runReferenceSync — succès', () => {
  test('écrit sous referenceData/{competitionId}, distinct du raceId PCS', async () => {
    const referenceData = makeReferenceData([['Équipe A', 3], ['Équipe B', 3]]);
    const provider = fakeProvider(referenceData);
    const store = new FakeReferenceRosterStore();

    const result = await runReferenceSync({
      provider, raceId: 'tour-de-france/2026', competitionId: 'tdf-2026', store,
      expectedTeams: ['Équipe A', 'Équipe B'], expectedTeamSize: 3, log: silentLog
    });

    expect(result.success).toBe(true);
    expect(store.writes).toHaveLength(1);
    expect(store.writes[0].competitionId).toBe('tdf-2026');
    expect(store.writes[0].referenceData.teams).toHaveLength(2);
  });
});

describe('runReferenceSync — échec', () => {
  test('équipe attendue absente -> aucune écriture', async () => {
    const referenceData = makeReferenceData([['Équipe A', 3]]);
    const provider = fakeProvider(referenceData);
    const store = new FakeReferenceRosterStore();

    const result = await runReferenceSync({
      provider, raceId: 'tour-de-france/2026', competitionId: 'tdf-2026', store,
      expectedTeams: ['Équipe A', 'Équipe B'], expectedTeamSize: 3, log: silentLog
    });

    expect(result.success).toBe(false);
    expect(store.writes).toHaveLength(0);
  });

  test('erreur réseau -> aucune écriture', async () => {
    const provider = fakeProvider(new Error('Timeout réseau'));
    const store = new FakeReferenceRosterStore();

    const result = await runReferenceSync({
      provider, raceId: 'tour-de-france/2026', competitionId: 'tdf-2026', store, expectedTeams: [], log: silentLog
    });

    expect(result.success).toBe(false);
    expect(store.writes).toHaveLength(0);
    expect(result.reason).toMatch(/Timeout réseau/);
  });
});
