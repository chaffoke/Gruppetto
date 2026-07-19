class FakeCompetitionRepository {
  constructor({ existingCompetitionIds = [] } = {}) {
    this.existing = new Set(existingCompetitionIds);
    this.metaWrites = [];
    this.stageWrites = [];
    this.teamWrites = [];
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

  async writeTeam(competitionId, teamId, team) {
    this.teamWrites.push({ competitionId, teamId, team });
  }
}

module.exports = { FakeCompetitionRepository };
