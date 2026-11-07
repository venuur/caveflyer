// Loads and validates content/ JSON (and map PNGs) from disk, for Node tools and tests.
import {
  HULL_SPEC,
  MAP_SPEC,
  MATERIAL_SPEC,
  terrainFromRGBA,
  TUNING_SPEC,
  validate,
  type HullDef,
  type MapDef,
  type MaterialTable,
  type SimConfig,
  type TuningConfig,
} from '@caveflyer/sim';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng } from './png.js';

export const CONTENT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../content');

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function checked<T>(path: string, spec: Parameters<typeof validate>[1]): T {
  const value = readJson(path);
  const problems = validate(value, spec);
  if (problems.length) throw new Error(`${path}:\n  ${problems.join('\n  ')}`);
  return value as T;
}

function jsonFiles(dir: string): string[] {
  return readdirSync(join(CONTENT_DIR, dir))
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => join(CONTENT_DIR, dir, f));
}

export function loadTuning(): TuningConfig {
  return checked<TuningConfig>(join(CONTENT_DIR, 'tuning.json'), TUNING_SPEC);
}

export function loadMaterials(): MaterialTable {
  const table = readJson(join(CONTENT_DIR, 'materials.json')) as Record<string, unknown>;
  for (const [name, def] of Object.entries(table)) {
    const problems = validate(def, MATERIAL_SPEC, name);
    if (problems.length) throw new Error(`materials.json:\n  ${problems.join('\n  ')}`);
  }
  return table as unknown as MaterialTable;
}

export function loadHulls(): Record<string, HullDef> {
  const hulls: Record<string, HullDef> = {};
  for (const f of jsonFiles('hulls')) {
    const h = checked<HullDef>(f, HULL_SPEC);
    hulls[h.id] = h;
  }
  return hulls;
}

export function loadConfig(): SimConfig {
  return { tuning: loadTuning(), hulls: loadHulls(), materials: loadMaterials() };
}

export interface LoadedMap {
  def: MapDef;
  cells?: Uint8Array;
}

export function loadMap(id: string, materials: MaterialTable = loadMaterials()): LoadedMap {
  const path = join(CONTENT_DIR, 'maps', `${id}.json`);
  if (!existsSync(path)) throw new Error(`unknown map "${id}"; available: ${mapIds().join(', ')}`);
  const def = checked<MapDef>(path, MAP_SPEC);
  if (!def.image) return { def };
  const img = decodePng(readFileSync(join(CONTENT_DIR, 'maps', def.image)));
  if (img.width !== def.width || img.height !== def.height) {
    throw new Error(`${def.image} is ${img.width}x${img.height}, sidecar says ${def.width}x${def.height}`);
  }
  return { def, cells: terrainFromRGBA(img.data, materials) };
}

export function mapIds(): string[] {
  return jsonFiles('maps').map((f) => f.replace(/^.*[\\/]/, '').replace(/\.json$/, ''));
}
