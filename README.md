# 💪 Muscu — Application de Suivi Musculation

Application web progressive (PWA) de suivi d'entraînement musculation, optimisée pour iPhone. Installable sur l'écran d'accueil via Safari.

---

## Fonctionnalités

### Programme personnalisé
- Questionnaire d'onboarding en 5 étapes (objectif, niveau, jours, équipement, contraintes)
- Algorithme de recommandation avec scoring intelligent adapté au profil
- Programmes supportés : Push/Pull/Legs, Upper/Lower, Full Body, Poids du corps, Haut uniquement, Bas uniquement
- Variété des exercices entre les jours (Jour A ≠ Jour B, Push ≠ Push Bis)
- Aucun doublon de mouvement dans la même séance (ex: pas deux types de curl ensemble)
- Gestion de plusieurs programmes avec possibilité de switcher
- Remplacement d'exercices dans le programme depuis la bibliothèque

### Algorithme de scoring
Chaque exercice est noté selon le profil de l'utilisateur :
- **Type de mouvement** : polyarticulaire (compound) ou isolation
- **Objectif** : masse, sèche ou forme générale — pour la masse : 70% compound + 30% isolation
- **Niveau** : correspondance parfaite +3, trop avancé -5, plus facile +1
- **Pattern de mouvement** : limité à 1 exercice par pattern (dip, curl, squat, row...)
- **Muscle primaire** : limité à 2 exercices par groupe musculaire par séance

### Suivi des séances
- Saisie des poids et répétitions par série
- Sélection de la date de séance
- Sauvegarde automatique dans Supabase (cloud)
- Historique par exercice avec détection automatique des PRs (1RM estimé)

### Timer de repos
- Se déclenche automatiquement après chaque sauvegarde de série
- Choix du temps de repos : 45s / 1min / 1m30 / 2min / 3min
- Mémorisation du dernier temps choisi par exercice
- Barre de progression visuelle
- Passage en rouge dans les 10 dernières secondes
- Vibration à la fin du timer

### Bibliothèque d'exercices
- 67 exercices catalogués avec illustrations DALL-E
- Classés par type (compound/isolation), objectif et pattern de mouvement
- Filtres par catégorie (Push, Pull, Legs, Core) et niveau
- Recherche par nom ou muscle ciblé
- Description technique de chaque exercice

### Dashboard de progression
- Statistiques globales : séances, séries, volume total soulevé, exercices suivis
- Graphiques de progression par exercice (poids max dans le temps)
- Détection et affichage des records personnels (PR)
- Filtres par jour d'entraînement

### Session persistante
- Connexion maintenue après fermeture de Safari
- Connexion maintenue après verrouillage de l'iPhone
- Connexion maintenue après rechargement de la page
- Compatible Safari iOS et Chrome

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | HTML / CSS / JavaScript pur (fichier unique) |
| Hébergement | GitHub Pages |
| Base de données | Supabase (PostgreSQL) |
| Authentification | Supabase Auth (email / mot de passe) |
| Illustrations | DALL-E + Supabase Storage |

---

## Environnements

| Environnement | URL | Usage |
|---------------|-----|-------|
| Production | striinox.github.io/musculation-app | App stable utilisée en salle |
| Sandbox | striinox.github.io/musculation-app-dev | Développement et tests |

Toutes les modifications passent d'abord par la sandbox avant d'être promues en production.

---

## Architecture Supabase

### Tables

**`user_profiles`** — Profil et préférences de l'utilisateur
```
user_id, objective, level, days_per_week, equipment, constraints
```

**`programs`** — Programmes d'entraînement
```
user_id, name, is_active, structure (JSONB)
```

**`exercises_library`** — Bibliothèque des exercices
```
id, name, muscle_primary, muscles_secondary, category, equipment, level,
reps_recommended, description, tips, variants,
movement_type, objectives, movement_pattern
```

**`workout_logs`** — Logs des séances
```
user_id, exercise_id, exercise_name, day_key, session_date, set_number, weight_kg, reps
```

### Storage
- Bucket `exercise-images` — illustrations DALL-E des exercices (public)

### Sécurité
- Row Level Security (RLS) activé sur toutes les tables
- Chaque utilisateur ne voit que ses propres données
- La table `exercises_library` est en lecture publique

---

## Installation sur iPhone (PWA)

1. Ouvrir l'URL dans **Safari** sur iPhone
2. Appuyer sur le bouton **Partager** (carré avec flèche)
3. Sélectionner **"Sur l'écran d'accueil"**
4. L'app s'installe comme une application native

