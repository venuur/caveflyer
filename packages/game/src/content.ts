import type { MapDef, MaterialTable, TuningConfig } from '@caveflyer/sim';
import blank from '../../../content/maps/blank.json';
import materialsJson from '../../../content/materials.json';
import tuningJson from '../../../content/tuning.json';

export const tuning: TuningConfig = tuningJson;
export const materials = materialsJson as MaterialTable;
export const maps: Record<string, MapDef> = { blank: blank as MapDef };
