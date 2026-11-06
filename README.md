# 👻 Mayfield Paranormal Surveillance — Four Playable Levels + Farm Agent Blueprint

A React/Vite game prototype with **four levels** sharing one engine for resident/guest humans, animals and ghosts; live maps, camera feeds, audio, focus, time, objectives and victory/game-over. A fifth **Farm** level is supplied as a **validated, asset-backed example for an agent to implement**, not yet selectable.

## 🚀 Run locally

Requires Node.js 20.19+ (Node 22 recommended).

```bash
npm install
npm run dev
# open http://localhost:5173

npm test                  # Node built-in tests; works without npm install
npm run validate:levels   # validates data and artwork, including Farm example
npm run build             # production Vite build; requires installed dependencies
```

Switch between **House / Park / Bank / Hotel** below the title. Restarting or switching levels resets the day, focus, visitor schedules, evidence and five missions. Randomized animals reroll when the level starts.


## 🕒 Park actor schedule — executable five-minute audit

The Park uses an **opt-in role scheduler** driven by the same simulation clock as
its day timer. The fictional park day runs **4:00 PM through 9:00 PM** in **300
simulation seconds** (1 game second = 1 park minute). Its residents stay on
duty; visiting photographers, families, pets, and ghosts arrive, move through
connected zones and leave when their visits end. The cat and squirrel roll
resident/guest independently on every new game.

```bash
npm run test:park:timeline     # 8 tests, no browser or npm install needed
npm run audit:park             # CSV and report for every actor / five minutes
npm test                       # whole repository regression suite
```

The audit checks **61 timestamps per animal-roll scenario**, all four
cat/squirrel combinations, for **244 checkpoints and 3,660 per-actor room and
presence comparisons**. The output files are
`reports/park-five-minute-actor-audit.csv` and
`reports/park-five-minute-audit-summary.md`. The unit suite additionally
checks each intermediate zone-to-zone move is valid, family members stay
together, and corrupted actor positions are detected as failures.

Detailed status and remaining work are documented in
`docs/agents/park/IMPLEMENTATION_STATUS.md`. Other levels deliberately remain
on their preexisting legacy movement until scheduled migration.

## 🗺️ Maps and cameras

| Playable level | Detail 1: live map | Active zones | Detail 2: cameras | Distinctive activity |
| --- | --- | --- | --- | --- |
| **House** | 3×3 | 9 | 2×2 = 4 | Basement, residents/guests, ghost traps, cat |
| **Park** | 3×3 | 6 + 3 outdoor/parking cells | 2×2 = 4 | Shelter, swings, tree bench, soccer field, cat/squirrel |
| **Bank** | **4×4** | **16** | 2×2 = 4 | Employee and guard residents; customer and thief guests; lost property |
| **Hotel** | **6×6** | **27 in 36 cells** | **2×3 = 6** | Suites, rooms, laundry, indoor pool, ballroom, spa, restaurant, concierge |
| **Farm — agent example only** | **3×3 field by itself** | 9 distinct field sectors | 2×2 = 4 | Field wildlife, scarecrow spirit, a visiting farm guest |

**Detail 1:** lighting, unique camera glyphs, actors and ghosts update continuously on the whole map.

**Detail 2:** each small camera has an independent mute button; actor positions refresh in stop-motion and can be expanded into the live view. The hotel fits **six feeds, three across and two down**.

**Detail 3:** the selected room is shown live with a separate 60-second inspection timer, the selected room's camera badge, and its lights, moving actors and ghosts.

**Sound:** the panel aggregates every **unmuted room**, not just rooms visible in Detail 2.

**Focus:** cyan segments drain during inspection, gold segments return for story clues, magenta segments return for captured ghosts. A level wins after its five objectives; the day expiring or focus running out first causes game over.

## 🏨 Hotel — based on the original 6×6 concept

The six hotel floors use **36 grid cells**, but large suites and amenities intentionally occupy **two adjacent cells with one shared room ID, light state, live scene and actor population**. The 27 simulated zones include:

