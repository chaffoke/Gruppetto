/**
 * === Erreurs métier de competitionImport ===
 * Chaque erreur porte un code stable (utilisable en test ou en
 * diagnostic), distinct du message affiché. Les providers, une fois
 * implémentés, lèveront ces erreurs plutôt que des Error génériques —
 * mais ne font AUCUNE validation eux-mêmes : ils se contentent de
 * signaler l'impossibilité de produire une donnée (page absente,
 * structure imprévue). La validation du contenu déjà récupéré est
 * entièrement séparée (voir competitionImportValidation.js).
 */
class CompetitionImportError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CompetitionImportError';
    this.code = code;
  }
}

const ERROR_CODES = {
  PAGE_NOT_FOUND: 'PAGE_NOT_FOUND',
  UNEXPECTED_STRUCTURE: 'UNEXPECTED_STRUCTURE',
  MISSING_START_TIME: 'MISSING_START_TIME',
  MISSING_PROFILE_IMAGE: 'MISSING_PROFILE_IMAGE',
  STAGE_COUNT_MISMATCH: 'STAGE_COUNT_MISMATCH',
  DUPLICATE_STAGE_NUMBER: 'DUPLICATE_STAGE_NUMBER',
  INVALID_STAGE_NUMBER: 'INVALID_STAGE_NUMBER',
  INVALID_DATE: 'INVALID_DATE',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD'
};

function pageNotFoundError(url, status) {
  return new CompetitionImportError(ERROR_CODES.PAGE_NOT_FOUND, `Page introuvable ou inaccessible (HTTP ${status}) : ${url}`);
}
function unexpectedStructureError(context) {
  return new CompetitionImportError(ERROR_CODES.UNEXPECTED_STRUCTURE, `Structure HTML inattendue : ${context}`);
}
function missingStartTimeError(stageNumber) {
  return new CompetitionImportError(ERROR_CODES.MISSING_START_TIME, `Heure de départ introuvable pour l'étape ${stageNumber}`);
}
function missingProfileImageError(stageNumber) {
  return new CompetitionImportError(ERROR_CODES.MISSING_PROFILE_IMAGE, `Image de profil introuvable pour l'étape ${stageNumber}`);
}
function stageCountMismatchError(expected, actual) {
  return new CompetitionImportError(ERROR_CODES.STAGE_COUNT_MISMATCH, `Nombre d'étapes incohérent : ${actual} récupérée(s), ${expected} attendue(s)`);
}
function duplicateStageNumberError(numbers) {
  return new CompetitionImportError(ERROR_CODES.DUPLICATE_STAGE_NUMBER, `Numéro(s) d'étape en double : ${numbers.join(', ')}`);
}
function invalidStageNumberError(value) {
  return new CompetitionImportError(ERROR_CODES.INVALID_STAGE_NUMBER, `Numéro d'étape invalide : ${value}`);
}
function invalidDateError(field, value, stageNumber) {
  const where = stageNumber != null ? ` (étape ${stageNumber})` : '';
  return new CompetitionImportError(ERROR_CODES.INVALID_DATE, `Champ "${field}" invalide${where} : ${value}`);
}
function missingRequiredFieldError(field, context) {
  return new CompetitionImportError(ERROR_CODES.MISSING_REQUIRED_FIELD, `Champ obligatoire manquant "${field}"${context ? ' (' + context + ')' : ''}`);
}

module.exports = {
  CompetitionImportError, ERROR_CODES,
  pageNotFoundError, unexpectedStructureError, missingStartTimeError, missingProfileImageError,
  stageCountMismatchError, duplicateStageNumberError, invalidStageNumberError, invalidDateError,
  missingRequiredFieldError
};
