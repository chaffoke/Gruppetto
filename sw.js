/**
 * Service Worker minimal pour Gruppetto.
 *
 * Périmètre volontairement restreint : uniquement le "shell" statique de
 * l'application (index.html, manifest, icônes). Aucune requête vers
 * Firebase/Firestore, aucun appel dynamique, aucune ressource externe
 * (CDN) n'est interceptée ou mise en cache par ce fichier — elles suivent
 * leur comportement réseau normal, sans aucune interférence.
 *
 * Stratégie : "network-first" pour le shell — toujours essayer d'obtenir
 * la version la plus récente en priorité ; le cache ne sert que de repli
 * si le réseau est indisponible (usage hors-ligne basique).
 */

const CACHE_NAME = 'gruppetto-shell-v1';

const SHELL_PATHS = [
  'index.html',
  'manifest.json',
  'favicon.ico',
  'favicon-16.png',
  'favicon-32.png',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_PATHS))
      .catch(() => {}) // ne bloque jamais l'installation si un asset manque
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  const isSameOrigin = url.origin === self.location.origin;
  const isNavigation = req.mode === 'navigate';
  const isShellAsset = isSameOrigin && SHELL_PATHS.some((p) => url.pathname.endsWith('/' + p) || url.pathname.endsWith(p));

  // Tout ce qui n'est pas explicitement le shell (Firebase, Firestore,
  // CDN, requêtes dynamiques...) : on ne touche à rien, comportement
  // réseau natif du navigateur, sans passer par ce Service Worker.
  if (!isSameOrigin || (!isNavigation && !isShellAsset)) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
        return response;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match('index.html'))
      )
  );
});
