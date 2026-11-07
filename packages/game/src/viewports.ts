export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Split-screen layout: 1 full, 2 side by side, 3-4 in quadrants. */
export function viewportLayout(players: number, width: number, height: number): Rect[] {
  const n = Math.max(1, Math.min(4, players));
  if (n === 1) return [{ x: 0, y: 0, width, height }];
  const halfW = Math.floor(width / 2);
  if (n === 2) {
    return [
      { x: 0, y: 0, width: halfW, height },
      { x: halfW, y: 0, width: width - halfW, height },
    ];
  }
  const halfH = Math.floor(height / 2);
  const quads: Rect[] = [
    { x: 0, y: 0, width: halfW, height: halfH },
    { x: halfW, y: 0, width: width - halfW, height: halfH },
    { x: 0, y: halfH, width: halfW, height: height - halfH },
    { x: halfW, y: halfH, width: width - halfW, height: height - halfH },
  ];
  return quads.slice(0, n);
}

/** Largest integer scale (min 1) at which a w x h world fits in the rect. */
export function pixelScale(rect: Rect, w: number, h: number): number {
  return Math.max(1, Math.floor(Math.min(rect.width / w, rect.height / h)));
}
