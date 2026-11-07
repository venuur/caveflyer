/** Deep copy of plain sim data (objects, arrays, primitives, Uint8Array). */
export function clonePlain<T>(v: T): T {
  if (v === null || typeof v !== 'object') return v;
  if (v instanceof Uint8Array) return v.slice() as T;
  if (Array.isArray(v)) return v.map((x: unknown) => clonePlain(x)) as T;
  const out: Record<string, unknown> = {};
  const obj = v as Record<string, unknown>;
  for (const k of Object.keys(obj)) out[k] = clonePlain(obj[k]);
  return out as T;
}
