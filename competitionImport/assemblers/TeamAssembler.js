/**
 * === TeamAssembler ===
 * Traduit le DTO brut de PCSTeamJerseyProvider vers le modèle métier
 * Team. Résolution d'identifiant injectée, comme les autres Assemblers.
 *
 * ⚠️ Pas de pcsJerseyClass ici, volontairement : contrairement aux
 * maillots individuels pendant une étape (attribut data-color confirmé
 * sur la page de résultat), la page startlist ne fournit qu'une IMAGE
 * pour le maillot d'équipe — aucun attribut CSS de type "classe" n'a été
 * observé à ce jour. Ajouter pcsJerseyClass ici reviendrait à inventer
 * une donnée non vérifiée.
 *
 * jersey.slug (nom de fichier sans extension, ex.
 * "uae-team-emirates-xrg-2026-n2") est conservé en plus de jersey.url :
 * plus pérenne qu'une URL complète (cache local, CDN, renommage de
 * ressources plus tard) — confirmé extrait correctement sur la vraie
 * fixture pour les 4 équipes testées.
 *
 * @param {Array<{ pcsTeamSlug: string, name: string, pcsJerseyUrl: string|null, pcsJerseySlug: string|null }>} rawTeams
 * @param {{ resolveTeamId?: (slug:string)=>string|null }} resolvers
 * @returns {Array<{ id: string, pcsSlug: string, name: string, jersey: { slug: string|null, url: string|null } }>}
 */
function assembleTeams(rawTeams, { resolveTeamId } = {}) {
  return (rawTeams || []).map(raw => ({
    id: resolveTeamId ? resolveTeamId(raw.pcsTeamSlug) : raw.pcsTeamSlug,
    pcsSlug: raw.pcsTeamSlug,
    name: raw.name,
    jersey: {
      slug: raw.pcsJerseySlug || null,
      url: raw.pcsJerseyUrl || null
    }
  }));
}

module.exports = { assembleTeams };
