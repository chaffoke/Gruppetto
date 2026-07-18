class FakeReferenceRosterStore {
  constructor() {
    this.writes = [];
  }
  async writeReferenceData(competitionId, referenceData) {
    this.writes.push({ competitionId, referenceData });
  }
}

module.exports = { FakeReferenceRosterStore };
