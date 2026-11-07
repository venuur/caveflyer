import type { InputFrame } from './input.js';
import type { SimState } from './state.js';

/**
 * Advance the simulation by one fixed tick. Pure with respect to the outside
 * world: the only inputs are the state and the per-player input frames.
 * The state is mutated in place; clone it first if you need the old one.
 */
export function step(state: SimState, inputs: readonly InputFrame[]): void {
  void inputs; // M0: no ships yet. Ships, physics and weapons arrive in M1+.
  state.tick += 1;
}
