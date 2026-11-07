import { describe, expect, it } from 'vitest';
import { decodePng, encodePng } from '../src/png.js';

describe('png', () => {
  it('round-trips RGBA pixels', () => {
    const data = new Uint8Array(7 * 5 * 4).map((_, i) => (i * 37) & 0xff);
    const back = decodePng(encodePng({ width: 7, height: 5, data }));
    expect(back.width).toBe(7);
    expect(back.height).toBe(5);
    expect([...back.data]).toEqual([...data]);
  });
});
