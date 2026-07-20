/**
 * === FirestoreCompetitionRepository ===
 * Écrit sous des sous-collections dédiées de la compétition existante —
 * jamais dans le document `competitions/{id}` lui-même (celui qui
 * contient `config`/`state`, surveillé par l'écouteur temps réel de
 * l'app). Une seule racine par compétition, comme demandé, sans jamais
 * risquer d'interférer avec ce que l'app lit en continu.
 *
 *   competitions/{id}/meta/info        — infos de compétition (nécessite competitionInfo)
 *   competitions/{id}/meta/favorites   — DOCUMENT SÉPARÉ, volontairement : les
 *                                        favoris sont importables indépendamment
 *                                        de meta/info (pas de dépendance technique
 *                                        réelle entre les deux)
 *   competitions/{id}/stages/{n}       — un document par étape
 *   competitions/{id}/teams/{teamId}   — un document par équipe
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

  async writeFavorites(competitionId, favoritesDoc) {
    await this.db.collection('competitions').doc(competitionId)
      .collection('meta').doc('favorites').set(favoritesDoc);
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
