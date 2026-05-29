# Spottr (musculation-app-dev) — sandbox

PWA Spottr (musculation tracking), fichier `index.html` unique servi sur GitHub Pages.

**Toujours bosser ici en premier**, jamais directement en prod.

---

## Écosystème (3 repos, 1 backend)

| Repo | URL | Rôle |
|---|---|---|
| `musculation-app-dev` (ici) | striinox.github.io/musculation-app-dev | Sandbox |
| `musculation-app` | striinox.github.io/musculation-app + `myspottr.app` | Prod web |
| `spottr-mobile` | (publication Play / App Store en cours) | Wrapper Capacitor 8 |

Workflow : sandbox → prod (`cp index.html`) → mobile (`cp` dans `www/` + `npx cap sync`).

**Tous partagent le même backend Supabase** (projet `rqymrinhvihfrlgklkfi`, eu-west-1, plan **Pro** depuis 2026-05-30).

---

## Stack

- HTML / CSS / JS pur dans **`index.html` unique** (+ `sw.js` pour cache illustrations)
- JS wrappé en **IIFE** → les fonctions appelées depuis `onclick=` HTML doivent être aliasées `window.xxx` (cf. memory `project_muscu_iife_inline_pitfall`)
- Supabase (PostgreSQL + Auth + Storage)
- PWA installable iPhone via Safari
- Identité visuelle : design system **CHARGE v5** (dark mode VOLT — fond `#161719`, accent `#D7E661`, typo Archivo Black / Archivo / JetBrains Mono)
- Capacitor **8** côté mobile (`@capacitor/haptics`, `splash-screen`, `status-bar`, `@capgo/capacitor-social-login`)
- Bundle `app.myspottr.gym`, domaine `myspottr.app`

---

## Tables Supabase clés

| Table | Contenu |
|---|---|
| `user_profiles` | `objective`, `level`, `days_per_week`, `equipment`, `constraints` |
| `programs` | `structure` JSONB (template), `share_code` (7 chars UNIQUE), `objective`, `level`, `is_active` |
| `exercises_library` | 67 exercices, colonnes `_en` câblées (i18n EN), `movement_type`, `objectives`, `movement_pattern`, `muscle_primary`/`muscles_secondary` |
| `workout_logs` | logs par série, `program_id` (FK ON DELETE SET NULL), `session_id` (FK ON DELETE SET NULL, depuis v8) |
| `sessions` | **overrides matérialisés** (depuis v8) : 1 row par séance datée qui s'écarte du template. Unique `(user_id, program_id, day_key, session_date) WHERE program_id IS NOT NULL` |
| `feedback` | retours beta (RLS insert-only `authenticated`, lecture admin via service role) |

RLS partout (`auth.uid() = user_id`). `exercises_library` en lecture publique.

RPC `SECURITY DEFINER` :
- `import_program_by_share_code(p_code TEXT)` — duplique un programme via son code court partagé
- `delete_my_account()` — purge `feedback`, `workout_logs`, `sessions`, `programs`, `user_profiles`, `auth.users` (exigence Apple/Google)

---

## Architecture sessions matérialisées (v8, 2026-05-30)

Sépare proprement **template** (la routine = `programs.structure`) et **occurrences** (ajustement daté dans `sessions.exercises`). Cf. memory `project_muscu_sessions_materialized` pour le détail.

- **Vue Séance** → mutations dans `sessions.exercises` via `ensureSessionOverride(day, date)` (INSERT lazy idempotent avec snapshot du template). Helpers : `getDisplayExercises(day, date)` (routing override ↔ template) et `fetchSessionsForWeek(programId, start, end)` (préchargement parallèle aux `workout_logs`).
- **Vue Programmes > "Modifier"** (sur la carte du programme actif) → mutations dans `programs.structure` via `persistProgramStructure()` (UPDATE + sync `activeProgram.structure` en mémoire pour cohérence vue séance).

⚠️ Tous les renderers ont changé de signature pour accepter la **liste effective** au lieu de `day.exercises` direct : `renderSessionHero(day, stats, statusLabel, exercises)`, `mountExerciseCards(day, date, dayLogs, exercises)`, `computeSessionStats(exercises, logs)`. Si tu ajoutes un nouveau renderer côté séance, **toujours passer par `getDisplayExercises`** sinon les overrides ne s'affichent pas.

---

## Pièges connus (liens vers memories)

| Piège | Memory |
|---|---|
| IIFE → fonctions invisibles depuis `onclick=` sans alias `window.xxx` | `project_muscu_iife_inline_pitfall` |
| HTML déclaré après `</script>` (timer-overlay) → différer via `DOMContentLoaded` | `project_muscu_dom_after_script_pitfall` |
| Supabase drop silencieux des colonnes inconnues à l'insert/update | `project_muscu_supabase_silent_drop` |
| Supabase Storage `remove()` tronqué à ~16 fichiers → batcher par ≤10 | `project_muscu_supabase_storage_bulk_delete_truncated` |
| Bug supabase-js #2013 deadlock OAuth → workaround raw HTTP `/token` | `project_muscu_supabase_oauth_deadlock` |
| iOS Safari OAuth Google : 3 pièges cumulés (fetch flaky / `location.reload()` perd localStorage / `setSession()` deadlock) | `project_muscu_ios_safari_fetch_flaky` |
| Ghost click iOS sur overlay qui change de layout au `touchend` | `project_muscu_ios_ghost_click_pitfall` |

