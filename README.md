# Spottr — Sandbox (web)

Sandbox de développement de l'app **Spottr**, application de suivi musculation. Toutes les modifications passent par ici avant promotion en prod et sync vers la version mobile.

L'app est une PWA `index.html` unique en HTML/CSS/JavaScript pur, aussi consommée par le projet [`spottr-mobile`](https://github.com/Striinox/spottr-mobile) (Capacitor) qui la wrappe dans un shell natif Android/iOS.

---

## Environnements

| Environnement | URL | Repo | Rôle |
|---|---|---|---|
| **Sandbox web** | striinox.github.io/musculation-app-dev | `musculation-app-dev` | **On bosse toujours ici en premier** |
| **Prod web** | striinox.github.io/musculation-app | `musculation-app` | Promotion manuelle après validation |
| **Mobile (Android/iOS)** | (en cours, futur Play Store + App Store) | `spottr-mobile` | Wrapper Capacitor de la PWA |

Workflow : sandbox → prod (copie de `index.html`) → mobile (copie dans `spottr-mobile/www/` + `npx cap sync`).

---

## Fonctionnalités

### Programme personnalisé
- Onboarding (objectif, niveau, jours, équipement, contraintes) avec algo de génération adapté
- Programmes supportés : Push/Pull/Legs, Upper/Lower, Full Body, Poids du corps, Haut/Bas uniquement
- Variété entre jours (Jour A ≠ Jour B), aucun doublon de mouvement par séance
- Multi-programmes avec switcher actif
- Remplacement d'exercices à la volée depuis la Bibliothèque
- **Partage de programme par code court (7 caractères)** — un ami saisit le code, le programme est dupliqué dans son compte (snapshot indépendant)

### Algorithme de scoring
Chaque exercice est noté selon le profil :
- **Type de mouvement** : compound vs isolation
- **Objectif** : masse / sèche / forme — pour la masse : 70 % compound + 30 % isolation
- **Niveau** : correspondance parfaite +3, trop avancé -5, plus facile +1
- **Pattern de mouvement** : limité à 1 exercice par pattern (curl, dip, squat, row…)
- **Muscle primaire** : limité à 2 exercices par groupe musculaire par séance

### Suivi des séances
- Saisie poids et reps par série, sauvegarde Supabase
- Pré-remplissage en bleu avec les valeurs de la dernière séance
- **Suggestions de surcharge progressive** par exercice : ↗ cible, +rep, stagnate, plateau, etc., avec couleurs et bloc tinté CHARGE
- **Détection de plateau + suggestion de deload** (3 séances de suite sans progrès)
- Adaptation des incréments au programme actif (mass/cut/fitness × beginner/intermediate/advanced)
- Logs isolés par programme (un swap de programme ne pollue pas l'historique d'un autre)

### Mes Records
- Sous-écran dédié accessible depuis Stats : tous tes PRs par exercice
- Photo + nom + 1RM Epley + meilleure série + date + catégorie
- Filtres catégorie (Push/Pull/Legs/Core), tri par 1RM décroissant ou date récente
- Card cliquable : breakdown PR par tranche de reps (1-3, 4-6, 7-10, 11-15, 16+)

### Semaine
- Refonte CHARGE : header eyebrow + display, layout vertical
- **Volume strip hebdo** + comparaison « ↑ +X kg vs S-1 »
- Pool sticky bottom drag-and-drop (long-press sur mobile)
- Drag de séances entre jours pour replanifier la semaine

### Bibliothèque
- 67 exercices catalogués avec illustrations DALL-E
- Cards single-column avec photo 130 px (refonte CHARGE)
- Filtres hybrides catégorie + niveau
- Overlay détail plein écran avec pills muscles, cues, specs, CTA d'ajout à une séance

### Dashboard
- Stats 2×2, graphiques area VOLT
- Bouton « 🏆 Voir tous mes records » qui ouvre l'écran Mes Records

