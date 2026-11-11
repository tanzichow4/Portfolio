import type { Win, WinId } from '../types';
import { WIN_IDS, WIN_META } from './windows';

export const MENUBAR_H = 36;
export const DOCK_CLEARANCE = 76;

export const PHONE_BREAKPOINT = 760;
export const DESKTOP_QUERY = `(min-width: ${PHONE_BREAKPOINT}px)`;

export type View = 'phone' | 'desktop';

export function viewForWidth(width: number): View {
  return width < PHONE_BREAKPOINT ? 'phone' : 'desktop';
}

/** `null` means no media query is available, so fall back to the measured width. */
export function resolveView(desktopMatches: boolean | null, width: number): View {
  if (desktopMatches === null) return viewForWidth(width);
  return desktopMatches ? 'desktop' : 'phone';
}

export const INITIAL_ORDER: readonly WinId[] = ['proj', 'exp', 'term', 'about', 'hello'];

export function layout(vw: number, vh: number): Record<WinId, { x: number; y: number }> {
  const xClamp = (x: number, w: number) =>
    Math.max(16, Math.min(Math.round(x), Math.floor(vw - w - 16))) + 0;
  const yFit = (y: number, h: number) =>
    Math.max(MENUBAR_H, Math.min(Math.round(y), Math.floor(vh - DOCK_CLEARANCE - h))) + 0;
  const w = (id: WinId) => WIN_META[id].width;
  const h = (id: WinId) => WIN_META[id].height;

  return {
    hello: { x: xClamp(vw * 0.06, w('hello')), y: yFit(72, h('hello')) },
    about: { x: xClamp(vw * 0.5, w('about')), y: yFit(64, h('about')) },
    exp: { x: xClamp(vw * 0.05, w('exp')), y: yFit(Math.max(380, vh * 0.52), h('exp')) },
    proj: { x: xClamp(vw * 0.42, w('proj')), y: yFit(Math.max(300, vh * 0.38), h('proj')) },
    term: { x: xClamp(vw - 470, w('term')), y: yFit(Math.max(330, vh - 380), h('term')) },
    site: {
      x: Math.round(vw / 2 - 170) + 0,
      y: Math.max(MENUBAR_H, Math.round(vh / 2 - 180)) + 0,
    },
  };
}

export const START_OPEN: readonly WinId[] = ['hello'];

type Built = { wins: Record<WinId, Win>; order: WinId[] };

function buildWindows(vw: number, vh: number, isOpen: (id: WinId) => boolean): Built {
  const pos = layout(vw, vh);
  const wins = {} as Record<WinId, Win>;
  for (const id of WIN_IDS) {
    wins[id] = { x: pos[id].x, y: pos[id].y, open: isOpen(id), min: false };
  }
  return { wins, order: [...INITIAL_ORDER] };
}

export function initialWindows(vw: number, vh: number): Built {
  return buildWindows(vw, vh, (id) => START_OPEN.includes(id));
}

export function tidyWindows(vw: number, vh: number): Built {
  return buildWindows(vw, vh, (id) => WIN_META[id].dock);
}
