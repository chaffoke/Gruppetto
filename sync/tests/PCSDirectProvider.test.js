const fs = require('fs');
const path = require('path');
const { PCSDirectProvider } = require('../providers/PCSDirectProvider');

const fixtureHtml = fs.readFileSync(
  path.join(__dirname, 'fixtures/startlist-sample.html'),
  'utf-8'
);

describe('PCSDirectProvider.parseRosterHtml (sur fixture)', () => {
  const provider = new PCSDirectProvider();
  const result = provider.parseRosterHtml(fixtureHtml, 'tour-de-france/2026');

  test('retourne bien le raceId et un horodatage', () => {
    expect(result.raceId).toBe('tour-de-france/2026');
    expect(new Date(result.fetchedAt).toString()).not.toBe('Invalid Date');
  });

  test('récupère tous les coureurs de la fixture', () => {
    expect(result.riders).toHaveLength(11);
  });

  test('un coureur actif est bien marqué "active"', () => {
    const pogacar = result.riders.find(r => r.lastName === 'POGAČAR');
    expect(pogacar).toMatchObject({
      firstName: 'Tadej', team: 'UAE Team Emirates - XRG (WT)',
      status: 'active', sinceStage: null
    });
  });

  test('un nom de famille à plusieurs mots est correctement séparé', () => {
    const rider = result.riders.find(r => r.sourceRiderId === 'rider/isaac-del-toro');
    expect(rider).toMatchObject({ lastName: 'DEL TORO', firstName: 'Isaac' });
  });

  test('deux coureurs homonymes (même nom de famille) sont bien distingués par prénom', () => {
    const johannessens = result.riders.filter(r => r.lastName === 'JOHANNESSEN');
    expect(johannessens).toHaveLength(2);
    expect(johannessens.map(r => r.firstName).sort()).toEqual(['Anders Halland', 'Tobias Halland']);
  });

  test('un DNF est bien détecté avec son étape', () => {
    const rider = result.riders.find(r => r.lastName === 'VAN LERBERGHE');
    expect(rider).toMatchObject({ firstName: 'Bert', status: 'dnf', sinceStage: 6 });
  });

  test('un DNS est bien détecté', () => {
    const rider = result.riders.find(r => r.lastName === 'TRÆEN');
    expect(rider).toMatchObject({ status: 'dns', sinceStage: 7 });
  });

  test('OTL est mappé sur dnf', () => {
    const rider = result.riders.find(r => r.lastName === "O'BRIEN");
    expect(rider).toMatchObject({ status: 'dnf', sinceStage: 4 });
  });

  test('page vide -> aucun coureur, pas d\'exception', () => {
    const empty = provider.parseRosterHtml('<html><body></body></html>', 'x/2026');
    expect(empty.riders).toEqual([]);
  });
});
