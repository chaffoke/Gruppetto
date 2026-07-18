/**
 * === Identifiants stables ===
 *
 * Pour ProCyclingStats, "l'identifiant PCS" et "l'identifiant dérivé de
 * l'URL PCS" sont en pratique la MÊME chose : le slug figurant dans
 * l'URL (ex. "tadej-pogacar" dans "rider/tadej-pogacar") EST
 * l'identifiant que PCS utilise lui-même pour cette entité — il n'existe
 * pas de champ "id" séparé ailleurs sur la page. D'où seulement deux
 * niveaux de repli ici, pas trois :
 *   1. slug extrait de l'URL PCS (cas normal, quasi toujours disponible)
 *   2. slug dérivé du nom (repli défensif, si jamais le lien est absent)
 *
 * Ces identifiants sont ce que TOUS les autres modules (Live,
 * pronostics, futurs imports) doivent utiliser pour se référer à une
 * équipe ou un coureur — jamais un nom, jamais sensible à un
 * renommage, un accent ou une homonymie.
 */

function slugify(text) {
  return String(text || '')
    .replace(/ß/g, 'ss') // le ß ne se décompose pas via NFD (ce n'est pas un accent)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // enlève les accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Extrait le dernier segment d'une URL PCS de type "team/xxx" ou "rider/xxx". */
function extractSlugFromPcsUrl(pcsUrl) {
  if (!pcsUrl) return null;
  const parts = pcsUrl.split('/').filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : null;
}

/**
 * @param {{ pcsUrl: string|null, name: string }} team
 * @returns {string} identifiant stable
 */
function deriveTeamId(team) {
  return extractSlugFromPcsUrl(team.pcsUrl) || slugify(team.name);
}

/**
 * @param {{ sourcePcsUrl: string|null, lastName: string, firstName: string|null }} rider
 * @returns {string} identifiant stable
 */
function deriveRiderId(rider) {
  return extractSlugFromPcsUrl(rider.sourcePcsUrl) || slugify(`${rider.lastName}-${rider.firstName || ''}`);
}

module.exports = { slugify, extractSlugFromPcsUrl, deriveTeamId, deriveRiderId };
