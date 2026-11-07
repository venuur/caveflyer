import { emptyInput, type InputFrame } from './input.js';
import { updateShip } from './physics.js';
import type { SimState } from './state.js';

const IDLE = emptyInput();

/**
 * Advance the simulation by one fixed tick. Pure with respect to the outside
 * world: the only inputs are the state and the per-player input frames
 * (indexed by Ship.player). The state is mutated in place.
 */
export function step(state: SimState, inputs: readonly InputFrame[]): void {
  // Ships are kept sorted by id, so update order is deterministic.
  for (const ship of state.ships) {
    updateShip(state, ship, inputs[ship.player] ?? IDLE);
  }
  state.tick += 1;
}
