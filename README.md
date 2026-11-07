# Cave Flyer

A browser-based, local split-screen caveflyer for 1–4 players, with bots for solo
play. Small ships under gravity, controlled by rotate and thrust, fighting in
destructible caves. See [docs/](docs/README.md) for the design doc and decisions log.

## Status

**M1 — Flight sandbox.** One ship on the Tunnels map: gravity, thrust, snappy
rotation (or assisted steering on a gamepad), wall collisions with impact damage, landing pads
that repair, respawn, follow camera with look-ahead, and a live tuning panel.

Done: M0 (skeleton: monorepo, deterministic sim, PRNG, headless runner).

## Getting started

Requires Node 22+.

```sh
npm install
npm run dev        # browser client at http://localhost:5173  (?map=tunnels&hull=dart&assisted=1)
npm run check      # sim lint + typecheck + tests
npm run headless -- --map tunnels --players 4 --seconds 60 --seed 1
npx tsx packages/tools/src/genTunnels.ts   # regenerate content/maps/tunnels.png
npm run build      # static build in packages/game/dist
```

## Controls

| Action | Left keys | Right keys | Gamepad |
| --- | --- | --- | --- |
| Rotate | A / D | ← / → | Left stick X or d-pad (assisted: stick sets nose direction) |
| Thrust | W | ↑ | A or RT |

In the M1 sandbox, both keyboard halves and the first gamepad all fly the one ship.

Debug keys: `F2` tuning panel, `F3` or `` ` `` debug overlay, `P` pause, `]` single-step, `R` respawn.

Land gently (≤ 40 px/s) and upright (within 20°) on a green pad to repair the hull.

## Layout

```
packages/
  sim/     deterministic simulation (no DOM, timers, Math.random or Math.sin)
  bots/    bot AI (M4)
  game/    browser client: PixiJS rendering, loop, overlay
  tools/   headless runner, later balance reports and map importer
content/   tuning, materials, hulls, client (camera), maps (JSON sidecar + PNG)
docs/      design doc link and decisions log
```

## Rules for `packages/sim`

- `step(state, inputs)` is a pure function of state and per-player `InputFrame`s, at a fixed 60 ticks/s.
- Randomness comes only from the PCG32 state stored in `SimState`; trig only from `sim/trig`.
- Entity lists are arrays sorted by id; state is plain, serializable data with a per-tick hash.
- `npm run lint` enforces this.
