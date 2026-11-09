import { expect, test, type Page } from '@playwright/test';

const watchErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

const pos = async (page: Page, id: string) => {
  const b = await page.locator(`[data-win="${id}"]`).boundingBox();
  return b && { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width) };
};

test('AC24: at 1280x720 the five windows sit at the reference positions and site is absent', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto('/');
  const want = {
    hello: { x: 77, y: 72 },
    about: { x: 640, y: 64 },
    // DELIBERATE REQUIREMENT CHANGE (T07 AC52): exp height 300 -> 290, so y 344 -> 354.
    exp: { x: 64, y: 354 },
    proj: { x: 538, y: 300 },
    term: { x: 810, y: 334 },
  };
  for (const [id, p] of Object.entries(want)) {
    await expect(page.locator(`[data-win="${id}"]`)).toBeVisible();
    expect(await pos(page, id), id).toMatchObject(p);
  }
  await expect(page.locator('[data-win="site"]')).toHaveCount(0);
  await expect(page.locator('[data-win]')).toHaveCount(5);
  expect(errors).toEqual([]);
});

test('AC24: windows are labelled regions with their titles', async ({ page }) => {
  await page.goto('/');
  for (const name of ['hello.txt', 'about.md', 'experience.log', 'projects', 'terminal']) {
    await expect(page.getByRole('region', { name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('region', { name: 'About this site' })).toHaveCount(0);
});

test('AC24: 1920x1080 then resize to 1280x720 moves term to 1200,660 and keeps all in bounds', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  expect(await pos(page, 'term')).toMatchObject({ x: 1450, y: 694 });

  await page.setViewportSize({ width: 1280, height: 720 });
  await expect.poll(() => pos(page, 'term')).toMatchObject({ x: 1200, y: 660 });

  for (const id of ['hello', 'about', 'exp', 'proj', 'term']) {
    const p = (await pos(page, id))!;
    expect(p.x, `${id} x min`).toBeGreaterThanOrEqual(80 - p.width);
    expect(p.x, `${id} x max`).toBeLessThanOrEqual(1200);
    expect(p.y, `${id} y min`).toBeGreaterThanOrEqual(36);
    expect(p.y, `${id} y max`).toBeLessThanOrEqual(660);
  }
  expect(await pos(page, 'hello')).toMatchObject({ x: 115, y: 72 });

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(100);
  expect(await pos(page, 'term')).toMatchObject({ x: 1200, y: 660 });
  expect(errors).toEqual([]);
});

test('T07 AC47: the About this site window renders within 2px of its 340x282 height and shows its body', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.getByRole('menuitem', { name: 'tanzi.os', exact: true }).click();
  await page.getByRole('menu').locator('[role^="menuitem"]').first().click();
  const w = page.locator('[data-win="site"]');
  await expect(w).toHaveCount(1);
  await expect(w.getByRole('heading', { name: 'tanzi.os' })).toBeVisible();
  await page.waitForTimeout(700);
  const b = (await w.boundingBox())!;
  expect(Math.abs(b.height - 282)).toBeLessThanOrEqual(2);
  expect(Math.abs(b.x - 470)).toBeLessThanOrEqual(1);
  expect(Math.abs(b.y - 180)).toBeLessThanOrEqual(1);
  const dock = (await page.getByRole('navigation', { name: 'Dock' }).boundingBox())!;
  expect(b.y + b.height).toBeLessThanOrEqual(dock.y);
});
