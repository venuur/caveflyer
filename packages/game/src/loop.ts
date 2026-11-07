/**
 * Fixed-timestep accumulator. The sim always advances in whole ticks; the
 * renderer gets `alpha` in [0,1) to interpolate between the last two states.
 */
export class FixedStepLoop {
  readonly stepMs: number;
  private accumulator = 0;

  constructor(
    tickRate: number,
    /** Cap on ticks per frame so a stalled tab cannot spiral. */
    readonly maxStepsPerFrame = 5,
  ) {
    this.stepMs = 1000 / tickRate;
  }

  /** Add elapsed real time; returns how many ticks to run and the blend factor. */
  advance(elapsedMs: number): { steps: number; alpha: number } {
    this.accumulator += Math.max(0, elapsedMs);
    let steps = Math.floor(this.accumulator / this.stepMs);
    if (steps > this.maxStepsPerFrame) {
      steps = this.maxStepsPerFrame;
      this.accumulator = 0; // drop the backlog rather than fast-forwarding
    } else {
      this.accumulator -= steps * this.stepMs;
    }
    return { steps, alpha: this.accumulator / this.stepMs };
  }
}

/** Linear interpolation helper for render positions. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
