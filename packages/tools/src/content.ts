import type { MapDef, TuningConfig } from '@caveflyer/sim';
import blank from '../../../content/maps/blank.json' with { type: 'json' };
import tuningJson from '../../../content/tuning.json' with { type: 'json' };

export const tuning: TuningConfig = tuningJson;
export const maps: Record<string, MapDef> = { blank: blank as MapDef };
