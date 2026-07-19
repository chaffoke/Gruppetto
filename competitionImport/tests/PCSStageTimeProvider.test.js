const fs = require('fs');
const path = require('path');
const { PCSStageTimeProvider } = require('../providers/PCSStageTimeProvider');

const fixtureHtml = fs.readFileSync(path.join(__dirname, 'fixtures/time-table-sample.html'), 'utf-8');

describe('PCSStageTimeProvider.parseTimeTableHtml (sur fixture réelle)', () => {
  const provider = new PCSStageTimeProvider();

  test('extrait l\'heure de départ officielle et la combine avec la date fournie', () => {
    const result = provider.parseTimeTableHtml(fixtureHtml, '2026-07-17');
    expect(result.officialStartTime).toBe('2026-07-17T13:20:00');
  });

  test('sans date fournie -> null (impossible de construire une heure complète)', () => {
    const result = provider.parseTimeTableHtml(fixtureHtml, null);
    expect(result.officialStartTime).toBeNull();
  });

  test('page sans ligne "Start" -> null, pas d\'exception', () => {
    const empty = provider.parseTimeTableHtml('<table class="basic"><tbody><tr><td>1</td><td>Finish</td><td>18:00</td></tr></tbody></table>', '2026-07-17');
    expect(empty.officialStartTime).toBeNull();
  });
});
