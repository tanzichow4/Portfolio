import { expect, test, type Page } from '@playwright/test';

const KEY = 'tanzi-os:theme';
const theme = (page: Page) => page.locator('html').getAttribute('data-theme');
const seed = (page: Page, value: string) =>
  page.addInitScript(
    ([k, v]) => {
      localStorage.setItem(k, v);
    },
    [KEY, value],
  );

test.describe('theme init (dev)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`AC10: with no stored theme, data-theme follows the OS scheme (${scheme})`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/');
      expect(await theme(page)).toBe(scheme);
    });
  }

  for (const [stored, os] of [
    ['dark', 'light'],
    ['light', 'dark'],
  ] as const) {
    test(`AC11: stored ${stored} wins over OS ${os}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: os });
      await seed(page, stored);
      await page.goto('/');
      expect(await theme(page)).toBe(stored);
    });
  }

  for (const bad of ['blue', '', '<img src=x onerror=alert(1)>']) {
    test(`AC12: invalid stored value ${JSON.stringify(bad)} is ignored and the OS scheme decides`, async ({
      page,
    }) => {
      await seed(page, bad);
      await page.emulateMedia({ colorScheme: 'light' });
      await page.goto('/');
      expect(await theme(page)).toBe('light');
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('/');
      expect(await theme(page)).toBe('dark');
    });
  }

  test('AC13: when reading storage throws, theme is dark with no errors', async ({ page }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
    await page.emulateMedia({ colorScheme: 'light' });
    await page.addInitScript(() => {
      Storage.prototype.getItem = () => {
        throw new Error('storage blocked');
      };
    });
    await page.goto('/');
    await expect(page.locator('#root')).toBeAttached();
    expect(await theme(page)).toBe('dark');
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('AC2/AC4: light mode exposes the fixed neutral-500 and accent-400 tokens', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    const tokens = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return {
        n500: s.getPropertyValue('--color-neutral-500').trim().toLowerCase(),
        a400: s.getPropertyValue('--color-accent-400').trim().toLowerCase(),
      };
    });
    expect(tokens.n500).toBe('#626679');
    expect(tokens.a400).toBe('#6558ad');
  });

  test('AC5: --wall-plain follows the active theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    const bgFor = (t: 'dark' | 'light') =>
      page.evaluate((th) => {
        document.documentElement.dataset.theme = th;
        const el = document.createElement('div');
        el.style.background = 'var(--wall-plain)';
        document.body.appendChild(el);
        const c = getComputedStyle(el).backgroundColor;
        el.remove();
        return c;
      }, t);
    const dark = await bgFor('dark');
    const light = await bgFor('light');
    expect(dark).toBe('rgb(22, 24, 38)');
    expect(light).toBe('rgb(228, 231, 245)');
    expect(dark).not.toBe(light);
  });
});
