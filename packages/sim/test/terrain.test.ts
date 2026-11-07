import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE, createTerrain, MATERIAL, materialAt, setMaterial, terrainFromRGBA } from '../src/terrain.js';
import { loadConfig, loadMap, mapIds } from '../../tools/src/index.js';

const config = loadConfig();
const blank = loadMap('blank').def;

describe('terrain', () => {
  it('builds the map border and air interior', () => {
    const t = createTerrain(blank);
    expect(t.cells.length).toBe(blank.width * blank.height);
    expect(materialAt(t, 0, 0)).toBe(MATERIAL.metal);
    expect(materialAt(t, blank.width - 1, blank.height - 1)).toBe(MATERIAL.metal);
    expect(materialAt(t, blank.width / 2, blank.height / 2)).toBe(MATERIAL.air);
    expect(materialAt(t, -5, 10)).toBe(MATERIAL.metal);
    expect(t.chunksX).toBe(Math.ceil(blank.width / 64));
  });

  it('stamps pads as indestructible pad material', () => {
    const t = createTerrain({ ...blank, pads: [{ x: 100, y: 200, width: 30 }] });
    expect(materialAt(t, 100, 200)).toBe(MATERIAL.pad);
    expect(materialAt(t, 129, 203)).toBe(MATERIAL.pad);
    expect(materialAt(t, 130, 200)).toBe(MATERIAL.air);
  });

  it('marks only the touched chunk dirty', () => {
    const t = createTerrain(blank);
    setMaterial(t, CHUNK_SIZE + 3, 5, MATERIAL.dirt);
    expect(t.revision).toBe(1);
    expect(t.chunkRevision[1]).toBe(1);
    expect(t.chunkRevision.reduce((a, b) => a + b, 0)).toBe(1);
  });

  it('maps colors to materials, nearest colour for off-palette pixels', () => {
    const rgba = new Uint8Array([
      0x8a, 0x5a, 0x32, 255, // dirt exactly
      0x6a, 0x70, 0x79, 255, // almost rock
      0x9f, 0xb4, 0xc7, 0, // transparent -> air
      0x0b, 0x0d, 0x17, 255, // air
    ]);
    expect([...terrainFromRGBA(rgba, config.materials)]).toEqual([MATERIAL.dirt, MATERIAL.rock, MATERIAL.air, MATERIAL.air]);
  });
});

describe('content', () => {
  it('every map loads and validates; spawns are in open air', () => {
    for (const id of mapIds()) {
      const m = loadMap(id, config.materials);
      const t = createTerrain(m.def, m.cells);
      for (const sp of m.def.spawns) expect(materialAt(t, sp.x, sp.y), `${id} spawn`).toBe(MATERIAL.air);
      for (const pad of m.def.pads) {
        expect(materialAt(t, pad.x + pad.width / 2, pad.y - 8), `${id} pad headroom`).toBe(MATERIAL.air);
      }
    }
  });

  it('hulls, materials and tuning validate; material ids match MATERIAL', () => {
    expect(Object.keys(config.hulls).sort()).toEqual(['balanced', 'brick', 'dart']);
    for (const [name, def] of Object.entries(config.materials)) {
      expect(MATERIAL[name as keyof typeof MATERIAL]).toBe(def.id);
    }
  });
});
