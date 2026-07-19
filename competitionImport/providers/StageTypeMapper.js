/**
 * === StageTypeMapper ===
 * SEUL composant autorisé à connaître le vocabulaire PCS pour cette
 * conversion. Aucun autre composant de Gruppetto ne doit dépendre
 * directement des libellés PCS.
 *
 * Mapping figé, validé explicitement — ne dépend JAMAIS de profileScore
 * ni de verticalMeters. Ces deux champs restent des informations
 * complémentaires, conservées pour de futurs usages (statistiques,
 * filtres), sans impact sur ce mapping ni sur le reste de la logique
 * métier de Gruppetto.
 *
 * Si une distinction "haute montagne" est souhaitée un jour, elle devra
 * reposer sur une règle métier Gruppetto propre (indicateur admin ou
 * calcul interne) — jamais sur profileScore.
 */

const STAGE_TYPES = {
  FLAT: 'flat',
  HILLY: 'hilly',
  MOUNTAIN: 'mountain',
  ITT: 'itt',
  TTT: 'ttt',
  PROLOGUE: 'prologue',
  UNKNOWN: 'unknown'
};

/** Vocabulaire PCS confirmé sur la vraie page route/stage-profiles. */
const PCS_STAGE_TYPE_MAP = {
  'Flat': STAGE_TYPES.FLAT,
  'Hills, flat finish': STAGE_TYPES.HILLY,
  'Hills, uphill finish': STAGE_TYPES.HILLY,
  'Mountains, uphill finish': STAGE_TYPES.MOUNTAIN
};

/**
 * TTT/ITT/Prologue ne sont pas dans le filtre "Profile type" de PCS —
 * ils s'identifient via le suffixe du nom d'étape (confirmé sur la
 * vraie page : "Stage 1 (TTT)", "Stage 16 (ITT)").
 */
function detectFromStageName(stageName) {
  if (!stageName) return null;
  if (/\(TTT\)/i.test(stageName)) return STAGE_TYPES.TTT;
  if (/\(ITT\)/i.test(stageName)) return STAGE_TYPES.ITT;
  if (/\bprologue\b/i.test(stageName)) return STAGE_TYPES.PROLOGUE;
  return null;
}

/**
 * @param {{ pcsStageType: string|null, stageName: string|null }} input
 * @returns {string} une valeur de STAGE_TYPES, jamais un libellé PCS brut
 */
function mapStageType({ pcsStageType, stageName } = {}) {
  const fromName = detectFromStageName(stageName);
  if (fromName) return fromName;

  if (pcsStageType && PCS_STAGE_TYPE_MAP[pcsStageType]) {
    return PCS_STAGE_TYPE_MAP[pcsStageType];
  }

  return STAGE_TYPES.UNKNOWN;
}

module.exports = { STAGE_TYPES, PCS_STAGE_TYPE_MAP, mapStageType, detectFromStageName };
