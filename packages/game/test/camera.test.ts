import { describe, expect, it } from 'vitest';
import { FollowCamera, zoomFor } from '../src/camera.js';

const tuning = { targetVisibleHeight: 300, lookAheadSeconds: 0.5, maxLookAheadPx: 60, smoothing: 8 };
const map = { width: 1000, height: 800 };
const view = { width: 400, height: 300 };

describe('FollowCamera', () => {
  it('leads the ship in its direction of travel, capped', () => {
    const cam = new FollowCamera();
    cam.update({ x: 500, y: 400, vx: 40, vy: 0 }, view, map, tuning, 1 / 60);
    expect(cam.x).toBe(520);
    const fast = new FollowCamera();
    fast.update({ x: 500, y: 400, vx: 1000, vy: 0 }, view, map, tuning, 1 / 60);
    expect(fast.x).toBe(560);
  });

  it('eases toward the target and clamps to the map', () => {
    const cam = new FollowCamera();
    cam.update({ x: 500, y: 400, vx: 0, vy: 0 }, view, map, tuning, 1 / 60);
    cam.update({ x: 600, y: 400, vx: 0, vy: 0 }, view, map, tuning, 1 / 60);
    expect(cam.x).toBeGreaterThan(500);
    expect(cam.x).toBeLessThan(600);
    const edge = new FollowCamera();
    edge.update({ x: 5, y: 790, vx: 0, vy: 0 }, view, map, tuning, 1 / 60);
    expect(edge.x).toBe(200);
    expect(edge.y).toBe(650);
  });

  it('centres maps smaller than the view', () => {
    const cam = new FollowCamera();
    cam.update({ x: 10, y: 10, vx: 0, vy: 0 }, { width: 2000, height: 2000 }, map, tuning, 1 / 60);
    expect([cam.x, cam.y]).toEqual([500, 400]);
  });

  it('zoom is an integer that keeps about the target height visible', () => {
    expect(zoomFor(720, 300)).toBe(2);
    expect(zoomFor(1080, 300)).toBe(3);
    expect(zoomFor(200, 300)).toBe(1);
  });
});
