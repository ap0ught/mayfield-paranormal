# Mayfield Paranormal — Agent Entry Point

## Source of truth

The game is one React/Vite project. Level data lives in `src/rooms.js` and specialized modules like `src/hotel-level.js`. The pure simulation/validation APIs live in `src/level-engine.js`. Never build a separate game framework for a new map.

## New levels

**Start with [`docs/AGENT_NEW_LEVEL_FARM.md`](docs/AGENT_NEW_LEVEL_FARM.md)**, which walks through a future Farm level with a separate **3×3 field**. A validated code example is in `examples/farm-level.example.js` and farm-field artwork generation is in `scripts/generate-farm-example-art.py`.

Size contracts: `mapRows × mapColumns` is the number of overview cells; `cameraRows × cameraColumns` is the count of Detail-2 cameras. Three detail levels always share the same actor/sound/lighting/ghost state. For repeated multi-cell suites, set `spanCells` to match the map-cell count. Five objectives and both losing conditions are mandatory.

## Test and build

- `npm test` — deterministic Node test suite without installing Vite.
- `npm run validate:levels` — schema, connectivity, and asset checks for registered levels plus Farm example.
- `npm install && npm run build` — actual Vite build when the registry is available.
- `npm run dev` — browser visual/interaction verification.

Do not claim browser rendering/build results based on unit tests alone.

## Role- and time-driven actor scheduling (Park first)

**Next coding assignment:** Implement real job schedules instead of only looping routes. Read [`docs/agents/park/AGENT.md`](docs/agents/park/AGENT.md) first, then [`docs/agents/ACTOR_SCHEDULING_CONTRACT.md`](docs/agents/ACTOR_SCHEDULING_CONTRACT.md), [`docs/agents/park/ACTOR_TIMETABLE.md`](docs/agents/park/ACTOR_TIMETABLE.md), and [`docs/agents/park/TEST_PLAN.md`](docs/agents/park/TEST_PLAN.md). The complete proposed Park plan lives in [`examples/park-role-schedules.example.js`](examples/park-role-schedules.example.js) and has specification tests in [`tests/park-role-schedules-spec.test.js`](tests/park-role-schedules-spec.test.js).

**Important distinction:** The schedule **documents and fixture exist**, but the existing simulation **has not yet implemented** time-based role appointments. Do not report fixture-test success as runtime scheduler success. Park is the first implementation target; keep House, Bank, and Hotel operational throughout the migration.


## Current Park timed-actor test (implemented)

Run `npm run test:park:timeline` and `npm run audit:park`. The Park role
scheduler (`src/role-scheduler.js`) is now connected to the live Park level,
which opts in via `level.roleSchedules`. The Park day clock is 300 simulation
seconds for five in-world hours. The report checks each actor's expected zone
and presence every five game minutes (61 timestamps), including four cat/
squirrel roll outcomes. See `docs/agents/park/IMPLEMENTATION_STATUS.md` for
what is implemented versus work that remains. Other levels still run the
legacy movement engine and must remain compatible.

### Actor sprite rendering and animation contract

The reusable renderer in `src/App.jsx` uses `spriteUrl`, `actorPose` and `snapshotFramePosition` from `src/sprite-animation.js`. Do not hard-code sprite identities by visible display name: use `level.id` and actor `templateId`, with a fallback for newly spawned ghosts. Every new actor template requires a 384×88 transparent sprite atlas with six 64×88 frames (idle, four walking poses, interaction). Run `node scripts/export-sprite-cast.mjs` then `python3 scripts/generate_sprites.py` after adding an actor. Run `npm test` to verify sheet completeness. Preserve the game’s detail hierarchy: map = low-detail live dots; mini-cameras = 1.3-second snapshot pose; main feed = smooth walking animation. Animations must pause with the simulation. Future Farm and Office agents should reuse this approach.

## Park 3D camera rule (added November 2026)

Read `docs/PARK_3D_CAMERA_ARCHITECTURE.md` before changing Park visuals. Park is **3D-first**: Detail 3 is live WebGL rendered through a stationary zone-specific camera; Detail 2 is a 2D low-resolution **rasterization of that very same WebGL scene and camera** (not separately drawn room art); Detail 1 is a real-time HTML overview/map. The authoritative room graph, actor scheduling, lights and ghost capture remain in shared simulation state. House, Bank and Hotel continue using their existing 2D scene renderers. Run `node --test tests/park-3d-views.test.js` and `npm test` after scene changes. WebGL pixel capture must be checked on a browser with working WebGL support.
