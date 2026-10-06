# Luca's Games

Simple two-player games for the dinner table. No ads, no accounts, works offline.

**Play:** https://cfedgo.github.io/arcade/

## Put it on your iPhone or iPad

1. Open the link above in **Safari**.
2. Tap **Share**, then **Add to Home Screen**.
3. Open it once while you have signal. After that it works anywhere.

## Games

| Game | Notes |
|---|---|
| Tic-Tac-Toe | X and O, ties called early, winning line |
| Dots & Boxes | 3×3 boxes, close a box to go again |
| Connect 4 | Blue and green discs, ties called early |
| Memory Match | 16 cards of dinos and cars, a match earns another turn |
| Checkers | Official rules: must jump, multi-jumps, kings |

Player 1 is always blue (X), Player 2 always green (O).

Phase 2 adds a computer opponent.

## How it's built

Plain HTML, CSS and JavaScript. No frameworks, no build step, no tracking.

- `index.html` loads everything
- `js/app.js` is the arcade: players, scores, settings, sounds
- `js/games/` holds one file per game
- `sw.js` keeps a copy on the phone for offline play. **Bump `VERSION` in `sw.js` whenever files change** so phones pick up the update.

Scores and player names are saved only on the device.

Font: Bungee, SIL Open Font License (`fonts/OFL.txt`).
