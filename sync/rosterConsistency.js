/**
 * === Contrôle de cohérence approfondi d'un roster ===
 *
 * Complète validateSnapshot() (monitoring.js), qui reste focalisé sur les
 * anomalies globales (effectif total, statuts invalides). Ici, on vérifie
 * la cohérence STRUCTURELLE du roster : équipes, doublons, rattachements —
 * pensé pour détecter une évolution de la mise en page de PCS qui ferait
 * dériver silencieusement le parsing sans que le total ne bouge (ex. deux
 * coureurs d'équipes différentes fusionnés sous la mauvaise équipe).
 *
 * Ne connaît ni Gruppetto ni Firestore — prend un snapshot, retourne un
 * rapport structuré. C'est à l'appelant (verify-live.js aujourd'hui,
 * sync.js demain) de décider quoi faire du résultat.
 */

function normalizeTeamName(name) {
  return (name || '').replace(/\s*\([A-Z]{2,4}\)\s*$/, '').trim();
}

function checkRosterConsistency(snapshot, {
  expectedTeams = [],
  expectedTeamSize = 8,
  teamSizeTolerance = 1,
  knownRiders = []
} = {}) {
  const checks = [];
  const riders = (snapshot && snapshot.riders) || [];
  const addOk = (message) => checks.push({ ok: true, message });
  const addFail = (message) => checks.push({ ok: false, message });

  // --- Regroupement par équipe ---
  const byTeam = {};
  riders.forEach(r => {
    const key = normalizeTeamName(r.team) || '(équipe inconnue)';
    (byTeam[key] = byTeam[key] || []).push(r);
  });
  const teamNames = Object.keys(byTeam);

  addOk(`${teamNames.length} équipe(s) détectée(s)`);
  addOk(`${riders.length} coureur(s)`);

  // --- Répartition des statuts ---
  const statusCounts = { active: 0, dnf: 0, dns: 0, dsq: 0 };
  let unknownStatusCount = 0;
  riders.forEach(r => {
    if (Object.prototype.hasOwnProperty.call(statusCounts, r.status)) statusCounts[r.status]++;
    else unknownStatusCount++;
  });
  addOk(`${statusCounts.active} actif(s)`);
  const abandonCount = statusCounts.dnf + statusCounts.dns + statusCounts.dsq;
  addOk(`${abandonCount} abandon(s) (dnf:${statusCounts.dnf} dns:${statusCounts.dns} dsq:${statusCounts.dsq})`);
  if (unknownStatusCount > 0) addFail(`${unknownStatusCount} coureur(s) avec un statut non reconnu`);

  // --- Présence des équipes attendues + effectif par équipe ---
  if (expectedTeams.length > 0) {
    const normalizedExpected = expectedTeams.map(normalizeTeamName);
    const missingTeams = normalizedExpected.filter(name => !teamNames.includes(name));
    if (missingTeams.length > 0) {
      missingTeams.forEach(name => addFail(`Équipe attendue introuvable : ${name}`));
    } else {
      addOk('Toutes les équipes attendues sont présentes');
    }

    normalizedExpected.forEach(name => {
      const count = (byTeam[name] || []).length;
      if (count === 0) return; // déjà signalé ci-dessus
      if (Math.abs(count - expectedTeamSize) > teamSizeTolerance) {
        addFail(`Équipe ${name} incomplète (${count} coureur(s) au lieu de ${expectedTeamSize})`);
      }
    });

    // --- Coureurs rattachés à une équipe qui n'existe pas dans la liste attendue ---
    const unexpectedTeamRiders = riders.filter(r => !normalizedExpected.includes(normalizeTeamName(r.team)));
    if (unexpectedTeamRiders.length > 0) {
      addFail(`${unexpectedTeamRiders.length} coureur(s) rattaché(s) à une équipe non reconnue (ex. "${normalizeTeamName(unexpectedTeamRiders[0].team)}")`);
    }
  }

  // --- Doublons : même coureur détecté deux fois ---
  const riderKeyCounts = {};
  riders.forEach(r => {
    const key = `${r.lastName}|${r.firstName}|${normalizeTeamName(r.team)}`;
    riderKeyCounts[key] = (riderKeyCounts[key] || 0) + 1;
  });
  const duplicateRiders = Object.entries(riderKeyCounts).filter(([, n]) => n > 1);
  if (duplicateRiders.length > 0) {
    addFail(`${duplicateRiders.length} doublon(s) détecté(s) (ex. ${duplicateRiders[0][0].split('|')[0]})`);
  } else {
    addOk('Aucun doublon de coureur');
  }

  // --- Doublons d'identifiant source (URL/ID unique attendu par coureur) ---
  const idCounts = {};
  riders.forEach(r => {
    if (!r.sourceRiderId) return;
    idCounts[r.sourceRiderId] = (idCounts[r.sourceRiderId] || 0) + 1;
  });
  const duplicateIds = Object.entries(idCounts).filter(([, n]) => n > 1);
  if (duplicateIds.length > 0) {
    addFail(`${duplicateIds.length} identifiant(s) dupliqué(s) (ex. ${duplicateIds[0][0]})`);
  } else {
    addOk('Aucun identifiant dupliqué');
  }

  // --- Coureurs de référence, répartis sur plusieurs équipes ---
  if (knownRiders.length > 0) {
    const missingKnown = [];
    const wrongKnown = [];
    knownRiders.forEach(known => {
      const found = riders.find(r => r.lastName === known.lastName);
      if (!found) { missingKnown.push(known.lastName); return; }
      if (found.status !== known.expectedStatus
        || (known.expectedStage != null && found.sinceStage !== known.expectedStage)) {
        wrongKnown.push(known.lastName);
      }
    });
    if (missingKnown.length > 0) addFail(`Coureur(s) de référence introuvable(s) : ${missingKnown.join(', ')}`);
    if (wrongKnown.length > 0) addFail(`Coureur(s) de référence avec un statut inattendu : ${wrongKnown.join(', ')}`);
    if (missingKnown.length === 0 && wrongKnown.length === 0) addOk('Tous les coureurs de référence retrouvés');
  }

  const passed = checks.every(c => c.ok);
  return { passed, checks };
}

module.exports = { checkRosterConsistency, normalizeTeamName };
