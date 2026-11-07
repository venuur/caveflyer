import { Container, Graphics } from 'pixi.js';
import { createRng, nextFloat, nextInt } from '@caveflyer/sim';

/**
 * Placeholder parallax layers: dim star specks that scroll slower than the
 * world. Seeded so the backdrop is stable per map. Real per-map art comes later.
 */
export function createBackground(width: number, height: number, seed: number): Container[] {
  const rng = createRng(seed);
  const layers: Container[] = [];
  const specs = [
    { count: 120, color: 0x1c2240, size: 1 },
    { count: 60, color: 0x2e3a66, size: 2 },
  ];
  for (const spec of specs) {
    const g = new Graphics();
    for (let i = 0; i < spec.count; i++) {
      g.rect(nextInt(rng, 0, width), nextInt(rng, 0, height), spec.size, spec.size);
    }
    g.fill({ color: spec.color, alpha: 0.6 + 0.4 * nextFloat(rng) });
    layers.push(g);
  }
  return layers;
}
