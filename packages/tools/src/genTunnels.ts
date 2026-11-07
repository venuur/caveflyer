// Generates content/maps/tunnels.png from simple seeded shapes.
// Run: npx tsx packages/tools/src/genTunnels.ts
// The PNG is the source of truth once committed; edit it by hand freely.
import { createRng, MATERIAL, nextFloat, type MaterialTable } from '@caveflyer/sim';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENT_DIR, loadMaterials } from './content.js';
import { encodePng } from './png.js';

const W = 960;
const H = 640;
const grid = new Uint8Array(W * H).fill(MATERIAL.dirt);
const rng = createRng(20261107);

// Value noise on a coarse lattice, bilinearly interpolated.
function makeNoise(cell: number): (x: number, y: number) => number {
  // Lattice covers twice the map so scaled lookups never hit the clamped edge.
  const gw = Math.ceil((2 * W) / cell) + 2;
  const gh = Math.ceil((2 * H) / cell) + 2;
  const lattice = Array.from({ length: gw * gh }, () => nextFloat(rng));
  return (x, y) => {
    const fx = x / cell;
    const fy = y / cell;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const tx = fx - ix;
    const ty = fy - iy;
    const at = (i: number, j: number) => lattice[Math.min(gh - 1, j) * gw + Math.min(gw - 1, i)]!;
    const top = at(ix, iy) * (1 - tx) + at(ix + 1, iy) * tx;
    const bot = at(ix, iy + 1) * (1 - tx) + at(ix + 1, iy + 1) * tx;
    return top * (1 - ty) + bot * ty;
  };
}
const coarse = makeNoise(48);
const fine = makeNoise(12);
const wobble = (x: number, y: number) => coarse(x, y) * 0.7 + fine(x, y) * 0.3 - 0.5;

const set = (x: number, y: number, m: number) => {
  if (x >= 0 && y >= 0 && x < W && y < H) grid[y * W + x] = m;
};

// Rock veins through the dirt.
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (coarse(x * 1.3, y * 1.3) > 0.66) set(x, y, MATERIAL.rock);

function ellipse(cx: number, cy: number, rx: number, ry: number, m: number, jitter = 0.15): void {
  for (let y = Math.floor(cy - ry * 1.3); y <= cy + ry * 1.3; y++) {
    for (let x = Math.floor(cx - rx * 1.3); x <= cx + rx * 1.3; x++) {
      const d = Math.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2);
      if (d < 1 + jitter * wobble(x, y) * 2) set(x, y, m);
    }
  }
}

function path(points: [number, number][], radius: number, m: number, jitter = 8): void {
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i]!;
    const [bx, by] = points[i + 1]!;
    const pad = radius + jitter + 2;
    for (let y = Math.floor(Math.min(ay, by) - pad); y <= Math.max(ay, by) + pad; y++) {
      for (let x = Math.floor(Math.min(ax, bx) - pad); x <= Math.max(ax, bx) + pad; x++) {
        const vx = bx - ax;
        const vy = by - ay;
        const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
        const d = Math.hypot(x - (ax + vx * t), y - (ay + vy * t));
        if (d < radius + jitter * wobble(x, y) * 2) set(x, y, m);
      }
    }
  }
}

function rect(x0: number, y0: number, x1: number, y1: number, m: number): void {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) set(x, y, m);
}

/** Paint the top `depth` px of exposed floor in a column range with a material. */
function paintFloor(x0: number, x1: number, y0: number, y1: number, depth: number, m: number): void {
  for (let x = x0; x < x1; x++) {
    for (let y = y0; y < y1; y++) {
      if (grid[(y - 1) * W + x] === MATERIAL.air && grid[y * W + x] !== MATERIAL.air) {
        for (let k = 0; k < depth; k++) set(x, y + k, m);
        break;
      }
    }
  }
}

// Main chamber, where everyone spawns.
ellipse(480, 190, 235, 115, MATERIAL.air);
// The loop: out of the chamber's left side, around the bottom, back in on the right.
path(
  [
    [280, 215], [165, 290], [112, 420], [170, 545], [330, 585], [480, 578],
    [630, 585], [790, 545], [848, 420], [795, 290], [680, 215],
  ],
  24,
  MATERIAL.air,
);
// Tight shortcut shaft from the chamber floor down to the bottom tunnel.
path([[296, 235], [300, 285], [315, 430], [335, 575]], 14, MATERIAL.air, 4);
// A side pocket off the right tunnel, good for hiding.
ellipse(878, 300, 42, 52, MATERIAL.air, 0.2);
path([[815, 300], [870, 300]], 16, MATERIAL.air, 3);

// Chamber pad: flat rock plinth with headroom above it.
rect(410, 290, 550, 330, MATERIAL.rock);
rect(410, 225, 550, 290, MATERIAL.air);
// Bottom-tunnel pad bay.
rect(430, 556, 530, 596, MATERIAL.air);
rect(425, 596, 535, 612, MATERIAL.rock);

// Indestructible features: a hanging metal stalactite and a metal core in the island.
rect(472, 70, 488, 112, MATERIAL.metal);
rect(440, 410, 520, 440, MATERIAL.metal);
// An icy stretch of floor on the bottom right.
paintFloor(600, 770, 540, 630, 5, MATERIAL.ice);

const materials: MaterialTable = loadMaterials();
const colors = new Map<number, [number, number, number]>();
for (const def of Object.values(materials)) {
  const c = parseInt(def.color.slice(1), 16);
  colors.set(def.id, [(c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff]);
}
const rgba = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const [r, g, b] = colors.get(grid[i]!)!;
  rgba.set([r, g, b, 255], i * 4);
}
const out = join(CONTENT_DIR, 'maps', 'tunnels.png');
writeFileSync(out, encodePng({ width: W, height: H, data: rgba }));
console.log(`wrote ${out}`);
