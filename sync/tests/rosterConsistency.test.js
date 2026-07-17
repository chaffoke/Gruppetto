const { checkRosterConsistency, normalizeTeamName } = require('../rosterConsistency');

function rider(lastName, team, status = 'active', sinceStage = null, id = null) {
  return { lastName, firstName: 'X', team, status, sinceStage, sourceRiderId: id || `/rider/${lastName.toLowerCase()}` };
}

function makeTeam(team, count, idPrefix) {
  return Array.from({ length: count }, (_, i) => rider(`R${i}`, team, 'active', null, `/rider/${idPrefix}${i}`));
}

const expectedTeams = ['UAE Team Emirates - XRG', 'Soudal Quick-Step', 'Lidl - Trek'];

function baseSnapshot() {
  const riders = [
    ...makeTeam('UAE Team Emirates - XRG (WT)', 8, 'uae'),
    ...makeTeam('Soudal Quick-Step (WT)', 8, 'soudal'),
    ...makeTeam('Lidl - Trek (WT)', 8, 'lidl')
  ];
  riders[0].lastName = 'POGAČAR';
  riders[13].lastName = 'VAN LERBERGHE';
  riders[13].status = 'dnf';
  riders[13].sinceStage = 6;
  return { riders };
}

const knownRiders = [
  { lastName: 'VAN LERBERGHE', expectedStatus: 'dnf', expectedStage: 6 },
  { lastName: 'POGAČAR', expectedStatus: 'active', expectedStage: null }
];

describe('normalizeTeamName', () => {
  test('retire le suffixe de catégorie', () => {
    expect(normalizeTeamName('Soudal Quick-Step (WT)')).toBe('Soudal Quick-Step');
    expect(normalizeTeamName('Cofidis (PRT)')).toBe('Cofidis');
    expect(normalizeTeamName('Sans suffixe')).toBe('Sans suffixe');
  });
});

describe('checkRosterConsistency', () => {
  test('cas nominal : tout est cohérent', () => {
    const result = checkRosterConsistency(baseSnapshot(), { expectedTeams, expectedTeamSize: 8, knownRiders });
    expect(result.passed).toBe(true);
  });

  test('détecte une équipe incomplète', () => {
    const snap = baseSnapshot();
    snap.riders = snap.riders.filter(r => !(r.team.includes('Lidl') && ['R0', 'R1'].includes(r.lastName)));
    const result = checkRosterConsistency(snap, { expectedTeams, expectedTeamSize: 8, knownRiders });
    expect(result.passed).toBe(false);
    expect(result.checks.some(c => !c.ok && c.message.includes('Lidl - Trek incomplète'))).toBe(true);
  });

  test('détecte une équipe attendue totalement absente', () => {
    const snap = baseSnapshot();
    snap.riders = snap.riders.filter(r => !r.team.includes('Lidl'));
    const result = checkRosterConsistency(snap, { expectedTeams, expectedTeamSize: 8, knownRiders });
    expect(result.passed).toBe(false);
    expect(result.checks.some(c => !c.ok && c.message.includes('introuvable'))).toBe(true);
  });

  test('détecte un coureur en double', () => {
    const snap = baseSnapshot();
    snap.riders.push({ ...snap.riders[0] });
    const result = checkRosterConsistency(snap, { expectedTeams, expectedTeamSize: 8, knownRiders });
    expect(result.passed).toBe(false);
    expect(result.checks.some(c => !c.ok && c.message.includes('doublon'))).toBe(true);
  });

  test('détecte un identifiant source dupliqué', () => {
    const snap = baseSnapshot();
    snap.riders[1].sourceRiderId = snap.riders[0].sourceRiderId;
    const result = checkRosterConsistency(snap, { expectedTeams, expectedTeamSize: 8, knownRiders });
    expect(result.passed).toBe(false);
    expect(result.checks.some(c => !c.ok && c.message.includes('identifiant'))).toBe(true);
  });

  test('détecte un coureur rattaché à une équipe non reconnue', () => {
    const snap = baseSnapshot();
    snap.riders[0].team = 'Équipe Fantôme (WT)';
    const result = checkRosterConsistency(snap, { expectedTeams, expectedTeamSize: 8, knownRiders });
    expect(result.passed).toBe(false);
    expect(result.checks.some(c => !c.ok && c.message.includes('non reconnue'))).toBe(true);
  });

  test('détecte un coureur de référence manquant', () => {
    const snap = baseSnapshot();
    snap.riders = snap.riders.filter(r => r.lastName !== 'VAN LERBERGHE');
    const result = checkRosterConsistency(snap, { expectedTeams, expectedTeamSize: 8, knownRiders });
    expect(result.passed).toBe(false);
    expect(result.checks.some(c => !c.ok && c.message.includes('VAN LERBERGHE'))).toBe(true);
  });

  test('détecte un coureur de référence avec un statut inattendu', () => {
    const snap = baseSnapshot();
    const rider = snap.riders.find(r => r.lastName === 'VAN LERBERGHE');
    rider.status = 'active';
    rider.sinceStage = null;
    const result = checkRosterConsistency(snap, { expectedTeams, expectedTeamSize: 8, knownRiders });
    expect(result.passed).toBe(false);
    expect(result.checks.some(c => !c.ok && c.message.includes('statut inattendu'))).toBe(true);
  });

  test('fonctionne sans expectedTeams ni knownRiders (mode informatif seul)', () => {
    const result = checkRosterConsistency(baseSnapshot());
    expect(result.passed).toBe(true);
    expect(result.checks.length).toBeGreaterThan(0);
  });
});
