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
 * ⚠️ Confirmé en conditions réelles : ouvrir une nouvelle page par
 * requête (browser.newPage() à chaque appel) déclenche un 403 dès la
 * deuxième requête — schéma identique au 429 déjà rencontré sur
 * PCSStageTimeProvider, mais plus strict ici (bloque plutôt que
 * limite). Corrigé par deux changements : une seule page réutilisée
 * pour toute la session (plus proche d'une vraie navigation humaine,
 * un seul onglet qui change de page), et un délai entre chaque
 * navigation.
 * ⚠️ Confirmé en conditions réelles, à deux reprises : ni le délai entre
 * requêtes, ni la réutilisation d'une seule page n'ont suffi à éviter
 * un 403 après la première requête. Cause la plus probable, corrigée
 * ici : un User-Agent explicitement identifié comme un script
 * (Gruppetto-ResultsImport/1.0), adapté à une requête HTTP honnête mais
 * qui trahit immédiatement l'automatisation pour un navigateur censé se
 * comporter comme un vrai visiteur — corrigé côté appelant (run.js).
 * En complément, puppeteer-extra + le plugin stealth masquent les
 * autres signaux habituels de détection headless (navigator.webdriver,
 * empreintes Chrome DevTools Protocol, etc.) — solution standard pour
 * ce type de blocage, pas une improvisation.
 * ⚠️ Confirmé en conditions réelles : le correctif User-Agent + stealth
 * a bien éliminé le 403. Nouveau problème constaté : le vrai tableau
 * n'apparaît toujours pas dans le délai imparti. Piste corrigée ici :
 * "networkidle2" se contente de 2 connexions réseau actives — les
 * nombreuses requêtes publicitaires/analytics déjà repérées sur PCS
 * peuvent maintenir ce niveau indéfiniment, faisant considérer la page
 * "chargée" avant même que le vrai contenu (chargé en dernier,
 * potentiellement après le reste) n'ait eu le temps d'arriver.
 * "networkidle0" (zéro connexion active) et un délai plus long
 * devraient laisser plus de marge.
 */
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

let sharedBrowser = null;
let sharedPage = null;

async function getPage(userAgent) {
  if (!sharedBrowser) {
    sharedBrowser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  if (!sharedPage) {
    sharedPage = await sharedBrowser.newPage();
    if (userAgent) await sharedPage.setUserAgent(userAgent);
  }
  return sharedPage;
}

async function closeBrowser() {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
    sharedPage = null;
  }
}

/**
 * @param {{ waitForSelector?: string, timeoutMs?: number, userAgent?: string, delayMs?: number }} options
 * @returns {(url: string, fetchOptions?: object) => Promise<{ ok: boolean, status: number, text: () => Promise<string> }>}
 */
function createBrowserFetch({ waitForSelector: defaultWaitForSelector = 'table.results', timeoutMs = 30000, userAgent, delayMs = 4000 } = {}) {
  let callCount = 0;

  return async function browserFetchImpl(url, fetchOptions = {}) {
    const waitForSelector = fetchOptions.waitForSelector || defaultWaitForSelector;
    const ua = userAgent || (fetchOptions.headers && fetchOptions.headers['User-Agent']);

    // Délai avant chaque requête sauf la toute première de la session —
    // espace les navigations pour ne pas ressembler à un enchaînement
    // automatisé.
    if (callCount > 0 && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    callCount++;

    const page = await getPage(ua);
    const response = await page.goto(url, { waitUntil: 'networkidle0', timeout: timeoutMs });
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
  };
}

module.exports = { createBrowserFetch, closeBrowser };
