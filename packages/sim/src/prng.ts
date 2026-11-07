/**
 * PCG32 (XSH-RR) seeded PRNG. The 64-bit state is kept as two uint32 halves
 * so the generator is plain serializable data and needs no BigInt.
 */
export interface RngState {
  hi: number;
  lo: number;
}

const MUL_HI = 0x5851f42d;
const MUL_LO = 0x4c957f2d;
const INC_HI = 0x14057b7e;
const INC_LO = 0xf767814f;

/** 64-bit (hi,lo) = a * b + c, all uint32 halves. */
function mulAdd64(
  aHi: number,
  aLo: number,
  bHi: number,
  bLo: number,
  cHi: number,
  cLo: number,
): RngState {
  // Split low words into 16-bit parts to keep products exact in doubles.
  const a0 = aLo & 0xffff;
  const a1 = aLo >>> 16;
  const b0 = bLo & 0xffff;
  const b1 = bLo >>> 16;
  const p00 = a0 * b0;
  const p01 = a0 * b1;
  const p10 = a1 * b0;
  const p11 = a1 * b1;
  const mid = (p00 >>> 16) + (p01 & 0xffff) + (p10 & 0xffff);
  let lo = ((mid & 0xffff) << 16) | (p00 & 0xffff);
  let hi = p11 + (p01 >>> 16) + (p10 >>> 16) + (mid >>> 16);
  hi = (hi + Math.imul(aLo, bHi) + Math.imul(aHi, bLo)) >>> 0;
  lo >>>= 0;
  const sumLo = lo + cLo;
  const carry = sumLo > 0xffffffff ? 1 : 0;
  return { hi: (hi + cHi + carry) >>> 0, lo: sumLo >>> 0 };
}

function advance(s: RngState): void {
  const n = mulAdd64(s.hi, s.lo, MUL_HI, MUL_LO, INC_HI, INC_LO);
  s.hi = n.hi;
  s.lo = n.lo;
}

export function createRng(seed: number): RngState {
  const s: RngState = { hi: 0, lo: 0 };
  advance(s);
  const add = mulAdd64(s.hi, s.lo, 0, 1, 0, seed >>> 0);
  s.hi = add.hi;
  s.lo = add.lo;
  advance(s);
  return s;
}

/** Next uint32. Mutates the state in place. */
export function nextU32(s: RngState): number {
  const oldHi = s.hi;
  const oldLo = s.lo;
  advance(s);
  // xorshifted = ((old >> 18) ^ old) >> 27, truncated to 32 bits
  const xHi = (oldHi >>> 18) ^ oldHi;
  const xLo = (((oldHi << 14) | (oldLo >>> 18)) ^ oldLo) >>> 0;
  const xorshifted = ((xHi << 5) | (xLo >>> 27)) >>> 0;
  const rot = oldHi >>> 27;
  return ((xorshifted >>> rot) | (xorshifted << ((32 - rot) & 31))) >>> 0;
}

/** Uniform float in [0, 1). */
export function nextFloat(s: RngState): number {
  return nextU32(s) / 4294967296;
}

/** Uniform integer in [min, max] inclusive. */
export function nextInt(s: RngState, min: number, max: number): number {
  return min + Math.floor(nextFloat(s) * (max - min + 1));
}

/** Uniform float in [min, max). */
export function nextRange(s: RngState, min: number, max: number): number {
  return min + nextFloat(s) * (max - min);
}
