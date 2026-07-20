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

describe('PCSClassificationProvider.fetchClassification — garde-fous', () => {
  const provider = new PCSClassificationProvider();

  test('classement "teams" -> erreur explicite (structure non vérifiée)', async () => {
    await expect(provider.fetchClassification('tour-de-france', 2026, 13, 'teams'))
      .rejects.toThrow(/non implémenté/);
  });

  test('type inconnu -> erreur explicite', async () => {
    await expect(provider.fetchClassification('tour-de-france', 2026, 13, 'invalide'))
      .rejects.toThrow(/inconnu/);
  });
});
