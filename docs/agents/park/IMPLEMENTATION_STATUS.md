# Park role scheduling — implementation status

## Implemented and tested (2026-11-05)

The Park level now opts into the reusable role scheduler. The legacy route-based
simulation remains the default for House, Bank and Hotel.

- `src/park-role-schedules.js`: authoritative 16:00–21:00 schedule data for the 15 Park actor templates, including both cat/squirrel variants.
- `src/role-scheduler.js`: deterministic Park clock; shortest-path travel along connected playable zones; anticipatory travel so actors meet scheduled appointments; resident persistence; guest arrivals/departures; independent animal-roll schedule choices.
- `src/rooms.js`: Park's `roleSchedules` opt-in config.
- `src/App.jsx`: Park advances the shared actor state once per simulated second alongside the level day clock. Three camera-detail levels use the same actors. Capturing a ghost removes that actor from the scheduler's active state as well. Stories are claimable only when the speaker is present in the room.
- `tests/park-every-five-minutes.test.js`: 8 deterministic tests including all 4 cat/squirrel combinations, all 61 five-minute checkpoints per game, guest arrival/departure and photographer stays, graph-connected motion, and a deliberately corrupted position that the auditor rejects.
- `scripts/audit-park-every-five-minutes.mjs`: writes every actor's expected vs actual location / presence every five minutes, including absent guests, for all roll combinations to CSV and produces a Markdown summary.

## Verification performed

```
npm test                 92/92 passed
npm run validate:levels  House, Park, Bank, Hotel, Farm example all valid
npm run audit:park       244 checkpoints / 3660 actor comparisons / 0 errors
```

One *game* second equals one minute of the fictional Park day. The test's five-minute checks therefore run every 5 simulation seconds, without waiting five minutes of real time.

## Still to implement / verify

- Scripted once-per-action job events (photo shutter, whistle, opening/closing, etc.) from timed activities instead of generic ambient/random sounds.
- Rendering a verified screenshot of the **current** schedule-enabled Vite build in a full browser (this environment does not have installed Vite dependencies).
- Generic migration of House, Bank and Hotel to timed role schedules; the opt-in fallback intentionally preserves their existing behavior.
- Additional UX around missed story opportunities and actor activity labels.

**Do not** claim these remaining features are already complete. The five-minute
actor-location verification **is** implemented and passing.
