/**
 * === FavoritesAssembler ===
 * Traduit le DTO brut de PCSFavoritesProvider vers le modèle métier
 * Favorite. Résolution d'identifiant injectée, comme les autres
 * Assemblers du projet — jamais lue directement ici.
 *
 * @param {Array<{ rank: number, pcsRiderSlug: string, name: string, nationalityCode: string|null }>} rawFavorites
 * @param {{ resolveRiderId?: (slug:string)=>string|null }} resolvers
 * @returns {Array<{ riderId: string, pcsSlug: string, name: string, nationality: string|null, pcsRank: number }>}
 */
function assembleFavorites(rawFavorites, { resolveRiderId } = {}) {
  return (rawFavorites || []).map(raw => ({
    riderId: resolveRiderId ? resolveRiderId(raw.pcsRiderSlug) : raw.pcsRiderSlug,
    pcsSlug: raw.pcsRiderSlug,
    name: raw.name,
    nationality: raw.nationalityCode || null,
    pcsRank: raw.rank
  }));
}

module.exports = { assembleFavorites };
