import {
  createSimState,
  emptyInput,
  hashState,
  nextFloat,
  createRng,
  step,
  type InputFrame,
  type MatchSetup,
  type SimState,
} from '@caveflyer/sim';

export interface HeadlessResult {
  state: SimState;
  ticks: number;
  finalHash: number;
  /** Per-tick state hashes, when requested. */
  hashes: number[];
}

/** Run a match without rendering. `inputsAt` supplies each tick's inputs. */
export function runHeadless(
  setup: MatchSetup,
  ticks: number,
  opts: { recordHashes?: boolean; inputsAt?: (tick: number, state: SimState) => InputFrame[] } = {},
): HeadlessResult {
  const state = createSimState(setup);
  const idle = (setup.players ?? []).map(() => emptyInput());
  const hashes: number[] = [];
  for (let i = 0; i < ticks; i++) {
    step(state, opts.inputsAt ? opts.inputsAt(state.tick, state) : idle);
    if (opts.recordHashes) hashes.push(hashState(state));
  }
  return { state, ticks: state.tick, finalHash: hashState(state), hashes };
}

/**
 * Seeded random "button masher" inputs that hold each choice for a while, so
 * ships actually fly around and hit things. Used by determinism tests and the
 * headless runner until bots exist.
 */
export function randomInputs(players: number, seed: number): (tick: number) => InputFrame[] {
  const rng = createRng(seed);
  const current = Array.from({ length: players }, emptyInput);
  return () => {
    for (const input of current) {
      if (nextFloat(rng) < 0.08) input.rotate = ([-1, 0, 1] as const)[Math.floor(nextFloat(rng) * 3)]!;
      if (nextFloat(rng) < 0.1) input.thrust = nextFloat(rng) < 0.55;
    }
    return current.map((i) => ({ ...i }));
  };
}
