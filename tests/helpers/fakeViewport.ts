import { act } from '@testing-library/react';
import { vi } from 'vitest';

export const DESKTOP_Q = '(min-width: 760px)';

export function setWidth(w: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: w });
}

export interface FakeMatchMedia {
  adds: number;
  removes: number;
  listeners: Set<() => void>;
  setWidth: (w: number, fire?: boolean) => void;
}

/** Stub matchMedia: answers the desktop query from a test-controlled width, false otherwise. */
export function stubMatchMedia(initial: number, opts: { noAddEventListener?: boolean } = {}) {
  let width = initial;
  const fake: FakeMatchMedia = {
    adds: 0,
    removes: 0,
    listeners: new Set(),
    setWidth(w, fire = true) {
      width = w;
      if (fire) {
        act(() => {
          [...fake.listeners].forEach((l) => l());
        });
      }
    },
  };
  vi.stubGlobal('matchMedia', (q: string) => {
    const isDesktop = q.replace(/\s+/g, '') === DESKTOP_Q.replace(/\s+/g, '');
    const mql: Record<string, unknown> = {
      media: q,
      get matches() {
        return isDesktop ? width >= 760 : false;
      },
    };
    if (isDesktop && !opts.noAddEventListener) {
      mql.addEventListener = (_t: string, cb: () => void) => {
        fake.adds += 1;
        fake.listeners.add(cb);
      };
      mql.removeEventListener = (_t: string, cb: () => void) => {
        fake.removes += 1;
        fake.listeners.delete(cb);
      };
    }
    return mql;
  });
  return fake;
}