- Floor 6: rooms 601/602/605/606 and the two-cell Presidential Suite 603–604.
- Floor 5: two-cell Royal Suite 501–502, 503/504 and two-cell Garden Suite 505–506.
- Floor 4: rooms 401–404 and the two-cell Spa & Wellness.
- Floor 3: rooms 301–304 and the two-cell Indoor Pool.
- Floor 2: two-cell Family Suite 201–202, rooms 203/204, Hotel Laundry, Travel & Concierge Maps.
- Floor 1: two-cell Restaurant, Reception & Lobby and Grand Ballroom.

Hotel employees and security are residents, hotel patrons are visiting guests, and ghosts can haunt suites and common areas. Its **five missions** are to inspect laundry, pool and ballroom, listen to a hotel story, and capture a hotel ghost. The hotel day is 7 simulated minutes.

`src/hotel-level.js` contains the map and actor data. Original source artwork is in `source-art/hotel-cutaway.png`. Regenerate the overview and 27 room images with:

```bash
python scripts/generate-hotel-art.py
```

## 🏦 Bank — expanded from 3×3 to 4×4

All nine original bank zones remain: entrance, lobby, teller counters, ATM, queue, office, lost-property desk, security room and vault. Seven connected rooms are added: **Express Tellers**, **Customer Lounge**, **Consultation Suite**, **Cash Counting**, **Wire Transfer Desk**, **Employee Break Room**, and **Records Archive**. Resident employees/guards and visiting thieves/customers continue using the same actor lifecycle rules.

Bank gameplay still requires detecting and reporting a visiting thief, finding an owner's dropped wallet or keys, returning it to the owner or customer-care staff, and capturing a ghost. Wrong-person thief reports and wrong-room item recovery are rejected. All incidents use the same live cameras and map.

Editable bank art sources are `.svg` files under `public/assets` and the 4×4 bank overview is `bank_map.webp`. Regenerate every bank room and map with:

```bash
python scripts/generate-bank-art.py
```

Requires Python, Pillow and CairoSVG; pre-generated WEBP art is already included.

## 🌾 Farm — how an agent builds the next level

**Full instructions:** [`docs/AGENT_NEW_LEVEL_FARM.md`](docs/AGENT_NEW_LEVEL_FARM.md) and the short entry point [`AGENTS.md`](AGENTS.md).

