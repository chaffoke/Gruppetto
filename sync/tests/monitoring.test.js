const { validateSnapshot } = require('../monitoring');

function fakeRiders(n, status = 'active') {
  return Array.from({ length: n }, (_, i) => ({ lastName: `Rider${i}`, status }));
}

describe('validateSnapshot', () => {
  test('effectif stable -> valide', () => {
    const snap = { riders: fakeRiders(184) };
    expect(validateSnapshot(snap, 184).valid).toBe(true);
  });

  test('petite variation -> valide', () => {
    const snap = { riders: fakeRiders(180) };
    expect(validateSnapshot(snap, 184).valid).toBe(true);
  });

  test('chute brutale de l\'effectif -> invalide', () => {
    const snap = { riders: fakeRiders(150) };
    const result = validateSnapshot(snap, 184);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/anormale/);
  });

  test('réponse vide -> invalide', () => {
    expect(validateSnapshot({ riders: [] }, 184, { minRiders: 20 }).valid).toBe(false);
    expect(validateSnapshot(null, 184).valid).toBe(false);
    expect(validateSnapshot({}, 184).valid).toBe(false);
  });

  test('coureurs sans nom -> invalide', () => {
    const snap = { riders: [{ lastName: '', status: 'active' }] };
    expect(validateSnapshot(snap, null, { minRiders: 1 }).valid).toBe(false);
  });

  test('statut non reconnu -> invalide', () => {
    const snap = { riders: [{ lastName: 'X', status: 'blessé' }] };
    expect(validateSnapshot(snap, null, { minRiders: 1 }).valid).toBe(false);
  });

  test('premier run sans historique (previousRiderCount=null) -> ne bloque pas sur la variation', () => {
    const snap = { riders: fakeRiders(184) };
    expect(validateSnapshot(snap, null).valid).toBe(true);
  });
});
