import { expect, type Page } from '@playwright/test';

/** Order that leaves every dock window open with the default stacking (the Tidy up state). */
const SEQUENCE = [
  ['proj', 'projects'],
  ['exp', 'experience.log'],
  ['term', 'terminal'],
  ['about', 'about.md'],
  ['hello', 'hello.txt'],
] as const;

/**
 * Opens every dock window with synthetic clicks on the dock buttons (no focus or Tab start point
 * moves), then waits until all five are mounted and their fly-in animations have finished.
 */
export async function openAllFromDock(page: Page): Promise<void> {
  const dock = page.getByRole('navigation', { name: 'Dock' });
  for (const [, title] of SEQUENCE) {
    await dock.locator(`button.dock-win[aria-label="${title}"]`).dispatchEvent('click');
  }
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const wins = Array.from(document.querySelectorAll('[data-win]'));
          return wins.length === 5 && wins.every((el) => el.getAnimations().length === 0);
        }),
      { timeout: 5000 },
    )
    .toBe(true);
}
