# Luca's Games

Simple two-player games for the dinner table, plus a coloring book. No ads, no accounts, works offline.

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

## Coloring

**Color:** https://cfedgo.github.io/arcade/coloring/ (also a tile on the games list)

- Tap-to-fill bucket, markers in 4 sizes, eraser, undo, start over
- Built-in pages live in `coloring/pages/` as traced vector line art
- "Add a picture" loads a page from the device and cleans it into line art
- Coloring is saved on the device
- The star button saves a finished copy to **My Art**, titled with the date; open one to view it, delete it, or keep coloring

### Put it on an Amazon Fire tablet

1. Open the coloring link above in **Silk**.
2. Open the menu, choose **Add to Home Screen**.
3. Using an Amazon Kids profile? In the parent settings for his profile, turn on the web browser and allow `cfedgo.github.io`.

### Adding new pages

Make pages in ChatGPT with thick, closed outlines and no gray shading. They are traced to vectors (potrace) and saved to `coloring/pages/`, then listed in `coloring/index.html` and `sw.js`.

Phase 2 adds a computer opponent.

## How it's built

Plain HTML, CSS and JavaScript. No frameworks, no build step, no tracking.

- `index.html` loads everything
- `js/app.js` is the arcade: players, scores, settings, sounds
- `js/games/` holds one file per game
- `sw.js` keeps a copy on the phone for offline play. **Bump `VERSION` in `sw.js` whenever files change** so phones pick up the update.

Scores and player names are saved only on the device.

Font: Bungee, SIL Open Font License (`fonts/OFL.txt`).
