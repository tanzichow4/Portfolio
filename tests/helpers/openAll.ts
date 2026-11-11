import { fireEvent } from '@testing-library/react';
import { WIN_TITLES } from '../../src/data';
import type { WinId } from '../../src/types';

/** Order that leaves every window open with the default stacking (matches the Tidy up state). */
const OPEN_SEQUENCE: readonly WinId[] = ['proj', 'exp', 'term', 'about', 'hello'];

/**
 * Opens every dock window by clicking its dock button. Synthetic clicks move no focus and no
 * sequential-navigation start point, so Tab-order tests are not disturbed.
 */
export function openAllFromDock(): void {
  const dock = document.querySelector('nav.dock');
  if (!dock) throw new Error('openAllFromDock: no dock in the document');
  for (const id of OPEN_SEQUENCE) {
    const btn = dock.querySelector<HTMLButtonElement>(
      `button.dock-win[aria-label="${WIN_TITLES[id]}"]`,
    );
    if (!btn) throw new Error(`openAllFromDock: no dock button for ${id}`);
    fireEvent.click(btn);
  }
}
