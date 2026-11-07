/**
 * Content and tuning types. The sim never reads files: callers load the JSON
 * from content/ and pass these plain objects in.
 */
export interface TuningConfig {
  tickRate: number;
}

export type MaterialName = 'air' | 'dirt' | 'rock' | 'metal' | 'ice';

export interface MapDef {
  id: string;
  name: string;
  width: number;
  height: number;
  /** Gravity in px/s^2, positive is down. */
  gravity: number;
  /** Linear drag coefficient per second. */
  drag: number;
  /** Material of the map's outer frame, and its thickness in pixels. */
  border: { material: MaterialName; thickness: number };
  spawns: { x: number; y: number }[];
  pads: { x: number; y: number; width: number }[];
}

export interface MaterialDef {
  /** Byte stored in the terrain grid. Must match MATERIAL in terrain.ts. */
  id: number;
  /** Render color, #rrggbb. Ignored by the sim. */
  color: string;
  /** Damage multiplier to carve: 1 = dirt, 4 = rock; negative = indestructible. */
  toughness: number;
  friction: number;
}

export type MaterialTable = Record<MaterialName, MaterialDef>;
