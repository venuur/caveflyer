/**
 * Content and tuning types. The sim never reads files: callers load the JSON
 * from content/ and pass these plain objects in.
 */
export interface ShipTuning {
  /** Points on the hull circle tested against terrain. */
  collisionSamples: number;
  /** Longest move per collision substep, px. */
  maxSubstepPx: number;
  /** Bounce factor for the normal velocity component on impact. */
  restitution: number;
  /** Below this impact speed (px/s) the ship comes to rest instead of bouncing. */
  restSpeed: number;
  /** Scales the material friction applied to sliding speed on contact. */
  contactFriction: number;
  /** Match option: wall impacts damage ships. */
  wallDamage: boolean;
  /** Impact speed (px/s) above which walls do damage. */
  damageThreshold: number;
  /** HP lost per px/s of impact speed above the threshold. */
  damagePerSpeed: number;
  respawnSeconds: number;
  invulnSeconds: number;
}

export interface PadTuning {
  /** Max speed (px/s) to count as landed. */
  maxLandingSpeed: number;
  /** Max nose deviation from upright, degrees. */
  maxLandingAngleDeg: number;
  /** Upright impacts on a pad below this speed do no damage. */
  safeImpactSpeed: number;
  repairPerSecond: number;
  /** Vertical tolerance (px) between hull bottom and pad top. */
  snapDistance: number;
}

export interface TuningConfig {
  tickRate: number;
  ship: ShipTuning;
  pad: PadTuning;
}

export interface HullDef {
  id: string;
  name: string;
  mass: number;
  /** Thrust force: acceleration in px/s^2 at mass 1. */
  thrust: number;
  /** Degrees per second. */
  turnRate: number;
  armor: number;
  /** Hull length in px; the collision circle has radius size / 2. */
  size: number;
  points: number;
  role: string;
}

export type MaterialName = 'air' | 'dirt' | 'rock' | 'metal' | 'ice' | 'pad';

export interface MaterialDef {
  /** Byte stored in the terrain grid. Must match MATERIAL in terrain.ts. */
  id: number;
  /** Render color, #rrggbb. Ignored by the sim. */
  color: string;
  /** Damage multiplier to carve: 1 = dirt, 4 = rock; negative = indestructible. */
  toughness: number;
  /** 0..1, how quickly sliding contact slows a ship. */
  friction: number;
}

export type MaterialTable = Record<MaterialName, MaterialDef>;

export interface PadDef {
  /** Left edge of the pad surface. */
  x: number;
  /** Top of the pad surface; ships rest on it. */
  y: number;
  width: number;
}

export interface MapDef {
  id: string;
  name: string;
  width: number;
  height: number;
  /** PNG file (next to the JSON) whose colors map to materials. Absent = empty map. */
  image?: string;
  /** Gravity in px/s^2, positive is down. */
  gravity: number;
  /** Linear drag coefficient per second. */
  drag: number;
  /** Material of the map's outer frame, and its thickness in pixels. */
  border: { material: MaterialName; thickness: number };
  spawns: { x: number; y: number }[];
  pads: PadDef[];
}

/** All the content a match needs, carried in sim state so it can be tuned live. */
export interface SimConfig {
  tuning: TuningConfig;
  hulls: Record<string, HullDef>;
  materials: MaterialTable;
}
