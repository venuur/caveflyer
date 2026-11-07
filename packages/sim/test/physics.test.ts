import { describe, expect, it } from 'vitest';
import { hullRadius, isSolid, MATERIAL, setMaterial, trig } from '../src/index.js';
import { boxWorld, config, input, run } from './helpers.js';

const DT = 1 / config.tuning.tickRate;

describe('flight', () => {
  it('falls under gravity, slowed by drag', () => {
    const s = boxWorld({ y: 30, floorY: 299 });
    run(s, 30); // 0.5 s
    const ship = s.ships[0]!;
    expect(ship.vx).toBe(0);
    expect(ship.vy).toBeGreaterThan(50);
    expect(ship.vy).toBeLessThan(60); // 120 * 0.5 = 60 without drag
  });

  it('thrust along the nose: upright climbs, accel = thrust / mass', () => {
    const s = boxWorld({ y: 200, floorY: 299 });
    s.map.drag = 0;
    s.map.gravity = 0;
    run(s, 60, input({ thrust: true }));
    const ship = s.ships[0]!;
    expect(ship.vy).toBeCloseTo(-300, 6); // Balanced: thrust 300, mass 1
    expect(ship.thrusting).toBe(true);
  });

  it('heavier hulls accelerate by thrust / mass', () => {
    const s = boxWorld({ y: 250, floorY: 299, hull: 'brick' });
    s.map.drag = 0;
    s.map.gravity = 0;
    run(s, 30, input({ thrust: true }));
    expect(s.ships[0]!.vy).toBeCloseTo((-380 / 1.6) * 0.5, 6);
  });

  it('snappy rotation turns at the hull turn rate', () => {
    const s = boxWorld({ y: 100, floorY: 299 });
    run(s, 15, input({ rotate: 1 })); // 0.25 s at 240 deg/s = 60 deg
    expect(trig.radToDeg(s.ships[0]!.angle)).toBeCloseTo(60, 6);
    run(s, 1);
    expect(s.ships[0]!.angVel).toBe(0); // no angular momentum
  });

  it('assisted rotation reaches the target without overshooting', () => {
    const s = boxWorld({ y: 100, floorY: 299 });
    const target = trig.degToRad(-100);
    let prevErr = Infinity;
    for (let i = 0; i < 40; i++) {
      run(s, 1, input({ targetAngle: target }));
      const err = Math.abs(trig.wrapAngle(target - s.ships[0]!.angle));
      expect(err).toBeLessThanOrEqual(prevErr + 1e-12);
      prevErr = err;
    }
    expect(s.ships[0]!.angle).toBeCloseTo(target, 9);
  });
});

