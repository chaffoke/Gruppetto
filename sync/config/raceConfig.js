/**
 * === Configuration de la course actuellement suivie ===
 *
 * Utilisée à la fois par run.js (production) et par les tests
 * d'intégration (verify-live.js) — c'est la SEULE raison pour laquelle ce
 * fichier vit à la racine du projet plutôt que dans tests/ : le code de
 * production en dépend directement.
 *
 * ⚠️ Spécifique au Tour de France 2026 — à mettre à jour à chaque nouvelle
 * course suivie (Giro, Vuelta, éditions futures). Ce n'est pas une vérité
 * permanente. Voir README.md, section "Limites connues et pistes
 * d'évolution", pour la piste d'automatisation envisagée à terme.
 */

const EXPECTED_TEAMS = [
  'UAE Team Emirates - XRG', 'Team Visma | Lease a Bike', 'Red Bull - BORA - hansgrohe',
  'Lidl - Trek', 'EF Education - EasyPost', 'Decathlon CMA CGM Team', 'XDS Astana Team',
  'Bahrain - Victorious', 'Netcompany INEOS', 'Soudal Quick-Step', 'Alpecin - Premier Tech',
  'Team Jayco AlUla', 'Uno-X Mobility', 'NSN Cycling Team', 'Movistar Team',
  'Lotto Intermarché', 'Cofidis', 'Pinarello Q36.5 Pro Cycling Team',
  'Groupama - FDJ United', 'Tudor Pro Cycling Team', 'TotalEnergies',
  'Team Picnic PostNL', 'Caja Rural - Seguros RGA'
];

/**
 * Coureurs de référence, confirmés lors du PoC, répartis sur plusieurs
 * équipes différentes — sert de filet de sécurité contre une régression
 * silencieuse du parseur, pas de test métier permanent.
 */
const KNOWN_RIDERS = [
  { lastName: 'VAN LERBERGHE', expectedStatus: 'dnf', expectedStage: 6 },
  { lastName: 'TRÆEN', expectedStatus: 'dns', expectedStage: 7 },
  { lastName: "O'BRIEN", expectedStatus: 'dnf', expectedStage: 4 } // OTL -> dnf
];

module.exports = { EXPECTED_TEAMS, KNOWN_RIDERS };
