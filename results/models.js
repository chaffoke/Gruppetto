/**
 * === Modèles métier — results/ ===
 * PCS n'est qu'un fournisseur de données. Le vocabulaire ci-dessous est
 * celui de Gruppetto — les valeurs brutes PCS ne doivent jamais fuiter
 * au-delà des providers (conservées uniquement dans `extra`, pour
 * diagnostic).
 *
 * @typedef {'finished' | 'dns' | 'dnf' | 'dsq' | 'otl'} StageResultStatus
 * @typedef {'general' | 'points' | 'mountain' | 'youth' | 'teams'} ClassificationType
 *
 * @typedef {Object} StageResultEntry
 * @property {number|null} rank        - null si non classé (dns/dnf/dsq)
 * @property {string} riderId          - identifiant stable Gruppetto — SEULE référence utilisée par le reste de l'app
 * @property {string|null} teamId      - idem, identifiant stable Gruppetto
 * @property {number|null} bib
 * @property {string|null} time
 * @property {string|null} gap
 * @property {StageResultStatus} status
 * @property {number|null} bonusSeconds
 * @property {number|null} points
 * @property {Object} extra            - infos PCS utiles au diagnostic (pcsSlug, pcsRawStatus...), jamais utilisées pour la logique métier
 *
 * @typedef {Object} ClassificationEntry
 * @property {number} rank
 * @property {string|null} riderId     - null uniquement pour le classement par équipes
 * @property {string|null} teamId
 * @property {string|null} time
 * @property {string|null} gap
 * @property {number|null} points
 * @property {Object} extra
 */

const STAGE_RESULT_STATUSES = {
  FINISHED: 'finished',
  DNS: 'dns',
  DNF: 'dnf',
  DSQ: 'dsq',
  OTL: 'otl',
  DF: 'df' // "Did finish, no result" — statut réel confirmé dans la légende PCS, pas anticipé initialement
};

const CLASSIFICATION_TYPES = {
  GENERAL: 'general',
  POINTS: 'points',
  MOUNTAIN: 'mountain',
  YOUTH: 'youth',
  TEAMS: 'teams'
};

module.exports = { STAGE_RESULT_STATUSES, CLASSIFICATION_TYPES };
