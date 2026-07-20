const fs = require('fs');
const path = require('path');
const { PCSCompetitionProvider } = require('../providers/PCSCompetitionProvider');

const fixtureHtml = fs.readFileSync(path.join(__dirname, 'fixtures/race-page-sample.html'), 'utf-8');

describe('PCSCompetitionProvider.parseCompetitionHtml (sur fixture réelle)', () => {
  const provider = new PCSCompetitionProvider();
  const result = provider.parseCompetitionHtml(fixtureHtml, 'tour-de-france', 2026);

  test('extrait correctement name/year depuis le titre', () => {
    expect(result.name).toBe('Tour de France');
    expect(result.year).toBe(2026);
  });

  test('extrait les dates au format ISO déjà fourni par PCS', () => {
    expect(result.startDate).toBe('2026-07-04');
    expect(result.endDate).toBe('2026-07-26');
  });

  test('compte 21 vraies étapes, exclut les 2 jours de repos et la ligne de total', () => {
    expect(result.stageCount).toBe(21);
  });

  test('conserve la classification et les infos complémentaires en extra', () => {
    expect(result.type).toBe('2.UWT');
    expect(result.extra.category).toBe('Men Elite');
    expect(result.extra.totalDistanceKm).toBe(3289.3);
  });
});
