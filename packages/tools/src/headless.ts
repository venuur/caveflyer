// Headless runner: `npm run headless -- --map blank --seconds 60 --seed 1`
import { formatHash } from '@caveflyer/sim';
import { parseArgs } from 'node:util';
import { maps, tuning } from './content.js';
import { runHeadless } from './match.js';

const { values } = parseArgs({
  options: {
    map: { type: 'string', default: 'blank' },
    seconds: { type: 'string', default: '60' },
    seed: { type: 'string', default: '1' },
  },
});

const map = maps[values.map];
if (!map) {
  console.error(`Unknown map "${values.map}". Available: ${Object.keys(maps).join(', ')}`);
  process.exit(1);
}
const ticks = Math.round(Number(values.seconds) * tuning.tickRate);
const t0 = performance.now();
const result = runHeadless({ seed: Number(values.seed), map, tuning }, ticks);
const ms = performance.now() - t0;
const simSeconds = result.ticks / tuning.tickRate;
console.log(`map=${map.id} seed=${values.seed} ticks=${result.ticks} hash=${formatHash(result.finalHash)}`);
console.log(`${ms.toFixed(1)} ms wall, ${(simSeconds / (ms / 1000)).toFixed(0)}x real time`);
