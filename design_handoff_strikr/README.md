# Handoff: STRIKR — "Guess the Footballer" mobile game

## Overview
STRIKR is a mobile game where the player guesses a football (soccer) player's identity from their career club history, revealed one club at a time. Wrong guesses reveal the next club; a correct guess ends the round with a reward reveal (photo, nationality, diamonds/XP). The app also includes a daily Wordle-style challenge on the player's surname, a diamond-currency economy used for hints and reveals, missions, a leaderboard/league, a friends system, onboarding, settings (incl. dark mode and language), and i18n (FR/EN/ES).

## About the Design Files
**The files in this bundle are design references built in HTML/CSS/vanilla JS — they are prototypes demonstrating intended look, content, and behavior, not production code to ship as-is.** The task is to **recreate these designs natively** — most likely as a React Native or Flutter mobile app (or native iOS/Android if preferred) — using whatever environment/stack you choose, since no production codebase exists yet. Treat the HTML/JS here as an exact behavioral and visual spec, not a library to import.

That said, several plain-JS modules (`strikr-game.js`, `strikr-daily.js`, `wiki-lookup.js`, `players.js`, `strikr-i18n.js`, `strikr-diamonds.js`, `strikr-fx.js`) contain **real, working game logic** (matching rules, reward tables, Wikidata lookup logic, translation strings, Wordle-style feedback algorithm) that is framework-agnostic and can be ported/transliterated directly into the target language rather than re-derived from scratch.

## Fidelity
**High-fidelity.** All screens use final copy, exact colors, exact spacing/sizing, and fully working interaction logic (the prototype is literally playable — try it by opening `STRIKR - App.dc.html` in a browser). Recreate pixel-perfectly.

## How to view the prototype
Open `STRIKR - App.dc.html` in any browser — it's a single self-contained app shell with bottom tab navigation between all screens. It requires network access (loads Google Fonts + Wikidata/Wikipedia APIs for club logos and player photos).

`Guess the Player (visual explorations + roadmap).dc.html` is a **working notes / decision log**, not a screen to build — it contains the 3 early visual directions we explored (only 1b "Sticker Album" was chosen and became the final style) and a live checklist of what's done vs. pending. Read it for project history/context, not as a spec.

---

## Design Tokens

### Colors
- Background (cream/paper): `#fff8ee`
- Ink (primary text/borders): `#1a1a1a`
- Primary accent (coral/orange-red): `#ff5a3c`
- Secondary accent (blue): `#2b3ff2`
- Success/mint green: `#a8f5c6`
- Yellow (currency/highlight): `#ffe66b`
- Pink accent: `#ffcae0`
- Light blue accent: `#c9d8ff`
- Wrong-answer red: `#ffd6d0`
- Track/muted background: `#f0eadf`
- Muted text: `rgba(0,0,0,.5)` to `rgba(0,0,0,.55)`
- Dark mode ground: `#15130f` (was `#fff8ee`), dark card: `#211d17` (was `#fff`), dark track: `#2a251c` (was `#f0eadf`), dark text: `#f0e9d8` (was `#1a1a1a`), dark border: `#55503f` (was `#1a1a1a`). Colorful accent chips (yellow/mint/pink/blue/coral/etc.) are NEVER recolored in dark mode — they stay exactly as in light mode; only neutral chrome (backgrounds, white cards, ink text/borders) flips.

### Typography
- Display/headings: **Inter Tight**, weights 600–900, tight letter-spacing (-0.01em to -0.03em) — used for all titles, numbers, buttons.
- Body copy: **Space Grotesk**, weights 400–600 — used for descriptive/secondary text.
- Numeric/data/labels (kickers, stats, timers, codes): **JetBrains Mono**, weights 500–700, wide letter-spacing (0.06em–0.24em), uppercase.
- Sizes: hero numbers 30–40px/900, screen titles 22–30px/900, card titles 13–15px/800-900, body 11–13px/500-600, micro-labels/kickers 9–11px/700 uppercase mono.

