import type { MapDef, MaterialName, MaterialTable } from './content.js';

export const MATERIAL = { air: 0, dirt: 1, rock: 2, metal: 3, ice: 4, pad: 5 } as const;
export type MaterialId = (typeof MATERIAL)[MaterialName];

export const CHUNK_SIZE = 64;
/** Thickness of the indestructible slab stamped under each pad's surface. */
export const PAD_THICKNESS = 4;

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

/**
 * Build terrain for a map. `cells` is the imported material grid (from the
 * map PNG); without it the map is empty air. The border and pads are stamped
 * on top so they are always present and indestructible.
 */
export function createTerrain(map: MapDef, cells?: Uint8Array): Terrain {
  const { width, height } = map;
  if (cells && cells.length !== width * height) {
    throw new Error(`map ${map.id}: terrain is ${cells.length} cells, expected ${width * height}`);
  }
  const grid = cells ? cells.slice() : new Uint8Array(width * height);
  const mat = MATERIAL[map.border.material];
  const t = map.border.thickness;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < t || y < t || x >= width - t || y >= height - t) grid[y * width + x] = mat;
    }
  }
  for (const pad of map.pads) {
    for (let y = pad.y; y < pad.y + PAD_THICKNESS && y < height; y++) {
      for (let x = pad.x; x < pad.x + pad.width && x < width; x++) {
        if (x >= 0 && y >= 0) grid[y * width + x] = MATERIAL.pad;
      }
    }
  }
  const chunksX = Math.ceil(width / CHUNK_SIZE);
  const chunksY = Math.ceil(height / CHUNK_SIZE);
  return {
    width,
    height,
    cells: grid,
    chunksX,
    chunksY,
    revision: 0,
    chunkRevision: new Array<number>(chunksX * chunksY).fill(0),
  };
}

/** Out-of-bounds reads as metal, so nothing can leave the map. */
export function materialAt(t: Terrain, x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= t.width || iy >= t.height) return MATERIAL.metal;
  return t.cells[iy * t.width + ix] ?? MATERIAL.metal;
}

export function isSolid(t: Terrain, x: number, y: number): boolean {
  return materialAt(t, x, y) !== MATERIAL.air;
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

/**
 * Convert RGBA pixels (e.g. a decoded map PNG) to material ids. Exact color
 * matches are used when present; otherwise the nearest material color wins,
 * so slightly off colors from an image editor still import.
 */
export function terrainFromRGBA(rgba: Uint8Array | Uint8ClampedArray, materials: MaterialTable): Uint8Array {
  const entries = Object.values(materials)
    .map((m) => {
      const c = parseInt(m.color.slice(1), 16);
      return { id: m.id, r: (c >> 16) & 0xff, g: (c >> 8) & 0xff, b: c & 0xff };
    })
    .sort((a, b) => a.id - b.id);
  const out = new Uint8Array(rgba.length / 4);
  for (let i = 0; i < out.length; i++) {
    const r = rgba[i * 4] ?? 0;
    const g = rgba[i * 4 + 1] ?? 0;
    const b = rgba[i * 4 + 2] ?? 0;
    const a = rgba[i * 4 + 3] ?? 255;
    if (a < 128) {
      out[i] = MATERIAL.air;
      continue;
    }
    let best = 0;
    let bestD = Infinity;
    for (const e of entries) {
      const d = (e.r - r) * (e.r - r) + (e.g - g) * (e.g - g) + (e.b - b) * (e.b - b);
      if (d < bestD) {
        bestD = d;
        best = e.id;
      }
    }
    out[i] = best;
  }
  return out;
}
