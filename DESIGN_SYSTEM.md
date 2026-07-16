# DESIGN_SYSTEM.md — Gruppetto

Ce document est la référence officielle des règles d'interface de Gruppetto. Toute nouvelle fonctionnalité, tout nouvel écran, doit être construit en réutilisant ces composants — jamais en créant une variante supplémentaire.

**Statut** : ce document décrit la cible. Certaines valeurs héritées (tailles de police, rayons) existent encore ponctuellement dans le code et seront progressivement alignées, étape de polish après étape de polish — jamais en une seule réécriture.

---

## Philosophie

- **Simplicité avant tout.** Une fonctionnalité en moins vaut mieux qu'une interface confuse.
- **Une seule façon de faire chaque chose.** Un seul composant Modal, un seul Toast, un seul style de carte, un seul Skeleton, un seul Empty State. Jamais de variante "juste pour cette fois".
- **Mobile first, sans exception.** Chaque écran est pensé pour un téléphone tenu à une main avant d'être pensé pour autre chose.
- **Peu d'éléments, bien choisis.** Préférer un espace vide à un élément de décoration.
- **Cohérence dans le temps.** Ce document doit rester valable dans plusieurs années — toute exception doit être documentée ici, pas seulement dans le code.
- **Test de validation systématique** : *"Est-ce que cette interface pourrait être confondue avec une application du Play Store ?"* Si la réponse est non, on cherche plus simple.

---

## Couleurs

Palette unique, volontairement restreinte. Ne jamais introduire de nouvelle teinte sans l'ajouter ici en premier.

| Rôle | Variable CSS | Valeur | Usage |
|---|---|---|---|
| Fond principal | `--asphalt` | `#1a1c1f` | Fond de l'application |
| Fond secondaire | `--asphalt-2` | `#232529` | Cartes, en-têtes, surfaces élevées |
| Fond tertiaire | `--asphalt-3` | `#2d3035` | Champs de saisie, éléments imbriqués |
| **Primaire** | `--jaune` | `#ffcd05` | Actions principales, accents, identité de marque |
| Primaire (pressé) | `--jaune-deep` | `#e0ac00` | État actif du bouton primaire |
| **Succès** | `--vert` | `#2f9e6e` | Confirmations, progressions positives |
| Succès (pressé) | `--vert-deep` | `#1f7a54` | État actif des éléments verts |
| **Erreur / Danger** | `--polka` | `#e8425a` | Suppressions, alertes, régressions |
| Texte clair | `--blanc` | `#f3f1ea` | Texte principal sur fond sombre |
| Texte secondaire | `--grey` | `#8b8e94` | Texte discret, métadonnées, placeholders |
| Séparateurs | `--line` | `#383b40` | Bordures 1px, séparations de contenu |

**Couleurs d'état** : succès = `--vert`, erreur/danger = `--polka`, avertissement = `--jaune` (utilisé aussi en accent, à distinguer par le contexte), information = `--grey` ou `--asphalt-2` selon le fond. Pas de couleur "info" dédiée pour l'instant — à introduire seulement si un vrai besoin apparaît.

**Règle** : jamais de couleur codée en dur dans un composant. Toujours passer par une variable CSS existante.

---

## Espacements

Grille officielle, en pixels. Toute marge, tout padding, tout gap doit provenir de cette liste — plus aucune valeur arbitraire dans les nouveaux composants.

```
4px   — micro-espacement (entre une icône et son texte)
8px   — espacement serré (intérieur d'un chip, gap entre boutons)
12px  — espacement standard (padding intérieur d'une carte compacte)
16px  — espacement de section (padding intérieur d'une carte standard, marges d'écran)
24px  — séparation entre blocs
32px  — séparation entre grandes sections
48px  — respiration d'écran (padding vertical d'un Empty State plein)
```

**État actuel** : plusieurs écrans utilisent encore des valeurs proches mais non alignées (10px, 14px, 18px...). Ces écarts seront corrigés progressivement lors des prochaines étapes de polish, jamais en bloc.

---

## Rayons de bordure

Trois rayons officiels, jamais davantage :

