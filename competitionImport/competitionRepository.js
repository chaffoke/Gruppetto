/**
 * === FirestoreCompetitionRepository ===
 * Écrit sous des sous-collections dédiées de la compétition existante —
 * jamais dans le document `competitions/{id}` lui-même (celui qui
 * contient `config`/`state`, surveillé par l'écouteur temps réel de
 * l'app). Une seule racine par compétition, comme demandé, sans jamais
 * risquer d'interférer avec ce que l'app lit en continu.
 *
 *   competitions/{id}/meta/info       — un seul document
 *   competitions/{id}/stages/{n}      — un document par étape
 */
class FirestoreCompetitionRepository {
  constructor(db) {
    this.db = db;
  }

  /** @returns {boolean} le document racine competitions/{id} existe-t-il déjà ? */
  async competitionExists(competitionId) {
    const doc = await this.db.collection('competitions').doc(competitionId).get();
    return doc.exists;
  }

  async writeCompetitionMeta(competitionId, meta) {
    await this.db.collection('competitions').doc(competitionId)
      .collection('meta').doc('info').set(meta);
  }

  async writeStage(competitionId, stageNumber, stage) {
    await this.db.collection('competitions').doc(competitionId)
      .collection('stages').doc(String(stageNumber)).set(stage);
  }

  async writeTeam(competitionId, teamId, team) {
    await this.db.collection('competitions').doc(competitionId)
      .collection('teams').doc(teamId).set(team);
  }
}

module.exports = { FirestoreCompetitionRepository };
