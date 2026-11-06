# Park actor position audit (five-minute checkpoints)

- Park clock: 4:00 PM through 9:00 PM (300 game seconds)
- Checkpoint frequency: five in-game minutes (5 simulated seconds)
- Animal-roll scenarios: 4
- Checkpoints checked: 244 (61 per scenario)
- Actor presence and room comparisons: 3660
- Incorrect locations: 0
- Verification uses runtime role scheduling against independent appointment blocks; intermediate walking steps are also covered by unit tests.

## RESULT: PASS — every actor matched the scheduled location or expected absence.
