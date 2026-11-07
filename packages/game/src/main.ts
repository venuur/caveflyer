import { createSimState, step, type InputFrame } from '@caveflyer/sim';
import { Application, Container, TextureSource } from 'pixi.js';
import { maps, materials, tuning } from './content';
import { DebugOverlay } from './debugOverlay';
import { FixedStepLoop } from './loop';
import { createBackground } from './render/background';
import { TerrainRenderer } from './render/terrainRenderer';
import { pixelScale, viewportLayout } from './viewports';

TextureSource.defaultOptions.scaleMode = 'nearest';

async function start(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const seed = Number(params.get('seed') ?? 1) >>> 0;
  const map = maps[params.get('map') ?? 'blank'] ?? maps.blank!;

  const app = new Application();
  await app.init({ resizeTo: window, background: '#05060b', antialias: false, roundPixels: true });
  document.body.appendChild(app.canvas);

  const state = createSimState({ seed, map, tuning });

  // One shared world scene; each human gets a camera (M0: one, full screen).
  const world = new Container();
  const parallax = createBackground(map.width, map.height, seed);
  for (const layer of parallax) world.addChild(layer);
  const terrain = new TerrainRenderer(state.terrain, materials);
  world.addChild(terrain.view);
  app.stage.addChild(world);

  const overlay = new DebugOverlay(document.getElementById('debug')!);
  const loop = new FixedStepLoop(tuning.tickRate);
  const inputs: InputFrame[] = [];
  let paused = false;
  let stepOnce = false;
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyP') paused = !paused;
    if (e.code === 'Period') stepOnce = true;
  });

  app.ticker.add((ticker) => {
    let { steps } = loop.advance(ticker.deltaMS);
    if (paused) steps = stepOnce ? 1 : 0;
    stepOnce = false;
    for (let i = 0; i < steps; i++) step(state, inputs);

    // Camera: centre the map in the viewport at the largest integer scale.
    const [vp] = viewportLayout(1, app.screen.width, app.screen.height);
    const scale = pixelScale(vp!, map.width, map.height);
    world.scale.set(scale);
    world.position.set(
      Math.round(vp!.x + (vp!.width - map.width * scale) / 2),
      Math.round(vp!.y + (vp!.height - map.height * scale) / 2),
    );
    // Parallax offsets come with the follow camera in M1; the M0 camera is static.

    const chunksUploaded = terrain.update();
    overlay.update(state, { steps, chunksUploaded, seed, paused });
  });
}

void start();