### Spacing & Shape
- Border radius: 12–18px on cards/buttons, 99px (pill) on chips/badges/avatars.
- Borders: 2–2.5px solid `#1a1a1a` on nearly every card/button (sticker/comic-book look).
- Shadows: hard offset shadows, no blur — `Npx Npx 0 #1a1a1a` (or an accent color), typically 2–5px offset. This is the signature visual motif — NOT soft drop shadows.
- Screen padding: 20px horizontal typical; safe-area insets respected at top (`env(safe-area-inset-top)`) and bottom.

### Iconography
Emoji only (⚽ 💎 🔥 🏆 🎯 🔤 👤 🧤 🌟 etc.) — no icon library. Keep this in the native rebuild (or swap for a matched custom icon set if the target platform disallows emoji-as-UI, but preserve the playful tone).

---

## App Shell & Navigation
- **Device frame**: designed for iPhone-sized viewport (402×874 reference), safe-area aware.
- **Bottom tab bar** (5 items): Home (🏠), Missions (🎯), centered raised circular Game button (⚽, accent-colored, elevated -4px with its own shadow), League/Ligue (🏆), Profil (👤). Active tab has a highlighted state.
- Screens NOT on the tab bar but reachable by navigation: **Daily Challenge** (from Home card or its own entry point), **Settings** (gear icon from Profil), **Friends** (from Profil button or League's "live" banner), **Onboarding** (shown once, first launch only, dismissible).
- Navigation is a simple screen-swap (single active `.app-screen` at a time) driven by `data-nav="<screen>"` attributes on buttons — recreate as your framework's standard stack/tab navigation.

## Screens / Views

### 1. Onboarding
- **Purpose**: First-launch, 3-slide swipeable/steppable intro explaining the core mechanic, daily challenge, and diamond economy.
- **Layout**: Full-screen overlay above the app shell. Header row: "Passer" (Skip) link top-right. Center: icon in a colored rounded-square badge (72px, hard shadow), title (22px/900), body text (13px), and for slide 1 only a small illustrative list of 3 club rows (2 "done"/checked, 1 "locked/?"). Dot pagination below. Bottom: full-width primary button, label "Suivant →" on slides 1–2, "Commencer →" on the last slide.
- **Slides content**:
  1. ⚽ coral badge — "Devine le joueur" — explains clubs reveal one by one, wrong guess reveals next club.
  2. 🔤 blue badge — "Défi du jour" — same player for everyone daily, Wordle-style feedback (yellow=correct position, white=present, blue=absent).
  3. 💎 yellow badge — "Gagne des diamants" — up to 50💎 on first try; spend on hints (nationality/position/age) or save for the League.
- **State**: `localStorage: strikr_onboarding_seen_v1` — set to `'1'` on finish/skip; never show again after.

### 2. Home
- **Purpose**: Dashboard/launcher — surfaces the daily puzzle, quick stats, and links into Daily Challenge, League, Missions.
- **Layout** (top to bottom, scrollable — content is TALLER than the viewport, must scroll):
  - Header row: logo mark (small square, ⚽ on ink background) + "STRIKR" wordmark, and on the right two pill badges: 🔥 streak count, 💎 diamond balance (`id="home-diamonds"`, live-updated from the shared diamond store).
  - **Puzzle-of-the-day card**: full-width, ink-black background, coral radial-glow decoration, coral hard-shadow. Kicker "PUZZLE DU JOUR", huge puzzle number ("N°142"), 2-line description, a rotated emoji tile (👤, rotate 6°) top-right, full-width yellow CTA button "▶ Jouer maintenant" (navigates to Game), and a centered mono stat line ("JOUEURS · 125 234 · MOYENNE 3.4 CLUBS").
  - **3-stat row**: 3 equal cards (white/mint/pink backgrounds) showing Solves count, Best streak (🔥), First-try % — each a big number (22px/900) + small mono label.
  - **3 stacked nav cards** (full-width rows, icon + title + subtitle + arrow):
    1. Daily Challenge (blue bg) — "DÉFI DU JOUR · NOUVEAU" kicker, "Devine le joueur en 6 essais", "Même joueur pour tous · jusqu'à +50 💎".
    2. League (ink bg) — "LIGUE OR · SAISON S2" kicker, current rank "6ᵉ sur 42", "+390 XP pour top 3 · J-3".
    3. Missions (white bg) — "MISSIONS DU JOUR" kicker, progress "1/4 · +200 XP acquis", thin progress bar.
- **Background decoration**: 2 large soft-opacity colored circles (coral top-right, blue mid-left) positioned absolutely behind content, `opacity .06–.08`.

### 3. Game (core mechanic)
- **Purpose**: The main "guess the player" round.
- **Layout**:
  - Header: kicker "Joueur mystère", 🔥 streak pill, 💎 diamond pill (`#strikr-diamonds`), big title "Devine **le player** ⚽" (accent color on 2nd word), reveal counter text ("N / total clubs révélés · tape 2 lettres"), and — when a thematic filter is active — a removable filter/category badge.
  - **Difficulty selector modal** (shown before each round via `promptLevelThenPick()`): centered card, title + subtitle, 3 stacked buttons — Easy 🟢 (mint), Medium 🟡 (yellow), Hard 🔴 (pink). Difficulty affects which players are eligible (curated easy/hard name sets; everyone else is "medium") and the diamond reward table.
  - **Hint row**: 3 chips to reveal Nationality (30💎), Position (20💎), Age (30💎) — tap to purchase if affordable, else the diamond counter flashes red (`flashLowDiamonds`).
  - **Club timeline** (`#strikr-cards`): vertical stack of "sticker" cards, one per club in career order. Revealed card = white bg, 2px ink border, hard shadow, club crest/logo (or colored initials fallback), club name, "CLUB N" label, green checkmark badge. Unrevealed card = diagonal-striped placeholder background, dashed border, "?" placeholder, "à débloquer" + "Sticker #N" label. The most-recently-revealed card gets a spring-in entrance animation (`.strikr-card-reveal`, ~420ms cubic-bezier bounce).
  - **Wrong guesses tray**: horizontal wrap of small pill chips showing each incorrect guess text with a ✕.
  - **Input row**: text input with placeholder "Tape 2 lettres...", live **autocomplete dropdown** appearing above the input (up to 6 name matches, click to fill+submit), a "↻" reset/forfeit button (free between rounds, costs 30💎 mid-round — shows "↻ 30💎" while playing) and a coral "Envoyer 🎯" submit button. Wrong submission triggers input shake animation + haptic/sound feedback.
  - **Win overlay** (`#strikr-win`): full-screen overlay, warm gradient (coral→orange→yellow), confetti dots, "TROUVÉ ✓" pill + "↻ NOUVEAU" button top row, circular conic-gradient-ringed portrait (real Wikidata photo when available, else initials on dark circle) with a soft radial mask, "✦ TROUVÉ AU Nᵉ CLUB ✦" label, player name (first name regular + **LAST NAME accent-colored, uppercase**), nationality flag pill + position pill + birth-year pill, full club-crest strip (mini logos with arrows), 3 reward stat cards (💎 gems, XP, 🔥 streak), and bottom actions "📤 Partager" (secondary) + "Suivant →" (primary, full width-ish).
- **Matching rule**: guess matches if it equals the full name OR just the last name (accent-insensitive, case-insensitive).
- **Rewards** (diamonds): vary by difficulty level and how many clubs were revealed before the correct guess — see `REWARD_TABLE` in `strikr-game.js` for exact numbers per level/attempt-count.
- **Forfeit cost**: 30💎 to abandon a round in progress and get a new player; free once a round is already won.

### 4. Daily Challenge ("Défi du jour")
- **Purpose**: A Wordle-style puzzle guessing a footballer's **surname**, same puzzle for every player each day (seeded by date), max 6 attempts.
- **Layout**:
  - Header: kicker "Défi du jour", diamond balance pill (`#daily-diamonds`), title "Trouve le **nom**", status line (center-aligned) showing attempt count or win/loss result.
  - **Letter grid** (`#daily-grid`): up to 6 rows × word-length columns of 38×38px tiles. Colors: **yellow** = correct letter & position (locked, auto-filled on future rows), **white** = correct letter, wrong position, **blue** = letter not in word, cream/dashed = empty/untyped.
  - **On-screen keyboard** (`#daily-keyboard`): AZERTY layout (3 rows), each key tinted by its best-known result color; bottom row has "⌫ EFFACER" (backspace) and "VALIDER ⏎" (submit) buttons. Physical keyboard input also supported (Enter/Backspace/A–Z).
  - **On win**: 128px circular portrait (real photo via Wikidata or initials fallback) appears centered, status line shows attempts + reward diamonds earned.
- **Reward table**: 1st try → 50💎; 2nd–3rd → 25💎; 4th–6th → 10💎 (added to the same shared diamond wallet as the main game).
- **Key mechanic**: correctly-placed (yellow) letters from a prior guess are **locked** into that position on all subsequent rows — the player only needs to fill in the remaining blanks.

### 5. Missions
- **Purpose**: Daily quest list with XP/diamond rewards.
- **Layout**: Title "Missions **du jour**", subtitle with bold XP amount, overall progress bar (X/4 missions, +XP earned), then a scrollable list of mission rows: icon tile (44×44, colored bg) + title + detail/progress, and either a "DONE" ink pill (completed), a thin progress bar + fraction text (in progress), or a "GO"/action button (not started). Completed missions get a mint-green card background.

### 6. League ("Ligue")
- Leaderboard screen — podium-style top 3 + ranked list below, includes streak/XP display for "You" highlighted differently from other rows, and (per earlier iteration) an entry point into Friends via a "EN DIRECT" live-friends banner.

### 7. Friends ("Mes amis")
- **Purpose**: Social layer — add friends via code/username, see friend activity, get suggestions.
- **Layout**: Back button + "Mes amis" title. Add-friend row: text input ("Code ou @pseudo d'un ami") + "Ajouter" button. Own invite code card (dashed border, 🔗 icon, "STRIKR-V0US7" code + "Copier" button). Friends list: rows with colored circular initial-avatar, name, activity subtitle (streak/result/last-seen), online-status dot (green = online). Suggestions section below with an "Ajouter" action per suggested contact.

### 8. Profil
- Avatar, username, level badge, entry points to Friends and Settings (gear icon).

### 9. Settings ("Paramètres")
- **Purpose**: Account + preferences.
- **Layout**: Back button + title. Sections (each with a small mono section header):
  - **Compte**: account row (avatar, name, connection method, "Modifier" link).
  - **Préférences**: toggle switches (custom-styled, not native) for Notifications, Sons, Vibrations, Mode sombre; a "Langue" row opening a **dropdown/select** with FR/EN/ES options; each toggle is a 42×24px pill track with a sliding 16×16px knob (mint when on, muted track when off).
  - **Support**: "Aide & contact" and "Conditions & confidentialité" nav rows.
  - Full-width outlined coral "Se déconnecter" (log out) button at the bottom.
- **Dark mode**: toggling flips the whole app's neutral chrome (backgrounds/cards/text/borders) to a dark palette while leaving colorful accent chips/badges/gradients untouched (see Design Tokens above for exact dark values) — implemented in the prototype as a live DOM recolor; in the native rebuild this should simply be a proper theme/color-scheme switch.
- **Language switching**: changing language re-renders all `data-i18n`/`data-i18n-html`-tagged strings from `strikr-i18n.js`'s FR/EN/ES dictionaries; persisted so it survives reload.

---

## Interactions & Behavior Summary
- **Autocomplete**: name-matching starts at 2 typed characters, substring match against the player database, top 6 shown, click-to-fill+submit.
- **Wrong-guess feedback**: input/card shake animation (~380ms) + haptic vibration + a short synthesized error tone (no audio files — tones are generated via Web Audio API oscillators, see `strikr-fx.js`).
- **Correct-guess feedback**: win chime (ascending 4-note arpeggio) + success haptic pattern + confetti-style overlay.
- **Hint purchase feedback**: short "coin" chime + haptic tick.
- **Card reveal animation**: newly-revealed club card springs in (translateY + scale bounce, cubic-bezier overshoot, ~420ms).
- **Low-diamond feedback**: diamond balance counter flashes to indicate insufficient funds when a hint/forfeit is attempted without enough currency.
- **Difficulty & thematic filters**: a small filter/category badge with a ✕ appears in the Game header when a non-default filter is active; tapping ✕ clears it and returns to the unfiltered player pool.

## State Management
- **Diamond wallet**: a single shared balance (`strikr-diamonds.js`) read/written by both the main Game and Daily Challenge, persisted, with a pub/sub-style change notification so both screens' displayed balance stay in sync live.
- **Game round state**: current player, revealed-club count, wrong-guess list, win/loss status, which hints have been purchased, selected difficulty level, remaining-players-per-difficulty pools (so the same player doesn't repeat until the pool is exhausted).
- **Daily Challenge state**: today's seeded player (deterministic by calendar date so it's identical for all users that day), guesses array, locked-correct-letter positions, win/loss status, reward-already-granted flag (prevents double reward on re-render).
- **Onboarding-seen, dark-mode-on, selected-language**: persisted flags/values so they survive app relaunch.
- **Roadmap/todo checklist** (in the exploration file only, not part of the shipped app): persisted checkbox states — not relevant to the production rebuild.

## Data
- **Player database** (`players.js`): ~200+ entries, each `{ n: full name, nat: ISO country code, dob: birth year, pos: GK|DF|MF|AT, clubs: [career clubs in chronological order] }`. This is real public football data and can be used directly or expanded.
- **Club crests / player photos**: resolved **dynamically at runtime** from Wikidata (`wiki-lookup.js` queries Wikidata's `P154` "logo image" property for clubs and `P18` "image" property for people, falling back to Wikipedia's REST summary API for photos). `wiki-overrides.js` is a manual override map for any specific club/player where the automatic lookup returns a wrong or missing image — check it for curated corrections before re-deriving image URLs elsewhere. In the native rebuild, decide whether to keep this live-lookup approach (simple, but subject to API availability/rate limits) or pre-bake a static asset bundle from the same sources for reliability.
- **i18n strings** (`strikr-i18n.js`): FR (default)/EN/ES dictionaries keyed by string ID, covering every piece of UI copy. Reuse the keys and translations directly.

## Assets
- No custom icon/image assets — all iconography is emoji.
- Fonts: Google Fonts — Inter Tight, Space Grotesk, JetBrains Mono (loaded via `<link>` in the prototype's `<head>`).
- Player photos and club crests are fetched live from Wikimedia Commons / Wikidata (public domain / freely licensed sources) — **note the roadmap flagged that official club-logo licensing for a public release has not been resolved**; confirm usage rights before shipping images of real clubs/players commercially, or plan a fan-art/illustrated fallback set.

## Files in this bundle
- `STRIKR - App.dc.html` — the full app shell: every screen (Home, Missions, Game, League, Friends, Profil, Settings, Onboarding), navigation, dark mode engine, i18n wiring. **Primary reference — open this to click through the whole app.**
- `strikr-game.js` — main game logic: player pool/difficulty selection, matching, hints, rewards, rendering, card reveal.
- `strikr-daily.js` — daily Wordle-style challenge logic: seeded player selection, letter-feedback algorithm, locked-letter carry-over, keyboard.
- `strikr-diamonds.js` — shared diamond-currency wallet (get/add/subscribe).
- `strikr-fx.js` — haptics + synthesized sound effects (Web Audio API, no audio files).
- `strikr-i18n.js` — FR/EN/ES string dictionaries + language-switching engine.
- `wiki-lookup.js` — Wikidata/Wikipedia club-logo and player-photo resolver.
- `wiki-overrides.js` — manual corrections for specific clubs/players where auto-lookup is wrong.
- `players.js` — the player database (~200+ entries).
- `ios-frame.jsx` — a device-bezel component used only for presenting the prototype in a phone frame; not part of the app itself, skip in the rebuild.
- `Guess the Player (visual explorations + roadmap).dc.html` — project history: early visual direction explorations (for context only — the shipped style is Sticker Album/1b, already fully reflected in `STRIKR - App.dc.html`) and a running checklist of completed vs. pending work items.
