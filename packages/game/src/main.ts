import { getHull, respawn, step, createSimState, type InputFrame } from '@caveflyer/sim';
import { Application, Container, TextureSource } from 'pixi.js';
import { FollowCamera, zoomFor } from './camera';
import { client, loadConfig, loadMap, maps } from './content';
import { DebugOverlay } from './debugOverlay';
import { Keyboard, KEY_LAYOUTS, mergeInputs, readGamepad } from './input/devices';
import { FixedStepLoop, lerp } from './loop';
import { createBackground } from './render/background';
import { Hud } from './render/hud';
import { ShipRenderer } from './render/shipRenderer';
import { TerrainRenderer } from './render/terrainRenderer';
import { TuningPanel, type SandboxSettings } from './ui/tuningPanel';
import { viewportLayout } from './viewports';

TextureSource.defaultOptions.scaleMode = 'nearest';

/** Interpolation snaps instead of blending across jumps this large (respawns). */
const TELEPORT_PX = 48;
const PARALLAX = [0.3, 0.6];

async function start(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const seed = Number(params.get('seed') ?? 1) >>> 0;
  const config = loadConfig();
  const mapId = params.get('map') ?? 'tunnels';
  const map = await loadMap(maps[mapId] ? mapId : 'tunnels', config.materials);
  const hull = params.get('hull') ?? 'balanced';

  const app = new Application();
  await app.init({ resizeTo: window, background: '#05060b', antialias: false, roundPixels: true });
  document.body.appendChild(app.canvas);

  const state = createSimState({
    seed,
    map: map.def,
    ...(map.cells ? { terrainCells: map.cells } : {}),
    config,
    players: [{ hull: config.hulls[hull] ? hull : 'balanced' }],
  });

  // One shared world scene; each human gets a camera (M1: one, full screen).
  const world = new Container();
  const parallax = createBackground(map.def.width, map.def.height, seed);
  for (const layer of parallax) world.addChild(layer);
  const terrain = new TerrainRenderer(state.terrain, config.materials);
  const ships = new ShipRenderer();
  world.addChild(terrain.view, ships.view);
  const hud = new Hud();
  app.stage.addChild(world, hud.view);

  const settings: SandboxSettings = { assisted: params.get('assisted') === '1' };
  const panel = new TuningPanel(state, client, settings);
  const overlay = new DebugOverlay(document.getElementById('debug')!);
  const keyboard = new Keyboard();
  const camera = new FollowCamera();
  const loop = new FixedStepLoop(state.config.tuning.tickRate);
  let paused = false;
  let stepOnce = false;
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.code === 'KeyP') paused = !paused;
    if (e.code === 'BracketRight') stepOnce = true;
    if (e.code === 'KeyR') {
      respawn(state, state.ships[0]!);
      camera.snap();
    }
  });
  document.getElementById('tuning-button')?.addEventListener('click', () => panel.toggle());

  /** Pose of each ship before the latest tick, for render interpolation. */
  let prev = state.ships.map((s) => ({ x: s.x, y: s.y, angle: s.angle }));

  function readInputs(): InputFrame[] {
    // M1 sandbox: player 1 takes both keyboard halves and the first gamepad.
    const frames = [keyboard.read(KEY_LAYOUTS.left), keyboard.read(KEY_LAYOUTS.right)];
    const pad = navigator.getGamepads?.().find((g) => g && g.connected);
    if (pad) frames.push(readGamepad(pad, settings.assisted));
    return [mergeInputs(frames)];
  }

  app.ticker.add((ticker) => {
    let { steps, alpha } = loop.advance(ticker.deltaMS);
    if (paused) {
      steps = stepOnce ? 1 : 0;
      alpha = 1;
    }
    stepOnce = false;
    const inputs = readInputs();
    for (let i = 0; i < steps; i++) {
      prev = state.ships.map((s) => ({ x: s.x, y: s.y, angle: s.angle }));
      step(state, inputs);
    }

    const [vp] = viewportLayout(1, app.screen.width, app.screen.height);
    const zoom = zoomFor(vp!.height, client.camera.targetVisibleHeight);
    const viewW = vp!.width / zoom;
    const viewH = vp!.height / zoom;

    // Interpolated poses.
    const poses = state.ships.map((s, i) => {
      const p = prev[i] ?? s;
      if (Math.hypot(s.x - p.x, s.y - p.y) > TELEPORT_PX) return { x: s.x, y: s.y, angle: s.angle };
      const dA = Math.atan2(Math.sin(s.angle - p.angle), Math.cos(s.angle - p.angle));
      return { x: lerp(p.x, s.x, alpha), y: lerp(p.y, s.y, alpha), angle: p.angle + dA * alpha };
    });
    state.ships.forEach((s, i) => ships.draw(s, getHull(state, s.hull), poses[i]!));
    ships.tick(ticker.deltaMS / 1000);

    const me = state.ships[0]!;
    const myPose = poses[0]!;
    if (me.alive) {
      camera.update(
        { x: myPose.x, y: myPose.y, vx: me.vx, vy: me.vy },
        { width: viewW, height: viewH },
        map.def,
        client.camera,
        ticker.deltaMS / 1000,
      );
    }
    const left = camera.x - viewW / 2;
    const top = camera.y - viewH / 2;
    world.scale.set(zoom);
    world.position.set(Math.round(vp!.x - left * zoom), Math.round(vp!.y - top * zoom));
    parallax.forEach((layer, i) => layer.position.set(left * (1 - PARALLAX[i]!), top * (1 - PARALLAX[i]!)));

    hud.update(me, getHull(state, me.hull), vp!, state.config.tuning.tickRate);
    const chunksUploaded = terrain.update();
    overlay.update(state, { steps, chunksUploaded, seed, paused });
  });
}

void start();
