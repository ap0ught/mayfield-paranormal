# Mayfield Park — agent handoff: role-driven actors

**Assignment:** Implement **job-, location-, and time-driven** actor behavior for the existing `park` level, and do so as a reusable engine feature for every later level. This is the first level adopting schedules. The **five-minute position scheduler and its Park runtime integration are implemented** in `src/role-scheduler.js` and `src/App.jsx`. Some additional role-specific audio/activity behavior remains future work; see `IMPLEMENTATION_STATUS.md`.

## Read in this order

1. [`../ACTOR_SCHEDULING_CONTRACT.md`](../ACTOR_SCHEDULING_CONTRACT.md) — universal rules, time units and runtime API.
2. [`ACTOR_TIMETABLE.md`](ACTOR_TIMETABLE.md) — the actual Park cast, obligations, locations and timing.
3. [`../../../examples/park-role-schedules.example.js`](../../../examples/park-role-schedules.example.js) — machine-readable **proposed** schedules for all 15 actor templates, including both cat and squirrel roll outcomes.
4. [`TEST_PLAN.md`](TEST_PLAN.md) — deterministic tests and browser acceptance checks.
5. `src/level-engine.js`, `src/rooms.js` (`PARK_LEVEL`), `src/App.jsx`, `tests/level-engine.test.js` — current implementation and constraints.

## Preserve existing gameplay

Park remains **six playable zones on a 3×3 map** with three non-playable filler cells. The map cells are:

```text
S1 Park Shelter | S2 Playground Swings | T1 Tree Bench
F1 Field A      | F2 Field B            | F3 Field C
OUTSIDE         | PARKING               | ENTRY
```

Only `S1`, `S2`, `T1`, `F1`, `F2`, `F3` are navigable room IDs. `OUTSIDE`, `PARKING`, and `ENTRY` are map presentation cells, not actor destinations. For now, humans and groups enter/leave through **S1**; a squirrel may enter/leave through **T1**; a guest ghost may manifest at **T1**. If an explicit parking-lot actor location is needed later, introduce a new playable zone and update map config/tests; do not silently use filler tiles as rooms.

Do not change Detail 1 live map, Detail 2 four feeds (2×2 stop-motion), Detail 3 single live camera, speaker-mute behavior, 60-second per-camera timer, focus, five missions, or day game-over logic except where needed to synchronize game time. Park currently uses a `300`-second level duration. The game should always have at least one solvable path through all five objectives before the day expires.

## What 'job' means here

A job is a **behavior package**, not a classification of whether an actor stays. The same job can be held by a resident or guest:

- **Maya:** `event_photographer`, `resident` — covers warmups, both halves, and wrap-up. Remains for the entire level.
- **Alex:** `event_photographer`, `guest` — checks in, shoots limited photos, reviews, exits. Appears only during the scheduled visit.
- **Ranger:** `park_ranger`, `resident` — opening/closing shelter, field and path safety patrols, visitor interactions.
- **Coach:** `soccer_coach`, `resident` — roster, early playground briefing, warmups, game, halftime, wrap-up.
- **Player:** `soccer_player`, `resident` — practice, game, hydration, cooldown.
- **Family:** four `guest` actors enter together; parent supervises, children play, Buddy accompanies them, all leave together.
- **Whiskers and Acorn:** independently roll resident/guest at level load; cat and squirrel use different itineraries by result.
- **Patches:** resident animal companion; ghosts use haunting roles and can be captured.

A schedule consists of **appointment windows** at graph-connected destinations. The scheduler should begin travel in advance when possible; tasks should not magically occur at the destination before the actor arrives. Required activities outrank idle and random chatter. Preferred activities may be skipped when delayed.

## Implementation tasks for coding agent

1. **Implemented for Park:** a single level clock, measured in `elapsedGameSeconds`; preserve existing camera timer separately. For Park, map 0–300 seconds to 16:00–21:00 on the displayed *game* clock.
2. **Implemented for Park:** versioned `roleSchedules` data in `src/park-role-schedules.js`, re-exported by the example path. Other levels must continue using legacy `route` / `guestVisits` while rollout is gradual.
3. **Partly implemented:** reusable pure scheduling functions with a virtual clock and deterministic animal outcomes. Suggested exports: `validateRoleSchedules(level, schedules)`, `chooseActivity(actor, elapsedSeconds)`, `findRoomPath(from,to,roomById)`, `advanceScheduledWorld(level, world, elapsedSeconds)`.
4. **Do not reuse `startTick` as game seconds.** Today a movement tick occurs every `350/speed` ms, while the game day decreases every `1000/speed` ms. Translate the old visit configs only as a migration step; new schedule arrivals are explicit game seconds.
5. A resident uses appointments to decide its target and can traverse intermediate zones via pathfinding; it loops neither physically nor temporally just because its original `route` array loops. A guest arrives once (or according to an explicit recurrence), does its tasks, reaches exit, then disappears and emits a departure event.
6. All scheduled actions must feed the **single `actors` state**. Both camera detail levels, map dots, sounds, ghost detectors, and conversation labels derive from that state — never fabricate separate scripted people for the main camera.
7. Emit role events once per relevant action: `photo_taken`, `whistle`, `playground_visit`, `shelter_opened`, `shelter_closed`, `animal_spotted`, `ghost_whisper`. For now these can be log/audio events, not extra mission types. The existing five mission events must continue to work.
8. Preserve independently seeded cat and squirrel 50/50 rolls. A cat's/squirrel's selected schedule variant must match its rolled `stay`, and it must not spawn as both.
9. Gate story audio by presence of the appropriate actor **in that room** and an unmuted microphone. The current Park story templates should have reachable, scheduled windows (see timetable). Player actions to listen must give rewards at most once per story.
10. If a ghost is trapped, it immediately vanishes from **every** view and any future scheduled activity for that captured instance is canceled. A new ghost must be a new instance with an explicit reappearance rule.
11. **Implemented:** run `npm run test:park:timeline`, `npm run audit:park`, `npm test` and `npm run validate:levels`. Remaining browser and event-specific tests are still in the test plan.

## Park story anchors (must remain playable)

| Story | Existing speaker | Zone | Proposed audible appointment |
|---|---|---|---|
| `shelter-story` | Ranger | S1 | 16:00–16:30 or 20:15–21:00 |
| `swings-story` | Coach | S2 | 16:20–16:35 |
| `photographer-story` | Maya | F1 | 16:00–16:45 or 20:00–21:00 |
| `field-story` | Player | F2 | 16:00–16:50 or 20:15–21:00 |
| `tree-story` | Ranger | T1 | 18:30–19:30 |

The current `storyEvents` UI lists these stories even when their speaker isn't present. The implementation must distinguish *story discovered / currently audible* from *story template exists*. Do not hand the user a reward if no actor could have spoken it.

## Done means

- Timed roles drive locations and actions, with no teleportation and no second world state.
- A resident photographer stays all day; a guest photographer arrives, shoots, and departs.
- The family of four stays together at shelter → swings → bench → swings → shelter, then leaves.
- The cat and squirrel choose resident/guest once per load and follow the correct schedule variants.
- Every role's location is accurate across map, stop-motion feeds, and live feed; sound is heard only when unmuted and physically present.
- Five-objective victory, day-expiration loss, and focus-expiration loss all remain tested.
- No regressions for House, Bank, and Hotel; no browser success claims without actually rendering a browser build.
