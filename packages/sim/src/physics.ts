import type { HullDef } from './content.js';
import type { InputFrame } from './input.js';
import { hullRadius, type Ship } from './ship.js';
import { getHull, type SimState } from './state.js';
import { materialAt, MATERIAL, type Terrain } from './terrain.js';
import { cos, degToRad, sin, TAU, wrapAngle } from './trig.js';

interface Probe {
  /** Number of colliding sample points (ring + centre). */
  hits: number;
  /** Sum of unit directions (from centre) of colliding ring samples. */
  sx: number;
  sy: number;
  /** Material of the first colliding sample. */
  material: number;
}

const ringCache: { n: number; dirs: number[] } = { n: 0, dirs: [] };

/** Unit directions of the hull's ring samples, [x0, y0, x1, y1, ...]. */
function ringDirs(n: number): number[] {
  if (ringCache.n !== n) {
    const dirs: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i * TAU) / n;
      dirs.push(cos(a), sin(a));
    }
    ringCache.n = n;
    ringCache.dirs = dirs;
  }
  return ringCache.dirs;
}

/** Test the hull circle at (x, y) against the terrain grid. */
function probe(t: Terrain, x: number, y: number, r: number, samples: number): Probe {
  const dirs = ringDirs(samples);
  const p: Probe = { hits: 0, sx: 0, sy: 0, material: MATERIAL.air };
  const centre = materialAt(t, x, y);
  if (centre !== MATERIAL.air) {
    p.hits++;
    p.material = centre;
  }
  for (let i = 0; i < samples; i++) {
    const dx = dirs[i * 2]!;
    const dy = dirs[i * 2 + 1]!;
    const m = materialAt(t, x + dx * r, y + dy * r);
    if (m !== MATERIAL.air) {
      if (p.hits === 0) p.material = m;
      p.hits++;
      p.sx += dx;
      p.sy += dy;
    }
  }
  return p;
}

function frictionOf(state: SimState, material: number): number {
  for (const def of Object.values(state.config.materials)) {
    if (def.id === material) return def.friction;
  }
  return 0.5;
}

/** Rotation: snappy (angular velocity set directly) or assisted (turn toward a target angle). */
function rotate(ship: Ship, hull: HullDef, input: InputFrame, dt: number): void {
  const turn = degToRad(hull.turnRate);
  if (input.targetAngle !== null) {
    const delta = wrapAngle(input.targetAngle - ship.angle);
    const max = turn * dt;
    const stepA = Math.abs(delta) <= max ? delta : max * Math.sign(delta);
    ship.angVel = stepA / dt;
    ship.angle = wrapAngle(ship.angle + stepA);
  } else {
    ship.angVel = input.rotate * turn;
    ship.angle = wrapAngle(ship.angle + ship.angVel * dt);
  }
}

/** Move the ship by its velocity over dt, resolving terrain contacts. */
function move(state: SimState, ship: Ship, r: number, dt: number): void {
  const st = state.config.tuning.ship;
  const t = state.terrain;
  const n = st.collisionSamples;
  const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
  const steps = Math.max(1, Math.ceil((speed * dt) / st.maxSubstepPx));
  const sdt = dt / steps;
  ship.lastImpact = 0;

  for (let s = 0; s < steps; s++) {
    const dx = ship.vx * sdt;
    const dy = ship.vy * sdt;
    const here = probe(t, ship.x, ship.y, r, n);
    const there = probe(t, ship.x + dx, ship.y + dy, r, n);
    // Free move, or wriggling out of terrain we are already embedded in.
    if (there.hits === 0 || (here.hits > 0 && there.hits <= here.hits)) {
      ship.x += dx;
      ship.y += dy;
      continue;
    }
    // Bisect to get as close to the surface as possible without touching it.
    let lo = 0;
    let hi = 1;
    for (let k = 0; k < 5; k++) {
      const mid = (lo + hi) / 2;
      if (probe(t, ship.x + dx * mid, ship.y + dy * mid, r, n).hits > 0) hi = mid;
      else lo = mid;
    }
    ship.x += dx * lo;
    ship.y += dy * lo;

    // Surface normal points away from the colliding samples.
    let nx = -there.sx;
    let ny = -there.sy;
    let len = Math.sqrt(nx * nx + ny * ny);
    if (len < 1e-9) {
      nx = -ship.vx;
      ny = -ship.vy;
      len = Math.sqrt(nx * nx + ny * ny) || 1;
    }
    nx /= len;
    ny /= len;

    const vn = ship.vx * nx + ship.vy * ny;
    if (vn < 0) {
      const impact = -vn;
      if (impact > ship.lastImpact) ship.lastImpact = impact;
      const e = impact > st.restSpeed ? st.restitution : 0;
      ship.vx -= (1 + e) * vn * nx;
      ship.vy -= (1 + e) * vn * ny;
      // Friction on the sliding (tangential) component.
      const tx = -ny;
      const ty = nx;
      const vt = ship.vx * tx + ship.vy * ty;
      const f = Math.min(1, frictionOf(state, there.material) * st.contactFriction);
      ship.vx -= vt * f * tx;
      ship.vy -= vt * f * ty;
    }

    // Spend the rest of this substep sliding with the new velocity, if free.
    const rx = ship.vx * sdt * (1 - lo);
    const ry = ship.vy * sdt * (1 - lo);
    if (probe(t, ship.x + rx, ship.y + ry, r, n).hits === 0) {
      ship.x += rx;
      ship.y += ry;
    }
  }

  // Grounded: an upward-facing surface just below the hull. The surface
  // normal is minus the sum of hit directions, and up is negative y.
  const below = probe(t, ship.x, ship.y + 1, r, n);
  const blen = Math.sqrt(below.sx * below.sx + below.sy * below.sy);
  ship.grounded = below.hits > 0 && blen > 1e-9 && below.sy / blen > 0.7;
}