```
8px   — petits éléments (chips, badges, boutons compacts)
12px  — éléments standards (cartes, modales, champs de saisie)
16px  — grands conteneurs (boîte de modale, carte d'étape mise en avant)
```

**État actuel** : des valeurs comme 5px, 6px, 10px, 14px, 20px existent encore par endroits (hérités des tout premiers écrans). Objectif : converger vers 8/12/16 uniquement.

---

## Typographie

Trois familles de police, chacune avec un rôle fixe :

- `--font-display` (Arial Black) — titres de marque, gros chiffres (classement, bandeau)
- `--font-body` (police système) — tout le texte courant, boutons, formulaires
- `--font-mono` (police à chasse fixe) — codes, statistiques chiffrées, horaires

### Hiérarchie officielle

| Niveau | Taille | Poids | Interlignage | Usage |
|---|---|---|---|---|
| Titre de marque | 26–34px | `--font-display` | 1 | En-tête de l'application |
| Titre d'écran | 17–20px | 700 | 1.2 | Titre de modale, titre de section majeure |
| Titre de composant | 14–15px | 700 | 1.3 | Titre de carte, nom d'une compétition |
| Corps de texte | 13–13.5px | 400–600 | 1.5–1.6 | Texte courant, descriptions |
| Texte secondaire | 11–12px | 400–600 | 1.4–1.5 | Métadonnées, légendes, hints |
| Micro-texte | 9.5–10.5px | 600–700 | 1.3 | Badges, labels de champ, étiquettes |

**État actuel** : de nombreuses tailles intermédiaires coexistent (12.5px, 13.5px, 11.5px...), résultat d'ajustements ponctuels écran par écran. La cible ci-dessus doit progressivement absorber ces valeurs.

**Règle** : jamais plus de 6 tailles de texte différentes dans toute l'application.

---

## Boutons

Quatre variantes officielles, chacune avec un rôle exclusif. Un écran ne doit jamais afficher deux boutons **Primary** côte à côte.

### Primary
- Fond `--jaune`, texte `--asphalt`, aucune bordure
- État pressé : fond `--jaune-deep`
- Usage : l'action principale et unique d'un écran ou d'une modale (Créer, Valider, Ouvrir)

### Secondary
- Fond `--asphalt-2`, texte `--blanc`, bordure 1px `--line`
- Usage : action alternative, action secondaire à côté d'un Primary (Annuler, Retour)

### Ghost *(à formaliser)*
- Fond transparent, texte `--blanc` ou `--grey`, aucune bordure
- Usage : actions tertiaires, discrètes, dans un menu ou une liste (ex : les boutons du menu ⋮ des cartes de compétition)
- Aujourd'hui implémenté ponctuellement par des styles en ligne ; à extraire en classe `.btn-ghost` lors d'une prochaine étape

### Danger
- Mêmes dimensions qu'un Secondary, texte et bordure `--polka`
- Usage : action destructrice ou irréversible (Supprimer, Remplacer, Nouvelle saison)
- Aujourd'hui appliqué via des styles en ligne sur `.btn-secondary` ; à formaliser en classe `.btn-danger`

