/**
 * === TeamAssembler ===
 * Traduit le DTO brut de PCSTeamJerseyProvider vers le modèle métier
 * Team. Résolution d'identifiant injectée, comme les autres Assemblers.
 *
 * Nommage délibérément différent de JerseyAssembler (pcsJerseyClass,
 * une valeur d'attribut CSS type "polkadot") : le maillot d'équipe est
 * représenté par une VRAIE IMAGE PCS (URL), pas un simple attribut —
 * pcsJerseyUrl reflète cette différence de nature, plutôt que de
 * forcer un nom identique pour deux représentations différentes.
 *
 * ⚠️ Pas de pcsJerseyClass ici, volontairement : contrairement aux
 * maillots individuels pendant une étape (attribut data-color confirmé
 * sur la page de résultat), la page startlist ne fournit qu'une IMAGE
 * pour le maillot d'équipe — aucun attribut CSS de type "classe" n'a été
 * observé à ce jour. Ajouter pcsJerseyClass ici reviendrait à inventer
 * une donnée non vérifiée.
 *
 * @param {Array<{ pcsTeamSlug: string, name: string, pcsJerseyUrl: string|null }>} rawTeams
 * @param {{ resolveTeamId?: (slug:string)=>string|null }} resolvers
 * @returns {Array<{ id: string, pcsSlug: string, name: string, pcsJerseyUrl: string|null }>}
 */
function assembleTeams(rawTeams, { resolveTeamId } = {}) {
  return (rawTeams || []).map(raw => ({
    id: resolveTeamId ? resolveTeamId(raw.pcsTeamSlug) : raw.pcsTeamSlug,
    pcsSlug: raw.pcsTeamSlug,
    name: raw.name,
    pcsJerseyUrl: raw.pcsJerseyUrl || null
  }));
}

module.exports = { assembleTeams };
