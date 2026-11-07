import { CHUNK_SIZE, type MaterialTable, type Terrain } from '@caveflyer/sim';
import { Container, Sprite, Texture } from 'pixi.js';

/** Material id -> packed RGBA (little-endian ABGR for a Uint32 view). */
function buildPalette(materials: MaterialTable): Uint32Array {
  const pal = new Uint32Array(256);
  for (const def of Object.values(materials)) {
    const c = parseInt(def.color.slice(1), 16);
    const r = (c >> 16) & 0xff;
    const g = (c >> 8) & 0xff;
    const b = c & 0xff;
    // Air is transparent so the background layers show through.
    const a = def.id === 0 ? 0 : 0xff;
    pal[def.id] = ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
  }
  return pal;
}

interface Chunk {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  image: ImageData;
  texture: Texture;
  seenRevision: number;
}

/**
 * Draws terrain as 64x64 chunk sprites and re-uploads only the chunks whose
 * revision changed since the last frame.
 */
export class TerrainRenderer {
  readonly view = new Container();
  private readonly chunks: Chunk[] = [];
  private readonly palette: Uint32Array;

  constructor(private readonly terrain: Terrain, materials: MaterialTable) {
    this.palette = buildPalette(materials);
    for (let cy = 0; cy < terrain.chunksY; cy++) {
      for (let cx = 0; cx < terrain.chunksX; cx++) {
        const canvas = document.createElement('canvas');
        canvas.width = CHUNK_SIZE;
        canvas.height = CHUNK_SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('2D canvas unavailable');
        const image = ctx.createImageData(CHUNK_SIZE, CHUNK_SIZE);
        const texture = Texture.from(canvas);
        texture.source.scaleMode = 'nearest';
        const sprite = new Sprite(texture);
        sprite.position.set(cx * CHUNK_SIZE, cy * CHUNK_SIZE);
        this.view.addChild(sprite);
        const chunk: Chunk = { canvas, ctx, image, texture, seenRevision: -1 };
        this.chunks.push(chunk);
        this.redraw(cx, cy, chunk);
      }
    }
  }

  /** Call once per frame. Returns the number of chunks re-uploaded. */
  update(): number {
    let uploaded = 0;
    const t = this.terrain;
    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i]!;
      if (chunk.seenRevision !== t.chunkRevision[i]) {
        this.redraw(i % t.chunksX, Math.floor(i / t.chunksX), chunk);
        uploaded++;
      }
    }
    return uploaded;
  }

  private redraw(cx: number, cy: number, chunk: Chunk): void {
    const t = this.terrain;
    const px = new Uint32Array(chunk.image.data.buffer);
    const x0 = cx * CHUNK_SIZE;
    const y0 = cy * CHUNK_SIZE;
    for (let y = 0; y < CHUNK_SIZE; y++) {
      const wy = y0 + y;
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const wx = x0 + x;
        const inside = wx < t.width && wy < t.height;
        px[y * CHUNK_SIZE + x] = inside ? (this.palette[t.cells[wy * t.width + wx] ?? 0] ?? 0) : 0;
      }
    }
    chunk.ctx.putImageData(chunk.image, 0, 0);
    chunk.texture.source.update();
    chunk.seenRevision = t.chunkRevision[cy * t.chunksX + cx] ?? 0;
  }
}