---

## Algorithme de recommandation

### Sélection du type de programme

| Condition | Programme généré |
|-----------|-----------------|
| Poids du corps | Full Body 3j max |
| Contrainte haut uniquement | Push/Pull alternés |
| Contrainte bas uniquement | Legs A/B/C |
| 2-3 jours (tous niveaux) | Full Body |
| Débutant 4 jours | Upper / Lower |
| Débutant 5-6 jours | Push / Pull / Legs |
| Intermédiaire/Avancé 4 jours | Upper / Lower |
| Intermédiaire/Avancé 5-6 jours | Push / Pull / Legs |

### Scoring des exercices

```
score = 0
Niveau correspond parfaitement    → +3
Niveau trop avancé                → -5
Niveau plus facile                → +1
Objectif inclus dans l'exercice   → +3
Masse + exercice polyarticulaire  → +3
Masse + exercice isolation        → +1
Sèche + exercice isolation        → +2
Forme + exercice polyarticulaire  → +2
```

### Règles anti-doublon par séance
- Maximum 1 exercice par `movement_pattern` (curl, dip, squat, row, pulldown...)
- Maximum 2 exercices par `muscle_primary`
- Exercices déjà utilisés dans la séance A exclus de la séance B

### Répartition des niveaux
- Débutant : 28 exercices
- Intermédiaire : 30 exercices
- Avancé : 9 exercices

---

## Roadmap

### En cours
- Illustrations manquantes : écarté poulie basse, leg curl assis, squat barre

### Planifié
- Pré-remplissage avec les valeurs de la dernière séance
- Politique de confidentialité RGPD
- Icône PWA personnalisée
- Notifications de rappel d'entraînement
- Export PDF de la progression
- Accès coach (lecture seule)
- Mode hors-ligne (Service Worker)
- Personnalisation du programme (ajouter/supprimer exercices)

### Futur
- Système de paiement (Stripe)
- Publication App Store
- Domaine personnalisé

---

## Historique des versions

### v5 — Avril 2026
- Redesign complet CHARGE (dark mode VOLT sporty, accent jaune-vert)
- Typographie Archivo Black · Archivo · JetBrains Mono
- Ticker temps réel : tonnage semaine · streak · top lift 1RM
- Session hero avec progression live et statut (Aujourd'hui / Terminée / En cours / Programmée / Repos)
- Cards exercices collapsibles (1 ouverte à la fois) avec photos DALL-E en thumbnail et banner, checkboxes par série
- Onglet Séance refait : switcher 7 jours + navigation entre semaines (‹ › Auj.) + card « Jour de repos » automatique
- Bottom nav simplifié : 5 tabs fixes avec icônes SVG thin-stroke (au lieu d'un tab par jour + emojis)
- Polish complet : Semaine (cellules rondes, today glow), Progression (big stats, graphiques VOLT), Bibliothèque (chips pilules), Programmes (bouton + en tirets accent), Modal de remplacement (backdrop blur glass iOS)
- Refonte Auth (logo CHARGE UP., badge version animé, gradient background) et Onboarding (questions en display, options cards VOLT)
- Fix bug timezone dans la navigation des semaines de l'onglet Séance
- `.nojekyll` ajouté pour contourner les timeouts Jekyll sur Pages

### v4 — Mars 2026
- Illustrations DALL-E pour 60+ exercices stockées dans Supabase Storage
- Algorithme anti-doublon avec `movement_pattern`
- Correction niveaux exercices (débutant/intermédiaire/avancé)
- Variété des exercices entre Upper A/B et Push/Push Bis
- Sandbox de développement séparée (`musculation-app-dev`)
- Workflow sandbox → production établi

### v3 — Mars 2026
- Session persistante après refresh, fermeture de Safari et verrouillage iPhone
- Timer de repos avec choix du temps et mémorisation par exercice
- Algorithme de scoring intelligent (`movement_type`, `objectives`)
- Variété des exercices entre les jours Full Body
- Refactoring complet du code JavaScript

### v2 — Mars 2026
- Questionnaire d'onboarding 5 étapes
- Algorithme de recommandation de programme
- Bibliothèque de 67 exercices avec filtres
- Gestion multi-programmes avec switch
- Remplacement d'exercices dans le programme
- Migration utilisateurs existants

### v1 — Mars 2026
- Programme Push/Pull/Legs 5 jours
- Système de logging avec sauvegarde Supabase
- Dashboard de progression avec graphiques
- Schémas SVG des exercices
- Déploiement GitHub Pages + PWA iPhone
