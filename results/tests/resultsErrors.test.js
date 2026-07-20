const {
  ResultsImportError, ERROR_CODES,
  resultPageNotFoundError, classificationPageNotFoundError, unknownRiderError, unknownTeamError,
  duplicatePositionError, invalidTimeError, invalidStatusError, invalidResultError,
  invalidClassificationError, stageNotFoundError
} = require('../resultsErrors');

describe('catalogue d\'erreurs results/', () => {
  test('chaque fabrique produit une ResultsImportError avec le bon code', () => {
    expect(resultPageNotFoundError('https://x', 404)).toBeInstanceOf(ResultsImportError);
    expect(resultPageNotFoundError('https://x', 404).code).toBe(ERROR_CODES.RESULT_PAGE_NOT_FOUND);
    expect(classificationPageNotFoundError('https://x', 404).code).toBe(ERROR_CODES.CLASSIFICATION_PAGE_NOT_FOUND);
    expect(unknownRiderError('x').code).toBe(ERROR_CODES.UNKNOWN_RIDER);
    expect(unknownTeamError('x').code).toBe(ERROR_CODES.UNKNOWN_TEAM);
    expect(duplicatePositionError('ctx', [1]).code).toBe(ERROR_CODES.DUPLICATE_POSITION);
    expect(invalidTimeError('time', 'x').code).toBe(ERROR_CODES.INVALID_TIME);
    expect(invalidStatusError('x').code).toBe(ERROR_CODES.INVALID_STATUS);
    expect(invalidResultError('x').code).toBe(ERROR_CODES.INVALID_RESULT);
    expect(invalidClassificationError('general', 'x').code).toBe(ERROR_CODES.INVALID_CLASSIFICATION);
    expect(stageNotFoundError('tdf-2026', 13).code).toBe(ERROR_CODES.STAGE_NOT_FOUND);
  });

  test('messages contiennent les informations utiles', () => {
    expect(stageNotFoundError('tdf-2026', 13).message).toMatch(/tdf-2026/);
    expect(stageNotFoundError('tdf-2026', 13).message).toMatch(/13/);
  });
});
