import { describe, expect, it } from 'vitest';
import { FixedStepLoop } from '../src/loop.js';
import { pixelScale, viewportLayout } from '../src/viewports.js';

describe('FixedStepLoop', () => {
  it('runs whole ticks and carries the remainder as alpha', () => {
    const loop = new FixedStepLoop(60);
    const a = loop.advance(25); // 1.5 ticks
    expect(a.steps).toBe(1);
    expect(a.alpha).toBeCloseTo(0.5, 6);
    const b = loop.advance(8.3333334); // remainder + 0.5 = 1.0
    expect(b.steps).toBe(1);
  });

  it('caps steps per frame after a stall', () => {
    const loop = new FixedStepLoop(60, 5);
    expect(loop.advance(5000).steps).toBe(5);
    expect(loop.advance(0).steps).toBe(0);
  });
});

describe('viewportLayout', () => {
  it('splits 1 / 2 / 3 / 4 players', () => {
    expect(viewportLayout(1, 800, 600)).toEqual([{ x: 0, y: 0, width: 800, height: 600 }]);
    expect(viewportLayout(2, 801, 600).map((r) => r.width)).toEqual([400, 401]);
    expect(viewportLayout(3, 800, 600)).toHaveLength(3);
    const four = viewportLayout(4, 800, 600);
    expect(four[3]).toEqual({ x: 400, y: 300, width: 400, height: 300 });
  });

  it('picks the largest integer pixel scale', () => {
    expect(pixelScale({ x: 0, y: 0, width: 1920, height: 1080 }, 640, 360)).toBe(3);
    expect(pixelScale({ x: 0, y: 0, width: 300, height: 200 }, 640, 360)).toBe(1);
  });
});
