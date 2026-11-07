import type { HullDef, MapDef, SimConfig } from './content.js';
import { clonePlain } from './clone.js';
import { createRng, type RngState } from './prng.js';
import { createShip, type Ship } from './ship.js';
import { createTerrain, type Terrain } from './terrain.js';

/** Whole simulation state. Plain data: serializable and hashable. */
export interface SimState {
  tick: number;
  rng: RngState;
  /** Content and tuning, carried in state so the tuning panel can edit it live. */
  config: SimConfig;
  map: MapDef;
  terrain: Terrain;
  /** Entity lists are arrays sorted by id; never iterate unordered maps. */
  ships: Ship[];
  nextEntityId: number;
}

export interface PlayerSetup {
  hull: string;
}

export interface MatchSetup {
  seed: number;
  map: MapDef;
  /** Imported material grid for the map; omit for an empty map. */
  terrainCells?: Uint8Array;
  config: SimConfig;
  players?: PlayerSetup[];
}

export function getHull(state: SimState, id: string): HullDef {
  const hull = state.config.hulls[id];
  if (!hull) throw new Error(`unknown hull "${id}"`);
  return hull;
}

export function createSimState(setup: MatchSetup): SimState {
  const config = clonePlain(setup.config);
  const map = clonePlain(setup.map);
  const state: SimState = {
    tick: 0,
    rng: createRng(setup.seed),
    config,
    map,
    terrain: createTerrain(map, setup.terrainCells),
    ships: [],
    nextEntityId: 1,
  };
  (setup.players ?? []).forEach((p, i) => {
    const spawn = map.spawns[i % Math.max(1, map.spawns.length)] ?? { x: map.width / 2, y: map.height / 2 };
    const ship = createShip(state.nextEntityId++, i, getHull(state, p.hull), spawn.x, spawn.y);
    ship.invulnTicks = Math.round(config.tuning.ship.invulnSeconds * config.tuning.tickRate);
    state.ships.push(ship);
  });
  return state;
}
