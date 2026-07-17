#!/usr/bin/env node
/**
 * === Test d'intégration : le vrai fournisseur, la vraie validation ===
 *
 * N'implémente plus SA PROPRE séquence de validation — il appelle
 * directement runSync(), exactement la fonction utilisée en production
 * par run.js, avec un FakeRiderStore (aucune écriture réelle, aucun accès
 * réseau vers Firestore requis). Il n'existe donc plus qu'un seul chemin
 * de validation dans tout le projet : si sync.js évolue, ce test suit
 * automatiquement, sans jamais pouvoir diverger silencieusement.
 *
 * Code de sortie 0 = tout est cohérent.
 * Code de sortie 1 = anomalie détectée.
 *
 * Utilisable aussi bien à la main que dans un futur workflow CI de
 * vérification (distinct du workflow de synchronisation réelle, qui lui
 * écrit dans Firestore via run.js).
 */
const { PCSDirectProvider } = require('../providers/PCSDirectProvider');
const { runSync } = require('../sync');
const { FakeRiderStore } = require('./FakeRiderStore');
const { EXPECTED_TEAMS, KNOWN_RIDERS } = require('../config/raceConfig');

async function main() {
  const raceId = process.argv[2] || 'tour-de-france/2026';

  console.log(`Test d'intégration — ${raceId}`);
  console.log('---');

  const provider = new PCSDirectProvider();
  const store = new FakeRiderStore(); // store à blanc : jamais d'écriture réelle, jamais de Firestore requis

  const result = await runSync({
    provider, raceId, store,
    expectedTeams: EXPECTED_TEAMS, expectedTeamSize: 8, knownRiders: KNOWN_RIDERS,
    log: console.log
  });

  process.exitCode = result.success ? 0 : 1;
}

if (require.main === module) {
  main().catch(err => {
    console.log(`✗ Échec inattendu du test d'intégration (${err.message})`);
    process.exitCode = 1;
  });
}

module.exports = { main };
