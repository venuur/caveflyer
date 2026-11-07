import type { MapDef, TuningConfig } from './content.js';
import { createRng, type RngState } from './prng.js';
import { createTerrain, type Terrain } from './terrain.js';

/** Whole simulation state. Plain data: serializable and hashable. */
export interface SimState {
  tick: number;
  rng: RngState;
  map: MapDef;
  terrain: Terrain;
  /** Entity lists are arrays sorted by id; never iterate unordered maps. */
  ships: unknown[];
  nextEntityId: number;
}

export interface MatchSetup {
  seed: number;
  map: MapDef;
  tuning: TuningConfig;
}

export function createSimState(setup: MatchSetup): SimState {
  return {
    tick: 0,
    rng: createRng(setup.seed),
    map: setup.map,
    terrain: createTerrain(setup.map),
    ships: [],
    nextEntityId: 1,
  };
}
