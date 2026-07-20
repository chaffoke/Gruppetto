class FakeResultsRepository {
  constructor({ existingStages = [], stageDates = {} } = {}) {
    this.existingStages = new Set(existingStages.map(String));
    this.stageDates = stageDates; // { "2026-07-20": 15, ... }
    this.stageResultsWrites = [];
    this.classificationWrites = [];
    this.jerseyWearersWrites = [];
    this.stageResultsStore = {}; // stageNumber -> stageResults
  }

  async stageExists(competitionId, stageNumber) {
    return this.existingStages.has(String(stageNumber));
  }

  async findStageNumberByDate(competitionId, dateStr) {
    return this.stageDates[dateStr] != null ? this.stageDates[dateStr] : null;
  }

  async writeStageResults(competitionId, stageNumber, stageResults) {
    this.stageResultsWrites.push({ competitionId, stageNumber, stageResults });
    this.stageResultsStore[stageNumber] = stageResults;
  }

  async writeClassification(competitionId, stageNumber, type, classification) {
    this.classificationWrites.push({ competitionId, stageNumber, type, classification });
  }

  async writeJerseyWearers(competitionId, stageNumber, jerseyWearersDoc) {
    this.jerseyWearersWrites.push({ competitionId, stageNumber, jerseyWearersDoc });
  }

  async getStageResults(competitionId, stageNumber) {
    return this.stageResultsStore[stageNumber] || null;
  }

  async getClassification() {
    return null; // non exercé dans les tests d'orchestration actuels
  }

  /** Même comportement volontairement non optimisé que la vraie implémentation. */
  async getResultsByRider(competitionId, riderId) {
    const results = [];
    Object.values(this.stageResultsStore).forEach(data => {
      const entry = (data.results || []).find(r => r.riderId === riderId);
      if (entry) results.push({ stageNumber: data.stageNumber, ...entry });
    });
    return results;
  }
}

module.exports = { FakeResultsRepository };
