import { useSyncExternalStore } from 'react';
import { DESKTOP_QUERY, resolveView, type View } from '../logic/layout';

function readDesktopQuery(): MediaQueryList | null {
  try {
    return typeof window.matchMedia === 'function' ? window.matchMedia(DESKTOP_QUERY) : null;
  } catch {
    return null;
  }
}

function getSnapshot(): View {
  return resolveView(readDesktopQuery()?.matches ?? null, window.innerWidth);
}

function subscribe(cb: () => void): () => void {
  const mql = readDesktopQuery();
  window.addEventListener('resize', cb);
  mql?.addEventListener?.('change', cb);
  return () => {
    window.removeEventListener('resize', cb);
    mql?.removeEventListener?.('change', cb);
  };
}

export function useView(): View {
  return useSyncExternalStore(subscribe, getSnapshot);
}
