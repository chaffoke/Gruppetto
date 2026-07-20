/**
 * === browserFetch ===
 * Fournit un fetchImpl compatible avec l'interface déjà attendue par
 * les providers ({ ok, status, text() }) — mais qui exécute réellement
 * le JavaScript de la page via un navigateur headless (Puppeteer),
 * plutôt qu'une simple requête HTTP.
 *
 * Nécessaire UNIQUEMENT pour les classements cumulés
 * (general/points/mountain/youth/teams) — confirmé en conditions
 * réelles que leur contenu (tableau data-code="prev"/"teamline") n'est
 * jamais présent dans une réponse HTTP brute, seulement dans le DOM
 * après exécution JavaScript. Les autres providers (résultat d'étape,
 * horaires, favoris, maillots d'équipe) continuent d'utiliser un fetch
 * HTTP classique — ils fonctionnent déjà, aucune raison de les
 * alourdir.
 *
 * N'importe PCSClassificationProvider ne connaît jamais Puppeteer —
 * seule la fonction fetchImpl injectée change, sa logique de parsing
 * (déjà écrite et vérifiée sur le DOM réel) reste identique.
 *
 * ⚠️ Jamais testé en conditions réelles avant ce chantier — premier
 * vrai test à faire via GitHub Actions.
 */
const puppeteer = require('puppeteer');

let sharedBrowser = null;

async function getBrowser() {
  if (!sharedBrowser) {
    sharedBrowser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // requis sur la plupart des runners CI
    });
  }
  return sharedBrowser;
}

async function closeBrowser() {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
  }
}

/**
 * @param {{ waitForSelector?: string, timeoutMs?: number, userAgent?: string }} options
 * @returns {(url: string, fetchOptions?: object) => Promise<{ ok: boolean, status: number, text: () => Promise<string> }>}
 */
function createBrowserFetch({ waitForSelector: defaultWaitForSelector = 'table.results', timeoutMs = 20000, userAgent } = {}) {
  return async function browserFetchImpl(url, fetchOptions = {}) {
    const waitForSelector = fetchOptions.waitForSelector || defaultWaitForSelector;
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      if (userAgent || (fetchOptions.headers && fetchOptions.headers['User-Agent'])) {
        await page.setUserAgent(userAgent || fetchOptions.headers['User-Agent']);
      }
      const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: timeoutMs });
      const status = response ? response.status() : 0;
      const ok = response ? response.ok() : false;

      if (ok && waitForSelector) {
        try {
          await page.waitForSelector(waitForSelector, { timeout: timeoutMs });
        } catch (e) {
          // Le sélecteur n'est jamais apparu — on renvoie quand même le HTML
          // tel quel, PCSClassificationProvider détectera lui-même
          // l'absence de la vraie structure (data-code="prev"/"teamline")
          // et renverra une liste vide, comme conçu pour ce cas.
        }
      }

      const html = await page.content();
      return { ok, status, text: async () => html };
    } finally {
      await page.close();
    }
  };
}

module.exports = { createBrowserFetch, closeBrowser };
