# Mayfield Park — scheduling tests and acceptance plan

**Status:** The Park location scheduler **now executes in the game**. `tests/park-every-five-minutes.test.js` verifies actor positions at 61 five-minute intervals for all four cat/squirrel combinations; `scripts/audit-park-every-five-minutes.mjs` produces a complete expected-versus-actual CSV. This provides automatic runtime coverage for many of the scenarios below, but not all audio, activity-event or browser-specific scenarios.

## Test fixture and commands

- Design fixture: `examples/park-role-schedules.example.js`
- Documentation: `docs/agents/ACTOR_SCHEDULING_CONTRACT.md`, `docs/agents/park/AGENT.md`, `ACTOR_TIMETABLE.md`
- Immediate schema tests: `node --test tests/park-role-schedules-spec.test.js`
- Existing regression tests: `npm test` and `npm run validate:levels`

## Complete behavioral test plan (partially implemented; see status)

| Test ID | Set up | Expected behavior |
|---|---|---|
| `PARK-SCH-01` | Create Park at time 0 | All initial residents present. No scheduled visitors present. Cat/squirrel roll exactly once. |
| `PARK-SCH-02` | Set game clock to 40 seconds | Alex guest photographer enters via `S1` exactly once and begins check-in. |
| `PARK-SCH-03` | Advance through 47–95 seconds | Alex performs F1 → F2 → F1 photography, returns to S1, exits. Maya remains present. |
| `PARK-SCH-04` | Advance to 80 seconds | Dana, Ivy, Noah, Buddy all arrive with one group ID. |
| `PARK-SCH-05` | Advance 80–205 seconds | Family moves S1 → S2 → T1 → S2 → S1, stays near one another, all exit by itinerary end (allow bounded travel slack). |
| `PARK-SCH-06` | Observe Coach in game clock 70–155 | Coach does not abandon active match for unscheduled errands; should be in F2 or traveling as explicitly planned. |
| `PARK-SCH-07` | Observe Maya at 0, 150, 299 seconds | `photo-mom` stays throughout and remains assigned to match photography. |
| `PARK-SCH-08` | RNG returns 0 for both animals | Cat and squirrel remain residents all game, never spawn as guests. |
| `PARK-SCH-09` | RNG returns 0.99 for both animals | Both use guest variants, arrive at their distinct times, exit, and never appear simultaneously as residents. |
| `PARK-SCH-10` | RNG sequence 0, 0.99 | Cat stays resident and squirrel visits; separate independent rolls. |
| `PARK-SCH-11` | Assign Ranger next appointment in T1 from S1 | Pathfinding takes linked zones (`S1 → S2 → T1`), no teleportation. |
| `PARK-SCH-12` | Request an appointment in filler `PARKING` | Validation fails; filler cell is not a playable zone. |
| `PARK-SCH-13` | Advance one game second at 1×/2× | Simulation elapsed time, guest schedules, audio, and visual state agree; speed should scale elapsed time, not skip actions. |
| `PARK-SCH-14` | Pause at t=64 seconds | Day clock, actor movement, activity progress, sound generation, and camera countdown freeze. Resume continues. |
| `PARK-SCH-15` | Mute F2 and trigger player speech | No live F2 event in sound feed. Unmute and trigger again: audible and attributed to the player. |
| `PARK-SCH-16` | Story for Coach in S2 at t=25 | Story is audible once, then gives +4 gold focus. At t=110 while Coach is in F2 it cannot be replayed as new S2 speech. |
| `PARK-SCH-17` | Trap `tree-line` ghost in T1 | Actor removed from live scene, map, snapshots and audio scheduling; no later queued haunt event from captured instance. |
| `PARK-SCH-18` | Complete all five existing Park objectives | Immediate `won`, no additional guest or activity simulation. |
| `PARK-SCH-19` | Let day reach zero with unfinished objective | `lost / day`; no actors continue scheduled tasks. |
| `PARK-SCH-20` | Spend final focus before mission completion | `lost / focus`; no late story or activity changes outcome. |
| `PARK-SCH-21` | Switch Park → House → Park | State resets; no old events, timers or queued guests leak across levels; animal rolls repeat only on new load. |
| `PARK-SCH-22` | Inspect one scheduled actor across Detail 1/2/3 | Exact same room/activity/actor template in every view, with stop-motion lag only in Detail 2. |
| `PARK-SCH-23` | Advance game through all 300 seconds | No actor ever occupies unknown room, all guest exits happen, no duplicate template live instances unless explicitly allowed for recurring visits. |

**Important design choice:** Appointments represent intended time/location *windows*. Actual route travel must be possible; do not satisfy a window by silently teleporting an actor. For required windows, scheduler should plan travel in advance. Document late arrivals and a bounded tolerance (for example, 5 game seconds) in the implementation.

## Test ergonomics

Use virtual time or a pure `stepWorld(state, {deltaGameSeconds, rng})`. Avoid real `setTimeout` waits in tests. Make the renderer depend on the world's state and not create its own independent schedule. Use injectable RNG for reproducibility. The test suite must run with `node --test` without Vite/browser dependencies.

Do not report these behavioral tests as passed until scheduler implementation exists and each assertion actually executes. Spec-only checks still validate shape and feasibility; the newer Park timeline tests now execute the real scheduling functions.

## Browser checks after implementation

1. Launch Vite and select **Park**.
2. Start with clock **4:00 PM**, observe Ranger at shelter and Maya on Field A.
3. Advance to 4:40 PM: Alex enters as a guest photographer; Maya remains on-site.
4. Advance to 5:20 PM: Dana's group arrives; swings and tree bench show the group in the 2×2 stop-motion feeds when monitored.
5. Pause/resume; see all three detail levels stay synchronized. Check mute controls prevent room audio.
6. Catch a ghost and confirm it disappears from every view. Hear a story during the speaker's eligible work window.
7. Verify victory and both losing screens under deterministic state injection.
8. Re-run `npm test`, `npm run validate:levels`, `npm run build`; save screenshots and logs from the actual browser build.
