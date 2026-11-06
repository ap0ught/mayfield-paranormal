# Park actors — jobs, location obligations, and timetable

**Day:** 16:00–21:00 (five simulated hours compressed into 300 game seconds). All times below are *in-game* Park time, **not** the user's local clock or the camera's 60-second countdown. See the authoritative machine-readable window data in `examples/park-role-schedules.example.js`.

## Location key

| Code | Place | Typical activities |
|---|---|---|
| `S1` | Park shelter | Opening/closing, check-in, breaks, group arrival/exit, interviews |
| `S2` | Swings/playground | Supervised play, swing squeaks, patrol, wildlife |
| `T1` | Tree and bench | Rest, pets, squirrel, haunting, tree-line investigation |
| `F1` | Soccer field A | Warmups, sideline photography, safety checks |
| `F2` | Soccer field B | Center-field match play, coaching, ghost evidence |
| `F3` | Soccer field C | Goal-side play, photography, security checks |

The map's parking/entry/outside row is **not simulated**; no actor can be assigned there without a future new zone.

## Resident cast — remains all game

| Actor (`templateId`) | Kind / job | Where they must be, and when | Why |
|---|---|---|---|
| `ranger` | Human · park ranger | 16:00 S1 open; 16:30 F1 inspect; 17:10 F2 patrol; 17:55 S2 inspect; 18:30 T1 patrol; 19:30 F3 inspect; 20:15 S1 close | Covers all safety-critical parts of park |
| `coach` | Human · soccer coach | 16:00 S1 roster; 16:20 S2 safety briefing; 16:35 F1 warmups; 17:10 F2 match; 18:35 S1 water; 18:55 F3 second half; 20:15 S1 debrief | Stays near players during match except defined break |
| `player` | Human · soccer player | 16:00 F2 warmup; 16:50 F1 first half; 18:30 S1 break; 18:55 F3 second half; 20:15 F2 cooldown | Match activity controls whereabouts |
| `photo-mom` (Maya) | Human · event photographer / parent | 16:00 F1 warmups; 16:45 F2 first half; 18:35 F3 second half; 20:00 F1 pack up | Photographer **resident**: covers entire game |
| `park-dog` (Patches) | Animal · park companion | 16:00 T1; 17:00 S2; 17:45 S1 for water; 18:35 T1; 20:00 T1 rest | Animal has location/time needs, not a human job |
| `tree-line` | Ghost · tree-line haunting | 16:00 T1; 17:30 S2 swing disturbance; 18:15 T1 whisper; 20:05 T1 apparition | Location-specific paranormal event windows |
| `midfield-echo` | Ghost · field haunting | 16:00 F2 light flicker; 16:50 F1 footsteps; 17:35 F2 whispers; 19:30 F3 goal apparition; 20:15 F2 haunt | Ghost must appear on correct camera at correct time |

The times above mark **start of an intended duty window**. End times and exact task IDs are in the example fixture. A planned move may take a route through other zones; actor visibility during travel must stay consistent.

## Scheduled visiting cast — enters and eventually exits

| Visit | Actors and jobs | Arrive / Leave | Required itinerary |
|---|---|---|---|
| `press-photographer` | `quick-photog` Alex · human photographer | 16:40 / 17:35 | S1 check-in → F1 shoot → F2 photos → F1 review → S1 exit |
| `family-playdate` | `visiting-mom` Dana (parent), `child-ivy` Ivy (child), `child-noah` Noah (child), `family-dog` Buddy (pet) | 17:20 / 19:25 | **Entire group:** S1 enter → S2 play → T1 snack/bench → S2 finish → S1 exit |
| `park-wisp` | `transient-spirit` Passing Specter · guest ghost | 19:40 / 20:35 | T1 manifests → F3 crosses → F2 whispers → S1 fades |

**Example: same job, different stay.** Maya and Alex both use the `event_photographer` behavior: move to sideline, aim camera, take a photo, review. Maya never naturally despawns; Alex leaves at the end of his assignment. Neither job nor species determines residency.

## Random animal templates — rolled independently on load

Each of these has a 50% chance to be a resident, 50% chance to be a guest. Do not reroll during level play.

| Actor | Resident schedule | Guest schedule |
|---|---|---|
| `park-cat` Whiskers | T1 birdwatch 16:00–17:40 → S2 prowl 17:40–18:50 → S1 shelter 18:50–19:40 → T1 bench 19:40–21:00 | Arrives via S1 18:05 → S2 18:25 → T1 18:50 → exits S1 at 19:10 |
| `park-squirrel` Acorn | T1 forage 16:00–18:00 → S2 scurry 18:00–18:35 → T1 nest 18:35–21:00 | Appears T1 17:05 → S2 17:30 → T1 17:45 → exits at 17:55 |

Animals may have optional/preferred appointments, but a **guest must still obey its arrival and departure contract** and a **resident must still remain in the level**.

## Role-event / audio expectations

- **Ranger:** gate latch, radio check, safety whistle, bench-path patrol; talk about apparition when actually in S1/T1.
- **Coach:** call warmups, whistle, direct players, water break, debrief; playground story audible only during the S2 early safety visit.
- **Player:** footsteps, soccer kicks, calls, hydration; midfield story when in F2.
- **Photographer:** camera-shutter click in F1/F2/F3 when `photograph_*` work is active; distinguish Alex's short visit from Maya's full-game assignment.
- **Parent and children:** parent converses while near group; kids play on S2, then sit/eat near T1. No child dialogue after group departure.
- **Animals:** paws/claws, collar, rustling; no human speech. Wildlife can be observed and used as ambient evidence, but must have an actual actor present.
- **Ghosts:** whisper, lights flicker, swing movement, cold spot; only while haunting and before capture or guest departure.
- **Audio:** events from *any* unmuted active room appear in the Sound tab; muted rooms yield no live audio feed. Do not generate a sound on a camera just because that room happens to be in the 2×2 camera wall.

## Mission interactions

Keep the existing Park five-goal checklist: inspect S2; inspect F2; hear one eligible story; scan ghost EMF in the correct room; capture a ghost. The early or recurring `midfield-echo` in F2 allows a fair EMF/capture opportunity even if the transient ghost has not arrived yet. Preserve focus refill from story/ghost capture and game-over on zero focus/day expiry.