### Comportement commun
- Largeur 100% par défaut (`display: block; width: 100%`), sauf quand deux boutons partagent une ligne (`flex: 1` chacun)
- Rayon 10px (à aligner sur 12px lors de l'harmonisation)
- Retour tactile : `transform: scale(0.92–0.96)` à l'état pressé

---

## Cartes (Card)

Un seul composant Card, deux variantes maximum :

### Standard
- Padding 16px, rayon 12px, fond `--asphalt-2`, bordure 1px `--line`
- Usage : carte de compétition (accueil), carte d'étape, carte de classement

### Compact
- Padding 8–12px, rayon 8–12px
- Usage : lignes de liste, résultats de recherche, éléments répétés en grand nombre

**Règle** : pas de troisième variante. Un besoin visuel différent doit d'abord être testé avec Standard ou Compact avant d'envisager une nouvelle forme.

---

## Modales (Modal)

Composant unique (`showConfirmModal`, `showPromptModal`, et les modales dédiées comme la création de compétition) partageant tous la même base visuelle et la même mécanique d'ouverture/fermeture.

- **Structure** : voile semi-transparent (`rgba(0,0,0,0.6)`) + boîte centrée, rayon 16px, padding 18px, largeur max 420px
- **Ouverture/fermeture** : jamais de `display:none/block`. Toujours `opacity` + `visibility` (avec délai sur la sortie) + léger `scale` sur la boîte — voir section Animations
- **Fermeture** : toujours possible via un bouton ✕ explicite **et** un tap sur le voile
- **Contenu** : titre + corps + 1 ou 2 boutons d'action maximum (Primary + éventuellement Secondary/Danger)
- **Position dans le DOM** : toute modale doit être un élément de premier niveau du `<body>`, jamais imbriquée dans un conteneur qui pourrait être caché (`display:none`) — piège déjà rencontré une fois, cause d'un bug bloquant corrigé depuis

**Objectif à terme** : un seul moteur de dialogue capable de gérer confirmation, saisie, information, sélection et formulaire, sans multiplier les composants.

---

## Toasts

Message flottant, discret, non bloquant.

- Position basse, centré horizontalement
- Apparition/disparition : fondu + léger déplacement vertical, transition déjà en place
- Durée d'affichage par défaut : 2200ms
- Un seul toast visible à la fois (le nouveau remplace l'ancien)
- Jamais utilisé pour une action nécessitant une décision — dans ce cas, toujours une modale

---

## Skeleton

Composant unique de chargement — jamais de spinner sauf impossibilité technique avérée.

- Un seul style visuel : dégradé animé ("shimmer"), 1.2s, boucle infinie
- Fonction générique `skeletonHtml({ width, height, radius, circle })` — les tailles varient, jamais l'apparence
- Usage systématique dès qu'un contenu met plus qu'un instant à apparaître (données réseau, image en cours d'envoi, compteur en cours de calcul)

---

## Empty State

Composant unique pour tout écran ou toute liste vide.

- Structure : icône/emoji + titre (optionnel) + texte explicatif + action principale (optionnelle)
- Fonction générique `emptyStateHtml({ icon, title, text, actionLabel, actionHandler, compact })`
- **Variante pleine** : écrans ou sections principales (accueil, chat, classement, Hall of Fame)
- **Variante compacte** (`compact: true`) : résultats de recherche, petites listes secondaires — mêmes composants, tailles réduites
- **Règle** : toujours expliquer *pourquoi* c'est vide et, si pertinent, *quoi faire* — jamais un message technique brut

---

## Animations

Un seul système d'animation (`fadeInUp`, 200ms) réutilisé partout — pas de bibliothèque d'effets différents par écran.

### Règles strictes
- **Durée** : 180 à 220ms maximum, jamais plus
- **Easing** : `ease` pour les fondus, `cubic-bezier(0.2, 0.8, 0.2, 1)` pour les effets de scale/déplacement (accélération douce, décélération naturelle)
- **Propriétés autorisées** : uniquement `opacity` et `transform` (translation, scale) — accélérées matériellement, aucun coût de mise en page
- **Exception tolérée** : `max-height` pour les petits accordéons (menus), sur de très petits sous-arbres uniquement
- **Interdit** : animations de plus de 220ms, effets "gadget" (rebond, rotation, glissements multiples), toute propriété déclenchant un recalcul de mise en page sur un grand conteneur

### Usage actuel
- Ouverture/fermeture de modale : fondu + scale (0.96 → 1)
- Changement d'écran (Accueil ↔ Compétition) : fondu + léger décalage vertical (6px) sur l'écran entrant uniquement
- Menus (ex : ⋮ sur une carte) : accordéon léger (max-height + fondu)
- Apparition de cartes : même fondu, rejoué à chaque affichage de liste

**Test de validation** : une animation ressentie mais jamais remarquée. Si l'utilisateur la voit consciemment, elle est déjà trop présente.

---

## Prochaines évolutions attendues de ce document

- Formalisation des classes `.btn-ghost` et `.btn-danger`
- Convergence complète des tailles de police vers la hiérarchie à 6 niveaux
- Convergence complète des rayons vers 8/12/16px uniquement
- Fusion progressive de `showConfirmModal`/`showPromptModal` vers un moteur de dialogue unique et étendu
