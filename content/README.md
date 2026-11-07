# Content

All tunable data lives here as JSON, never as magic numbers in code. Files are
checked against the specs in `packages/sim/src/validate.ts` when loaded.

- `tuning.json`: simulation tuning (tick rate, ship collision and damage, pads).
- `client.json`: client-only tuning (camera).
- `materials.json`: terrain materials: grid id, map/render color, toughness, friction.
- `hulls/`: one JSON per hull (mass, thrust, turn rate, armor, size, points).
- `maps/`: a JSON sidecar per map (size, gravity, drag, spawns, pads, border),
  plus an optional PNG whose pixel colors are material colors from `materials.json`.
  Off-palette pixels snap to the nearest material. Pads are stamped on top automatically.
- `weapons/`, `utilities/`: from M2 onward.

Tip: the in-game tuning panel (F2) has a "Copy JSON" button that exports the current values.
