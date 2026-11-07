import { describe, expect, it } from 'vitest';
import { createSimState, hashState, step } from '../src/index.js';
import { maps, runHeadless, tuning } from '../../tools/src/index.js';

const map = maps.blank!;

describe('determinism', () => {
  it('an empty match produces identical per-tick hashes on two runs', () => {
    const setup = { seed: 1234, map, tuning };
    const a = runHeadless(setup, 600, { recordHashes: true });
    const b = runHeadless(setup, 600, { recordHashes: true });
    expect(a.hashes).toHaveLength(600);
    expect(a.hashes).toEqual(b.hashes);
    // The hash must actually track state: every tick differs.
    expect(new Set(a.hashes).size).toBe(600);
  });

  it('different seeds give different state', () => {
    const a = runHeadless({ seed: 1, map, tuning }, 10);
    const b = runHeadless({ seed: 2, map, tuning }, 10);
    expect(a.finalHash).not.toBe(b.finalHash);
  });

  it('state survives a JSON-style clone with the same hash', () => {
    const s = createSimState({ seed: 9, map, tuning });
    step(s, []);
    const clone = structuredClone(s);
    expect(hashState(clone)).toBe(hashState(s));
    step(s, []);
    step(clone, []);
    expect(hashState(clone)).toBe(hashState(s));
  });
});

describe('headless', () => {
  it('runs a minute of sim in Node faster than real time', () => {
    const t0 = performance.now();
    const r = runHeadless({ seed: 1, map, tuning }, 60 * tuning.tickRate);
    const ms = performance.now() - t0;
    expect(r.ticks).toBe(3600);
    expect(ms).toBeLessThan(60_000);
  });
});
