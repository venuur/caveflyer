// Headless runner: `npm run headless -- --map tunnels --players 4 --seconds 60 --seed 1`
import { formatHash } from '@caveflyer/sim';
import { parseArgs } from 'node:util';
import { loadConfig, loadMap } from './content.js';
import { randomInputs, runHeadless } from './match.js';

const { values } = parseArgs({
  options: {
    map: { type: 'string', default: 'tunnels' },
    players: { type: 'string', default: '2' },
    hull: { type: 'string', default: 'balanced' },
    seconds: { type: 'string', default: '60' },
    seed: { type: 'string', default: '1' },
  },
});

const config = loadConfig();
const map = loadMap(values.map, config.materials);
const players = Array.from({ length: Number(values.players) }, () => ({ hull: values.hull }));
const seed = Number(values.seed);
const ticks = Math.round(Number(values.seconds) * config.tuning.tickRate);

const t0 = performance.now();
const result = runHeadless(
  { seed, map: map.def, ...(map.cells ? { terrainCells: map.cells } : {}), config, players },
  ticks,
  { inputsAt: randomInputs(players.length, seed) },
);
const ms = performance.now() - t0;
const simSeconds = result.ticks / config.tuning.tickRate;
console.log(`map=${map.def.id} seed=${seed} players=${players.length} ticks=${result.ticks} hash=${formatHash(result.finalHash)}`);
for (const s of result.state.ships) {
  console.log(`  ship ${s.id} (${s.hull}) hp=${s.hp.toFixed(0)} deaths=${s.deaths} pos=(${s.x.toFixed(0)},${s.y.toFixed(0)})`);
}
console.log(`${ms.toFixed(1)} ms wall, ${(simSeconds / (ms / 1000)).toFixed(0)}x real time`);