describe('terrain collision', () => {
  function noSampleInside(s: ReturnType<typeof boxWorld>): boolean {
    const ship = s.ships[0]!;
    const r = hullRadius(config.hulls[ship.hull]!);
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      if (isSolid(s.terrain, ship.x + Math.cos(a) * r * 0.9, ship.y + Math.sin(a) * r * 0.9)) return false;
    }
    return true;
  }

  it('a gentle drop comes to rest on the floor, undamaged', () => {
    const s = boxWorld({ y: 236, floorY: 250 });
    run(s, 120);
    const ship = s.ships[0]!;
    expect(ship.grounded).toBe(true);
    expect(Math.abs(ship.vy)).toBeLessThan(3);
    expect(ship.y).toBeGreaterThan(250 - 6 - 1.5);
    expect(ship.y).toBeLessThan(250 - 6);
    expect(ship.hp).toBe(100);
    expect(noSampleInside(s)).toBe(true);
  });

  it('a fast impact damages the hull and bounces', () => {
    const s = boxWorld({ y: 150, floorY: 250 });
    const ship = s.ships[0]!;
    ship.vy = 250;
    let bounced = false;
    for (let i = 0; i < 60; i++) {
      run(s, 1);
      if (ship.vy < -10) bounced = true;
    }
    expect(bounced).toBe(true);
    const expected = (250 - config.tuning.ship.damageThreshold) * config.tuning.ship.damagePerSpeed;
    expect(100 - ship.hp).toBeGreaterThan(expected * 0.85);
    expect(100 - ship.hp).toBeLessThan(expected * 1.15);
  });

  it('wall damage can be switched off as a match option', () => {
    const s = boxWorld({ y: 150, floorY: 250 });
    s.config.tuning.ship.wallDamage = false;
    s.ships[0]!.vy = 400;
    run(s, 60);
    expect(s.ships[0]!.hp).toBe(100);
  });

  it('does not tunnel through a thin wall at high speed', () => {
    const s = boxWorld({ y: 100, x: 100, floorY: 299 });
    for (let y = 0; y < 300; y++) for (let x = 250; x < 253; x++) setMaterial(s.terrain, x, y, MATERIAL.metal);
    s.map.gravity = 0;
    s.ships[0]!.vx = 2000;
    run(s, 30);
    expect(s.ships[0]!.x).toBeLessThan(250);
  });

  it('slides further on ice than on dirt', () => {
    const slide = (mat: number) => {
      const s = boxWorld({ y: 243, floorY: 250 });
      for (let x = 0; x < 400; x++) setMaterial(s.terrain, x, 250, mat);
      run(s, 30); // settle
      s.ships[0]!.vx = 100;
      const x0 = s.ships[0]!.x;
      run(s, 60);
      return s.ships[0]!.x - x0;
    };
    expect(slide(MATERIAL.ice)).toBeGreaterThan(slide(MATERIAL.dirt) * 2);
  });
});

describe('landing pads', () => {
  const pad = { x: 170, y: 240, width: 60 };

  it('landing upright and slowly repairs the hull', () => {
    const s = boxWorld({ y: 225, pads: [pad] });
    const ship = s.ships[0]!;
    ship.hp = 50;
    run(s, 60);
    expect(ship.landedPad).toBe(0);
    // Settles within ~0.5 s, then repairs at repairPerSecond.
    expect(ship.hp).toBeGreaterThan(50 + config.tuning.pad.repairPerSecond * 0.4);
    run(s, 600);
    expect(ship.hp).toBe(100);
  });

  it('does not count as landed when tilted past the limit', () => {
    const s = boxWorld({ y: 225, pads: [pad] });
    const ship = s.ships[0]!;
    ship.angle = trig.degToRad(35);
    ship.hp = 50;
    run(s, 60);
    expect(ship.grounded).toBe(true);
    expect(ship.landedPad).toBe(-1);
    expect(ship.hp).toBe(50);
  });

  it('an upright touchdown on a pad is safe at speeds that hurt elsewhere', () => {
    // Same drop height (14 px to the surface) and speed, ~145 px/s at impact:
    // above the wall damage threshold, below the pad's safe speed.
    const onPad = boxWorld({ y: 220, pads: [pad] });
    onPad.ships[0]!.vy = 135;
    run(onPad, 60);
    expect(onPad.ships[0]!.lastImpact).toBe(0);
    expect(onPad.ships[0]!.hp).toBe(100);

    const offPad = boxWorld({ y: 220, floorY: 240 });
    offPad.ships[0]!.vy = 135;
    run(offPad, 60);
    expect(offPad.ships[0]!.hp).toBeLessThan(100);
  });
});

describe('death and respawn', () => {
  it('dies at 0 HP, respawns after the delay with spawn invulnerability', () => {
    const s = boxWorld({ y: 150 });
    const ship = s.ships[0]!;
    ship.hp = 1;
    ship.vy = 300;
    run(s, 60);
    expect(ship.alive).toBe(false);
    expect(ship.deaths).toBe(1);
    const respawnTicks = config.tuning.ship.respawnSeconds * config.tuning.tickRate;
    run(s, respawnTicks);
    expect(ship.alive).toBe(true);
    expect(ship.hp).toBe(100);
    expect(ship.invulnTicks).toBeGreaterThan(0);
    expect(ship.x).toBe(200);
    expect(DT).toBeGreaterThan(0);
  });
});
