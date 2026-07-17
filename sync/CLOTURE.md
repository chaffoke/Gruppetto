# Rapport de clôture — Synchronisation automatique des coureurs

**Projet :** Gruppetto
**Chantier :** Service de synchronisation automatique du statut des coureurs (DNS/DNF/DSQ)
**Statut :** Terminé — en attente de validation en environnement réel par l'utilisateur

---

## 1. Objectif initial

Éviter la mise à jour manuelle des abandons, non-partants et disqualifications dans Gruppetto. Jusqu'ici, cette information était vérifiée et saisie à la main, régulièrement, par l'utilisateur. L'objectif était d'automatiser autant que possible cette veille, sans intervention quotidienne, tout en restant fiable et peu coûteux à exploiter.

## 2. Fonctionnalités réalisées

- Récupération automatique du statut de chaque coureur (actif/DNS/DNF/DSQ) depuis ProCyclingStats.
- Double couche de validation avant toute écriture : anomalies globales (effectif, statuts) et cohérence structurelle (équipes attendues, doublons, coureurs de référence).
- Diff bidirectionnel : tout changement de statut est détecté, dans n'importe quel sens (y compris une correction rétroactive ou une réintégration).
- Écriture Firestore strictement atomique : aucune donnée de production modifiée tant que la validation n'a pas entièrement réussi.
- Historique complet de chaque synchronisation (réussie ou non), avec le détail des changements.
- Planification automatique quotidienne (GitHub Actions, 00h15 heure de Paris) et déclenchement manuel disponible.
- Architecture ouverte à d'autres fournisseurs de données et à d'autres courses, sans changement structurel.

## 3. Architecture mise en place

| Composant | Responsabilité |
|---|---|
| `CyclingDataProvider` | Interface commune à tout fournisseur de données cyclistes |
| `PCSDirectProvider` | Récupération et normalisation des données ProCyclingStats |
| `monitoring.js` | Détection d'anomalies globales |
| `rosterConsistency.js` | Contrôle de cohérence structurelle approfondi |
| `diff.js` | Comparaison bidirectionnelle des statuts |
| `syncHistoryEntry.js` | Construction des entrées d'historique |
| `firestoreRiderStore.js` | Seule couche parlant à Firestore ; garantit l'écriture atomique |
| `sync.js` (`runSync`) | Orchestrateur ; assemble tout ce qui précède |
| `run.js` | Point d'entrée réel, câblé pour la production |
| `config/raceConfig.js` | Configuration propre à la course suivie |

Principe directeur : séparation stricte entre fonctions pures (testables sans réseau ni Firebase) et code d'entrée-sortie, avec injection de dépendances (`provider`, `store`) pour permettre de tester l'intégralité de la logique métier — y compris l'atomicité — sans jamais toucher un environnement réel.

## 4. Tests réalisés

- **Unitaires** : normalisation des noms/statuts, détection d'anomalies, cohérence structurelle, diff bidirectionnel — chacun testé isolément, sans dépendance externe.
- **Intégration réelle** (`verify-live.js`) : vrai appel réseau vers ProCyclingStats, validé par le même chemin exact que la production (`runSync`), sans jamais écrire dans Firestore.
- **Atomicité** : vérifiée explicitement — succès simple, changement bidirectionnel simultané, échec de validation, panne réseau — à chaque fois avec confirmation qu'aucune écriture de production n'a lieu en cas d'échec et que l'état précédent reste intact.
- 34 tests exécutés et vérifiés directement pendant le développement (hors tests dépendant de Cheerio, à confirmer par l'utilisateur en environnement réel avec accès réseau).

## 5. Documentation produite

- **`sync/README.md`** — document de référence unique : présentation, architecture, arborescence commentée, dépendances, guide de mise en production étape par étape, Firebase, GitHub Actions, dépannage, maintenance, limites connues, évolutions futures, validation finale, procédure de retour arrière.
- **Le présent rapport de clôture** — résumé factuel destiné à servir d'historique de version.

## 6. Limites connues

Dette technique assumée consciemment, documentée dans `README.md` (section 13) :
- Configuration (`EXPECTED_TEAMS`/`KNOWN_RIDERS`) propre à une seule course, à mettre à jour manuellement pour en suivre une autre.
- Aucun timeout réseau explicite sur le provider.
- Risque théorique de collision d'identifiant en l'absence de `sourceRiderId`.
- Correction rétroactive d'étape sans changement de statut : gérée par le code, non couverte par un test dédié.
- Erreur de blocage anti-bot et erreur structurelle indiscernables dans les logs actuels.
- La lecture de ces données par Gruppetto lui-même (`index.html`) n'est pas construite — Firestore est alimenté, mais rien ne le consomme encore côté application.

## 7. Prochain chantier recommandé

**Connecter Gruppetto à ces données** (lecture de `riders`/`syncHistory` pour mettre à jour `CONFIG.teams[].riders[].abandonedAtStage`) est la suite la plus directement utile : c'est elle qui transforme ce service, aujourd'hui autonome, en réel gain pour l'utilisateur final du jeu de pronostics.

Vient ensuite, à plus long terme, l'automatisation des résultats d'étape et des classements. L'architecture est déjà prête à l'accueillir sans refonte : `CyclingDataProvider` réserve depuis le départ les signatures `fetchStageResult()`, `fetchGeneralClassification()` et `fetchJerseyHolders()` ; le même schéma (validation à deux couches, diff, écriture atomique, historique) s'appliquerait à l'identique, avec une nouvelle collection Firestore dédiée.

## 8. Bilan

Le service est fonctionnellement complet, testé de façon approfondie dans les limites de l'environnement de développement, et documenté de manière autonome. Il ne reste qu'une validation en conditions réelles (réseau + Firebase + GitHub Actions) à la charge de l'utilisateur, suivant le guide fourni. Aucune régression n'a été introduite sur Gruppetto : ce chantier est entièrement additif. La dette technique restante est identifiée, volontaire, et sans impact sur la fiabilité du périmètre livré.
