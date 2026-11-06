# Release Notes — Expanded Maps & Farm Agent Handoff

## New playable Hotel

A 6×6 six-floor hotel map built from the prior hotel cutaway artwork, with 27 distinct walkable zones across 36 map cells. Nine cells belong to double-width suites or amenities. Hotel has 2×3 stop-motion cameras (six feeds), a single Detail-3 live view, resident employees/security, temporary visiting guests, two resident ghosts and five missions.

## Expanded playable Bank

Bank is now a genuine 4×4 map with 16 unique rooms. The seven new rooms are Express Tellers, Customer Lounge, Consultation Suite, Cash Counting, Wire Transfer Desk, Employee Break Room, and Records Archive. Existing customer/thief guest logic, employee/guard residency, lost items, thief reporting, missions and ghost systems remain in place.

## Configurable shared grid engine

Maps now declare optional `mapRows`, `mapColumns`, `mapOverlay`, `cameraRows`, `cameraColumns`; old defaults are 3×3 map / 2×2 feeds. Larger suites declare `spanCells` and repeat their ID in the map. `validateLevel` checks the map size, camera count, unique zone coverage, declared footprints, symmetric links, actor routes and mission contract.

## Next level: Farm (agent example, not yet playable)

The repository includes `AGENTS.md`, `docs/AGENT_NEW_LEVEL_FARM.md`, `examples/farm-level.example.js`, nine Farm field scene WEBPs, an overview WEBP, and a deterministic artwork generator. The Farm field occupies its own **3×3 grid of nine field sectors**, not a mixture of fields, buildings and other locations.

## Verification

75 Node tests pass; all four playable levels and the Farm example pass asset/data validation. No production Vite build or successful graphical browser capture was achieved in this environment.

**Commit suggestion:** `feat: add 6x6 hotel, expand bank to 4x4, document standalone 3x3 farm-field level`

## Park five-minute actor schedule verification — 2026-11-05

- Activated Park's opt-in role scheduler (`src/role-scheduler.js`) with the
  fictional 4:00–9:00 PM clock compressed to 300 simulation seconds.
- Actors follow the role's timed room appointment and use connected intermediate
  zones instead of teleporting. Residents persist, guests arrive/leave,
  family members travel together, and cat/squirrel random residency is stable.
- `npm run test:park:timeline`: new 8-test suite, including a deliberately
  wrong actor location that must fail the audit.
- `npm run audit:park`: outputs the complete 244-checkpoint, 3,660-comparison
  expected-vs-actual CSV and summary.
- `npm test`: all 92 tests passed. `npm run validate:levels`: all current levels
  and the Farm example passed asset/data checks.
- Remaining work: job-specific event/audio triggers, browser validation of the
  schedule-enabled build, and adapting other levels to optional role schedules.

## Park 3D camera redesign (November 6, 2026)

- Replaced Park's flat enlarged room art with a dependency-free native WebGL low-poly 3D scene for **all six zones**, each with its own locked perspective camera.
- Detail 2 derives 2D stop-motion snapshots from the **same WebGL scene** using a low-resolution PNG capture, so actors and lighting can't disagree between the 3D and 2D views.
- Detail 1 retains the real-time, inexpensive overview with live actor/ghost indicators.
- Preserved the existing actor and job schedule engine, sound monitor, 60-second camera timer, ghost capture, five-objective goals, and end-of-day loss conditions.
- Added tests for geometry, cameras, matrix math, WebGL draw calls, and the two-dimensional capture pipeline.
- Graphical browser screenshot remains unverified in this environment because Chromium software GL initialization failed; use the standalone `park-3d-renderer-check.html` and instructions in `docs/PARK_3D_CAMERA_ARCHITECTURE.md` on a machine with WebGL.
