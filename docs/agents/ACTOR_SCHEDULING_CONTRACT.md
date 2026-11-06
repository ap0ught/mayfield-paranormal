# Actor role scheduling — shared-engine contract (proposal for implementation)

**Status:** Park-only role scheduler **implemented in `src/role-scheduler.js`**, with opt-in integration in `src/App.jsx`; House, Bank and Hotel retain the original movement engine.  
**First implementation target:** Mayfield Park (`docs/agents/park/AGENT.md`).  
**Applies later to:** House, Bank, Hotel, Office Tower and Farm (when those levels are implemented).

## Purpose

Every actor has **three independent identity dimensions**: `kind` (`human | animal | ghost`), `stay` (`resident | guest`), and `role` (occupation, family function or supernatural behavior). A *role* determines obligations, a *schedule* determines **when and where** to fulfill them, while *stay* controls whether and when an actor enters and exits the simulation. Never equate occupation with residency. A resident photographer and a guest photographer can use the same role implementation but different schedules.

### Baseline today vs proposed work

| Existing game behavior | New behavior required by this document |
|---|---|
| Residents loop through `route` continuously | Residents keep their identity and presence, but follow timed duty and break blocks; routes become travel paths |
| Guests spawn at `guestVisits[].startTick`, traverse a route, and exit | Guests arrive at explicit game-clock times, perform timed tasks, then leave through a real exit zone |
| `kind`, `stay`, and free-text `role` are already independent | Add structured job/activity IDs and deadlines without removing backward compatibility |
| Camera feeds and live map share actor state | All scheduled movement and activities must be visible in that one world state |
| Conversations are selected from a rotating text list | A line becomes audible only when its speaker is present, on the correct schedule block, and its microphone is unmuted |

## Time contract

- **Canonical scheduling clock:** integer `elapsedGameSeconds` from level start, in the range `0..dayDurationSeconds`. Do not use JavaScript `Date.now()` or client wall-clock time to drive behavior. `Date` can still label real-world log timestamps if clearly marked.
- Park example uses `dayDurationSeconds: 300`; represent a fictional **4:00 PM to 9:00 PM** park day, compressing one *in-game minute* into one *simulation second*. `0 = 16:00`, `60 = 17:00`, `120 = 18:00`, `180 = 19:00`, `240 = 20:00`, `300 = 21:00`.
- Keep the existing 60-second *inspection-camera* countdown independent of the day clock and actor schedules.
- Today `App.jsx` advances `simTickRef` every `350/speed` milliseconds and the day every `1000/speed` milliseconds. **`startTick` is therefore NOT a clock second.** Migrate/bridge it deliberately; don't quietly interpret a 36-tick visit as 36 game minutes.
- The single authoritative simulation step advances day clock, actor scheduler, guest arrivals, activity completion, and movement in a deterministic order. Pausing freezes all of them; speed adjustment scales all consistently.
- When day clock expires, finish game-over evaluation before starting another activity or visitor.

## Core data shape

Use a versioned, serializable schema (park worked example in `examples/park-role-schedules.example.js`):

```js
{
  templateId: 'photo-mom',
  kind: 'human',
  stay: 'resident',
  role: 'photographer / parent',
  job: 'event_photographer',
  blocks: [
    {start: 0, end: 45, zone: 'F1', activity: 'photograph_warmups', priority: 'required'},
    {start: 45, end: 150, zone: 'F2', activity: 'photograph_match', priority: 'required'},
    {start: 150, end: 240, zone: 'F3', activity: 'photograph_match', priority: 'preferred'},
    {start: 240, end: 300, zone: 'F1', activity: 'photograph_wrapup', priority: 'required'},
  ],
}
```

`start` is inclusive, `end` exclusive, and blocks may be non-contiguous; free gaps can be travel, idle, socializing, or a break. All schedule blocks must reference *actual room IDs* in the level graph. `required` tasks must be attempted at the correct time and location; `preferred` blocks can be skipped after delays. The controller computes **shortest paths using reciprocal `room.links`** to move between appointments; do not teleport actors between fields or through off-map filler cells. Avoid adding duplicate resident/guest types for the same job.

