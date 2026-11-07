import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE, createTerrain, MATERIAL, materialAt, setMaterial } from '../src/terrain.js';
import materials from '../../../content/materials.json' with { type: 'json' };
import { maps } from '../../tools/src/index.js';

describe('terrain', () => {
  it('builds the map border and air interior', () => {
    const map = maps.blank!;
    const t = createTerrain(map);
    expect(t.cells.length).toBe(map.width * map.height);
    expect(materialAt(t, 0, 0)).toBe(MATERIAL.metal);
    expect(materialAt(t, map.width - 1, map.height - 1)).toBe(MATERIAL.metal);
    expect(materialAt(t, map.width / 2, map.height / 2)).toBe(MATERIAL.air);
    expect(materialAt(t, -5, 10)).toBe(MATERIAL.metal);
    expect(t.chunksX).toBe(Math.ceil(map.width / 64));
  });

  it('marks only the touched chunk dirty', () => {
    const t = createTerrain(maps.blank!);
    setMaterial(t, CHUNK_SIZE + 3, 5, MATERIAL.dirt);
    expect(t.revision).toBe(1);
    expect(t.chunkRevision[1]).toBe(1);
    expect(t.chunkRevision.reduce((a, b) => a + b, 0)).toBe(1);
  });

  it('content/materials.json ids match MATERIAL', () => {
    for (const [name, def] of Object.entries(materials)) {
      expect(MATERIAL[name as keyof typeof MATERIAL]).toBe(def.id);
    }
  });
});
