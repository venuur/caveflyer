import type { HullDef } from './content.js';

export interface Ship {
  id: number;
  /** Index into the per-tick inputs array. */
  player: number;
  hull: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Radians; 0 = nose up, positive = clockwise (screen coordinates). */
  angle: number;
  /** Radians per second, set directly by input (snappy rotation). */
  angVel: number;
  hp: number;
  alive: boolean;
  respawnTicks: number;
  invulnTicks: number;
  /** True on ticks where thrust was applied (for flame rendering and audio). */
  thrusting: boolean;
  /** Touching terrain with an upward-facing surface this tick. */
  grounded: boolean;
  /** Index of the pad the ship is landed on, or -1. */
  landedPad: number;
  /** Largest impact speed this tick, px/s (0 when none). */
  lastImpact: number;
  deaths: number;
}

export function createShip(id: number, player: number, hull: HullDef, x: number, y: number): Ship {
  return {
    id,
    player,
    hull: hull.id,
    x,
    y,
    vx: 0,
    vy: 0,
    angle: 0,
    angVel: 0,
    hp: hull.armor,
    alive: true,
    respawnTicks: 0,
    invulnTicks: 0,
    thrusting: false,
    grounded: false,
    landedPad: -1,
    lastImpact: 0,
    deaths: 0,
  };
}

export function hullRadius(hull: HullDef): number {
  return hull.size / 2;
}
