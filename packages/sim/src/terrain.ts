import type { MapDef, MaterialName } from './content.js';

export const MATERIAL = { air: 0, dirt: 1, rock: 2, metal: 3, ice: 4 } as const;
export type MaterialId = (typeof MATERIAL)[MaterialName];

export const CHUNK_SIZE = 64;

export interface Terrain {
  width: number;
  height: number;
  /** One material id per pixel, row-major. */
  cells: Uint8Array;
  chunksX: number;
  chunksY: number;
  /** Incremented on every change, so observers can detect edits cheaply. */
  revision: number;
  /**
   * Per-chunk revision (row-major over chunksX x chunksY), bumped when any
   * pixel in that chunk changes. The renderer re-uploads chunks whose revision
   * moved; the bot nav grid uses it to recompute only affected cells.
   */
  chunkRevision: number[];
}

export function createTerrain(map: MapDef): Terrain {
  const { width, height } = map;
  const cells = new Uint8Array(width * height);
  const mat = MATERIAL[map.border.material];
  const t = map.border.thickness;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < t || y < t || x >= width - t || y >= height - t) cells[y * width + x] = mat;
    }
  }
  const chunksX = Math.ceil(width / CHUNK_SIZE);
  const chunksY = Math.ceil(height / CHUNK_SIZE);
  return {
    width,
    height,
    cells,
    chunksX,
    chunksY,
    revision: 0,
    chunkRevision: new Array<number>(chunksX * chunksY).fill(0),
  };
}

/** Mark every chunk overlapping the pixel rect [x0,x1] x [y0,y1] as changed. */
export function markDirty(t: Terrain, x0: number, y0: number, x1: number, y1: number): void {
  const cx0 = Math.max(0, Math.floor(x0 / CHUNK_SIZE));
  const cy0 = Math.max(0, Math.floor(y0 / CHUNK_SIZE));
  const cx1 = Math.min(t.chunksX - 1, Math.floor(x1 / CHUNK_SIZE));
  const cy1 = Math.min(t.chunksY - 1, Math.floor(y1 / CHUNK_SIZE));
  t.revision += 1;
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const i = cy * t.chunksX + cx;
      t.chunkRevision[i] = (t.chunkRevision[i] ?? 0) + 1;
    }
  }
}

export function setMaterial(t: Terrain, x: number, y: number, material: number): void {
  if (x < 0 || y < 0 || x >= t.width || y >= t.height) return;
  t.cells[y * t.width + x] = material;
  markDirty(t, x, y, x, y);
}

export function materialAt(t: Terrain, x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= t.width || iy >= t.height) return MATERIAL.metal;
  return t.cells[iy * t.width + ix] ?? MATERIAL.metal;
}
