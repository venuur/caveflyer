export interface CameraTuning {
  targetVisibleHeight: number;
  lookAheadSeconds: number;
  maxLookAheadPx: number;
  /** Exponential follow rate, 1/s. Higher = snappier. */
  smoothing: number;
}

/** Integer zoom so roughly `targetVisibleHeight` world px fill the viewport height. */
export function zoomFor(viewportHeight: number, targetVisibleHeight: number): number {
  return Math.max(1, Math.floor(viewportHeight / targetVisibleHeight));
}

/**
 * Follow camera with look-ahead in the direction of travel. Tracks the
 * centre of view in world px and clamps it so the view stays inside the map
 * (or centres the map when it is smaller than the view).
 */
export class FollowCamera {
  x = 0;
  y = 0;
  private initialised = false;

  update(
    target: { x: number; y: number; vx: number; vy: number },
    view: { width: number; height: number },
    map: { width: number; height: number },
    tuning: CameraTuning,
    dtSeconds: number,
  ): void {
    let lx = target.vx * tuning.lookAheadSeconds;
    let ly = target.vy * tuning.lookAheadSeconds;
    const len = Math.hypot(lx, ly);
    if (len > tuning.maxLookAheadPx) {
      lx *= tuning.maxLookAheadPx / len;
      ly *= tuning.maxLookAheadPx / len;
    }
    const tx = target.x + lx;
    const ty = target.y + ly;
    if (!this.initialised) {
      this.x = tx;
      this.y = ty;
      this.initialised = true;
    } else {
      const k = 1 - Math.exp(-tuning.smoothing * dtSeconds);
      this.x += (tx - this.x) * k;
      this.y += (ty - this.y) * k;
    }
    this.x = clampAxis(this.x, view.width, map.width);
    this.y = clampAxis(this.y, view.height, map.height);
  }

  /** Jump straight to the target next update (after respawn or map change). */
  snap(): void {
    this.initialised = false;
  }
}

function clampAxis(centre: number, view: number, size: number): number {
  if (view >= size) return size / 2;
  return Math.min(size - view / 2, Math.max(view / 2, centre));
}
