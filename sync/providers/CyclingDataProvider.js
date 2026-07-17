/**
 * === CyclingDataProvider — contrat commun à tous les fournisseurs ===
 *
 * Toute implémentation (PCSDirectProvider, ParseBotProvider, demain
 * SportradarProvider...) doit respecter EXACTEMENT ce contrat, afin que
 * sync.js puisse changer de fournisseur sans jamais être modifié.
 *
 * Aucune logique métier Gruppetto ici (pas de notion de "pronostic
 * bloqué", pas de format CONFIG.teams) — uniquement une forme de données
 * neutre. La traduction vers le monde de Gruppetto est un chantier séparé,
 * côté application, non fait ici.
 *
 * Format de retour de fetchRoster(raceId) :
 * {
 *   raceId: string,           // ex. "tour-de-france/2026"
 *   fetchedAt: string,        // ISO 8601
 *   riders: [{
 *     firstName: string|null,
 *     lastName: string,
 *     team: string,
 *     status: 'active' | 'dns' | 'dnf' | 'dsq',
 *     sinceStage: number|null,   // étape depuis laquelle ce statut s'applique
 *     sourceRiderId: string|null // identifiant/URL propre à la source, pour traçabilité
 *   }]
 * }
 *
 * Les trois méthodes suivantes sont réservées pour une extension future
 * (résultats d'étape, classement général, maillots distinctifs) — la
 * signature existe dès aujourd'hui pour que l'interface n'ait plus jamais
 * à changer, mais aucune implémentation n'est fournie maintenant.
 */
class CyclingDataProvider {
  /** @returns {Promise<{raceId: string, fetchedAt: string, riders: Array}>} */
  async fetchRoster(raceId) {
    throw new Error(`${this.constructor.name}.fetchRoster() non implémentée`);
  }

  async fetchStageResult(raceId, stageNumber) {
    throw new Error(`${this.constructor.name}.fetchStageResult() non implémentée`);
  }

  async fetchGeneralClassification(raceId, uptoStage) {
    throw new Error(`${this.constructor.name}.fetchGeneralClassification() non implémentée`);
  }

  async fetchJerseyHolders(raceId, uptoStage) {
    throw new Error(`${this.constructor.name}.fetchJerseyHolders() non implémentée`);
  }
}

module.exports = { CyclingDataProvider };
