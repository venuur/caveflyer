/** Per-player, per-tick input. Humans and bots both produce this. */
export interface InputFrame {
  /** -1 = rotate left (counter-clockwise), 1 = right, 0 = none. */
  rotate: -1 | 0 | 1;
  /** Assisted mode: target nose angle in radians, or null when unused. */
  targetAngle: number | null;
  thrust: boolean;
  firePrimary: boolean;
  fireSecondary: boolean;
  utility: boolean;
}

export function emptyInput(): InputFrame {
  return {
    rotate: 0,
    targetAngle: null,
    thrust: false,
    firePrimary: false,
    fireSecondary: false,
    utility: false,
  };
}
