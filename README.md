# 👻 The Mayfield Paranormal Demo — House + Park DRY Test

A Vite + React playable prototype based on the ghost-hunting surveillance UI concepts from the chat.

The project now contains **two playable levels inside the same framework**:

1. **The Mayfield House** — the original 3×3 house investigation.
2. **Mayfield Park** — a DRY-test outdoor level with a park shelter, swings, a tree bench area, and a 3-sector soccer field.

The interface, timer, sound monitor, actor movement, ghosts, tools, focus economy, randomized animal residency, five-objective mission checklist, and win/loss logic all run as client-side game state.

## 🚀 Run it

Requires Node.js 20.19+ (Node 22 works well).

```bash
npm install
npm run dev
```

Open **http://localhost:5173**.

For a production bundle:

```bash
npm run build
npm run preview
```

No server/database, account, external credentials, or backend are needed.

## 🎮 What works

- **Level switching:** use the title-panel buttons to switch between **House** and **Park**. Each level starts a new game and rerolls the animals independently.
- **Detail 1 — live map:**
  - House: 3×3 interior grid with basement, first floor, second floor, and driveway.
  - Park: 3×3 map with **6 active zones** plus **outside / parking / driveway-entry** filler cells.
- **Detail 2 — 2×2 camera wall:** four stop-motion feeds update from the same shared simulation. Each feed can be muted/unmuted and cycled to another room.
- **Detail 3 — live inspection:** one selected room / zone shows the full live view with a 60-second countdown.
- **Shared simulation:** people move between connected rooms or zones, and every view updates from the same state.
- **Sound monitor:** aggregates ambience, speech, and ghost audio from **all unmuted rooms**, including rooms not currently shown in the 2×2 camera wall.
- **Ghost capture:** capture a visible ghost to restore magenta focus segments.
- **Story points:** hear important conversations or lore moments to restore gold focus segments.
- **Investigation ticker:** the 24-segment focus meter drains while watching live views and refills through story beats and ghost captures. Reaching zero focus immediately ends the game in a loss.
- **Mission checklist:** both levels have exactly five tasks, updated by actual successful game actions. Completing all five immediately wins the level.
- **Day countdown:** a demo day lasts **5 game minutes**; the timer advances when the simulation runs (and at 2× speed when selected), even when the 60-second live camera closes. If the day runs out before all five objectives are done, it is game over.
- **End-of-level modal:** victory and both failure modes display the achieved tasks, remaining day time, and focus; retrying rerolls the animals.
- **Tools and panels:** EMF scan, spirit lantern, audio recorder, evidence, reports, map help, and activity metrics.

## 🧪 Park DRY-test level layout

The new park level uses the same framework and game systems but swaps in a different zone graph.

Active park zones:
- **S1** — Park Shelter
- **S2** — Playground / Swings
- **T1** — Tree Bench
- **F1** — Soccer Field A
- **F2** — Soccer Field B
- **F3** — Soccer Field C

The bottom row of the map is reserved for **outside / parking / entry** cells.

## 📁 Structure

```text
index.html             Vite entry point
vite.config.js         Vite and React plugin configuration
src/App.jsx            UI and live game simulation, including level switching
src/rooms.js           Level data for House and Park, movement routes, sounds, stories, and tools
src/styles.css         Responsive desktop surveillance dashboard
src/main.jsx           React mounting point
public/assets/         Game artwork, including house and park crops
```

## Notes

- This is a **prototype**, not a complete game.
- Character motion is simulated, and sound is synthesized and captioned; it is not sampled from live recordings.
- Desktop widescreen (roughly 1600×900 or larger) is the primary layout; smaller viewports allow horizontal scrolling.
- The environment here could not complete an `npm install`, so I validated the updated source files with the globally available TypeScript transpiler to catch JSX / JS syntax errors.
- Illustration assets are derived from images generated during the conversation.

## 🧍 Unified actor framework — Humans, Animals, and Ghosts

Every actor has **two independent classifications**:

- `kind`: `human`, `animal`, or `ghost` (what it is)
- `stay`: `resident` or `guest` (whether it remains for the entire level or leaves after its visit)

`role` is a separate field, such as `photographer`, `parent`, `park ranger`, `courier`, or `house spirit`.

