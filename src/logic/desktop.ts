import type { State, Win, WinId } from '../types';
import { clampPosition } from './drag';
import { dockClickAction } from './dock';
import { initialWindows } from './layout';
import { raise } from './zorder';
import { WIN_IDS, WIN_META } from './windows';

export type DesktopAction =
  | { type: 'open' | 'close' | 'minimize' | 'restore' | 'focus' | 'dockClick'; id: WinId }
  | { type: 'move'; id: WinId; x: number; y: number }
  | { type: 'minimizeAll' | 'showAll' | 'tidy' | 'restart' }
  | { type: 'resize'; vw: number; vh: number };

export function initialDesktop(vw: number, vh: number): State {
  const { wins, order } = initialWindows(vw, vh);
  return { wins, order, vw, vh };
}

function withWin(state: State, id: WinId, win: Win, order: readonly WinId[]): State {
  return { ...state, wins: { ...state.wins, [id]: win }, order };
}

function setAllMin(state: State, min: boolean): State {
  let changed = false;
  const wins = { ...state.wins };
  for (const id of WIN_IDS) {
    const w = wins[id];
    if (w.open && w.min !== min) {
      wins[id] = { ...w, min };
      changed = true;
    }
  }
  return changed ? { ...state, wins } : state;
}

export function desktopReducer(state: State, action: DesktopAction): State {
  switch (action.type) {
    case 'open': {
      if (!WIN_IDS.includes(action.id)) return state;
      const w = state.wins[action.id];
      const order = raise(state.order, action.id);
      if (w.open && !w.min && order === state.order) return state;
      const next = w.open && !w.min ? w : { ...w, open: true, min: false };
      return withWin(state, action.id, next, order);
    }
    case 'close': {
      if (!WIN_IDS.includes(action.id)) return state;
      const w = state.wins[action.id];
      if (!w.open) return state;
      return withWin(state, action.id, { ...w, open: false, min: false }, state.order);
    }
    case 'minimize': {
      if (!WIN_IDS.includes(action.id)) return state;
      const w = state.wins[action.id];
      if (!w.open || w.min) return state;
      return withWin(state, action.id, { ...w, min: true }, state.order);
    }
    case 'restore': {
      if (!WIN_IDS.includes(action.id)) return state;
      const w = state.wins[action.id];
      if (!w.open || !w.min) return state;
      return withWin(state, action.id, { ...w, min: false }, raise(state.order, action.id));
    }
    case 'focus': {
      if (!WIN_IDS.includes(action.id)) return state;
      const w = state.wins[action.id];
      if (!w.open || w.min) return state;
      const order = raise(state.order, action.id);
      return order === state.order ? state : { ...state, order };
    }
    case 'dockClick': {
      if (!WIN_IDS.includes(action.id)) return state;
      const type = dockClickAction(action.id, state.wins, state.order);
      return desktopReducer(state, { type, id: action.id });
    }
    case 'move': {
      if (!WIN_IDS.includes(action.id)) return state;
      if (!Number.isFinite(action.x) || !Number.isFinite(action.y)) return state;
      const w = state.wins[action.id];
      const p = clampPosition(
        { x: action.x, y: action.y },
        WIN_META[action.id].width,
        state.vw,
        state.vh,
      );
      if (p.x === w.x && p.y === w.y) return state;
      return withWin(state, action.id, { ...w, x: p.x, y: p.y }, state.order);
    }
    case 'minimizeAll':
      return setAllMin(state, true);
    case 'showAll':
      return setAllMin(state, false);
    case 'tidy':
    case 'restart':
      return initialDesktop(state.vw, state.vh);
    case 'resize': {
      const { vw, vh } = action;
      if (!Number.isFinite(vw) || !Number.isFinite(vh) || vw < 0 || vh < 0) return state;
      if (vw === state.vw && vh === state.vh) return state;
      const wins = { ...state.wins };
      for (const id of WIN_IDS) {
        const w = wins[id];
        const p = clampPosition({ x: w.x, y: w.y }, WIN_META[id].width, vw, vh);
        if (p.x !== w.x || p.y !== w.y) wins[id] = { ...w, x: p.x, y: p.y };
      }
      return { ...state, wins, vw, vh };
    }
    default: {
      const unreachable: never = action;
      void unreachable;
      return state;
    }
  }
}
