export type Point = { x: number; y: number };

export function clampPosition(pos: Point, width: number, vw: number, vh: number): Point {
  return {
    x: Math.max(80 - width, Math.min(vw - 80, pos.x)),
    y: Math.max(36, Math.min(vh - 60, pos.y)),
  };
}

export function dragPosition(
  origin: Point,
  delta: { dx: number; dy: number },
  width: number,
  vw: number,
  vh: number,
): Point {
  return clampPosition({ x: origin.x + delta.dx, y: origin.y + delta.dy }, width, vw, vh);
}

export function tiltFor(movementX: number, enabled: boolean): number {
  if (!enabled || !Number.isFinite(movementX)) return 0;
  const t = Math.max(-7, Math.min(7, movementX * 0.7));
  return t === 0 ? 0 : t;
}