/** Index of the pad directly under the hull (within snap distance), or -1. */
export function padUnder(state: SimState, ship: Ship, r: number): number {
  const snap = state.config.tuning.pad.snapDistance;
  for (let i = 0; i < state.map.pads.length; i++) {
    const p = state.map.pads[i]!;
    if (ship.x >= p.x && ship.x <= p.x + p.width && Math.abs(ship.y + r - p.y) <= snap) return i;
  }
  return -1;
}

function kill(state: SimState, ship: Ship): void {
  const tuning = state.config.tuning;
  ship.alive = false;
  ship.hp = 0;
  ship.vx = 0;
  ship.vy = 0;
  ship.thrusting = false;
  ship.landedPad = -1;
  ship.deaths += 1;
  ship.respawnTicks = Math.round(tuning.ship.respawnSeconds * tuning.tickRate);
}

/** Spawn point farthest from other living ships (ties go to the lowest index). */
function pickSpawn(state: SimState, ship: Ship): { x: number; y: number } {
  const spawns = state.map.spawns;
  if (spawns.length === 0) return { x: state.map.width / 2, y: state.map.height / 2 };
  let best = 0;
  let bestScore = -1;
  for (let i = 0; i < spawns.length; i++) {
    const sp = spawns[i]!;
    let nearest = Infinity;
    for (const other of state.ships) {
      if (other.id === ship.id || !other.alive) continue;
      const d = (other.x - sp.x) * (other.x - sp.x) + (other.y - sp.y) * (other.y - sp.y);
      if (d < nearest) nearest = d;
    }
    if (nearest > bestScore) {
      bestScore = nearest;
      best = i;
    }
  }
  return spawns[best]!;
}

/** Put a ship back at the best spawn point, full HP, with spawn invulnerability. */
export function respawn(state: SimState, ship: Ship): void {
  const hull = getHull(state, ship.hull);
  const sp = pickSpawn(state, ship);
  ship.alive = true;
  ship.x = sp.x;
  ship.y = sp.y;
  ship.vx = 0;
  ship.vy = 0;
  ship.angle = 0;
  ship.angVel = 0;
  ship.hp = hull.armor;
  ship.invulnTicks = Math.round(state.config.tuning.ship.invulnSeconds * state.config.tuning.tickRate);
}

/** One tick of flight for one ship. */
export function updateShip(state: SimState, ship: Ship, input: InputFrame): void {
  const tuning = state.config.tuning;
  const dt = 1 / tuning.tickRate;
  if (!ship.alive) {
    ship.respawnTicks -= 1;
    if (ship.respawnTicks <= 0) respawn(state, ship);
    return;
  }
  const hull = getHull(state, ship.hull);
  const r = hullRadius(hull);

  rotate(ship, hull, input, dt);

  // Forces: gravity always, thrust along the nose. Acceleration = force / mass.
  let ax = 0;
  let ay = state.map.gravity;
  ship.thrusting = input.thrust;
  if (input.thrust) {
    const a = hull.thrust / hull.mass;
    ax += sin(ship.angle) * a;
    ay -= cos(ship.angle) * a;
  }
  ship.vx += ax * dt;
  ship.vy += ay * dt;
  const drag = Math.max(0, 1 - state.map.drag * dt);
  ship.vx *= drag;
  ship.vy *= drag;

  move(state, ship, r, dt);

  // Impact damage, with gentle upright pad touchdowns exempt.
  const pad = padUnder(state, ship, r);
  const upright = Math.abs(wrapAngle(ship.angle)) <= degToRad(tuning.pad.maxLandingAngleDeg);
  if (ship.lastImpact > 0 && tuning.ship.wallDamage && ship.invulnTicks === 0) {
    const safeOnPad = pad >= 0 && upright && ship.lastImpact < tuning.pad.safeImpactSpeed;
    if (!safeOnPad && ship.lastImpact > tuning.ship.damageThreshold) {
      ship.hp -= (ship.lastImpact - tuning.ship.damageThreshold) * tuning.ship.damagePerSpeed;
    }
  }

  // Landed: resting gently and upright on a pad repairs the hull.
  const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
  ship.landedPad = pad >= 0 && ship.grounded && upright && speed <= tuning.pad.maxLandingSpeed ? pad : -1;
  if (ship.landedPad >= 0 && ship.hp > 0) {
    ship.hp = Math.min(hull.armor, ship.hp + tuning.pad.repairPerSecond * dt);
  }

  if (ship.invulnTicks > 0) ship.invulnTicks -= 1;
  if (ship.hp <= 0) kill(state, ship);
}
