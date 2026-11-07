# Decisions log

One line per design or technical decision, with the reason.

## M0 — Skeleton

- Monorepo via npm workspaces (no pnpm/turbo): fewest tools; packages import each other's TS source directly.
- Packages export `src/index.ts` with no build step: Vite, Vitest and tsx all consume TS natively, so there's nothing to keep in sync.
- Exact-pinned toolchain: TypeScript 7.0.2, Vite 8.3.6, Vitest 5.1.0, PixiJS 8.22.0, tsx 4.23.15: the doc asks for an exact PixiJS pin; pinning everything keeps builds reproducible.
- `sim` and `bots` compile with `lib: ES2022` and `types: []`: DOM and Node APIs are type errors there, not just lint warnings.
- Sim lint is a small script (`scripts/lint-sim.mjs`), not ESLint: it bans Math.random, Math transcendentals, `**`, timers, Date, browser/Node globals, Map/Set and for…in, with no plugin setup.
- PRNG is PCG32 (oneseq), with state stored as two uint32 halves: plain JSON-serializable data, no BigInt in the hot path; verified against a BigInt reference in tests.
- Trig uses Horner-evaluated Taylor series with fdlibm-style quadrant reduction, not a lookup table: only IEEE +,−,×,÷,√, so it is bit-identical everywhere and accurate to ~1e-16; a table would need Math.sin to build it.
- State hash is FNV-1a over a canonical, key-sorted walk of the state (numbers hashed by their float64 bytes): it covers any plain-data state without per-field code.
- `step(state, inputs)` mutates the state in place: avoids allocating per tick; callers that need snapshots clone (`structuredClone` keeps the hash).
- Terrain keeps a per-chunk revision counter in sim state instead of a dirty set: the renderer and the bot nav grid each compare against their own last-seen revision, with no shared mutable "consumed" flag.
- Material colors, toughness and friction live in `content/materials.json`; the sim ignores color.
- M0 maps are a JSON sidecar with a frame border; the PNG material importer arrives with real maps (M1/M2).
- Fixed-step loop caps at 5 ticks/frame and drops the backlog after a stall (tab switch) instead of fast-forwarding.
- Camera in M0 fits the whole map at the largest integer scale (pixel art); the follow camera with look-ahead comes in M1.
- The design doc stays in Claude Docs and `docs/README.md` links to it, so there's no copy here to go stale.