### Timer de repos
- Anneau circulaire CHARGE, auto-démarrage après save
- Choix temps : 45s / 1min / 1m30 / 2min / 3min, mémorisé par exercice
- Wake lock pour éviter l'écran qui s'éteint
- Vibration à la fin

### Session persistante
- Connexion maintenue après fermeture/refresh du navigateur, lock iPhone
- Compatible Safari iOS et Chrome

---

## Stack technique

| Composant | Technologie |
|---|---|
| Frontend | HTML / CSS / JavaScript pur (`index.html` unique) |
| Hébergement web | GitHub Pages |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| Authentification | Supabase Auth (email / mot de passe) |
| Illustrations | DALL-E + Supabase Storage (bucket `exercise-images`) |
| Mobile (en cours) | Capacitor 7 (Android + iOS) |

Identité visuelle : design system **CHARGE v5** (dark mode VOLT jaune-vert, typographies Archivo Black / Archivo / JetBrains Mono).

---

## Architecture Supabase

### Tables principales

**`user_profiles`** — Profil utilisateur
```
user_id, objective, level, days_per_week, equipment, constraints
```

**`programs`** — Programmes d'entraînement
```
user_id, name, is_active, structure (JSONB),
objective, level, share_code (UNIQUE)
```

**`exercises_library`** — Bibliothèque (67 exercices)
```
id, name, muscle_primary, muscles_secondary, category, equipment, level,
reps_recommended, description, tips, variants,
movement_type, objectives, movement_pattern, bodyweight_only
```

**`workout_logs`** — Logs de séance
```
user_id, program_id (FK), exercise_id, exercise_name, day_key,
session_date, set_number, weight_kg, reps
```

### RPC

**`import_program_by_share_code(p_code TEXT)`** — `SECURITY DEFINER`, retourne le programme correspondant au code partagé (sans exposer le `user_id` du créateur). Utilisé par le flow d'import de programme partagé.

### Storage
- Bucket `exercise-images` — illustrations DALL-E (lecture publique)

### Sécurité
- RLS activé sur toutes les tables (`auth.uid() = user_id`)
- `exercises_library` en lecture publique
- L'import de programme partagé bypass la RLS via la RPC `SECURITY DEFINER`

---

## Algorithme de recommandation

### Sélection du type de programme

| Condition | Programme généré |
|---|---|
| Poids du corps | Full Body 3j max |
| Contrainte haut uniquement | Push/Pull alternés |
| Contrainte bas uniquement | Legs A/B/C |
| 2-3 jours (tous niveaux) | Full Body |
| Débutant 4 jours | Upper / Lower |
| Débutant 5-6 jours | Push / Pull / Legs |
| Intermédiaire/Avancé 4 jours | Upper / Lower |
| Intermédiaire/Avancé 5-6 jours | Push / Pull / Legs |

### Surcharge progressive — table d'incréments par programme

| Programme | Compound | Isolation | Stratégie reps |
|---|---|---|---|
| mass + beginner | +5 kg | +2,5 kg | linéaire agressive |
| mass + intermediate | +2,5 kg | +1 kg | classique |
| mass + advanced | +1 kg | +0,5 kg | micro-loading |
| cut (tous niveaux) | 0 | 0 | viser haut du range, densité |
| fitness | +2,5 kg | +1 kg | reps avant poids |

Bodyweight : reps uniquement quel que soit l'objectif.

### Détection de plateau
- 3+ séances consécutives sans progrès significatif (tolérance 2 % sur le 1RM Epley)
- Métrique : best Epley pour exercices pondérés, best reps pour bodyweight
- → suggestion de deload : -10 % poids, ou -1 série, ou changement de variation (lest/tempo/élévation pour bodyweight)

---

## Installation sur iPhone (PWA)

1. Ouvrir l'URL dans **Safari** sur iPhone
2. Bouton **Partager** → **« Sur l'écran d'accueil »**
3. L'app s'installe comme une application native

À terme, la version mobile native sera publiée sur l'App Store et le Play Store via le projet [`spottr-mobile`](https://github.com/Striinox/spottr-mobile).

