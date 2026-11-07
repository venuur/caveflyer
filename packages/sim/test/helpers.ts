import { loadConfig } from '../../tools/src/content.js';
import {
  createSimState,
  emptyInput,
  MATERIAL,
  step,
  type InputFrame,
  type MapDef,
  type PadDef,
  type SimState,
} from '../src/index.js';

export const config = loadConfig();

/** A 400x300 box with a flat dirt floor at `floorY` (and optional pads). */
export function boxWorld(opts: { floorY?: number; pads?: PadDef[]; hull?: string; x?: number; y?: number } = {}): SimState {
  const floorY = opts.floorY ?? 250;
  const width = 400;
  const height = 300;
  const map: MapDef = {
    id: 'box',
    name: 'Box',
    width,
    height,
    gravity: 120,
    drag: 0.4,
    border: { material: 'metal', thickness: 4 },
    spawns: [{ x: opts.x ?? 200, y: opts.y ?? 100 }],
    pads: opts.pads ?? [],
  };
  const cells = new Uint8Array(width * height);
  for (let y = floorY; y < height; y++) for (let x = 0; x < width; x++) cells[y * width + x] = MATERIAL.dirt;
  const state = createSimState({ seed: 1, map, terrainCells: cells, config, players: [{ hull: opts.hull ?? 'balanced' }] });
  state.ships[0]!.invulnTicks = 0;
  return state;
}

export function input(over: Partial<InputFrame> = {}): InputFrame {
  return { ...emptyInput(), ...over };
}

export function run(state: SimState, ticks: number, frame: InputFrame | ((t: number) => InputFrame) = input()): void {
  for (let i = 0; i < ticks; i++) step(state, [typeof frame === 'function' ? frame(i) : frame]);
}
