import { expect, test } from '@playwright/test';
import { openAllFromDock } from './helpers/openAll';

test.describe('T07 projects window at rest', () => {
  test('T07 AC47: proj renders within 2px of 385 high, at y 259, with its bottom at the dock top', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): only hello is open on load, so open the other windows from the dock first.
    await openAllFromDock(page);
    await page.evaluate(() => document.fonts.ready);
    const win = page.locator('[data-win="proj"]');
    await expect(win).toBeVisible();
    const b = (await win.boundingBox())!;
    expect(Math.abs(b.height - 385)).toBeLessThanOrEqual(2);
    expect(Math.round(b.y)).toBe(259);
    const dock = (await page.locator('nav[aria-label="Dock"]').boundingBox())!;
    expect(b.y + b.height).toBeLessThanOrEqual(dock.y + 0.5);
    // No blank band: the grid's content reaches within 2px of the window bottom.
    const gap = await page.evaluate(() => {
      const w = document.querySelector('[data-win="proj"]')!.getBoundingClientRect();
      const g = document.querySelector('[data-win="proj"] .proj-grid')!.getBoundingClientRect();
      return w.bottom - g.bottom;
    });
    expect(gap).toBeLessThanOrEqual(2);
  });

  test('T07 AC34: the titlebar reads ~/projects and the region is named projects', async ({
    page,
  }) => {
    await page.goto('/');
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): open the other windows from the dock (only hello is open on load).
    await openAllFromDock(page);
    await expect(page.locator('[data-win="proj"] .win-title')).toHaveText('~/projects');
    await expect(page.getByRole('region', { name: 'projects' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Minimize projects' })).toBeVisible();
  });

  test('T07 AC31: four tiles in a two-column grid with a 10px gap', async ({ page }) => {
    await page.goto('/');
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): open the other windows from the dock (only hello is open on load).
    await openAllFromDock(page);
    const tiles = page.locator('[data-win="proj"] a.proj-tile');
    await expect(tiles).toHaveCount(4);
    const r = await tiles.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()));
    expect(Math.abs(r[0].y - r[1].y)).toBeLessThan(1);
    expect(Math.abs(r[2].y - r[3].y)).toBeLessThan(1);
    expect(r[1].x - (r[0].x + r[0].width)).toBeCloseTo(10, 0);
    expect(r[2].y - (r[0].y + r[0].height)).toBeCloseTo(10, 0);
  });
});
