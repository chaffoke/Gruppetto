const fs = require('fs');
const path = require('path');
const { PCSClassificationProvider } = require('../providers/PCSClassificationProvider');

const fixtureHtml = fs.readFileSync(path.join(__dirname, 'fixtures/classification-general-sample.html'), 'utf-8');

describe('PCSClassificationProvider.parseClassificationHtml (sur fixture GC réelle)', () => {
  const provider = new PCSClassificationProvider();
  const entries = provider.parseClassificationHtml(fixtureHtml);

  test('récupère les 3 lignes de la fixture', () => {
    expect(entries).toHaveLength(3);
  });

  test('le leader du général est correctement identifié', () => {
    expect(entries[0]).toMatchObject({ rank: 1, pcsRiderSlug: 'tadej-pogacar', pcsTeamSlug: 'uae-team-emirates-xrg-2026', time: '62:14:08' });
  });

  test('les rangs suivants ont leur écart dans "time"', () => {
    expect(entries[1].time).toBe('2:32');
    expect(entries[2].time).toBe('4:01');
  });
});

describe('PCSClassificationProvider.parseTeamsClassificationHtml (sur fixture réelle)', () => {
  const teamsFixtureHtml = fs.readFileSync(path.join(__dirname, 'fixtures/classification-teams-sample.html'), 'utf-8');
  const provider = new PCSClassificationProvider();
  const entries = provider.parseTeamsClassificationHtml(teamsFixtureHtml);

  test('récupère les 23 équipes classées', () => {
    expect(entries).toHaveLength(23);
  });

  test('leader correctement identifié, avec temps absolu', () => {
    expect(entries[0]).toEqual({ rank: 1, pcsRiderSlug: null, pcsTeamSlug: 'lidl-trek-2026', time: '167:15:39', points: null });
  });

  test('jamais de pcsRiderSlug — un classement équipes n\'a pas de coureur individuel', () => {
    entries.forEach(e => expect(e.pcsRiderSlug).toBeNull());
  });

  test('dernière équipe classée correcte', () => {
    expect(entries[22].pcsTeamSlug).toBe('team-picnic-postnl-2026');
  });
});

describe('PCSClassificationProvider.fetchClassification — garde-fous', () => {
  const provider = new PCSClassificationProvider();

  test('type inconnu -> erreur explicite', async () => {
    await expect(provider.fetchClassification('tour-de-france', 2026, 13, 'invalide'))
      .rejects.toThrow(/inconnu/);
  });
});
