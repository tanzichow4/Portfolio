import type { Win, WinId } from '../types';
import { topMost } from './zorder';

export type DockAction = 'open' | 'restore' | 'focus' | 'minimize';

export function dockClickAction(
  id: WinId,
  wins: Record<WinId, Win>,
  order: readonly WinId[],
): DockAction {
  const w = wins[id];
  if (!w.open) return 'open';
  if (w.min) return 'restore';
  return topMost(order, wins) === id ? 'minimize' : 'focus';
}