### Suggested runtime extensions

```text
actor.templateId        stable content identity for story ownership
actor.role              descriptive role (retain existing strings)
actor.job               stable job ID for behavior lookup
actor.currentActivity   activity ID
actor.activityState     en_route | working | break | visiting | idle | leaving
actor.targetZone        current scheduled destination
actor.scheduleBlockId   currently selected appointment (if any)
actor.scheduledExit     guest exit time or null for residents
actor.groupId           shared visitor group, for coordinated arrival/departure
```

Ensure the renderer does not need level-specific movement logic; it reads `actor.room`, `actor.x`, `actor.currentActivity`, `actor.stay`, and `actor.kind` from the same world state. Add human-readable role/activity labels to the inspection HUD as needed.

## Resident and guest invariants

- Residents exist at level start and do not naturally despawn on their day schedule; they may be on a break, off duty, or at the exit *but remain in the level*. Capture of a ghost is a separate gameplay removal.
- Guests **never** appear before their arrival time. They spawn in the entrance/exit zone, execute the allowed route and activities, and exit only when they reach an exit after completion, or a defined safe timeout.
- Guest groups (Dana, Ivy, Noah, Buddy) travel together between common destinations; child/animal movement can lag slightly without splitting the visit into unrelated arrivals.
- A randomized cat or squirrel rolls `resident | guest` independently at level initialization; *then* applies the matching schedule template. Do not reroll on every clock tick, camera selection, or React rerender.
- A ghost uses the same scheduler semantics as other actors, but its `job` is paranormal behavior (e.g., `haunt_tree_line`), not employee work.
- If a thief, customer, coach, parent, photographer, cat, or ghost is present outside their scheduled location, it must be because of explicit travel, interruption, or a documented event, not a camera-specific duplicate.

## Activity execution and priorities

1. Apply level/game outcome checks and stop processing if finished.
2. Admit guests and groups whose scheduled arrival is due.
3. Select the current activity based on start/end window and `priority`.
4. Compute a valid path if target zone differs; move actor along reciprocal `room.links`. Do not teleport.
5. Start `activity` when actor reaches the zone; emit *one* event upon start or completion as appropriate (e.g., `photo_taken`, `coach_whistle`, `lost_item_drop`).
6. End/interrupt activities at boundaries. Move to next task or guest exit.
7. Update the shared map/live/camera state; then aggregate audio only for unmuted zones.

A higher-priority task interrupts roaming/idle. Required duties win over casual conversation or wandering. Path travel and actions must not make the five victory objectives impossible in a normal playthrough. A cutscene or story reward must not trigger if the required actors never arrived.

## Migration rules

- Existing `initialActors`, `guestVisits`, `randomAnimals`, route graph, `evaluateLevel`, and mission events **must continue working** during migration.
- Start with an opt-in `roleSchedules` level field rather than requiring every existing level to adopt it immediately.
- Favor small pure functions in `src/level-engine.js` or `src/schedule-engine.js`: `validateRoleSchedules`, `getDueBlocks`, `chooseActivity`, `findPath`, `advanceScheduledActors`, `scheduledGuestsDue`.
- Keep deterministic RNG injectable for randomized animals and optional job events.
- Do **not** introduce wall-clock drift, interval nesting, or React state dependencies in scheduling pure functions.

## Verification contract

Run `npm test` and `npm run validate:levels`. Add deterministic coverage for time boundaries, room graph paths, resident persistence, guest arrival/exit, photographers with different stay types, family co-location, sound attribution, animal 50/50 rolls, pause/speed, capture behavior, and victory/day/focus outcomes. Also verify in a browser that Detail 1, 2 and 3 show the same actor and activity after schedule updates.