```js
{
  id: 'quick-photog',
  name: 'Alex',
  kind: 'human',
  stay: 'guest',
  role: 'photographer',
  room: 'S1',
  route: ['S1', 'F1', 'F2', 'F1', 'S1'],
  x: 12, dir: 1, speed: 5.5, color: '#75e3ef'
}
```

`initialActors` defines **fixed residents**; they move along adjacent linked zones and loop indefinitely. `randomAnimals` defines animals whose `stay` is determined independently by a 50/50 roll at each game load. A rolled resident spawns with the original residents; a rolled guest becomes a scheduled one-time visit and eventually departs.

`guestVisits` defines **temporary entrants**; each has an arrival tick, an optional repeat interval, and one or more members. The whole group arrives together, follows its individual connected routes, then leaves the scene. That includes guest humans, animals, and ghosts.

### DRY-test scenarios

| Level | Actor / group | Kind | Stay | Behavior |
| --- | --- | --- | --- | --- |
| Park | Maya, a photographer and parent | Human | Resident | Photographs throughout the soccer game |
| Park | Alex, a photographer | Human | Guest | Enters, visits field sectors, takes photos, exits |
| Park | Dana, Ivy, Noah, and Buddy | 3 humans + dog | Guest | Enter together, visit swings and tree bench, leave |
| Park | Patches the park dog | Animal | Resident | Wanders between the tree and swings |
| Park | Tree-Line Watcher | Ghost | Resident | Haunts the area until captured |
| Park | Passing Specter | Ghost | Guest | Appears, passes through zones, disappears offsite |
| House | Charles, Elinor, June, Sam | Humans | Resident | Live in the house for the entire level |
| House | Mittens (cat) | Animal | Random | Resident all game **or** guest who enters, explores, and leaves |
| Park | Whiskers (cat), Acorn (squirrel) | Animal | Random (each) | Independently rolls resident or guest at level load |
| House | Delivery driver | Human | Guest | Delivers a parcel and leaves |
| House | Neighbor and Scout | Human + dog | Guest | Visit and depart together |
| House | Passing Spirit | Ghost | Guest | Briefly passes through basement rooms |

**Views use one actor state:** Detail 1 map updates continuously; Detail 2 snapshots the state every 1.3 seconds; Detail 3 shows the full-motion actors. Guest arrivals and departures are logged to the Sound panel (subject to mute rules). Photographers display a camera icon and generate camera-shutter events when moving into field zones. Camera sprites display **R** for residents and **G** for guests; the Reports panel shows the active actor roster.

The engine is isolated in `src/level-engine.js`. `src/rooms.js` owns the level data; `src/App.jsx` only renders and coordinates it. To make future levels, define new rooms, actor schedules, and routes without rewriting the UI.

### 🧪 Run automated tests

```bash
npm test
```

The `node:test` suite includes **31 tests** covering both levels’ room graphs, actor routes, randomized cat/squirrel stays, guest arrival/departure, resident persistence, ghost/animal/human support, map assets, focus rewards, and mute filtering. It also covers **the happy path (five objectives → win)** and **both losing paths (day expiration and zero focus → game over)** on both levels. Tests do not require Vite installation.

**Build verification:** JS/JSX syntax validation and the pure simulation tests passed in this environment. A browser-level Vite build/interaction run was not possible because npm dependencies could not be downloaded here. Run `npm install && npm run build` locally for full validation.

## ✅ Five objectives per level

| # | House | Park |
| --- | --- | --- |
| 1 | Inspect basement laundry (B2) | Inspect playground swings (S2) |
| 2 | Inspect the child's bedroom (2C) | Inspect the center soccer field (F2) |
| 3 | Hear a resident's story | Hear a park story |
| 4 | Use the Audio Recorder to capture an unmuted room sound | Get a paranormal EMF reading from a haunted zone |
| 5 | Capture any ghost with a trap | Capture a park ghost with a trap |

**Victory:** Complete the 5 tasks while there is time and focus left.

**Game over:** The 5-minute demo day reaches `00:00` with tasks remaining, or the 24-slot focus meter is depleted before victory.

**Random animals:** `Mittens` is in the House and `Whiskers` + `Acorn` are in the Park. Each is separately rolled resident/guest on initial load, level switches, or retry. Cats and squirrels have visually different sprites (emoji-based prototype art) and unique ambient sounds.

**Suggested commit:** `feat: add random animal stays and five-task win/loss objectives to house and park`
