const {
  pageNotFoundError, unexpectedStructureError, missingStartTimeError, missingProfileImageError,
  stageCountMismatchError, duplicateStageNumberError, invalidStageNumberError, invalidDateError,
  missingRequiredFieldError, ERROR_CODES, CompetitionImportError
} = require('../competitionImportErrors');

describe('catalogue d\'erreurs métier', () => {
  test('chaque fabrique produit une CompetitionImportError avec le bon code', () => {
    expect(pageNotFoundError('https://x', 404)).toBeInstanceOf(CompetitionImportError);
    expect(pageNotFoundError('https://x', 404).code).toBe(ERROR_CODES.PAGE_NOT_FOUND);
    expect(unexpectedStructureError('contexte').code).toBe(ERROR_CODES.UNEXPECTED_STRUCTURE);
    expect(missingStartTimeError(13).code).toBe(ERROR_CODES.MISSING_START_TIME);
    expect(missingProfileImageError(13).code).toBe(ERROR_CODES.MISSING_PROFILE_IMAGE);
    expect(stageCountMismatchError(21, 20).code).toBe(ERROR_CODES.STAGE_COUNT_MISMATCH);
    expect(duplicateStageNumberError([2]).code).toBe(ERROR_CODES.DUPLICATE_STAGE_NUMBER);
    expect(invalidStageNumberError(-1).code).toBe(ERROR_CODES.INVALID_STAGE_NUMBER);
    expect(invalidDateError('date', 'x').code).toBe(ERROR_CODES.INVALID_DATE);
    expect(missingRequiredFieldError('name').code).toBe(ERROR_CODES.MISSING_REQUIRED_FIELD);
  });

  test('les messages contiennent les informations utiles au diagnostic', () => {
    expect(pageNotFoundError('https://x/y', 403).message).toMatch(/403/);
    expect(pageNotFoundError('https://x/y', 403).message).toMatch(/https:\/\/x\/y/);
    expect(stageCountMismatchError(21, 19).message).toMatch(/21/);
    expect(stageCountMismatchError(21, 19).message).toMatch(/19/);
  });
});
