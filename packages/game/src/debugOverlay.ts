import { formatHash, hashState, type SimState } from '@caveflyer/sim';

/** Toggle with F3 or backtick. Shows fps, tick, steps per frame and the state hash. */
export class DebugOverlay {
  private visible = true;
  private frames = 0;
  private fps = 0;
  private lastFpsTime = performance.now();
  private hash = '--------';
  private hashEvery = 30;

  constructor(private readonly el: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3' || e.code === 'Backquote') {
        this.visible = !this.visible;
        this.el.hidden = !this.visible;
        e.preventDefault();
      }
    });
  }

  update(state: SimState, info: { steps: number; chunksUploaded: number; seed: number; paused: boolean }): void {
    this.frames++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 500) {
      this.fps = (this.frames * 1000) / (now - this.lastFpsTime);
      this.frames = 0;
      this.lastFpsTime = now;
    }
    if (state.tick % this.hashEvery === 0 || info.paused) this.hash = formatHash(hashState(state));
    if (!this.visible) return;
    this.el.textContent = [
      `fps     ${this.fps.toFixed(0)}`,
      `tick    ${state.tick}${info.paused ? '  (paused)' : ''}`,
      `steps   ${info.steps}/frame`,
      `hash    ${this.hash}`,
      `seed    ${info.seed}`,
      `map     ${state.map.id} ${state.map.width}x${state.map.height}`,
      `chunks  ${state.terrain.chunksX * state.terrain.chunksY} (${info.chunksUploaded} uploaded)`,
      '',
      'F3 overlay · F2 tuning · P pause · ] step · R respawn',
    ].join('\n');
  }
}
