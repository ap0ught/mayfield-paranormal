# Sprite-sheet animation verification

- **Character templates:** 51 (House 11, Park 15, Bank 14, Hotel 11)
- **Individual sprite PNGs:** 51
- **Frames per atlas:** 6 (idle, 4 walk poses, interaction)
- **Sprite sheet size:** 384×88 RGBA / six transparent 64×88 cells
- **Art validation:** All 51 sprites contain visible content and distinct walk and interaction frames.
- **Unit tests:** 96/96 passed, including four sprite-specific Node tests.
- **Level validation:** House 3×3, Park 3×3, Bank 4×4, Hotel 6×6, Farm example 3×3 validated.
- **Integration:** Live cameras animate at 4 frames per 640ms; small camera snapshots advance 1 pose per 1.3 seconds; simulation pause freezes frames. The Park role scheduler selects job-dependent idle, en-route and interaction states.
- **Guest identities:** Guest instances resolve their template ID rather than requiring a separate image for every visit. Newly manifested ghosts use a valid same-level fallback.
- **Syntax:** App.jsx, sprite-animation.js, rooms.js passed TypeScript transpile syntax checks.

## Verification limitation

The environment does not have the full Vite/React npm dependency tree, so a production build was not run. A Chromium screenshot attempt also hung. Assets, source syntax, all 96 Node tests, and a Pillow pixel-level asset audit passed; the in-browser appearance of the updated gameplay should be checked locally with `npm run dev`.
