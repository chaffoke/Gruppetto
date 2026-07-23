/**
 * === jerseyImageDownloader ===
 * Télécharge l'image d'un maillot d'équipe (URL PCS brute, jamais
 * hébergée par Gruppetto jusqu'ici) et la convertit en data URI base64,
 * stockable directement dans le document Firestore de l'équipe.
 *
 * Pourquoi côté serveur et pas simplement `<img src="...">` dans le
 * navigateur du joueur : PCS a visiblement resserré sa protection
 * anti-hotlink en même temps que le reste de son verrouillage (cf.
 * results/sync) — l'image ne charge plus quand elle est intégrée depuis
 * un autre domaine. Une requête serveur à serveur (celle-ci) n'est pas
 * soumise à cette même vérification de Referer/origine.
 *
 * Ne bloque jamais tout l'import pour UNE image manquante — l'appelant
 * (competitionImport.js) attrape l'erreur et garde `jersey.url` en repli.
 */
async function downloadJerseyDataUri(url, {
  fetchImpl = globalThis.fetch,
  userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
} = {}) {
  const res = await fetchImpl(url, { headers: { 'User-Agent': userAgent } });
  if (!res.ok) {
    throw new Error(`téléchargement impossible : HTTP ${res.status} pour ${url}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const contentType = (res.headers && typeof res.headers.get === 'function' && res.headers.get('content-type')) || 'image/png';
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return `data:${contentType};base64,${base64}`;
}

module.exports = { downloadJerseyDataUri };
