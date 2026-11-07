import {
  createSimState,
  emptyInput,
  hashState,
  step,
  type InputFrame,
  type MatchSetup,
} from '@caveflyer/sim';

export interface HeadlessResult {
  ticks: number;
  finalHash: number;
  /** Per-tick state hashes, when requested. */
  hashes: number[];
}

/** Run a match without rendering. `inputsAt` supplies each tick's inputs. */
export function runHeadless(
  setup: MatchSetup,
  ticks: number,
  opts: { players?: number; recordHashes?: boolean; inputsAt?: (tick: number) => InputFrame[] } = {},
): HeadlessResult {
  const state = createSimState(setup);
  const players = opts.players ?? 0;
  const idle = Array.from({ length: players }, emptyInput);
  const hashes: number[] = [];
  for (let i = 0; i < ticks; i++) {
    step(state, opts.inputsAt ? opts.inputsAt(state.tick) : idle);
    if (opts.recordHashes) hashes.push(hashState(state));
  }
  return { ticks: state.tick, finalHash: hashState(state), hashes };
}
