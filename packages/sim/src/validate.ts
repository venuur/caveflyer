/**
 * Minimal schema checks for content JSON. Each spec maps a field to its type;
 * `validate` returns a list of problems (empty when valid).
 */
export type FieldType = 'number' | 'string' | 'boolean' | 'object' | 'array';
export interface Spec {
  [key: string]: FieldType | Spec;
}

export function validate(value: unknown, spec: Spec, path = ''): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return [`${path || 'value'}: expected object`];
  }
  const obj = value as Record<string, unknown>;
  const problems: string[] = [];
  for (const key of Object.keys(spec).sort()) {
    const want = spec[key]!;
    const got = obj[key];
    const p = path ? `${path}.${key}` : key;
    if (typeof want === 'object') {
      problems.push(...validate(got, want, p));
    } else if (want === 'array' ? !Array.isArray(got) : typeof got !== want || got === null) {
      problems.push(`${p}: expected ${want}, got ${got === null ? 'null' : typeof got}`);
    } else if (want === 'number' && !Number.isFinite(got)) {
      problems.push(`${p}: expected a finite number`);
    }
  }
  return problems;
}

export const HULL_SPEC: Spec = {
  id: 'string',
  name: 'string',
  mass: 'number',
  thrust: 'number',
  turnRate: 'number',
  armor: 'number',
  size: 'number',
  points: 'number',
  role: 'string',
};

export const MATERIAL_SPEC: Spec = { id: 'number', color: 'string', toughness: 'number', friction: 'number' };

export const MAP_SPEC: Spec = {
  id: 'string',
  name: 'string',
  width: 'number',
  height: 'number',
  gravity: 'number',
  drag: 'number',
  border: { material: 'string', thickness: 'number' },
  spawns: 'array',
  pads: 'array',
};

export const TUNING_SPEC: Spec = {
  tickRate: 'number',
  ship: {
    collisionSamples: 'number',
    maxSubstepPx: 'number',
    restitution: 'number',
    restSpeed: 'number',
    contactFriction: 'number',
    wallDamage: 'boolean',
    damageThreshold: 'number',
    damagePerSpeed: 'number',
    respawnSeconds: 'number',
    invulnSeconds: 'number',
  },
  pad: {
    maxLandingSpeed: 'number',
    maxLandingAngleDeg: 'number',
    safeImpactSpeed: 'number',
    repairPerSecond: 'number',
    snapDistance: 'number',
  },
};
