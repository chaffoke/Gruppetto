const fs = require('fs');
const path = require('path');
const { PCSTeamRosterProvider } = require('../providers/PCSTeamRosterProvider');

const fixtureHtml = fs.readFileSync(path.join(__dirname, 'fixtures/startlist-sample.html'), 'utf-8');

describe('PCSTeamRosterProvider.parseRosterHtml (sur fixture réelle)', () => {
  const provider = new PCSTeamRosterProvider();
  const result = provider.parseRosterHtml(fixtureHtml, 'tour-de-france/2026');

  test('retourne le raceId et un horodatage', () => {
    expect(result.raceId).toBe('tour-de-france/2026');
    expect(new Date(result.fetchedAt).toString()).not.toBe('Invalid Date');
  });

  test('récupère les 4 équipes de la fixture, avec leur lien PCS et un identifiant stable', () => {
    expect(result.teams).toHaveLength(4);
    const uae = result.teams.find(t => t.name === 'UAE Team Emirates - XRG (WT)');
    expect(uae.pcsUrl).toBe('team/uae-team-emirates-xrg-2026');
    expect(uae.id).toBe('uae-team-emirates-xrg-2026');
    expect(uae.jerseyUrl).toBeNull();
  });

  test('chaque coureur a un identifiant stable dérivé de l\'URL PCS', () => {
    const uae = result.teams.find(t => t.name === 'UAE Team Emirates - XRG (WT)');
    const pogacar = uae.riders.find(r => r.lastName === 'POGAČAR');
    expect(pogacar.id).toBe('tadej-pogacar');
  });

  test('extrait dossard, nom et nationalité correctement', () => {
    const uae = result.teams.find(t => t.name === 'UAE Team Emirates - XRG (WT)');
    const pogacar = uae.riders.find(r => r.lastName === 'POGAČAR');
    expect(pogacar).toMatchObject({
      bib: 1, firstName: 'Tadej', nationality: 'SI', sourcePcsUrl: 'rider/tadej-pogacar'
    });
  });

  test('gère un nom de famille à plusieurs mots', () => {
    const uae = result.teams.find(t => t.name === 'UAE Team Emirates - XRG (WT)');
    const delToro = uae.riders.find(r => r.sourcePcsUrl === 'rider/isaac-del-toro');
    expect(delToro).toMatchObject({ lastName: 'DEL TORO', firstName: 'Isaac', nationality: 'MX' });
  });

  test('distingue deux coureurs homonymes par prénom', () => {
    const unoX = result.teams.find(t => t.name === 'Uno-X Mobility (WT)');
    const johannessens = unoX.riders.filter(r => r.lastName === 'JOHANNESSEN');
    expect(johannessens).toHaveLength(2);
    expect(johannessens.map(r => r.firstName).sort()).toEqual(['Anders Halland', 'Tobias Halland']);
  });

  test('page vide -> aucune équipe, pas d\'exception', () => {
    const empty = provider.parseRosterHtml('<html><body></body></html>', 'x/2026');
    expect(empty.teams).toEqual([]);
  });
});
