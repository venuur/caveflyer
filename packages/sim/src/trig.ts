/**
 * Deterministic trigonometry. Math.sin/cos/atan2 are not guaranteed to give
 * bit-identical results across engines, but IEEE-754 +, -, *, / and sqrt are.
 * These functions use only those operations.
 */
export const PI = 3.141592653589793;
export const TAU = 6.283185307179586;
export const HALF_PI = 1.5707963267948966;
const DEG = PI / 180;

export function degToRad(deg: number): number {
  return deg * DEG;
}

export function radToDeg(rad: number): number {
  return rad / DEG;
}

/** Wrap an angle into [-PI, PI). */
export function wrapAngle(a: number): number {
  let r = a - TAU * Math.floor((a + PI) / TAU);
  if (r >= PI) r -= TAU;
  return r;
}

// Taylor coefficients in x^2 for sin(x)/x and cos(x), evaluated with Horner.
// On [-PI/4, PI/4] the truncation error is below 1e-16.
const SIN_C = [
  1, -1 / 6, 1 / 120, -1 / 5040, 1 / 362880, -1 / 39916800, 1 / 6227020800, -1 / 1307674368000,
  1 / 355687428096000,
];
const COS_C = [
  1, -1 / 2, 1 / 24, -1 / 720, 1 / 40320, -1 / 3628800, 1 / 479001600, -1 / 87178291200,
  1 / 20922789888000, -1 / 6402373705728000,
];

function horner(coeffs: readonly number[], x2: number): number {
  let acc = 0;
  for (let i = coeffs.length - 1; i >= 0; i--) acc = acc * x2 + (coeffs[i] ?? 0);
  return acc;
}

function sinKernel(x: number): number {
  return x * horner(SIN_C, x * x);
}

function cosKernel(x: number): number {
  return horner(COS_C, x * x);
}

/** Reduce to quadrant q and remainder r in [-PI/4, PI/4]. */
function reduce(a: number): { q: number; r: number } {
  const q = Math.round(a / HALF_PI);
  // Two-part constant for better precision in the reduction.
  const r = a - q * 1.5707963267341256 - q * 6.077100506506192e-11;
  return { q: ((q % 4) + 4) % 4, r };
}

export function sin(a: number): number {
  const { q, r } = reduce(a);
  switch (q) {
    case 0:
      return sinKernel(r);
    case 1:
      return cosKernel(r);
    case 2:
      return -sinKernel(r);
    default:
      return -cosKernel(r);
  }
}

export function cos(a: number): number {
  const { q, r } = reduce(a);
  switch (q) {
    case 0:
      return cosKernel(r);
    case 1:
      return -sinKernel(r);
    case 2:
      return -cosKernel(r);
    default:
      return sinKernel(r);
  }
}

/** atan on [0, 1] via argument halving + series. */
function atanUnit(x: number): number {
  // atan(x) = 2*atan(x / (1 + sqrt(1 + x^2))); two halvings bring x <= ~0.2.
  let t = x / (1 + Math.sqrt(1 + x * x));
  t = t / (1 + Math.sqrt(1 + t * t));
  const t2 = t * t;
  let sum = 0;
  let term = t;
  for (let k = 0; k < 14; k++) {
    sum += term / (2 * k + 1);
    term *= -t2;
  }
  return 4 * sum;
}

export function atan2(y: number, x: number): number {
  if (x === 0 && y === 0) return 0;
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  let a = ax >= ay ? atanUnit(ay / ax) : HALF_PI - atanUnit(ax / ay);
  if (x < 0) a = PI - a;
  return y < 0 ? -a : a;
}
