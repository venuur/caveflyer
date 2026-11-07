// Browser-side content loading: JSON is bundled by Vite, map PNGs are fetched
// and decoded through a canvas. Everything is validated against the sim specs.
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
  type Spec,
  type TuningConfig,
} from '@caveflyer/sim';
import clientJson from '../../../content/client.json';
import materialsJson from '../../../content/materials.json';
import tuningJson from '../../../content/tuning.json';

export interface ClientConfig {
  camera: { targetVisibleHeight: number; lookAheadSeconds: number; maxLookAheadPx: number; smoothing: number };
}

function checked<T>(name: string, value: unknown, spec: Spec): T {
  const problems = validate(value, spec);
  if (problems.length) throw new Error(`${name}:\n  ${problems.join('\n  ')}`);
  return value as T;
}

const hullFiles = import.meta.glob('../../../content/hulls/*.json', { eager: true, import: 'default' });
const mapFiles = import.meta.glob('../../../content/maps/*.json', { eager: true, import: 'default' });
const mapImages = import.meta.glob('../../../content/maps/*.png', { eager: true, query: '?url', import: 'default' });

export const client = clientJson as ClientConfig;

export function loadConfig(): SimConfig {
  const tuning = checked<TuningConfig>('tuning.json', tuningJson, TUNING_SPEC);
  for (const [name, def] of Object.entries(materialsJson)) checked(`materials.json ${name}`, def, MATERIAL_SPEC);
  const hulls: Record<string, HullDef> = {};
  for (const [path, json] of Object.entries(hullFiles).sort()) {
    const h = checked<HullDef>(path, json, HULL_SPEC);
    hulls[h.id] = h;
  }
  return { tuning, hulls, materials: materialsJson as MaterialTable };
}

export const maps: Record<string, MapDef> = Object.fromEntries(
  Object.entries(mapFiles).map(([path, json]) => {
    const def = checked<MapDef>(path, json, MAP_SPEC);
    return [def.id, def];
  }),
);

export async function loadMap(id: string, materials: MaterialTable): Promise<{ def: MapDef; cells?: Uint8Array }> {
  const def = maps[id];
  if (!def) throw new Error(`unknown map "${id}"`);
  if (!def.image) return { def };
  const url = mapImages[`../../../content/maps/${def.image}`] as string | undefined;
  if (!url) throw new Error(`map image ${def.image} not found`);
  const img = new Image();
  img.src = url;
  await img.decode();
  if (img.width !== def.width || img.height !== def.height) {
    throw new Error(`${def.image} is ${img.width}x${img.height}, sidecar says ${def.width}x${def.height}`);
  }
  const canvas = document.createElement('canvas');
  canvas.width = def.width;
  canvas.height = def.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const rgba = ctx.getImageData(0, 0, def.width, def.height).data;
  return { def, cells: terrainFromRGBA(rgba, materials) };
}
