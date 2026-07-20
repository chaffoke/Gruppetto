class FakeCompetitionRepository {
  constructor({ existingCompetitionIds = [] } = {}) {
    this.existing = new Set(existingCompetitionIds);
    this.metaWrites = [];
    this.favoritesWrites = [];
    this.stageWrites = [];
    this.teamWrites = [];
  }

  async competitionExists(competitionId) {
    return this.existing.has(competitionId);
  }

  async writeCompetitionMeta(competitionId, meta) {
    this.metaWrites.push({ competitionId, meta });
  }

  async writeFavorites(competitionId, favoritesDoc) {
    this.favoritesWrites.push({ competitionId, favoritesDoc });
  }

  async writeStage(competitionId, stageNumber, stage) {
    this.stageWrites.push({ competitionId, stageNumber, stage });
  }

  async writeTeam(competitionId, teamId, team) {
    this.teamWrites.push({ competitionId, teamId, team });
  }
}

module.exports = { FakeCompetitionRepository };
