import { describe, expect, it } from 'vitest';
import { clonePlain, createSimState, hashState, step } from '../src/index.js';
import { loadConfig, loadMap, randomInputs, runHeadless } from '../../tools/src/index.js';

const config = loadConfig();
const tunnels = loadMap('tunnels', config.materials);
const blank = loadMap('blank', config.materials);
const setupOn = (m: typeof tunnels, seed: number, players = 0) => ({
  seed,
  map: m.def,
  ...(m.cells ? { terrainCells: m.cells } : {}),
  config,
  players: Array.from({ length: players }, (_, i) => ({ hull: ['dart', 'balanced', 'brick', 'balanced'][i]! })),
});

describe('determinism', () => {
  it('an empty match produces identical per-tick hashes on two runs', () => {
    const a = runHeadless(setupOn(blank, 1234), 600, { recordHashes: true });
    const b = runHeadless(setupOn(blank, 1234), 600, { recordHashes: true });
    expect(a.hashes).toEqual(b.hashes);
    expect(new Set(a.hashes).size).toBe(600);
  });

  it('a recorded 4-ship flight replays with identical per-tick hashes', () => {
    // Record inputs once, then replay them from the recording.
    const recorded: ReturnType<ReturnType<typeof randomInputs>>[] = [];
    const gen = randomInputs(4, 99);
    const a = runHeadless(setupOn(tunnels, 7, 4), 3600, {
      recordHashes: true,
      inputsAt: (t) => (recorded[t] = gen(t)),
    });
    const b = runHeadless(setupOn(tunnels, 7, 4), 3600, { recordHashes: true, inputsAt: (t) => recorded[t]! });
    expect(b.hashes).toEqual(a.hashes);
    // The ships really moved and collided.
    expect(a.state.ships.some((s) => s.deaths > 0 || s.hp < 100)).toBe(true);
  });

  it('different seeds give different state', () => {
    const a = runHeadless(setupOn(blank, 1), 10);
    const b = runHeadless(setupOn(blank, 2), 10);
    expect(a.finalHash).not.toBe(b.finalHash);
  });

  it('state survives a clone with the same hash and future', () => {
    const s = createSimState(setupOn(tunnels, 9, 2));
    const inputs = randomInputs(2, 5);
    for (let i = 0; i < 100; i++) step(s, inputs(i));
    const clone = clonePlain(s);
    expect(hashState(clone)).toBe(hashState(s));
    const more = randomInputs(2, 6);
    for (let i = 0; i < 100; i++) {
      const f = more(i);
      step(s, f);
      step(clone, f);
    }
    expect(hashState(clone)).toBe(hashState(s));
  });
});

describe('headless', () => {
  it('runs a minute of 4-ship sim in Node much faster than real time', () => {
    const t0 = performance.now();
    const r = runHeadless(setupOn(tunnels, 1, 4), 3600, { inputsAt: randomInputs(4, 1) });
    const ms = performance.now() - t0;
    expect(r.ticks).toBe(3600);
    expect(ms).toBeLessThan(10_000);
  });
});
