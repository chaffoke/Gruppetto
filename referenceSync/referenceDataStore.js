/**
 * === FirestoreReferenceDataStore ===
 * Écriture ponctuelle, PAS de diff ni d'historique — contrairement à
 * sync/, cette synchronisation est déclenchée manuellement et remplace
 * intégralement le document à chaque exécution.
 *
 * Écrit sous `referenceData/{competitionId}` — l'identifiant de
 * compétition PROPRE À GRUPPETTO (ex. "tdf-2026"), volontairement
 * différent du raceId PCS (ex. "tour-de-france/2026") utilisé pour la
 * récupération : c'est cette collection que les futurs modules
 * (pronostics, profils, résultats) consommeront, donc elle doit parler
 * le langage d'identifiants déjà utilisé par Gruppetto (competitions/),
 * pas celui de PCS.
 *
 * Validée par checkRosterConsistency (réutilisée depuis sync/), sans le
 * contrôle "coureurs de référence" qui n'a pas de sens ici (pas de
 * notion de statut DNS/DNF dans ce module).
 */
const { checkRosterConsistency } = require('../sync/rosterConsistency');

/** Adapte la forme {teams:[{name, riders}]} vers le format attendu par
 *  checkRosterConsistency (liste plate de riders avec un champ team).
 *  Utilise désormais l'identifiant stable (rider.id) plutôt que l'URL
 *  brute pour la détection de doublons — plus robuste, même sémantique. */
function flattenTeamsToRiders(teams) {
  const riders = [];
  teams.forEach(team => {
    team.riders.forEach(r => {
      riders.push({
        lastName: r.lastName,
        firstName: r.firstName,
        team: team.name,
        status: 'active', // non pertinent ici, requis par le format partagé
        sourceRiderId: r.id
      });
    });
  });
  return riders;
}

function validateRoster(referenceData, expectedTeams, expectedTeamSize = 8) {
  const flatRiders = flattenTeamsToRiders(referenceData.teams);
  return checkRosterConsistency({ riders: flatRiders }, { expectedTeams, expectedTeamSize, knownRiders: [] });
}

class FirestoreReferenceDataStore {
  constructor(db) {
    this.db = db;
  }

  async writeReferenceData(competitionId, referenceData) {
    await this.db.collection('referenceData').doc(competitionId).set(referenceData);
  }
}

module.exports = { FirestoreReferenceDataStore, validateRoster, flattenTeamsToRiders };
