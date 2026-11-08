import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { dragPosition, tiltFor } from '../logic/drag';
import { isDragButton } from '../logic/motion';
import { prefersReducedMotion } from './reducedMotion';

export interface DragOptions {
  x: number;
  y: number;
  width: number;
  vw: number;
  vh: number;
  wobble: boolean;
  onEnd: (x: number, y: number) => void;
}

export interface DragState {
  x: number;
  y: number;
  tilt: number;
}

type Handler = (e: ReactPointerEvent<HTMLElement>) => void;

export interface DragHandlers {
  onPointerDown: Handler;
  onPointerMove: Handler;
  onPointerUp: Handler;
  onPointerCancel: Handler;
  onLostPointerCapture: Handler;
}

interface Active {
  pointerId: number;
  originX: number;
  originY: number;
  startX: number;
  startY: number;
  lastClientX: number;
  lastX: number;
  lastY: number;
}

export function useDrag(opts: DragOptions): { drag: DragState | null; handlers: DragHandlers } {
  const { x, y, width, vw, vh, wobble, onEnd } = opts;
  const [drag, setDrag] = useState<DragState | null>(null);
  const active = useRef<Active | null>(null);

  useEffect(
    () => () => {
      active.current = null;
    },
    [],
  );

  const onPointerDown: Handler = (e) => {
    if (active.current || !isDragButton(e.button)) return;
    if ((e.target as Element).closest('button')) return;
    active.current = {
      pointerId: e.pointerId,
      originX: x,
      originY: y,
      startX: e.clientX,
      startY: e.clientY,
      lastClientX: e.clientX,
      lastX: x,
      lastY: y,
    };
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // synthetic or inactive pointer: continue without capture
    }
  };

  const onPointerMove: Handler = (e) => {
    const a = active.current;
    if (!a || a.pointerId !== e.pointerId) return;
    const pos = dragPosition(
      { x: a.originX, y: a.originY },
      { dx: e.clientX - a.startX, dy: e.clientY - a.startY },
      width,
      vw,
      vh,
    );
    const mx = Number.isFinite(e.movementX) ? e.movementX : e.clientX - a.lastClientX;
    a.lastClientX = e.clientX;
    a.lastX = pos.x;
    a.lastY = pos.y;
    setDrag({ x: pos.x, y: pos.y, tilt: tiltFor(mx, wobble && !prefersReducedMotion()) });
  };

  const end: Handler = (e) => {
    const a = active.current;
    if (!a || a.pointerId !== e.pointerId) return;
    active.current = null;
    setDrag(null);
    if (a.lastX !== a.originX || a.lastY !== a.originY) onEnd(a.lastX, a.lastY);
  };

  return {
    drag,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: end,
      onPointerCancel: end,
      onLostPointerCapture: end,
    },
  };
}
