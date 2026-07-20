const fs = require('fs');
const path = require('path');
const { PCSClassificationProvider } = require('../providers/PCSClassificationProvider');

const fixtureHtml = fs.readFileSync(path.join(__dirname, 'fixtures/classification-general-sample.html'), 'utf-8');

describe('PCSClassificationProvider.parseClassificationHtml — garde-fou structurel', () => {
  const provider = new PCSClassificationProvider();

  test('cette fixture a en réalité la structure d\'un résultat d\'étape (gc/pnt), pas d\'un vrai classement cumulé (prev/delta) — rejetée, liste vide plutôt qu\'une fausse donnée', () => {
    const entries = provider.parseClassificationHtml(fixtureHtml);
    expect(entries).toEqual([]);
  });

  // ⚠️ Pas encore de fixture positive confirmée pour un vrai tableau
  // "prev"/"delta" (classement cumulé général/points/montagne/jeunes) —
  // à ajouter dès qu'un vrai extrait sera disponible. Ce test négatif
  // confirme au moins que le garde-fou empêche la corruption silencieuse
  // déjà constatée en conditions réelles.
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

  test('un tableau individuel (sans data-code="teamline") est rejeté -> liste vide, jamais de fausse donnée', () => {
    const individualFixtureHtml = fs.readFileSync(path.join(__dirname, 'fixtures/classification-general-sample.html'), 'utf-8');
    const bogus = provider.parseTeamsClassificationHtml(individualFixtureHtml);
    expect(bogus).toEqual([]);
  });
});

describe('PCSClassificationProvider.fetchClassification — garde-fous', () => {
  const provider = new PCSClassificationProvider();

  test('type inconnu -> erreur explicite', async () => {
    await expect(provider.fetchClassification('tour-de-france', 2026, 13, 'invalide'))
      .rejects.toThrow(/inconnu/);
  });
});
