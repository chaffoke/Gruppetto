/**
 * === Erreurs métier de results/ ===
 * Même principe que competitionImport : un code stable, un message
 * lisible. Les providers, une fois implémentés, lèveront ces erreurs
 * pour tout ce qui les empêche de produire une donnée (page absente,
 * structure imprévue) — jamais pour valider un contenu déjà récupéré,
 * ça reste le rôle de resultsValidation.js.
 */
class ResultsImportError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ResultsImportError';
    this.code = code;
  }
}

const ERROR_CODES = {
  RESULT_PAGE_NOT_FOUND: 'RESULT_PAGE_NOT_FOUND',
  CLASSIFICATION_PAGE_NOT_FOUND: 'CLASSIFICATION_PAGE_NOT_FOUND',
  UNKNOWN_RIDER: 'UNKNOWN_RIDER',
  UNKNOWN_TEAM: 'UNKNOWN_TEAM',
  DUPLICATE_POSITION: 'DUPLICATE_POSITION',
  INVALID_TIME: 'INVALID_TIME',
  INVALID_STATUS: 'INVALID_STATUS',
  INVALID_RESULT: 'INVALID_RESULT',
  INVALID_CLASSIFICATION: 'INVALID_CLASSIFICATION',
  STAGE_NOT_FOUND: 'STAGE_NOT_FOUND'
};

function resultPageNotFoundError(url, status) {
  return new ResultsImportError(ERROR_CODES.RESULT_PAGE_NOT_FOUND, `Page de résultat introuvable ou inaccessible (HTTP ${status}) : ${url}`);
}
function classificationPageNotFoundError(url, status) {
  return new ResultsImportError(ERROR_CODES.CLASSIFICATION_PAGE_NOT_FOUND, `Page de classement introuvable ou inaccessible (HTTP ${status}) : ${url}`);
}
function unknownRiderError(identifier) {
  return new ResultsImportError(ERROR_CODES.UNKNOWN_RIDER, `Coureur inconnu de referenceData : ${identifier}`);
}
function unknownTeamError(identifier) {
  return new ResultsImportError(ERROR_CODES.UNKNOWN_TEAM, `Équipe inconnue de referenceData : ${identifier}`);
}
function duplicatePositionError(context, ranks) {
  return new ResultsImportError(ERROR_CODES.DUPLICATE_POSITION, `Position(s) en double dans ${context} : ${ranks.join(', ')}`);
}
function invalidTimeError(field, value, context) {
  return new ResultsImportError(ERROR_CODES.INVALID_TIME, `Temps invalide "${field}"${context ? ' (' + context + ')' : ''} : ${value}`);
}
function invalidStatusError(value, context) {
  return new ResultsImportError(ERROR_CODES.INVALID_STATUS, `Statut invalide${context ? ' (' + context + ')' : ''} : ${value}`);
}
function invalidResultError(reason) {
  return new ResultsImportError(ERROR_CODES.INVALID_RESULT, `Résultat invalide : ${reason}`);
}
function invalidClassificationError(type, reason) {
  return new ResultsImportError(ERROR_CODES.INVALID_CLASSIFICATION, `Classement "${type}" invalide : ${reason}`);
}
function stageNotFoundError(competitionId, stageNumber) {
  return new ResultsImportError(ERROR_CODES.STAGE_NOT_FOUND, `Étape ${stageNumber} introuvable dans la compétition "${competitionId}" — importez d'abord competitionImport.`);
}

module.exports = {
  ResultsImportError, ERROR_CODES,
  resultPageNotFoundError, classificationPageNotFoundError, unknownRiderError, unknownTeamError,
  duplicatePositionError, invalidTimeError, invalidStatusError, invalidResultError,
  invalidClassificationError, stageNotFoundError
};
