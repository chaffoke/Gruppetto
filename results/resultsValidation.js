/**
 * === Validations — results/ ===
 * Même philosophie que competitionImport : les providers ne valident
 * rien, seul ce fichier le fait, appelé par l'orchestrateur avant toute
 * écriture. Deux niveaux : errors (bloquant) et warnings (signalé, pas
 * bloquant).
 */
const { STAGE_RESULT_STATUSES, CLASSIFICATION_TYPES } = require('./models');
const {
  unknownRiderError, unknownTeamError, duplicatePositionError,
  invalidStatusError, invalidResultError, invalidClassificationError
} = require('./resultsErrors');

const VALID_STATUSES = Object.values(STAGE_RESULT_STATUSES);

/**
 * @param {import('./models').StageResultEntry} entry
 * @param {{ knownRiderIds?: Set<string>, knownTeamIds?: Set<string> }} options
 *   Les deux ensembles sont optionnels — s'ils ne sont pas fournis, la
 *   vérification "coureur/équipe inconnu(e)" est simplement ignorée
 *   (impossible de valider contre rien), pas un échec silencieux caché.
 */
function validateStageResultEntry(entry, { knownRiderIds, knownTeamIds } = {}) {
  const errors = [];
  const warnings = [];

  if (!entry || typeof entry !== 'object') {
    errors.push('Entrée de résultat manquante ou invalide.');
    return { valid: false, errors, warnings };
  }

  if (!entry.riderId || typeof entry.riderId !== 'string') {
    errors.push(invalidResultError(`riderId manquant (bib ${entry.bib})`).message);
  } else if (knownRiderIds && !knownRiderIds.has(entry.riderId)) {
    errors.push(unknownRiderError(entry.riderId).message);
  }

  if (entry.teamId != null && knownTeamIds && !knownTeamIds.has(entry.teamId)) {
    errors.push(unknownTeamError(entry.teamId).message);
  }

  if (!VALID_STATUSES.includes(entry.status)) {
    errors.push(invalidStatusError(entry.status, `riderId ${entry.riderId}`).message);
  }

  if (entry.status === STAGE_RESULT_STATUSES.FINISHED && entry.rank == null) {
    errors.push(invalidResultError(`rang manquant pour un statut "finished" (riderId ${entry.riderId})`).message);
  }
  if (entry.status && entry.status !== STAGE_RESULT_STATUSES.FINISHED && entry.rank != null) {
    warnings.push(`Rang présent (${entry.rank}) alors que le statut n'est pas "finished" (riderId ${entry.riderId}) — conservé tel quel.`);
  }
  if (entry.rank != null && (typeof entry.rank !== 'number' || entry.rank < 1)) {
    errors.push(invalidResultError(`rang invalide : ${entry.rank} (riderId ${entry.riderId})`).message);
  }

  if (entry.bonusSeconds != null && (typeof entry.bonusSeconds !== 'number' || entry.bonusSeconds < 0)) {
    errors.push(`bonusSeconds invalide pour riderId ${entry.riderId} : ${entry.bonusSeconds}`);
  }
  if (entry.points != null && (typeof entry.points !== 'number' || entry.points < 0)) {
    errors.push(`points invalide pour riderId ${entry.riderId} : ${entry.points}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateStageResults(entries, options = {}) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(entries)) {
    errors.push('Liste de résultats manquante ou invalide.');
    return { valid: false, errors, warnings };
  }

  const ranks = entries.map(e => e && e.rank).filter(r => r != null);
  const duplicateRanks = [...new Set(ranks.filter((r, i) => ranks.indexOf(r) !== i))];
  if (duplicateRanks.length > 0) {
    errors.push(duplicatePositionError("le résultat d'étape", duplicateRanks).message);
  }

  entries.forEach(entry => {
    const r = validateStageResultEntry(entry, options);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  });

  return { valid: errors.length === 0, errors, warnings };
}

function validateClassificationEntry(type, entry) {
  const errors = [];
  const warnings = [];

  if (!entry || typeof entry !== 'object') {
    errors.push('Entrée de classement manquante ou invalide.');
    return { valid: false, errors, warnings };
  }

  if (entry.rank == null || typeof entry.rank !== 'number' || entry.rank < 1) {
    errors.push(invalidClassificationError(type, `rang invalide : ${entry.rank}`).message);
  }

  if (type === CLASSIFICATION_TYPES.TEAMS) {
    if (!entry.teamId) errors.push(invalidClassificationError(type, `teamId manquant (rang ${entry.rank})`).message);
  } else if (!entry.riderId) {
    errors.push(invalidClassificationError(type, `riderId manquant (rang ${entry.rank})`).message);
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateClassification(type, entries) {
  const errors = [];
  const warnings = [];

  if (!Object.values(CLASSIFICATION_TYPES).includes(type)) {
    errors.push(`Type de classement inconnu : "${type}"`);
    return { valid: false, errors, warnings };
  }
  if (!Array.isArray(entries)) {
    errors.push(invalidClassificationError(type, 'liste manquante ou invalide').message);
    return { valid: false, errors, warnings };
  }

  const ranks = entries.map(e => e && e.rank).filter(r => r != null);
  const duplicateRanks = [...new Set(ranks.filter((r, i) => ranks.indexOf(r) !== i))];
  if (duplicateRanks.length > 0) {
    errors.push(duplicatePositionError(`le classement "${type}"`, duplicateRanks).message);
  }

  entries.forEach(entry => {
    const r = validateClassificationEntry(type, entry);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  });

  return { valid: errors.length === 0, errors, warnings };
}

module.exports = { validateStageResultEntry, validateStageResults, validateClassificationEntry, validateClassification };
