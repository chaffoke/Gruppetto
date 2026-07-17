/**
 * === FirestoreRiderStore ===
 * Seule couche du projet qui connaisse l'API Firestore. sync.js ne
 * manipule jamais directement `batch()`/`collection()` — il appelle
 * `commitSuccess()` ou `commitFailure()`, qui garantissent chacune leur
 * propre atomicité :
 *
 * - commitSuccess() : TOUTES les écritures (statuts des coureurs +
 *   entrée d'historique) dans un seul batch Firestore. Un batch Firestore
 *   est atomique par nature : soit toutes les écritures réussissent, soit
 *   aucune n'est appliquée — jamais d'état intermédiaire.
 * - commitFailure() : une écriture UNIQUE, isolée, dans syncHistory
 *   seulement. Ne touche jamais la collection `riders` — impossible
 *   structurellement d'altérer les données de production depuis ce
 *   chemin.
 *
 * Limite connue : un batch Firestore est plafonné à 500 opérations. Pour
 * ~184 coureurs + 1 entrée d'historique, largement dans la limite. À
 * revoir uniquement si Gruppetto suit un jour une course à bien plus de
 * 500 coureurs (peu probable).
 */
class FirestoreRiderStore {
  constructor(db) {
    this.db = db;
  }

  riderDocId(raceId, rider) {
    const slugSource = rider.sourceRiderId || `${rider.lastName}-${rider.firstName || ''}`;
    const slug = slugSource.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase().replace(/^-+|-+$/g, '');
    return `${raceId.replace(/\//g, '_')}__${slug}`;
  }

  async readCurrentStatuses(raceId) {
    const snap = await this.db.collection('riders').where('raceId', '==', raceId).get();
    const map = {};
    snap.forEach(doc => {
      const d = doc.data();
      const key = d.sourceRiderId || doc.id;
      map[key] = { status: d.status, sinceStage: d.sinceStage };
    });
    return map;
  }

  async commitSuccess({ raceId, riders, historyEntry, now }) {
    const batch = this.db.batch();

    riders.forEach(r => {
      const ref = this.db.collection('riders').doc(this.riderDocId(raceId, r));
      batch.set(ref, {
        raceId,
        firstName: r.firstName,
        lastName: r.lastName,
        team: r.team,
        status: r.status,
        sinceStage: r.sinceStage,
        sourceRiderId: r.sourceRiderId || null,
        updatedAt: now.toISOString()
      }, { merge: true });
    });

    const historyRef = this.db.collection('syncHistory').doc();
    batch.set(historyRef, historyEntry);

    await batch.commit(); // Atomique : tout ou rien.
  }

  async commitFailure(historyEntry) {
    await this.db.collection('syncHistory').doc().set(historyEntry);
  }
}

module.exports = { FirestoreRiderStore };
