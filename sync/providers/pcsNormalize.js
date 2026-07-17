/**
 * === Fonctions pures de normalisation pour PCSDirectProvider ===
 * Séparées du parsing HTML pour être testables sans cheerio ni réseau.
 */

const STATUS_MAP = {
  DNF: 'dnf',
  DNS: 'dns',
  DSQ: 'dsq',
  // "Hors délai" — éliminé dans les faits, traité comme un abandon.
  // À confirmer avec Kevin : c'est une convention choisie, pas une règle PCS.
  OTL: 'dnf'
};

/**
 * PCS affiche les noms "SURNOM Prénom" (surnom en MAJUSCULES, prénom en
 * casse normale) — y compris pour les surnoms à plusieurs mots
 * ("VAN DER POEL Mathieu", "DEL TORO Isaac"). On ne peut donc pas se fier
 * au premier mot seul : on prend tous les mots en tête qui sont
 * entièrement en majuscules.
 *
 * Limite connue à surveiller : certains caractères spéciaux (ex. le "ß"
 * allemand) peuvent se comporter différemment selon la locale lors de la
 * comparaison en majuscules — à vérifier sur un vrai run si un nom semble
 * mal coupé.
 */
function splitPcsName(rawName) {
  const words = rawName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { lastName: '', firstName: null };

  let i = 0;
  while (i < words.length && words[i] === words[i].toUpperCase()) i++;
  if (i === 0) i = 1; // toujours au moins un mot de surnom

  return {
    lastName: words.slice(0, i).join(' '),
    firstName: words.slice(i).join(' ') || null
  };
}

/**
 * Extrait un statut PCS du texte associé à un coureur, par ex.
 * "96 VAN LERBERGHE Bert (DNF #6)" -> { status: 'dnf', sinceStage: 6 }
 * Aucune mention -> coureur toujours actif.
 */
function extractStatus(fullText) {
  const match = fullText.match(/\((DNF|DNS|DSQ|OTL)\s*#?\s*(\d+)?\)/);
  if (!match) return { status: 'active', sinceStage: null };
  return {
    status: STATUS_MAP[match[1]] || 'active',
    sinceStage: match[2] ? Number(match[2]) : null
  };
}

module.exports = { splitPcsName, extractStatus, STATUS_MAP };
