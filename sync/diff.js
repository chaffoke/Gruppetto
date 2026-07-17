/**
 * === Diff bidirectionnel ===
 * Compare le roster fraîchement récupéré à l'état précédemment connu
 * (peu importe sa provenance). Un changement dans N'IMPORTE QUELLE
 * direction (active→dnf, dnf→active, dns→dsq, etc.) est traité de façon
 * strictement identique : une simple différence de valeur, jamais une
 * machine à états avec des transitions "autorisées". Firestore doit
 * toujours refléter la source, jamais une hypothèse sur le sens plausible
 * d'un changement.
 *
 * previousStatuses : Map ou objet { sourceRiderId: { status, sinceStage } }
 * Un coureur absent de previousStatuses est considéré comme nouveau
 * (from: null) — pas une erreur.
 */
function computeRiderDiff(riders, previousStatuses = {}) {
  const changes = [];

  riders.forEach(r => {
    const key = r.sourceRiderId;
    const previous = key ? previousStatuses[key] : undefined;
    const previousStatus = previous ? previous.status : null;
    const previousStage = previous ? previous.sinceStage : null;

    const statusChanged = previousStatus !== r.status;
    const stageChanged = previousStage !== r.sinceStage;

    if (statusChanged || (r.status !== 'active' && stageChanged)) {
      changes.push({
        sourceRiderId: key,
        lastName: r.lastName,
        firstName: r.firstName,
        team: r.team,
        from: previousStatus,
        to: r.status,
        fromStage: previousStage,
        toStage: r.sinceStage
      });
    }
  });

  return changes;
}

module.exports = { computeRiderDiff };
