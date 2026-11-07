import { describe, expect, it } from 'vitest';
import { createRng, nextFloat, nextInt, nextU32 } from '../src/prng.js';

/** Reference PCG32 (oneseq) with BigInt, to check the 32-bit-halves version. */
function referencePcg(seed: number, n: number): number[] {
  const MASK = (1n << 64n) - 1n;
  const MUL = 6364136223846793005n;
  const INC = 1442695040888963407n;
  let state = 0n;
  state = (state * MUL + INC) & MASK;
  state = (state + BigInt(seed >>> 0)) & MASK;
  state = (state * MUL + INC) & MASK;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const old = state;
    state = (old * MUL + INC) & MASK;
    const xorshifted = Number((((old >> 18n) ^ old) >> 27n) & 0xffffffffn);
    const rot = Number(old >> 59n);
    out.push(((xorshifted >>> rot) | (xorshifted << ((32 - rot) & 31))) >>> 0);
  }
  return out;
}

describe('PCG32', () => {
  it('matches a BigInt reference implementation', () => {
    for (const seed of [0, 1, 42, 0xdeadbeef]) {
      const rng = createRng(seed);
      const got = Array.from({ length: 1000 }, () => nextU32(rng));
      expect(got).toEqual(referencePcg(seed, 1000));
    }
  });

  it('is reproducible and serializable', () => {
    const a = createRng(7);
    for (let i = 0; i < 10; i++) nextU32(a);
    const b = JSON.parse(JSON.stringify(a));
    expect(nextU32(a)).toBe(nextU32(b));
  });

  it('gives floats in [0,1) and ints in range', () => {
    const rng = createRng(3);
    for (let i = 0; i < 10000; i++) {
      const f = nextFloat(rng);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const n = nextInt(rng, -2, 5);
      expect(n).toBeGreaterThanOrEqual(-2);
      expect(n).toBeLessThanOrEqual(5);
    }
  });
});
