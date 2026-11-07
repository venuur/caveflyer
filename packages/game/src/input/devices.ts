import { emptyInput, type InputFrame } from '@caveflyer/sim';

/** One half of a shared keyboard. */
export interface KeyLayout {
  left: string;
  right: string;
  thrust: string;
  firePrimary: string;
  fireSecondary: string;
  utility: string;
}

export const KEY_LAYOUTS: Record<'left' | 'right', KeyLayout> = {
  left: { left: 'KeyA', right: 'KeyD', thrust: 'KeyW', utility: 'KeyS', firePrimary: 'KeyF', fireSecondary: 'KeyG' },
  right: {
    left: 'ArrowLeft',
    right: 'ArrowRight',
    thrust: 'ArrowUp',
    utility: 'ArrowDown',
    firePrimary: 'ControlRight',
    fireSecondary: 'ShiftRight',
  },
};

const GAME_KEYS = new Set(Object.values(KEY_LAYOUTS).flatMap((l) => Object.values(l)));

/** Tracks held keys, ignoring keystrokes aimed at form controls (tuning panel). */
export class Keyboard {
  private readonly down = new Set<string>();

  constructor(target: Window = window) {
    target.addEventListener('keydown', (e) => {
      if (isFormControl(e.target)) return;
      this.down.add(e.code);
      if (GAME_KEYS.has(e.code)) e.preventDefault();
    });
    target.addEventListener('keyup', (e) => this.down.delete(e.code));
    target.addEventListener('blur', () => this.down.clear());
  }

  held(code: string): boolean {
    return this.down.has(code);
  }

  read(layout: KeyLayout): InputFrame {
    const f = emptyInput();
    const l = this.held(layout.left);
    const r = this.held(layout.right);
    f.rotate = l === r ? 0 : l ? -1 : 1;
    f.thrust = this.held(layout.thrust);
    f.firePrimary = this.held(layout.firePrimary);
    f.fireSecondary = this.held(layout.fireSecondary);
    f.utility = this.held(layout.utility);
    return f;
  }
}

function isFormControl(t: EventTarget | null): boolean {
  return t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement;
}

const STICK_DEADZONE = 0.35;
const AIM_DEADZONE = 0.5;

/**
 * Read a standard-mapping gamepad. Classic: stick X / d-pad rotate. Assisted:
 * stick direction is the target nose angle (0 = up, clockwise positive).
 */
export function readGamepad(pad: Gamepad, assisted: boolean): InputFrame {
  const f = emptyInput();
  const ax = pad.axes[0] ?? 0;
  const ay = pad.axes[1] ?? 0;
  const btn = (i: number) => (pad.buttons[i]?.value ?? 0) > 0.3;
  if (assisted && Math.hypot(ax, ay) > AIM_DEADZONE) {
    f.targetAngle = Math.atan2(ax, -ay);
  } else {
    const left = btn(14) || (!assisted && ax < -STICK_DEADZONE);
    const right = btn(15) || (!assisted && ax > STICK_DEADZONE);
    f.rotate = left === right ? 0 : left ? -1 : 1;
  }
  f.thrust = btn(0) || btn(7) || btn(12);
  f.firePrimary = btn(2) || btn(5);
  f.fireSecondary = btn(1) || btn(4);
  f.utility = btn(3) || btn(6);
  return f;
}

/** Merge several devices driving the same player: any press wins. */
export function mergeInputs(frames: InputFrame[]): InputFrame {
  const out = emptyInput();
  let rotate = 0;
  for (const f of frames) {
    rotate += f.rotate;
    if (f.targetAngle !== null) out.targetAngle = f.targetAngle;
    out.thrust ||= f.thrust;
    out.firePrimary ||= f.firePrimary;
    out.fireSecondary ||= f.fireSecondary;
    out.utility ||= f.utility;
  }
  out.rotate = rotate < 0 ? -1 : rotate > 0 ? 1 : 0;
  if (out.rotate !== 0) out.targetAngle = null; // explicit rotation overrides assisted aim
  return out;
}