Pièges non encore mémorisés mais à connaître :
- **Service Worker iOS sert un mix HTML/JS de plusieurs versions** après plusieurs push consécutifs → hard refresh agressif (fermer l'onglet + Safari multitâche) pour purger. Symptôme : "rien ne se passe au tap" sur un bouton qui devrait marcher.
- **Z-index ordonné des overlays** : `.lib-overlay` 80 < `.lib-add-modal` 90 < `.timer-overlay` 100 < `.prog-edit-overlay` 150 < `.modal-overlay` 200 < `#program-pick-modal` 1000 (override explicite pour qu'il monte au-dessus de son overlay parent). Tout nouvel overlay full-screen iOS doit utiliser :
  - `padding-top: calc(var(--safe-top) + 14px)` sur le sheet pour ne pas passer derrière la status bar / l'encoche
  - close button `position:fixed` avec `top:calc(var(--safe-top) + 14px)` style `.lib-overlay-close` (rond noir flottant avec `backdrop-filter:blur`)
  - `-webkit-overflow-scrolling:touch` + `overscroll-behavior:contain` (sinon scroll buggé une fois sur deux)
- **`console.debug` du flow OAuth sont load-bearing** sur iOS Safari (timing critique). Les retirer casse l'auth. Cf. memory OAuth deadlock.
- **Flags `isInitializing` et `appReady`** gèrent l'init de l'auth — ne pas les casser.
- **Descriptions / noms d'exercices** : lire depuis `libraryCache` au moment du render, **pas** depuis les données du programme stocké (le snapshot peut être daté).

---

## Illustrations

- Library **100 % illustrée** depuis 2026-05-04 (66 WebP dans bucket `exercise-images`, cache 1 an)
- Helper `img()` ajoute `.webp` automatiquement, set `HAS_IMG` ~ligne 2600 de `index.html`
- Bucket nettoyé le 2026-05-28 : 63 PNG legacy supprimés (~101 MB libérés)
- Script de cleanup réutilisable : `spottr-mobile/scripts/cleanup-png.mjs` (dépendance-free, batche par 10 pour contourner le plafond silencieux du bulk DELETE)
- **Alias spécial** : `tractions-pdc` utilise `tractions-large.webp` (pas de fichier propre, alias dans `getSVG()` — à préserver)
- Cf. memory `project_muscu_illustrations_status`

---

## i18n

- ~210 clés FR/EN, langue par défaut **EN**, détection auto via `navigator.language`, bouton 🌐 dans le menu ⋮
- Système maison sans dépendance : objet `I18N { fr, en }` + `t(key, params)` + `applyTranslations()` sur attributs `data-i18n*`
- Pour tout nouveau string : **`t('key')` côté JS** + **`data-i18n="key"` côté HTML**, jamais en dur
- Helpers `getEx*` (`getExName`, `getExDescription`, `getExTips`, `getExMusclePrimary`, `getExMusclesSecondary`) pour render les exos — **jamais directement `ex.name`** (sinon utilisateur EN voit du FR)
- Pour les exos ajoutés à `exercises_library` : remplir aussi les colonnes `_en`, sinon fallback FR
- Cf. memory `project_muscu_i18n_status`

---

## Workflow de travail avec Claude Code

- **Étape par étape** : chaque modif vérifiée avant de passer à la suivante (cf. memory `feedback_workflow_musculation`)
- Préférer les **diffs exacts / `str_replace`** aux instructions génériques
- Commits **en français**
- **JAMAIS push sur prod `musculation-app` sans confirmation explicite** — uniquement sur `musculation-app-dev`
- Demander confirmation avant tout `git push`
- Préfère le **scope complet plutôt que stub/MVP** quand plusieurs options sont sur la table (cf. memory `feedback_decision_style`)
- Quand on promo prod : copie de `index.html` sandbox → prod, commit FR, push. Puis copie vers `spottr-mobile/www/` + `npx cap sync android` pour propager aux assets natifs.

---

## Principes algorithmiques (génération de programme)

- **Compound movements AVANT isolation** dans une même séance
- Max **1 exercice par `movement_pattern`** par séance (curl, dip, squat, row, pulldown…)
- Max **2 exercices par `muscle_primary`** par séance
- Pour la masse : 70 % compound + 30 % isolation
- Niveau : match parfait +3, trop avancé -5, plus facile +1
- Détection de plateau : 3+ séances consécutives sans progrès significatif (tolérance 2 % sur le 1RM Epley)
- Table d'incréments adaptée au programme (`mass`/`cut`/`fitness` × `beginner`/`intermediate`/`advanced`)
