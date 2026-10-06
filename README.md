# Luca's Games

Simple two-player games for the dinner table. No ads, no accounts, works offline.

**Play:** https://cfedgo.github.io/arcade/

## Put it on your iPhone or iPad

1. Open the link above in **Safari**.
2. Tap **Share**, then **Add to Home Screen**.
3. Open it once while you have signal. After that it works anywhere.

## Games

| Game | Status |
|---|---|
| Tic-Tac-Toe | Ready |
| Dots & Boxes | Next |
| Connect 4 | Planned |
| Memory Match (cars & dinos) | Planned |
| Checkers | Planned |

Phase 2 adds a computer opponent.

## How it's built

Plain HTML, CSS and JavaScript. No frameworks, no build step, no tracking.

- `index.html` loads everything
- `js/app.js` is the arcade: players, scores, settings, sounds
- `js/games/` holds one file per game
- `sw.js` keeps a copy on the phone for offline play. **Bump `VERSION` in `sw.js` whenever files change** so phones pick up the update.

Scores and player names are saved only on the device.

Font: Bungee, SIL Open Font License (`fonts/OFL.txt`).
