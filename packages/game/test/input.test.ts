import { emptyInput } from '@caveflyer/sim';
import { describe, expect, it } from 'vitest';
import { mergeInputs } from '../src/input/devices.js';

describe('mergeInputs', () => {
  it('ORs buttons and cancels opposite rotation', () => {
    const a = { ...emptyInput(), rotate: -1 as const, thrust: true };
    const b = { ...emptyInput(), rotate: 1 as const, firePrimary: true };
    const m = mergeInputs([a, b]);
    expect(m.rotate).toBe(0);
    expect(m.thrust).toBe(true);
    expect(m.firePrimary).toBe(true);
  });

  it('explicit rotation overrides an assisted target angle', () => {
    const aim = { ...emptyInput(), targetAngle: 1 };
    expect(mergeInputs([aim]).targetAngle).toBe(1);
    expect(mergeInputs([aim, { ...emptyInput(), rotate: 1 as const }]).targetAngle).toBeNull();
  });
});
