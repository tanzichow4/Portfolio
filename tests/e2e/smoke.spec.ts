import { expect, test } from '@playwright/test';

test('loads the desktop with no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/');
  await expect(page).toHaveTitle('tanzi.os');
  expect(['dark', 'light']).toContain(await page.locator('html').getAttribute('data-theme'));
  expect(errors).toEqual([]);
});
