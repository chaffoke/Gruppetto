class FakeCompetitionRepository {
  constructor({ existingCompetitionIds = [] } = {}) {
    this.existing = new Set(existingCompetitionIds);
    this.metaWrites = [];
    this.stageWrites = [];
  }

  async competitionExists(competitionId) {
    return this.existing.has(competitionId);
  }

  async writeCompetitionMeta(competitionId, meta) {
    this.metaWrites.push({ competitionId, meta });
    this.existing.add(competitionId);
  }

  async writeStage(competitionId, stageNumber, stage) {
    this.stageWrites.push({ competitionId, stageNumber, stage });
  }
}

module.exports = { FakeCompetitionRepository };
