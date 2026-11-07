import { describe, expect, it } from 'vitest';
import { atan2, cos, sin, wrapAngle, PI } from '../src/trig.js';

describe('deterministic trig', () => {
  it('matches Math to near machine precision', () => {
    for (let a = -50; a <= 50; a += 0.0137) {
      // Argument reduction loses a few ulps of |a|, so scale the tolerance.
      const tol = 2e-16 * Math.max(4, Math.abs(a));
      expect(Math.abs(sin(a) - Math.sin(a))).toBeLessThan(tol);
      expect(Math.abs(cos(a) - Math.cos(a))).toBeLessThan(tol);
    }
  });

  it('atan2 matches Math within 1e-14 in all quadrants', () => {
    for (let y = -3; y <= 3; y += 0.173) {
      for (let x = -3; x <= 3; x += 0.191) {
        expect(Math.abs(atan2(y, x) - Math.atan2(y, x))).toBeLessThan(1e-14);
      }
    }
    expect(atan2(0, 0)).toBe(0);
    expect(atan2(1, 0)).toBeCloseTo(PI / 2, 15);
    expect(atan2(0, -1)).toBeCloseTo(PI, 15);
  });

  it('wrapAngle maps into [-PI, PI)', () => {
    for (let a = -20; a <= 20; a += 0.31) {
      const w = wrapAngle(a);
      expect(w).toBeGreaterThanOrEqual(-PI);
      expect(w).toBeLessThan(PI);
      expect(Math.abs(Math.sin(w) - Math.sin(a))).toBeLessThan(1e-12);
    }
  });
});