---

## Roadmap

### En cours
- Transition vers app mobile native (Capacitor) → Android Store + Apple App Store
- Polish mobile : status bar, safe area, splash screen

### Planifié
- Politique de confidentialité RGPD
- Onboarding renforcé pour débutants (tooltips sur 1RM, Epley, deload, etc.)
- Analytics + canal de feedback in-app
- Notifications de rappel d'entraînement (in-app, puis push natif via mobile)
- Stats par muscle (volume hebdo par groupe musculaire)
- Refonte CHARGE du panneau History et du Replace modal
- Indicateur de progression live à côté des inputs

### Reporté à la phase mobile native
- Mode hors-ligne (Service Worker + IndexedDB + sync conflict resolution)
- Notifications push background
- Apple Watch / Wear OS

### Futur
- Système de paiement freemium (Stripe / RevenueCat)
- Vidéos d'exécution des exercices
- Export PDF mensuel
- Coach mode (dyade trainer/coaché)

---

## Historique des versions

### v6 — Mai 2026 (rebrand Spottr + features avancées + transition mobile)
- **Rebrand complet : Muscu/CHARGE → Spottr** (domain `myspottr.app` réservé, repo dédié `spottr-mobile`)
- Suggestions de surcharge progressive par exercice avec adaptation au programme actif (compound/isolation × beginner/intermediate/advanced/cut)
- Détection de plateau + suggestion de deload (3 séances sans progrès)
- Écran « Mes Records » dédié avec PR par tranche de reps (1-3 / 4-6 / 7-10 / 11-15 / 16+)
- Comparaison de volume vs semaine précédente sur le strip hebdo
- Partage de programme par code court à 7 caractères + RPC `import_program_by_share_code` (SECURITY DEFINER)
- Mise en évidence des suggestions : bordure gauche colorée sur la carte fermée + pill icône (↗ / 🔥 / ⚠ / ✨ / 📐 / ⏸) + bloc tinté en haut de la carte étendue
- Migration `programs` : ajout des colonnes `objective` et `level` (manquaient en base, étaient envoyées et droppées silencieusement par Supabase) + backfill par parsing du nom des programmes
- Fixes : gestion d'erreur sur `deleteLog` et `initUserSession`, redirection vers Séance après création/migration de programme
- Init du projet `spottr-mobile` (Capacitor + Android shell + icône S typographique générée par sharp/SVG + @capacitor/assets)

### v5 — Avril 2026
- Redesign complet **CHARGE** (dark mode VOLT, accent jaune-vert)
- Typographies Archivo Black / Archivo / JetBrains Mono
- Ticker temps réel : tonnage semaine, streak, top lift 1RM
- Session hero avec progression live et statut
- Cards exercices collapsibles avec photos DALL-E
- Onglet Séance refait : switcher 7 jours + navigation entre semaines
- Bottom nav simplifiée (5 tabs fixes avec icônes SVG)
- Refonte Auth (logo CHARGE UP., badge version animé) et Onboarding
- Fix bug timezone navigation semaines

### v4 — Mars 2026
- Illustrations DALL-E pour 60+ exercices
- Algorithme anti-doublon avec `movement_pattern`
- Correction niveaux exercices
- Variété des exercices entre Upper A/B et Push/Push Bis
- Sandbox de développement séparée

### v3 — Mars 2026
- Session persistante après refresh / fermeture Safari / lock iPhone
- Timer de repos avec mémorisation par exercice
- Algorithme de scoring intelligent (`movement_type`, `objectives`)
- Refactoring complet du JavaScript

### v2 — Mars 2026
- Onboarding 5 étapes
- Algorithme de recommandation de programme
- Bibliothèque de 67 exercices
- Gestion multi-programmes
- Remplacement d'exercices

### v1 — Mars 2026
- Programme Push/Pull/Legs 5 jours
- Logging avec sauvegarde Supabase
- Dashboard avec graphiques
- Schémas SVG des exercices
- Déploiement GitHub Pages + PWA iPhone
