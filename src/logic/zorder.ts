import type { Win, WinId } from '../types';

export const SITE_Z = 800;

export function raise(order: readonly WinId[], id: WinId): readonly WinId[] {
  if (order[order.length - 1] === id) return order;
  return [...order.filter((o) => o !== id), id];
}

export function topMost(order: readonly WinId[], wins: Record<WinId, Win>): WinId | null {
  for (let i = order.length - 1; i >= 0; i--) {
    const w = wins[order[i]];
    if (w.open && !w.min) return order[i];
  }
  return null;
}

export function zIndexFor(id: WinId, order: readonly WinId[]): number {
  if (id === 'site') return SITE_Z;
  return Math.max(order.indexOf(id), 0) + 10;
}
