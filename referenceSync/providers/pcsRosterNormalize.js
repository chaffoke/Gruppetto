/**
 * === Fonctions pures de normalisation pour PCSTeamRosterProvider ===
 * Séparées du parsing HTML pour être testables sans Cheerio.
 */

/**
 * Extrait le dossard depuis le texte complet d'un <li> coureur, ex.
 * "96VAN LERBERGHE Bert (DNF #6)" -> 96
 */
function extractBib(fullText) {
  const match = fullText.match(/^(\d+)/);
  return match ? Number(match[1]) : null;
}

/**
 * Extrait le code pays depuis la classe CSS du drapeau, ex.
 * class="flag si" -> "SI". PCS utilise des codes minuscules à 2 lettres ;
 * on les remonte en majuscules pour rester cohérent avec le reste du
 * projet (voir DEFAULT_TEAMS dans Gruppetto, qui utilise déjà ce format).
 */
function extractNationality(flagClassAttr) {
  if (!flagClassAttr) return null;
  const match = flagClassAttr.match(/\bflag\s+([a-z]{2})\b/);
  return match ? match[1].toUpperCase() : null;
}

module.exports = { extractBib, extractNationality };
