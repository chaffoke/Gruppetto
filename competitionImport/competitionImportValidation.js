/**
 * === Validations — competitionImport ===
 *
 * Chaque fonction reçoit l'objet DÉJÀ produit par un provider (peu
 * importe qu'il vienne d'un vrai parseur Cheerio ou d'une donnée
 * simulée en test) et vérifie sa conformité au contrat métier. Les
 * providers eux-mêmes ne valident RIEN — ce sont de simples adaptateurs
 * HTML → objet. Seul l'orchestrateur appelle ces validations, avant
 * d'écrire quoi que ce soit.
 *
 * Deux niveaux, volontairement distincts :
 *  - errors   : bloquant, la donnée est inutilisable telle quelle.
 *  - warnings : signalé, mais n'empêche pas l'import (ex. heure de
 *               départ ou image absente, pas assez de vérifications
 *               officielles à ce stade pour être fatal).
 */
const {
  stageCountMismatchError, duplicateStageNumberError, invalidStageNumberError,
  invalidDateError, missingRequiredFieldError, missingStartTimeError, missingProfileImageError
} = require('./competitionImportErrors');

function validateCompetitionInfo(info) {
  const errors = [];
  const warnings = [];

  if (!info || typeof info !== 'object') {
    errors.push('Objet de compétition manquant ou invalide.');
    return { valid: false, errors, warnings };
  }

  if (!info.name || typeof info.name !== 'string') errors.push(missingRequiredFieldError('name').message);
  if (!info.year || typeof info.year !== 'number') errors.push(missingRequiredFieldError('year').message);
  if (info.stageCount == null || typeof info.stageCount !== 'number' || info.stageCount <= 0) {
    errors.push(missingRequiredFieldError('stageCount').message);
  }
  if (!info.pcsUrl) warnings.push('pcsUrl absent.');
  if (!info.pcsSlug) warnings.push('pcsSlug absent.');
  if (info.startDate && isNaN(Date.parse(info.startDate))) errors.push(invalidDateError('startDate', info.startDate).message);
  if (info.endDate && isNaN(Date.parse(info.endDate))) errors.push(invalidDateError('endDate', info.endDate).message);

  return { valid: errors.length === 0, errors, warnings };
}

function validateStageListEntry(stage) {
  const errors = [];
  const warnings = [];

  if (!stage || typeof stage !== 'object') {
    errors.push('Objet étape manquant ou invalide.');
    return { valid: false, errors, warnings };
  }

  if (stage.stageNumber == null || typeof stage.stageNumber !== 'number' || stage.stageNumber < 1) {
    errors.push(invalidStageNumberError(stage.stageNumber).message);
  }
  if (!stage.name || typeof stage.name !== 'string') {
    errors.push(missingRequiredFieldError('name', `étape ${stage.stageNumber}`).message);
  }
  if (stage.distanceKm != null && (typeof stage.distanceKm !== 'number' || stage.distanceKm <= 0)) {
    errors.push(`distanceKm invalide pour l'étape ${stage.stageNumber} : ${stage.distanceKm}`);
  }
  if (stage.elevationGainM != null && (typeof stage.elevationGainM !== 'number' || stage.elevationGainM < 0)) {
    errors.push(`elevationGainM invalide pour l'étape ${stage.stageNumber} : ${stage.elevationGainM}`);
  }
  if (stage.date && isNaN(Date.parse(stage.date))) {
    errors.push(invalidDateError('date', stage.date, stage.stageNumber).message);
  }
  if (!stage.pcsProfileUrl) warnings.push(missingProfileImageError(stage.stageNumber).message);
  if (!stage.startCity || !stage.finishCity) warnings.push(`Ville de départ/arrivée manquante pour l'étape ${stage.stageNumber}.`);

  return { valid: errors.length === 0, errors, warnings };
}

/** Valide la liste complète : cohérence de comptage, doublons, puis chaque étape individuellement. */
function validateStageList(stages, expectedCount) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(stages)) {
    errors.push('Liste des étapes manquante ou invalide.');
    return { valid: false, errors, warnings };
  }

  if (expectedCount != null && stages.length !== expectedCount) {
    errors.push(stageCountMismatchError(expectedCount, stages.length).message);
  }

  const numbers = stages.map(s => s && s.stageNumber);
  const duplicates = [...new Set(numbers.filter((n, i) => numbers.indexOf(n) !== i))];
  if (duplicates.length > 0) errors.push(duplicateStageNumberError(duplicates).message);

  stages.forEach(stage => {
    const result = validateStageListEntry(stage);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  });

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * L'absence d'heure de départ n'est PAS bloquante (avertissement
 * seulement) — predictionDeadline restera simplement null jusqu'à
 * saisie manuelle par l'admin. Une heure présente mais mal formée, en
 * revanche, est une vraie erreur (donnée corrompue, pas absente).
 */
function validateStageTime(stageNumber, result) {
  const errors = [];
  const warnings = [];

  if (stageNumber == null || typeof stageNumber !== 'number') {
    errors.push(invalidStageNumberError(stageNumber).message);
  }

  const officialStartTime = result && result.officialStartTime;
  if (officialStartTime == null) {
    warnings.push(missingStartTimeError(stageNumber).message);
    return { valid: errors.length === 0, errors, warnings };
  }
  if (typeof officialStartTime !== 'string' || isNaN(Date.parse(officialStartTime))) {
    errors.push(invalidDateError('officialStartTime', officialStartTime, stageNumber).message);
  }

  return { valid: errors.length === 0, errors, warnings };
}

module.exports = { validateCompetitionInfo, validateStageListEntry, validateStageList, validateStageTime };
