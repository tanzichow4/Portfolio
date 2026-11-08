export type Pose = { transform: string; opacity: number; transition: string };

export type PoseInput = {
  min: boolean;
  dragging: boolean;
  tilt: number;
  wobble: boolean;
  reduced: boolean;
  x: number;
  y: number;
  width: number;
  vw: number;
  vh: number;
};

const SPRING = 'transform .45s var(--ease-spring), opacity .25s ease-out';
const GENIE = 'transform .45s var(--ease-minimize), opacity .4s ease-in';

export function genieOffset(
  x: number,
  y: number,
  width: number,
  vw: number,
  vh: number,
): { dx: number; dy: number } {
  return { dx: vw / 2 - (x + width / 2), dy: vh - 40 - y };
}

export function chromePose(input: PoseInput): Pose {
  const { min, dragging, tilt, wobble, reduced, x, y, width, vw, vh } = input;
  if (min) {
    if (reduced) return { transform: 'none', opacity: 0, transition: 'opacity .4s ease-in' };
    const { dx, dy } = genieOffset(x, y, width, vw, vh);
    return { transform: `translate(${dx}px, ${dy}px) scale(0.06)`, opacity: 0, transition: GENIE };
  }
  if (dragging) {
    if (reduced) return { transform: 'none', opacity: 1, transition: 'none' };
    // tilt is already in degrees (from tiltFor); clamp again, non-finite and -0 become 0.
    const clamped = Number.isFinite(tilt) ? Math.max(-7, Math.min(7, tilt)) : 0;
    const deg = wobble && clamped !== 0 ? clamped : 0;
    return { transform: `rotate(${deg}deg) scale(1.015)`, opacity: 1, transition: 'none' };
  }
  if (reduced) return { transform: 'none', opacity: 1, transition: 'opacity .25s ease-out' };
  return { transform: 'none', opacity: 1, transition: SPRING };
}

export function isDragButton(button: number): boolean {
  return button === 0;
}
