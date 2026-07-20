/**
 * === FirestoreResultsRepository ===
 * Écrit sous des sous-collections dédiées de la compétition existante —
 * cohérent avec competitionImport, jamais une collection racine séparée.
 *
 *   competitions/{id}/stageResults/{stageNumber}
 *   competitions/{id}/classifications/{stageNumber}_{type}
 *   competitions/{id}/stages/{stageNumber}   (lecture seule ici — déjà écrit par competitionImport)
 *
 * === getResultsByRider() — API officielle, volontairement non optimisée ===
 * Cette méthode est l'unique point d'accès "Coureur → Résultats" que le
 * reste de Gruppetto (fiche coureur, Hall of Fame, statistiques) devra
 * utiliser, aujourd'hui et demain. Son IMPLÉMENTATION actuelle parcourt
 * les documents stageResults existants un par un — délibérément non
 * optimisé, en l'absence de besoin réel de performance à ce stade. Le
 * jour où un index dédié, un cache ou une vue matérialisée sera
 * nécessaire, seule cette méthode changera de corps — jamais sa
 * signature, jamais les appelants.
 */
class FirestoreResultsRepository {
  constructor(db) {
    this.db = db;
  }

  async stageExists(competitionId, stageNumber) {
    const doc = await this.db.collection('competitions').doc(competitionId)
      .collection('stages').doc(String(stageNumber)).get();
    return doc.exists;
  }

  /**
   * Retrouve le numéro d'étape dont la date correspond à celle donnée
   * (format "YYYY-MM-DD", déjà écrit par competitionImport). Nécessaire
   * pour qu'un déclenchement programmé (cron) puisse importer "l'étape
   * du jour" sans qu'un humain ait à préciser le numéro à chaque fois.
   * @returns {number|null}
   */
  async findStageNumberByDate(competitionId, dateStr) {
    const snap = await this.db.collection('competitions').doc(competitionId)
      .collection('stages').where('date', '==', dateStr).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return doc.data().stageNumber != null ? doc.data().stageNumber : parseInt(doc.id, 10);
  }

  async writeStageResults(competitionId, stageNumber, stageResults) {
    await this.db.collection('competitions').doc(competitionId)
      .collection('stageResults').doc(String(stageNumber)).set(stageResults);
  }

  async writeClassification(competitionId, stageNumber, type, classification) {
    await this.db.collection('competitions').doc(competitionId)
      .collection('classifications').doc(`${stageNumber}_${type}`).set(classification);
  }

  async writeJerseyWearers(competitionId, stageNumber, jerseyWearersDoc) {
    await this.db.collection('competitions').doc(competitionId)
      .collection('jerseyWearers').doc(String(stageNumber)).set(jerseyWearersDoc);
  }

  async getStageResults(competitionId, stageNumber) {
    const doc = await this.db.collection('competitions').doc(competitionId)
      .collection('stageResults').doc(String(stageNumber)).get();
    return doc.exists ? doc.data() : null;
  }

  async getClassification(competitionId, stageNumber, type) {
    const doc = await this.db.collection('competitions').doc(competitionId)
      .collection('classifications').doc(`${stageNumber}_${type}`).get();
    return doc.exists ? doc.data() : null;
  }

  /**
   * ⚠️ Non optimisé, volontairement — voir la documentation en tête de
   * fichier. Parcourt toutes les étapes connues de la compétition et
   * filtre par riderId.
   */
  async getResultsByRider(competitionId, riderId) {
    const snapshot = await this.db.collection('competitions').doc(competitionId)
      .collection('stageResults').get();

    const results = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const entry = (data.results || []).find(r => r.riderId === riderId);
      if (entry) results.push({ stageNumber: data.stageNumber, ...entry });
    });
    return results;
  }
}

module.exports = { FirestoreResultsRepository };
