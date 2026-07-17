/**
 * === FakeRiderStore ===
 * Implémente la même interface que FirestoreRiderStore (readCurrentStatuses,
 * commitSuccess, commitFailure) mais garde tout en mémoire — permet de
 * tester l'intégralité de la logique d'atomicité de sync.js sans Firebase.
 *
 * Enregistre chaque appel (commitSuccessCalls / commitFailureCalls) pour
 * que les tests puissent vérifier PRÉCISÉMENT quel chemin a été emprunté —
 * en particulier, que commitSuccess n'est jamais appelé après un échec de
 * validation.
 */
class FakeRiderStore {
  constructor(initialStatuses = {}) {
    this.statuses = { ...initialStatuses };
    this.commitSuccessCalls = [];
    this.commitFailureCalls = [];
  }

  async readCurrentStatuses() {
    return { ...this.statuses };
  }

  async commitSuccess({ raceId, riders, historyEntry }) {
    this.commitSuccessCalls.push({ raceId, riders, historyEntry });
    // Simule l'écriture atomique : les statuts ne changent qu'ici, en un bloc.
    riders.forEach(r => {
      if (r.sourceRiderId) this.statuses[r.sourceRiderId] = { status: r.status, sinceStage: r.sinceStage };
    });
  }

  async commitFailure(historyEntry) {
    this.commitFailureCalls.push(historyEntry);
    // Volontairement : ne touche jamais this.statuses.
  }
}

module.exports = { FakeRiderStore };