The worked example has **exactly nine field sectors** forming a **standalone 3×3 field**; the farmhouse, barn, road, etc. are **outside the field grid**. The example and all nine art assets validate already, but Farm has **not** been registered in `LEVELS` (so it isn't a playable selector option yet).

- Complete, reusable data module: `examples/farm-level.example.js`.
- Deterministic placeholder art generator: `scripts/generate-farm-example-art.py`.
- The handoff guide explains registration, actors, routes, story points, mission events, art contract, validation and regression tests.

If farm buildings must become independent camera locations within the **same** level later, extend the engine to support **multiple named maps**, rather than shrinking the field or replacing a field sector with a barn.

## 📁 Key files

| Path | Purpose |
| --- | --- |
| `src/App.jsx` | All rendering and level switching, map/camera dimensions from data |
| `src/rooms.js` | House, Park, expanded Bank, level registry |
| `src/hotel-level.js` | Hotel 6×6 zone graph and 2×3 camera data |
| `src/level-engine.js` | Pure actor, guest, audio, focus, lost-property, objective, outcome rules |
| `src/styles.css` | Shared multi-grid interface and UI styles |
| `examples/farm-level.example.js` | Future Farm 3×3 field, valid configuration but not registered |
| `docs/AGENT_NEW_LEVEL_FARM.md` | Agent instructions and acceptance checklist |
| `scripts/generate-hotel-art.py` | Rebuild all Hotel crops from the original art |
| `scripts/generate-bank-art.py` | Rebuild 16 Bank scenes, editable SVG sources and map |
| `scripts/generate-farm-example-art.py` | Rebuild standalone Farm field art |
| `scripts/validate-levels.mjs` | Check data, routes, grid dimensions and WEBP assets |
| `tests/` | Pure tests for every registered level, Farm example, renderer invariants and win/loss |

## 🧪 Verification boundaries

Run `npm test` and `npm run validate:levels`. No npm packages are required for these data checks. A **full Vite production build and graphical browser interaction test require installed dependencies**; passing these pure tests alone is not evidence that the game rendered in a browser.

## Suggested Git commit

`feat: add six-floor hotel and expand bank to 4x4 with farm-level agent guide`

## 👥 Planned actor role schedules — Park agent package

The next development feature has been specified but **is not yet implemented in the gameplay engine**. Instead of having each resident loop an untimed route and each guest follow a short entry/exit route, the proposed feature gives every actor a role-driven list of **locations, job duties, and times**. It also preserves the distinction between `kind` (human/animal/ghost), `stay` (resident/guest), and `role` (occupation or behavior).

Start with `docs/agents/park/AGENT.md` for the Park handoff. The cross-level contract is `docs/agents/ACTOR_SCHEDULING_CONTRACT.md`; the detailed timetable is `docs/agents/park/ACTOR_TIMETABLE.md`; the test plan is `docs/agents/park/TEST_PLAN.md`. A machine-readable Park fixture is `examples/park-role-schedules.example.js` and nine **specification checks** run in `tests/park-role-schedules-spec.test.js`.

The Park scheduling concept uses the existing 300-second day as a 16:00–21:00 fictional day. Every existing actor template is covered, including a resident photographer at the entire match, a guest photographer who enters/shoots/leaves, park staff, players, a visiting family, a dog, resident/guest ghosts, and independently randomized resident/guest cat and squirrel.

To check the authored contract without enabling the feature yet:

```bash
node --test tests/park-role-schedules-spec.test.js
npm test
npm run validate:levels
```

## 🎞️ Character sprites and walking animations

The playable House, Park, Bank and Hotel levels now each have **individual 6-pose transparent sprite sheets** for every named actor template (51 sheets total). Each sheet is 384×88 pixels containing six 64×88 frames:

| Frame | Purpose |
|---|---|
| 0 | Idle / standing |
| 1–4 | Four-frame walking cycle |
| 5 | Role interaction (photo, work, gesture, etc.) |

- **Detail 3 (large live feed):** character walk cycles animate continuously, with movement and facing based on the actor state. Ghost sheets float and cycle their forms.
- **Detail 2 (camera wall):** position *and* walking pose advance only at the existing 1.3-second stop-motion refresh.
- **Detail 1 (map):** remains low-detail with live occupancy dots; no new renderer is necessary.
- Park's job scheduler selects idle, walking or interaction poses according to activity and movement status. Legacy levels keep route-based walking.
- Animations pause with the simulation, support reduced-motion preference, and use pixelated scaling for sharp low-resolution sprites.
- Random guest/resident cat and squirrel use the same sprite regardless of stay status; guests spawned with `@visit` suffix automatically use the original template's spritesheet.

### Regenerate the sprite sheets

```bash
node scripts/export-sprite-cast.mjs
python3 scripts/generate_sprites.py  # requires Pillow (pip install Pillow)
npm test
```

Assets: `public/assets/sprites/<level>/<actor-id>.png` and `cast.json`.

The generator also creates `sprite-sheet-preview.png` and `walking-ranger-demo.gif` as visual references. **These sheets are intentionally simple original placeholder pixel art**, ready to be replaced by more detailed character art without changing the game renderer; keep the same frame order and 6×64×88 dimensions when substituting artwork.

## Park: real 3D fixed cameras, 2D camera captures, live overview (November 2026)

Mayfield Park is now a *3D-first* level. Its `S1`, `S2`, `T1`, and `F1`–`F3` zones are procedural low-poly 3D scenes rather than flat room background paintings. Each zone has a deliberately fixed perspective camera. **Detail 3** displays the live WebGL scene, **Detail 2** displays a rasterized 2D PNG captured from that very same camera and only refreshed at the stop-motion snapshot tick, and **Detail 1** stays a low-cost live 2D overview showing room occupancy, ghosts and lights. Actors, traps and lighting are derived from the same underlying simulation.

The code adds **no third-party 3D dependency**: `src/park-3d-scene.js` implements native WebGL geometry and fixed cameras; `src/Park3DView.jsx` integrates it with React. `docs/PARK_3D_CAMERA_ARCHITECTURE.md` explains the architecture and acceptance tests. `park-3d-renderer-check.html` lets you inspect the 3D renderer independently of React.

**Visual note:** A local browser with WebGL is required. Tests cover scene composition and WebGL draw calls, but Chromium here could not initialize its software GL display, so pixel-level browser rendering remains to be checked locally.
