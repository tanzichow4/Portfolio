import { expect, test, type Locator, type Page } from '@playwright/test';

const watchErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on(
    'console',
    (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text()),
  );
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

const win = (page: Page) => page.locator('[data-win="proj"]');
const dockBtn = (page: Page) =>
  page.getByRole('navigation', { name: 'Dock' }).locator('button.dock-win[aria-label="projects"]');
const tiles = (page: Page) => win(page).locator('.proj-open');
const back = (page: Page) => win(page).getByRole('button', { name: 'Back to projects' });

const settled = async (page: Page) => {
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.querySelectorAll('[data-win]')].every((e) => e.getAnimations().length === 0),
      ),
    )
    .toBe(true);
};
const openProjects = async (page: Page) => {
  await dockBtn(page).click();
  await expect(win(page)).toBeVisible();
  await settled(page);
  // The fly-in scales the window; wait until it has reached its full, final width.
  await expect
    .poll(() =>
      page.evaluate(
        () => document.querySelector('[data-win="proj"]')!.getBoundingClientRect().width,
      ),
    )
    .toBeGreaterThan(519);
};
/** One synchronous read of the window box so layout cannot change between measurements. */
const rect = (page: Page) =>
  page.evaluate(() => {
    const r = document.querySelector('[data-win="proj"]')!.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
const focusedInProj = (page: Page) =>
  page.evaluate(() => !!document.activeElement?.closest('[data-win="proj"]'));
const activeText = (page: Page) =>
  page.evaluate(() => document.activeElement?.textContent?.trim() ?? '');

for (const scheme of ['dark', 'light'] as const) {
  test.describe(`T18 projects detail (${scheme})`, () => {
    test.use({ colorScheme: scheme, viewport: { width: 1280, height: 720 } });

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await openProjects(page);
    });

    test('T18 AC6, AC11, AC14: clicking a tile opens the detail view with the back button focused', async ({
      page,
    }) => {
      const errors = watchErrors(page);
      await tiles(page).nth(1).click();
      await expect(back(page)).toBeVisible();
      await expect(back(page)).toBeFocused();
      await expect(
        win(page).getByRole('heading', { level: 2, name: 'Indoor Garden' }),
      ).toBeVisible();
      await expect(tiles(page)).toHaveCount(0);
      await expect(win(page).locator('.win-title')).toHaveText('~/projects');
      await expect(page.getByRole('region', { name: 'projects' })).toBeVisible();
      await expect(win(page).getByText('Capstone', { exact: false })).toBeVisible();
      expect(errors).toEqual([]);
    });

    for (const key of ['Enter', ' ']) {
      test(`T18 AC6, AC14: pressing ${key === ' ' ? 'Space' : key} on a focused tile opens the detail view`, async ({
        page,
      }) => {
        const errors = watchErrors(page);
        await tiles(page).nth(2).focus();
        await page.keyboard.press(key);
        await expect(back(page)).toBeFocused();
        await expect(
          win(page).getByRole('heading', { level: 2, name: 'Grocery Prices' }),
        ).toBeVisible();
        expect(errors).toEqual([]);
      });
    }

    test('T18 AC13, AC14: the back button returns to the list with focus on the same tile', async ({
      page,
    }) => {
      const errors = watchErrors(page);
      await tiles(page).nth(3).click();
      await back(page).click();
      await expect(tiles(page)).toHaveCount(4);
      await expect(tiles(page).nth(3)).toBeFocused();
      expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(0);
      expect(errors).toEqual([]);
    });

    test('T18 AC15, AC14: Escape returns to the list with focus on the same tile, and Escape in the list keeps the window', async ({
      page,
    }) => {
      const errors = watchErrors(page);
      await tiles(page).nth(0).click();
      await page.keyboard.press('Escape');
      await expect(tiles(page)).toHaveCount(4);
      await expect(tiles(page).nth(0)).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(win(page)).toBeVisible();
      await expect(tiles(page)).toHaveCount(4);
      await expect(tiles(page).nth(0)).toBeFocused();
      expect(errors).toEqual([]);
    });

    test('T18 AC15: Escape with focus on the Close button in detail view goes back and keeps the window open', async ({
      page,
    }) => {
      const errors = watchErrors(page);
      await tiles(page).nth(1).click();
      await win(page).getByRole('button', { name: 'Close projects' }).focus();
      await page.keyboard.press('Escape');
      await expect(tiles(page)).toHaveCount(4);
      await expect(win(page)).toBeVisible();
      expect(errors).toEqual([]);
    });

    test('T18 AC16: the detail tab order is Minimize, Close, Back, then focus leaves the window', async ({
      page,
    }) => {
      const errors = watchErrors(page);
      await tiles(page).nth(1).click();
      const stops = await win(page).evaluate((el) =>
        Array.from(
          el.querySelectorAll<HTMLElement>('a[href],button,input,textarea,select,[tabindex]'),
        )
          .filter((e) => e.tabIndex >= 0)
          .map((e) => e.getAttribute('aria-label') ?? e.textContent?.trim()),
      );
      expect(stops).toEqual(['Minimize projects', 'Close projects', 'Back to projects']);
      await win(page).getByRole('button', { name: 'Minimize projects' }).focus();
      await page.keyboard.press('Tab');
      await expect(win(page).getByRole('button', { name: 'Close projects' })).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(back(page)).toBeFocused();
      await page.keyboard.press('Tab');
      expect(await focusedInProj(page)).toBe(false);
      expect(errors).toEqual([]);
    });

    test('T18 AC11, AC19: the window stays 520x385 at y 259 in the list and in the detail view', async ({
      page,
    }) => {
      const errors = watchErrors(page);
      // A click raises the window with a short scale pose, so wait for the pose to finish first.
      const rest = async () => {
        await settled(page);
        await expect.poll(async () => Math.abs((await rect(page)).w - 520)).toBeLessThanOrEqual(2);
        return rect(page);
      };
      const list = await rest();
      await tiles(page).nth(1).click();
      const detail = await rest();
      for (const r of [list, detail]) {
        expect(Math.abs(r.w - 520)).toBeLessThanOrEqual(2);
        expect(Math.abs(r.h - 385)).toBeLessThanOrEqual(2);
        expect(Math.round(r.y)).toBe(259);
      }
      expect(Math.abs(detail.x - list.x)).toBeLessThanOrEqual(1);
      expect(errors).toEqual([]);
    });

    test('T18 AC17: with current data the detail view does not overflow the window body', async ({
      page,
    }) => {
      await tiles(page).nth(1).click();
      await settled(page);
      const o = await page.evaluate(() => {
        const b = document.querySelector('[data-win="proj"] .proj-body') as HTMLElement;
        return {
          sw: b.scrollWidth,
          cw: b.clientWidth,
          sh: b.scrollHeight,
          ch: b.clientHeight,
          page: document.scrollingElement!.scrollHeight - document.scrollingElement!.clientHeight,
        };
      });
      expect(o.sw).toBeLessThanOrEqual(o.cw);
      expect(o.sh).toBeLessThanOrEqual(o.ch + 1);
      expect(o.page).toBeLessThanOrEqual(0);
    });

    test('T18 AC19, AC20: 8 injected tiles scroll inside the fixed window, Tab x12 reaches the last tile inside the scroller', async ({
      page,
    }) => {
      const errors = watchErrors(page);
      await page.evaluate(() => {
        const grid = document.querySelector('[data-win="proj"] .proj-grid')!;
        const items = [...grid.querySelectorAll(':scope > li')];
        for (let i = 0; i < 8; i++) {
          grid.insertBefore(items[i % items.length].cloneNode(true), grid.firstChild);
        }
      });
      await settled(page);
      const before = await rect(page);
      expect(Math.abs(before.h - 385)).toBeLessThanOrEqual(2);
      expect(Math.round(before.y)).toBe(259);
      const m = await page.evaluate(() => {
        const b = document.querySelector('[data-win="proj"] .proj-body') as HTMLElement;
        return { sh: b.scrollHeight, ch: b.clientHeight, sw: b.scrollWidth, cw: b.clientWidth };
      });
      expect(m.sh).toBeGreaterThan(m.ch);
      expect(m.sw).toBeLessThanOrEqual(m.cw);

      const b = (await win(page).locator('.proj-body').boundingBox())!;
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.wheel(0, 200);
      await expect
        .poll(() =>
          page.evaluate(() => document.querySelector('[data-win="proj"] .proj-body')!.scrollTop),
        )
        .toBeGreaterThan(0);
      const after = await rect(page);
      expect(after.x).toBeCloseTo(before.x, 0);
      expect(after.y).toBeCloseTo(before.y, 0);
      expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(0);

      await page.evaluate(() => {
        document.querySelector('[data-win="proj"] .proj-body')!.scrollTop = 0;
      });
      await win(page).getByRole('button', { name: 'Close projects' }).focus();
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press('Tab');
        expect(
          await page.evaluate(() => document.activeElement?.classList.contains('proj-body')),
        ).toBe(false);
      }
      expect(await activeText(page)).toContain('Driver Safety');
      const inside = await page.evaluate(() => {
        const a = document.activeElement!.getBoundingClientRect();
        const body = document.querySelector('[data-win="proj"] .proj-body') as HTMLElement;
        const s = body.getBoundingClientRect();
        return {
          top: a.top >= s.top - 1,
          bottom: a.bottom <= s.bottom + 1,
          scrolled: body.scrollTop,
        };
      });
      expect(inside.top).toBe(true);
      expect(inside.bottom).toBe(true);
      expect(inside.scrolled).toBeGreaterThan(0);
      expect(errors).toEqual([]);
    });

    test('T18 AC21: the scroll bar colours are the neutral-500 and surface tokens', async ({
      page,
    }) => {
      const r = await page.evaluate(() => {
        const probe = (v: string) => {
          const d = document.createElement('div');
          d.style.color = `var(${v})`;
          document.body.appendChild(d);
          const c = getComputedStyle(d).color;
          d.remove();
          return c;
        };
        const body = document.querySelector('[data-win="proj"] .proj-body')!;
        const cs = getComputedStyle(body);
        return {
          color: cs.scrollbarColor,
          width: cs.scrollbarWidth,
          overflowY: cs.overflowY,
          overflowX: cs.overflowX,
          thumb: probe('--color-neutral-500'),
          track: probe('--color-surface'),
        };
      });
      expect(r.color).toBe(`${r.thumb} ${r.track}`);
      expect(r.width).toBe('thin');
      expect(r.overflowY).toBe('auto');
      expect(r.overflowX).toBe('hidden');
    });

    test('T18 AC9: the Featured star is visible once on the Indoor Garden tile and once in its detail, nowhere else', async ({
      page,
    }) => {
      const errors = watchErrors(page);
      const stars = win(page).getByRole('img', { name: 'Featured', exact: true });
      await expect(stars).toHaveCount(1);
      await expect(stars).toBeVisible();
      const owner = await stars.evaluate(
        (el) => el.closest('li')!.querySelector('h2')!.textContent,
      );
      expect(owner).toBe('Indoor Garden');
      expect(await stars.evaluate((el) => el.getAttribute('tabindex'))).toBeNull();

      await tiles(page).nth(0).click();
      await expect(stars).toHaveCount(0);
      await back(page).click();
      await tiles(page).nth(1).click();
      await expect(stars).toHaveCount(1);
      await expect(stars).toBeVisible();
      expect(errors).toEqual([]);
    });

    test('T18 AC6: the real Chromium accessible description of the Indoor Garden tile includes Featured', async ({
      page,
    }) => {
      const cdp = await page.context().newCDPSession(page);
      const describe = async (loc: Locator) => {
        const h = await loc.elementHandle();
        const { node } = await cdp.send('DOM.describeNode', {
          objectId: (
            await cdp.send('Runtime.evaluate', {
              expression: 'document.activeElement',
            })
          ).result.objectId,
        });
        void h;
        const { nodes } = await cdp.send('Accessibility.getPartialAXTree', {
          backendNodeId: node.backendNodeId,
          fetchRelatives: false,
        });
        const n = nodes[0];
        return {
          name: String(n.name?.value ?? ''),
          description: String(n.description?.value ?? ''),
        };
      };
      await tiles(page).nth(1).focus();
      const garden = await describe(tiles(page).nth(1));
      expect(garden.name).toBe('Indoor Garden');
      expect(garden.description).toContain('Featured');
      expect(garden.description).toContain('IoT garden monitoring');
      await tiles(page).nth(0).focus();
      const cal = await describe(tiles(page).nth(0));
      expect(cal.name).toBe('Voice Calendar');
      expect(cal.description).not.toContain('Featured');
      expect(cal.description.length).toBeGreaterThan(0);
    });

    test('T18 AC18: closing and reopening the window shows the list again', async ({ page }) => {
      const errors = watchErrors(page);
      await tiles(page).nth(1).click();
      await expect(back(page)).toBeVisible();
      await win(page).getByRole('button', { name: 'Close projects' }).click();
      await expect(win(page)).toHaveCount(0);
      await openProjects(page);
      await expect(tiles(page)).toHaveCount(4);
      await expect(back(page)).toHaveCount(0);
      expect(errors).toEqual([]);
    });

    test('T18 AC18: Restart shows the list again', async ({ page }) => {
      const errors = watchErrors(page);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await tiles(page).nth(1).click();
      await expect(back(page)).toBeVisible();
      await page
        .getByRole('banner')
        .getByRole('menuitem', { name: 'tanzi.os', exact: true })
        .click();
      await page
        .getByRole('menu')
        .locator('[role^="menuitem"]')
        .filter({ hasText: 'Restart…' })
        .click();
      await expect(win(page)).toHaveCount(0);
      await openProjects(page);
      await expect(tiles(page)).toHaveCount(4);
      await expect(back(page)).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  });
}

test.describe('T18 phone page', () => {
  test.use({ colorScheme: 'dark', viewport: { width: 320, height: 700 } });

  test('T18 AC24, AC25: at 320px the Featured star shows once, with no horizontal overflow and no buttons', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const stars = page.getByRole('img', { name: 'Featured', exact: true });
    await expect(stars).toHaveCount(1);
    await stars.scrollIntoViewIfNeeded();
    await expect(stars).toBeVisible();
    const owner = await stars.evaluate((el) => el.closest('li')!.querySelector('h3')!.textContent);
    expect(owner).toContain('Indoor Garden');
    const m = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
      svgs: document.querySelectorAll('svg').length,
      buttons: document.querySelectorAll('button').length,
    }));
    expect(m.sw).toBeLessThanOrEqual(m.cw);
    expect(m.svgs).toBe(1);
    expect(m.buttons).toBe(0);
    expect(errors).toEqual([]);
  });
});
