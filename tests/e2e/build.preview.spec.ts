import { expect, test } from '@playwright/test';

const BG = { dark: 'rgb(22, 24, 38)', light: 'rgb(228, 231, 245)' } as const;

test.describe('production build (preview)', () => {
  for (const scheme of ['dark', 'light'] as const) {
    test(`AC14: with the JS entry blocked, first paint is ${scheme} (data-theme and body background)`, async ({
      page,
    }) => {
      await page.route('**/assets/*.js', (r) => r.abort());
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(bg).toBe(BG[scheme]);
    });
  }

  test('AC6: build makes only same-origin requests', async ({ page, baseURL }) => {
    const origins = new Set<string>();
    page.on('request', (r) => {
      const u = new URL(r.url());
      if (u.protocol === 'http:' || u.protocol === 'https:') origins.add(u.origin);
    });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    expect([...origins]).toEqual([new URL(baseURL!).origin]);
  });

  test('AC8: built CSS ships Inter 400, 500 and 600 only, normal style, from /assets/', async ({
    page,
    request,
  }) => {
    await page.goto('/');
    const hrefs = await page.evaluate(() =>
      [...document.querySelectorAll('link[rel="stylesheet"]')].map(
        (l) => (l as HTMLLinkElement).href,
      ),
    );
    expect(hrefs.length).toBeGreaterThan(0);
    const blocks: string[] = [];
    for (const href of hrefs) {
      const res = await request.get(href);
      expect(res.ok()).toBe(true);
      blocks.push(...((await res.text()).match(/@font-face\s*\{[^}]*\}/g) ?? []));
    }
    expect(blocks.length).toBeGreaterThan(0);
    const weights = new Set<number>();
    for (const b of blocks) {
      expect(b).toMatch(/font-family:\s*["']?Inter["']?\s*[;}]/);
      expect(b).toMatch(/font-style:\s*normal/);
      const w = Number(/font-weight:\s*(\d+)/.exec(b)?.[1]);
      expect([400, 500, 600]).toContain(w);
      weights.add(w);
      const urls = [...b.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((m) => m[1]);
      expect(urls.length).toBeGreaterThan(0);
      for (const u of urls) expect(new URL(u, hrefs[0]).pathname).toMatch(/^\/assets\//);
    }
    expect([...weights].sort((a, b) => a - b)).toEqual([400, 500, 600]);
  });
});
