/**
 * === Monitoring de la synchronisation ===
 * Ne connaît ni Firestore ni Gruppetto — prend un instantané (snapshot)
 * fraîchement récupéré et l'effectif précédemment connu, retourne un
 * verdict. sync.js décide quoi faire du verdict (conserver l'ancien état
 * si invalide, etc.) — cette fonction ne fait que constater.
 */
function validateSnapshot(snapshot, previousRiderCount, { tolerance = 10, minRiders = 20 } = {}) {
  const errors = [];

  if (!snapshot || !Array.isArray(snapshot.riders)) {
    errors.push('Réponse du fournisseur invalide (pas de liste de coureurs)');
    return { valid: false, errors };
  }

  const count = snapshot.riders.length;

  if (count < minRiders) {
    errors.push(`Nombre de coureurs anormalement bas : ${count} (minimum attendu : ${minRiders})`);
  }

  if (previousRiderCount != null && Math.abs(count - previousRiderCount) > tolerance) {
    errors.push(`Variation anormale de l'effectif : ${count} contre ${previousRiderCount} précédemment (tolérance : ${tolerance})`);
  }

  const withoutName = snapshot.riders.filter(r => !r.lastName).length;
  if (withoutName > 0) {
    errors.push(`${withoutName} coureur(s) sans nom de famille détecté(s) — indice probable d'un changement de mise en page`);
  }

  const validStatuses = new Set(['active', 'dns', 'dnf', 'dsq']);
  const badStatus = snapshot.riders.filter(r => !validStatuses.has(r.status)).length;
  if (badStatus > 0) {
    errors.push(`${badStatus} coureur(s) avec un statut non reconnu`);
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateSnapshot };
