# 🤖 Agent Playbook — Build a New Mayfield Level (Worked Example: Farm)

> **Outcome**: implement a new Farm level **in the existing Vite/React simulation**, not a parallel game. The farm has a **standalone 3×3 field** consisting of nine connected field sectors. No barn, farmhouse, driveway, equipment shed or road consumes a field cell. Those features may be drawn *outside* the field boundary in the background or implemented as a separate map later.
>
> **Status**: this repository ships a **validated, asset-backed Farm example**, but does **not** register it as a fifth playable level by default. The agent should use that example as its starting point when asked to implement Farm.

## 0. Find the engine first

Read these files in order:

1. `src/level-engine.js` — authoritative simulation logic (`validateLevel`, `initializeLevel`, `advanceWorld`, `applyObjectiveEvent`, `evaluateLevel`). **Do not duplicate these rules.**
2. `src/rooms.js` — level registry and existing House / Park / Bank configurations.
3. `src/hotel-level.js` — separate data module for a 6×6 map with multi-cell suites and a 2×3 camera wall.
4. `src/App.jsx` — shared rendering, level switcher, audio, cameras, timers, ghost traps, and checklist. It should *not* need new Farm-specific branches for basic gameplay.
5. `tests/level-engine.test.js`, `tests/render-regression.test.js` — the required contract.
6. `examples/farm-level.example.js` — **complete validated configuration for this assignment**.
7. `scripts/generate-farm-example-art.py` — deterministic art for every Farm zone plus the field overview.

The engine has **three simultaneous levels of detail**, independent of which world is loaded:

| Detail | Purpose | Farm setup |
| --- | --- | --- |
| **1 — Live map** | Overview of all active zones, lights, actors, ghosts | 3 columns × 3 rows, **field only** |
| **2 — Stop-motion cameras** | Selected monitored zones refresh every 1.3 seconds | 2 columns × 2 rows = 4 feeds |
| **3 — Live view** | Full-speed selected zone with its own 60-second inspection timer | One field sector |

All actors, light switches, camera badges, ghost indicators, and audio are different *views of the same world state*, not separate simulations.

## 1. Farm field layout — exactly nine cells

Use the following zone ID map, in top-to-bottom row-major order:

```text
         COLUMN 1     COLUMN 2     COLUMN 3
ROW 1    F11          F12          F13
ROW 2    F21          F22          F23
ROW 3    F31          F32          F33
```

`F22` is center field. The farm path and buildings are **outside** this grid; don't add a barn as `F13` or replace the northeast field with the house. In `examples/farm-level.example.js`, this is represented by:

```js
mapRows: 3,
mapColumns: 3,
mapCells: ['F11','F12','F13','F21','F22','F23','F31','F32','F33'],
cameraRows: 2,
cameraColumns: 2,
defaultCameras: ['F11','F22','F23','F33'],
defaultSelected: 'F22',
```

Every one of those nine IDs must correspond to a `room` (also called a *zone*) with its own camera image and sound list. For this first Farm implementation, **nine sectors = nine distinct simulation zones**. A barn, farmhouse, farm pond, tractor shed, and orchard can be future *separate maps or separate levels*, but are not part of the field grid.

If the product later needs both a farm campus map **and** an independently zoomable 3×3 field submap in one level, that is a new multi-map engine feature: add explicit map selectors and tests before silently splicing more cells into this field.

## 2. Actor contract: kind, stay and role are independent

These three properties are never interchangeable:

```js
{
  id: 'farmhand',
  name: 'Rowan',
  kind: 'human',           // 'human' | 'animal' | 'ghost'
  stay: 'resident',       // 'resident' | 'guest'
  role: 'farmhand',       // business/story role, not species or duration
  color: '#9acbff',
  room: 'F11',
  x: 30,
  dir: 1,
  speed: 2.6,
  route: ['F11','F12','F22','F21','F11']
}
```

- `initialActors` contains **residents only**. They repeat their routes and remain until a game mechanic removes them (e.g. a ghost capture).
- `guestVisits` contains scheduled guests. They enter at `startTick`, move through their route, then disappear naturally. Groups can have multiple `members`.
- `randomAnimals` is for animals whose `resident`/`guest` status is independently rolled at level start; give each one `guestStartTick` and a valid closed route. The Farm example includes Pip the rabbit.
- A `ghost` is an actor kind and may be either a resident or a guest; don't bake permanent ghost silhouettes into the background.
- Movement routes must use only adjacent zones listed in both rooms' `links`. Every resident's final zone must connect back to its first zone. Visits do **not** wrap their last route step.

For the 3×3 field, the simplest graph uses horizontal/vertical neighbors only (north, south, east, west). The worked example constructs both sides of every link automatically.

## 3. Scene and map art — source-based and rebuildable

Required assets:

```text
public/assets/farm_field_map.webp          # standalone 3×3 overview
public/assets/farm_f11.webp                # independent Detail 2/3 scene
public/assets/farm_f12.webp
public/assets/farm_f13.webp
public/assets/farm_f21.webp
public/assets/farm_f22.webp
public/assets/farm_f23.webp
public/assets/farm_f31.webp
public/assets/farm_f32.webp
public/assets/farm_f33.webp
```

An initial set is included. Regenerate it using:

```bash
python scripts/generate-farm-example-art.py
```

For production, replace the placeholders with new consistent artwork while preserving the same `image` names. **Scenes contain only scenery, fixed furniture, and static objects**. Live humans, animals, ghosts, items, traps, lights and UI badges are rendered by React so they can move, vanish, be muted, or change states. Avoid screenshots that already include characters, ghosts, HUD labels, or a captured trap baked into the background.

When artwork depicts a farmhouse, road or barn, it must be **outside the nine-cell field frame**. A screenshot is not a substitute for zone image assets.

## 4. Build the config (copy, don't rewrite the engine)

1. Copy `examples/farm-level.example.js` to `src/farm-level.js`.
2. Change the export to `FARM_LEVEL` (and the `id` may stay `'farm'`).
3. Keep the complete fields in the example: `rooms`, `roomById`, `mapCells`, dimensions, camera defaults, `initialActors`, `guestVisits`, `randomAnimals`, conversations, story events, sounds, tools, five objectives and duration.
4. Keep exactly **five objectives**. Supported `eventType` values are in `OBJECTIVE_EVENTS` in `src/level-engine.js`; use real events emitted by the shared UI (`inspect`, `listen_story`, `audio_recorded`, `capture_ghost`, `emf_scan_ghost`, and the bank incident events).
5. Add `import { FARM_LEVEL } from './farm-level.js';` to `src/rooms.js` and register `farm: FARM_LEVEL` in `LEVELS`. `DEFAULT_LEVEL_ID` should remain House unless explicitly changed.
6. The level chooser is data-driven and will show a **Farm** button automatically. There should be no new direct JSX map markup or custom actor simulation required.
7. If the mission needs a new kind of interaction, implement a reusable event and tests in `src/level-engine.js` first, then emit it from `src/App.jsx`.

## 5. Spanning zones vs independent field cells

This engine supports **different map sizes**:

```js
// House & Park
mapRows: 3, mapColumns: 3
// Bank
mapRows: 4, mapColumns: 4
// Hotel
mapRows: 6, mapColumns: 6, cameraRows: 2, cameraColumns: 3
// Farm field (itself, not the whole property)
mapRows: 3, mapColumns: 3
```

Hotel suites can occupy multiple cells by repeating the same zone ID in `mapCells` and declaring `spanCells: 2` on that zone. The Farm **does not** use spanning rooms: each of its nine field cells is separate with `spanCells` defaulting to one.

Never hard-code 9, 16, 36, 4, or 6 as a universal engine-wide constant. Always use `mapRows * mapColumns`, `cameraRows * cameraColumns`, and `rooms.length` for the relevant count.

## 6. Daily flow, audio, focus, and win/loss

- The day timer (`dayDurationSeconds`, 360 in the sample) runs independently of the live-camera 60-second timer.
- Live inspection uses cyan focus segments; listening to important stories restores gold; trapping ghosts restores magenta.
- **Victory**: completing all five objectives before day end or zero focus.
- **Game over**: day reaches zero with unfinished objectives, or the focus meter empties.
- The sound panel aggregates all **unmuted** room sounds, not just the four currently visible cameras. Farm ambience includes wheat, wind, insects and irrigation sounds.
- Switching levels/retrying creates a fresh simulation with new random animal residency rolls.

## 7. Mandatory validation before handoff

Use these checks from repository root:

```bash
npm test                          # Node built-in tests; npm install not required
npm run validate:levels           # validates all registered levels and Farm example
python scripts/generate-farm-example-art.py
npm install
npm run build                     # final Vite build if packages are available
npm run dev                       # visually verify Farm if browser is available
```

Add tests for all of these cases: exact field map order and 3×3 dimensions; 9/9 sector image existence; valid symmetric routes; guest arrival+exit; resident persistence; animal 50/50 outcomes via deterministic RNG; muted sound filtering; mission happy-path victory; day-expired game-over; zero-focus game-over; level switching and the four camera controls.

**Acceptance checklist for the agent:**

- [ ] Farm is selectable through the same level chooser.
- [ ] Its only current map is the **3×3 field with nine field-sector zones**.
- [ ] No barns/houses/roads occupy a field cell.
- [ ] All camera/feed/map images exist and render with unique consistent glyph colors.
- [ ] Actors of all three kinds can be resident or guests; visitors enter and leave.
- [ ] Every room transition uses a valid route edge.
- [ ] The five objectives win; both independent game-over causes work.
- [ ] Bank (4×4), Hotel (6×6 + 2×3 feeds), House and Park still pass their tests.
- [ ] A browser screenshot or a stated browser-verification limitation accompanies the change.

## 8. Agent deliverables

Provide a concise summary, changed files, a fresh ZIP containing **all source and tests**, test counts and failures (if any), and a suggested Git commit message. Never claim a build or browser screenshot was verified if the toolchain was unavailable. Don't commit installed dependencies, caches, passwords, generated binary releases, or unrelated changes.

**Suggested commit for a future Farm implementation:**

`feat: add standalone 3x3 farm-field level using shared surveillance engine`
