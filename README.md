# Cave Flyer

A browser-based, local split-screen caveflyer for 1–4 players, with bots for solo
play. Small ships under gravity, controlled by rotate and thrust, fighting in
destructible caves. See [docs/](docs/README.md) for the design doc and decisions log.

## Status

**M0 — Skeleton.** Monorepo, fixed-timestep deterministic sim, seeded PRNG,
blank map rendered with PixiJS, debug overlay, headless runner.

## Getting started

Requires Node 22+.

```sh
npm install
npm run dev        # browser client at http://localhost:5173  (?seed=7&map=blank)
npm run check      # sim lint + typecheck + tests
npm run headless -- --map blank --seconds 600 --seed 1
npm run build      # static build in packages/game/dist
```

In the client: `F3` or `` ` `` toggles the debug overlay, `P` pauses, `.` single-steps.

## Layout

```
packages/
  sim/     deterministic simulation (no DOM, timers, Math.random or Math.sin)
  bots/    bot AI (M4)
  game/    browser client: PixiJS rendering, loop, overlay
  tools/   headless runner, later balance reports and map importer
content/   tuning, materials, maps (JSON), later hulls/weapons/utilities
docs/      design doc link and decisions log
```

## Rules for `packages/sim`

- `step(state, inputs)` is a pure function of state and per-player `InputFrame`s, at a fixed 60 ticks/s.
- Randomness comes only from the PCG32 state stored in `SimState`; trig only from `sim/trig`.
- Entity lists are arrays sorted by id; state is plain, serializable data with a per-tick hash.
- `npm run lint` enforces this.
