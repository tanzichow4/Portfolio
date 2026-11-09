import type { WinId } from '../types';

export const WIN_IDS: readonly WinId[] = ['hello', 'about', 'exp', 'proj', 'term', 'site'];

export interface WinMeta {
  width: number;
  /** Nominal height, used only by layout. */
  height: number;
  /** Whether the window has a dock button. */
  dock: boolean;
}

export const WIN_META: Readonly<Record<WinId, WinMeta>> = {
  hello: { width: 560, height: 420, dock: true },
  about: { width: 420, height: 331, dock: true },
  exp: { width: 520, height: 300, dock: true },
  proj: { width: 520, height: 330, dock: true },
  term: { width: 440, height: 310, dock: true },
  site: { width: 340, height: 340, dock: false },
};

export const DOCK_IDS: readonly WinId[] = WIN_IDS.filter((id) => WIN_META[id].dock);
