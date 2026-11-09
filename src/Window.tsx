import { useEffect, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { Minus, X } from '@phosphor-icons/react';
import { CHROME_LABELS, WIN_BAR_TITLES, WIN_ICONS, WIN_TITLES } from './data';
import { prefersReducedMotion } from './hooks/reducedMotion';
import { useDrag } from './hooks/useDrag';
import { chromePose } from './logic/motion';
import { WIN_META } from './logic/windows';
import type { Win, WinId } from './types';
import './Window.css';

export interface WindowProps {
  id: WinId;
  win: Win;
  z: number;
  top: boolean;
  vw: number;
  vh: number;
  wobble: boolean;
  flyIn: boolean;
  onFocus(): void;
  onMinimize(): void;
  onClose(): void;
  onMove(x: number, y: number): void;
  children?: ReactNode;
}

export default function Window({
  id,
  win,
  z,
  top,
  vw,
  vh,
  wobble,
  flyIn,
  onFocus,
  onMinimize,
  onClose,
  onMove,
  children,
}: WindowProps) {
  const meta = WIN_META[id];
  const title = WIN_TITLES[id];
  const Icon = WIN_ICONS[id];
  const [entering, setEntering] = useState(() => flyIn && !prefersReducedMotion());

  useEffect(() => {
    if (!entering) return;
    let id2 = 0;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => setEntering(false));
    });
    return () => {
      cancelAnimationFrame(id1);
      cancelAnimationFrame(id2);
    };
  }, [entering]);

  const { drag, handlers } = useDrag({
    x: win.x,
    y: win.y,
    width: meta.width,
    vw,
    vh,
    wobble,
    onEnd: onMove,
  });

  const left = drag ? drag.x : win.x;
  const topPx = drag ? drag.y : win.y;
  const pose = chromePose({
    min: win.min || entering,
    dragging: drag !== null,
    tilt: drag ? drag.tilt : 0,
    wobble,
    reduced: prefersReducedMotion(),
    x: left,
    y: topPx,
    width: meta.width,
    vw,
    vh,
  });

  const onTitleDouble = (e: MouseEvent<HTMLElement>) => {
    if (!meta.dock || (e.target as Element).closest('button')) return;
    onMinimize();
  };

  return (
    <section
      aria-label={title}
      aria-hidden={win.min || undefined}
      data-win={id}
      data-min={String(win.min)}
      inert={win.min}
      onPointerDownCapture={onFocus}
      onFocus={onFocus}
      style={{
        position: 'absolute',
        left,
        top: topPx,
        width: meta.width,
        minHeight: meta.height,
        zIndex: z,
        background: 'var(--color-surface)',
        color: 'var(--color-text)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        transformOrigin: 'top center',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        boxShadow: top ? 'var(--shadow-lg)' : 'var(--shadow-md)',
        transform: pose.transform,
        opacity: pose.opacity,
        transition: pose.transition,
        pointerEvents: win.min ? 'none' : undefined,
      }}
    >
      <div className="win-titlebar" {...handlers} onDoubleClick={onTitleDouble}>
        <Icon className="win-icon" size={14} aria-hidden />
        <span className="win-title">{WIN_BAR_TITLES[id] ?? title}</span>
        <div className="win-btns">
          {meta.dock && (
            <button
              type="button"
              className="btn btn-icon win-btn"
              aria-label={`${CHROME_LABELS.minimize} ${title}`}
              onClick={onMinimize}
            >
              <Minus size={12} aria-hidden />
            </button>
          )}
          <button
            type="button"
            className="btn btn-icon win-btn"
            aria-label={`${CHROME_LABELS.close} ${title}`}
            onClick={onClose}
          >
            <X size={12} aria-hidden />
          </button>
        </div>
      </div>
      <div className="win-body">{children}</div>
    </section>
  );
}
