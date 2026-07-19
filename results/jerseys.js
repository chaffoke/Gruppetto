/**
 * === deriveJerseyHolders ===
 * Les maillots ne sont pas une donnée importée séparément — ce sont une
 * CONSÉQUENCE des classements déjà en main. Fonction pure, appelable par
 * n'importe quel module (Live, fiche coureur), jamais un provider, jamais
 * une écriture Firestore dédiée : aucune duplication de donnée.
 *
 * Si demain PCS expose une information de maillot réellement différente
 * (ex. "maillot sur la route" pendant l'étape, distinct du classement
 * final), un provider dédié pourra être ajouté sans remettre en cause
 * cette fonction — elle continuera de représenter la dérivation "après
 * étape", qui restera toujours utile.
 *
 * @param {{ general?: Array, points?: Array, mountain?: Array, youth?: Array }} classifications
 *   Chaque tableau trié par rang croissant (rang 1 en premier).
 * @returns {{ yellow: string|null, green: string|null, polka: string|null, white: string|null }}
 */
function deriveJerseyHolders(classifications = {}) {
  const leaderOf = (list) => (Array.isArray(list) && list[0] && list[0].riderId) || null;
  return {
    yellow: leaderOf(classifications.general),
    green: leaderOf(classifications.points),
    polka: leaderOf(classifications.mountain),
    white: leaderOf(classifications.youth)
  };
}

module.exports = { deriveJerseyHolders };
