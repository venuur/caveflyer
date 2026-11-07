import type { SimState } from './state.js';

/**
 * FNV-1a (32-bit) over a canonical walk of plain data. Object keys are visited
 * in sorted order and numbers are hashed by their IEEE-754 bytes, so the hash
 * changes whenever any bit of state differs.
 */
const f64 = new Float64Array(1);
const u8 = new Uint8Array(f64.buffer);

class Fnv {
  h = 0x811c9dc5;
  byte(b: number): void {
    this.h = Math.imul(this.h ^ b, 0x01000193);
  }
  num(n: number): void {
    f64[0] = n;
    for (let i = 0; i < 8; i++) this.byte(u8[i] ?? 0);
  }
  str(s: string): void {
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      this.byte(c & 0xff);
      this.byte(c >>> 8);
    }
    this.byte(0);
  }
}

function walk(f: Fnv, v: unknown): void {
  if (v === null || v === undefined) {
    f.byte(v === null ? 1 : 2);
  } else if (typeof v === 'number') {
    f.byte(3);
    f.num(v);
  } else if (typeof v === 'boolean') {
    f.byte(v ? 4 : 5);
  } else if (typeof v === 'string') {
    f.byte(6);
    f.str(v);
  } else if (v instanceof Uint8Array) {
    f.byte(7);
    f.num(v.length);
    for (let i = 0; i < v.length; i++) f.byte(v[i] ?? 0);
  } else if (Array.isArray(v)) {
    f.byte(8);
    f.num(v.length);
    for (const item of v) walk(f, item);
  } else if (typeof v === 'object') {
    f.byte(9);
    const obj = v as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    for (const k of keys) {
      f.str(k);
      walk(f, obj[k]);
    }
  } else {
    throw new Error(`hashState: unsupported value type ${typeof v}`);
  }
}

export function hashValue(v: unknown): number {
  const f = new Fnv();
  walk(f, v);
  return f.h >>> 0;
}

/**
 * Terrain cells dominate state size, so their hash is cached by (array,
 * revision). Every terrain edit goes through markDirty, which bumps the
 * revision, so a cache hit always describes the current cells.
 */
const terrainCache = { cells: null as Uint8Array | null, revision: -1, hash: 0 };

function terrainCellsHash(cells: Uint8Array, revision: number): number {
  if (terrainCache.cells !== cells || terrainCache.revision !== revision) {
    terrainCache.cells = cells;
    terrainCache.revision = revision;
    terrainCache.hash = hashValue(cells);
  }
  return terrainCache.hash;
}

export function hashState(state: SimState): number {
  const { cells, ...terrainRest } = state.terrain;
  return hashValue({
    ...state,
    terrain: { ...terrainRest, cellsHash: terrainCellsHash(cells, state.terrain.revision) },
  });
}

export function formatHash(h: number): string {
  return h.toString(16).padStart(8, '0');
}
