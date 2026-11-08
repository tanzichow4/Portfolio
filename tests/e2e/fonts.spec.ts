import { expect, test } from '@playwright/test';

test.describe('fonts (dev)', () => {
  test('AC6: every request goes to the app origin', async ({ page, baseURL }) => {
    const origins = new Set<string>();
    page.on('request', (r) => {
      const u = new URL(r.url());
      if (u.protocol === 'http:' || u.protocol === 'https:') origins.add(u.origin);
    });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    expect([...origins]).toEqual([new URL(baseURL!).origin]);
  });

  for (const w of [400, 500, 600]) {
    test(`AC7: Inter ${w} loads and document.fonts.check is true`, async ({ page }) => {
      await page.goto('/');
      const res = await page.evaluate(async (weight) => {
        const faces = await document.fonts.load(`${weight} 15px Inter`, 'Tanzi');
        return { count: faces.length, ok: document.fonts.check(`${weight} 15px Inter`) };
      }, w);
      expect(res.count).toBeGreaterThan(0);
      expect(res.ok).toBe(true);
    });
  }

  test('AC7: body font-family begins with Inter', async ({ page }) => {
    await page.goto('/');
    const ff = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(ff).toMatch(/^["']?Inter["']?/);
  });

  test('AC9: no web font other than Inter is registered (mono uses system fonts)', async ({
    page,
  }) => {
    await page.goto('/');
    const families = await page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts].map((f) => f.family.replace(/["']/g, ''));
    });
    for (const f of families) expect(f).toBe('Inter');
  });

  test('AC9: --font-mono is the system monospace stack', async ({ page }) => {
    await page.goto('/');
    const v = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim(),
    );
    expect(v).toBe('ui-monospace, Menlo, monospace');
  });
});
