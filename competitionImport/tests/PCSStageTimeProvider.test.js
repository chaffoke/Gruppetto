const fs = require('fs');
const path = require('path');
const { PCSStageTimeProvider } = require('../providers/PCSStageTimeProvider');

const fixtureHtml = fs.readFileSync(path.join(__dirname, 'fixtures/time-table-sample.html'), 'utf-8');

describe('PCSStageTimeProvider._fetchWithRetry — répétition en cas de 429', () => {
  test('429 puis succès -> la répétition récupère la donnée, une seule répétition effectuée', async () => {
    let callCount = 0;
    const fetchImpl = async () => {
      callCount++;
      if (callCount === 1) return { ok: false, status: 429 };
      return { ok: true, text: async () => fixtureHtml };
    };
    const provider = new PCSStageTimeProvider({ fetchImpl, retryDelayMs: 5 }); // délai court pour un test rapide
    const result = await provider.fetchStartTime('tour-de-france', 2026, 13, '2026-07-17');
    expect(callCount).toBe(2);
    expect(result.officialStartTime).toBe('2026-07-17T13:20:00');
  });

  test('429 persistant même après répétition -> erreur explicite, une seule répétition tentée (pas de boucle infinie)', async () => {
    let callCount = 0;
    const fetchImpl = async () => { callCount++; return { ok: false, status: 429 }; };
    const provider = new PCSStageTimeProvider({ fetchImpl, retryDelayMs: 5 });
    await expect(provider.fetchStartTime('tour-de-france', 2026, 13, '2026-07-17')).rejects.toThrow(/429/);
    expect(callCount).toBe(2); // 1 tentative + 1 répétition, jamais plus
  });

  test('erreur autre que 429 -> aucune répétition, échec immédiat', async () => {
    let callCount = 0;
    const fetchImpl = async () => { callCount++; return { ok: false, status: 500 }; };
    const provider = new PCSStageTimeProvider({ fetchImpl, retryDelayMs: 5 });
    await expect(provider.fetchStartTime('tour-de-france', 2026, 13, '2026-07-17')).rejects.toThrow(/500/);
    expect(callCount).toBe(1);
  });
});

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
