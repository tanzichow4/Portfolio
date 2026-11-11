import { expect, test, type Locator, type Page } from '@playwright/test';
import { openAllFromDock } from './helpers/openAll';

const watchErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on(
    'console',
    (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text()),
  );
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

// Playwright defaults to a light OS scheme, so pin dark to make the starting theme deterministic.
test.use({ colorScheme: 'dark' });

const PHONE = { width: 375, height: 667 };
const DESKTOP = { width: 1280, height: 720 };
const WINS = ['hello', 'about', 'exp', 'proj', 'term'] as const;

const phoneMain = (page: Page) => page.locator('main.phone');
const deskBar = (page: Page) => page.locator('[aria-label="System menu bar"]');
const win = (page: Page, id: string) => page.locator(`[data-win="${id}"]`);
const viewCounts = (page: Page) =>
  page.evaluate(() => ({
    phone: document.querySelectorAll('main.phone').length,
    desktop: document.querySelectorAll('[aria-label="System menu bar"]').length,
  }));
const expectPhone = async (page: Page) => {
  await expect(phoneMain(page)).toHaveCount(1);
  await expect(deskBar(page)).toHaveCount(0);
  await expect(page.locator('[data-win], nav[aria-label="Dock"], .boot-status')).toHaveCount(0);
};
const expectDesktop = async (page: Page) => {
  await expect(deskBar(page)).toHaveCount(1);
  await expect(phoneMain(page)).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveClass(/phone-view/);
};
const theme = (page: Page) => page.evaluate(() => document.documentElement.dataset.theme);
const box = async (loc: Locator) => {
  const b = await loc.boundingBox();
  if (!b) throw new Error('no bounding box');
  return b;
};
const allPos = async (page: Page) => {
  const out: Record<string, { x: number; y: number }> = {};
  for (const id of WINS) {
    const b = await box(win(page, id));
    out[id] = { x: Math.round(b.x), y: Math.round(b.y) };
  }
  return out;
};
const scrollY = (page: Page) => page.evaluate(() => window.scrollY);

// Samples the DOM on every mutation and animation frame once a view exists. Any sample that does not
// show exactly one view is recorded in window.__bad.
const installViewSampler = (page: Page) =>
  page.addInitScript(() => {
    const w = window as unknown as { __bad: number[]; __seen: boolean };
    w.__bad = [];
    w.__seen = false;
    const check = () => {
      const c =
        document.querySelectorAll('main.phone').length +
        document.querySelectorAll('[aria-label="System menu bar"]').length;
      if (c >= 1) w.__seen = true;
      if (w.__seen && c !== 1) w.__bad.push(c);
    };
    new MutationObserver(check).observe(document, { childList: true, subtree: true });
    const loop = () => {
      check();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
const badSamples = (page: Page) =>
  page.evaluate(() => (window as unknown as { __bad: number[] }).__bad);

test.describe('T13 phone fallback page (e2e)', () => {
  test('T13 AC3: a phone-width load never has any desktop node in the DOM, from document start', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.addInitScript(() => {
      const hits: string[] = [];
      (window as unknown as { __desk: string[] }).__desk = hits;
      const sel =
        '[aria-label="System menu bar"], nav[aria-label="Dock"], [data-win], .boot-status';
      const scan = (n: Node) => {
        if (!(n instanceof Element)) return;
        if (n.matches(sel) || n.querySelector(sel)) hits.push(n.outerHTML.slice(0, 80));
      };
      new MutationObserver((recs) => {
        for (const r of recs) r.addedNodes.forEach(scan);
      }).observe(document, { childList: true, subtree: true });
    });
    await page.setViewportSize({ width: 500, height: 800 });
    await page.goto('/');
    await expect(phoneMain(page)).toBeVisible();
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => (window as unknown as { __desk: string[] }).__desk)).toEqual(
      [],
    );
    await expectPhone(page);
    expect(errors).toEqual([]);
  });

  for (const [w, view] of [
    [759, 'phone'],
    [760, 'desktop'],
  ] as const) {
    test(`T13 AC1: a load at ${w}px shows the ${view} view`, async ({ page }) => {
      const errors = watchErrors(page);
      await page.setViewportSize({ width: w, height: 800 });
      await page.goto('/');
      if (view === 'phone') await expectPhone(page);
      else await expectDesktop(page);
      expect(errors).toEqual([]);
    });
  }

  test('T13 AC1: resizing between 759 and 760 swaps the view each way', async ({ page }) => {
    const errors = watchErrors(page);
    await page.setViewportSize({ width: 759, height: 800 });
    await page.goto('/');
    await expectPhone(page);
    await page.setViewportSize({ width: 760, height: 800 });
    await expectDesktop(page);
    await page.setViewportSize({ width: 759, height: 800 });
    await expectPhone(page);
    expect(errors).toEqual([]);
  });

  test('T13 AC1: the view ignores height (a very short desktop width, a very tall phone width)', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.setViewportSize({ width: 900, height: 300 });
    await page.goto('/');
    await expectDesktop(page);
    await page.setViewportSize({ width: 500, height: 2000 });
    await expectPhone(page);
    expect(errors).toEqual([]);
  });

  for (const w of [760, 1000, 1279]) {
    test(`T13 AC4/AC9: at ${w}px the phone page never mounts and the desktop renders`, async ({
      page,
    }) => {
      const errors = watchErrors(page);
      await installViewSampler(page);
      await page.setViewportSize({ width: w, height: 800 });
      await page.goto('/');
      await expectDesktop(page);
      await expect(win(page, 'hello')).toBeVisible();
      await expect(page.locator('.phone-section, .phone-link')).toHaveCount(0);
      expect(await badSamples(page)).toEqual([]);
      expect(errors).toEqual([]);
    });
  }

  test('T13 AC5: crossing 760 in both directions never shows both views or neither', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await installViewSampler(page);
    await page.setViewportSize(DESKTOP);
    await page.goto('/');
    await expectDesktop(page);
    await page.setViewportSize({ width: 400, height: 800 });
    await expectPhone(page);
    await page.setViewportSize(DESKTOP);
    await expectDesktop(page);
    await page.setViewportSize({ width: 759, height: 700 });
    await expectPhone(page);
    await page.waitForTimeout(100);
    expect(await badSamples(page)).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('T13 AC5: a rotation-style swap of width and height swaps the view with no gap', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await installViewSampler(page);
    await page.setViewportSize({ width: 400, height: 800 });
    await page.goto('/');
    await expectPhone(page);
    await page.setViewportSize({ width: 800, height: 400 });
    await expectDesktop(page);
    await page.setViewportSize({ width: 400, height: 800 });
    await expectPhone(page);
    await page.waitForTimeout(100);
    expect(await badSamples(page)).toEqual([]);
    expect(errors).toEqual([]);
  });

  for (const end of ['phone', 'desktop'] as const) {
    test(`T13 AC6: a burst of rapid crossings ending on ${end} leaves exactly one matching view`, async ({
      page,
    }) => {
      const errors = watchErrors(page);
      await installViewSampler(page);
      await page.setViewportSize(DESKTOP);
      await page.goto('/');
      await expectDesktop(page);
      const widths = [400, 1000, 500, 900, 300, 1200, 759, 760, 759, 800];
      for (const w of widths) await page.setViewportSize({ width: w, height: 700 });
      await page.setViewportSize({ width: end === 'phone' ? 600 : 1100, height: 700 });
      if (end === 'phone') await expectPhone(page);
      else await expectDesktop(page);
      expect(await viewCounts(page)).toEqual(
        end === 'phone' ? { phone: 1, desktop: 0 } : { phone: 0, desktop: 1 },
      );
      expect(await badSamples(page)).toEqual([]);
      expect(errors).toEqual([]);
    });
  }

  test('T13 AC6: a return within one frame lands on the view for the final width', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.setViewportSize(DESKTOP);
    await page.goto('/');
    await expectDesktop(page);
    // Resize to phone and back inside one evaluate, so the page sees both events before a frame.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
    await page.setViewportSize({ width: 500, height: 700 });
    await page.setViewportSize({ width: 1000, height: 700 });
    await expectDesktop(page);
    expect(await viewCounts(page)).toEqual({ phone: 0, desktop: 1 });
    expect(errors).toEqual([]);
  });

  test('T13 AC7: a resize that does not cross 760 keeps the phone page mounted and scrolled', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.setViewportSize(PHONE);
    await page.goto('/');
    await expectPhone(page);
    await page.evaluate(() => {
      document.querySelector('main.phone')!.setAttribute('data-mark', 'kept');
      window.scrollTo(0, 200);
    });
    expect(await scrollY(page)).toBeGreaterThan(0);
    await page.setViewportSize({ width: 414, height: 667 });
    await page.waitForTimeout(150);
    await expectPhone(page);
    await expect(phoneMain(page)).toHaveAttribute('data-mark', 'kept');
    expect(await scrollY(page)).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  test('T13 AC7: a resize from 1280 to 1000 keeps the desktop and its typed terminal text', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.setViewportSize(DESKTOP);
    await page.goto('/');
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): only hello is open on load, so open the terminal from the dock.
    await openAllFromDock(page);
    await win(page, 'term').waitFor();
    const input = page.getByRole('textbox', { name: 'Terminal command' });
    await input.fill('half typed');
    await page.setViewportSize({ width: 1000, height: 720 });
    await page.waitForTimeout(150);
    await expectDesktop(page);
    await expect(input).toHaveValue('half typed');
    expect(errors).toEqual([]);
  });

  test('T13 AC8: crossing from a scrolled phone page to the desktop gives a fresh desktop with no scrollbars', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.setViewportSize(DESKTOP);
    await page.goto('/');
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): only hello is open on load, so open the other windows from the dock to take the baseline.
    await openAllFromDock(page);
    await win(page, 'hello').waitFor();
    const baseline = await allPos(page);

    await page.setViewportSize({ width: 400, height: 500 });
    await expectPhone(page);
    await page.evaluate(() => window.scrollTo(0, 99999));
    expect(await scrollY(page)).toBeGreaterThan(0);

    await page.setViewportSize(DESKTOP);
    await expectDesktop(page);
    await win(page, 'hello').waitFor();
    expect(await scrollY(page)).toBe(0);
    const dims = await page.evaluate(() => ({
      sh: document.documentElement.scrollHeight,
      ih: window.innerHeight,
      bsh: document.body.scrollHeight,
    }));
    expect(dims.sh).toBeLessThanOrEqual(dims.ih);
    expect(dims.bsh).toBeLessThanOrEqual(dims.ih);
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): the desktop after the round trip is fresh (only hello open), so open the rest, then compare.
    await expect(page.locator('[data-win]')).toHaveCount(1);
    await openAllFromDock(page);
    expect(await allPos(page)).toEqual(baseline);
    expect(errors).toEqual([]);
  });

  test('T13 AC8: a dragged window returns to its default position after a round trip', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.setViewportSize(DESKTOP);
    await page.goto('/');
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): only hello is open on load, so open the other windows from the dock to take the baseline.
    await openAllFromDock(page);
    await win(page, 'hello').waitFor();
    const baseline = await allPos(page);
    const title = win(page, 'hello').locator('.win-titlebar, [class*="titlebar"]').first();
    const tb = await box(title);
    await page.mouse.move(tb.x + 40, tb.y + tb.height / 2);
    await page.mouse.down();
    await page.mouse.move(tb.x + 140, tb.y + 120, { steps: 5 });
    await page.mouse.up();
    expect(await allPos(page)).not.toEqual(baseline);

    await page.setViewportSize({ width: 400, height: 800 });
    await expectPhone(page);
    expect(await scrollY(page)).toBe(0);
    await page.setViewportSize(DESKTOP);
    await expectDesktop(page);
    await win(page, 'hello').waitFor();
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): the desktop after the round trip is fresh (only hello open), so open the rest, then compare.
    await expect(page.locator('[data-win]')).toHaveCount(1);
    await openAllFromDock(page);
    expect(await allPos(page)).toEqual(baseline);
    expect(errors).toEqual([]);
  });

  test('T13 AC8: a Restart boot running at a crossing is discarded with no boot screen and no errors', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.addInitScript(() => {
      Math.random = () => 0;
    });
    await page.setViewportSize(DESKTOP);
    await page.goto('/');
    await win(page, 'hello').waitFor();
    await page.getByRole('banner').getByRole('menuitem', { name: 'tanzi.os', exact: true }).click();
    await page
      .getByRole('menu')
      .locator('[role^="menuitem"]')
      .filter({ hasText: /^Restart…$/ })
      .click();
    const dialog = page.getByRole('dialog', { name: 'Restarting tanzi.os' });
    await expect(dialog).toBeVisible();
    await page.setViewportSize({ width: 400, height: 800 });
    await expectPhone(page);
    await expect(dialog).toHaveCount(0);
    await page.setViewportSize(DESKTOP);
    await expectDesktop(page);
    await win(page, 'hello').waitFor();
    // The longest boot is 1350ms. A zombie boot would have shown its dialog again by now.
    await page.waitForTimeout(1800);
    await expect(dialog).toHaveCount(0);
    // The desktop's live region always exists. A discarded boot must leave it empty.
    await expect(page.locator('.boot-status')).toHaveText('');
    expect(errors).toEqual([]);
  });

  test('T13 AC8: crossing from the desktop shows the phone page at the top', async ({ page }) => {
    const errors = watchErrors(page);
    await page.setViewportSize(DESKTOP);
    await page.goto('/');
    await win(page, 'hello').waitFor();
    await page.setViewportSize({ width: 400, height: 600 });
    await expectPhone(page);
    expect(await scrollY(page)).toBe(0);
    await expect(page.locator('h1')).toBeInViewport();
    expect(errors).toEqual([]);
  });

  test('T13 AC14: wheel, End and PageDown scroll the page and the last link can be reached', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.setViewportSize(PHONE);
    await page.goto('/');
    await expectPhone(page);
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight),
    ).toBe(true);

    await page.mouse.move(100, 300);
    await page.mouse.wheel(0, 300);
    await expect.poll(() => scrollY(page)).toBeGreaterThan(0);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.keyboard.press('PageDown');
    await expect.poll(() => scrollY(page)).toBeGreaterThan(0);

    await page.keyboard.press('End');
    await expect
      .poll(() =>
        page.evaluate(
          () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1,
        ),
      )
      .toBe(true);
    await expect(page.locator('.phone-link').last()).toBeInViewport();
    expect(errors).toEqual([]);
  });

  test('T13 AC14: nothing on html, body or the page sets touch-action', async ({ page }) => {
    const errors = watchErrors(page);
    await page.setViewportSize(PHONE);
    await page.goto('/');
    await expectPhone(page);
    const ta = await page.evaluate(() =>
      ['html', 'body', 'main.phone'].map(
        (s) => getComputedStyle(document.querySelector(s)!).touchAction,
      ),
    );
    expect(ta).toEqual(['auto', 'auto', 'auto']);
    expect(errors).toEqual([]);
  });

  const SIZES: Array<[number, number]> = [
    [320, 568],
    [375, 667],
    [414, 896],
    [759, 900],
    [667, 375],
  ];
  for (const [w, h] of SIZES) {
    test(`T13 AC15: no horizontal overflow at ${w}x${h}`, async ({ page }) => {
      const errors = watchErrors(page);
      await page.setViewportSize({ width: w, height: h });
      await page.goto('/');
      await expectPhone(page);
      const m = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        iw: window.innerWidth,
        bw: document.body.scrollWidth,
      }));
      expect(m.sw).toBeLessThanOrEqual(m.iw);
      expect(m.bw).toBeLessThanOrEqual(m.iw);
      expect(errors).toEqual([]);
    });
  }

  test('T13 AC15: at 320px a 300-character unbroken string in a tag and a paragraph wraps', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');
    await expectPhone(page);
    await page.evaluate(() => {
      const long = 'W'.repeat(300);
      document.querySelector('.phone-tags .tag')!.textContent = long;
      document.querySelector('.phone-para')!.appendChild(document.createTextNode(long));
      document.querySelector('.phone-desc')!.appendChild(document.createTextNode(long));
    });
    const m = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      iw: window.innerWidth,
    }));
    expect(m.sw).toBeLessThanOrEqual(m.iw);
    expect(errors).toEqual([]);
  });

  test('T13 AC16: body stays overflow hidden at 760 and after crossing back from the phone page', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    const overflow = () => page.evaluate(() => getComputedStyle(document.body).overflow);
    const fits = () =>
      page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight);
    await page.setViewportSize({ width: 760, height: 700 });
    await page.goto('/');
    await expectDesktop(page);
    expect(await overflow()).toBe('hidden');
    expect(await fits()).toBe(true);

    await page.setViewportSize({ width: 400, height: 700 });
    await expectPhone(page);
    expect(await overflow()).toBe('visible');

    await page.setViewportSize({ width: 760, height: 700 });
    await expectDesktop(page);
    expect(await overflow()).toBe('hidden');
    expect(await fits()).toBe(true);
    expect(errors).toEqual([]);
  });

  test('T13 AC16: phone page text is selectable, desktop text is not', async ({ page }) => {
    const errors = watchErrors(page);
    const sel = () =>
      page.evaluate(() => {
        const p = document.querySelector('.phone-para, .phone-desc');
        return p ? getComputedStyle(p).userSelect : null;
      });
    await page.setViewportSize(PHONE);
    await page.goto('/');
    await expectPhone(page);
    expect(await sel()).not.toBe('none');
    expect(await sel()).not.toBeNull();
    const userSelectDesktop = await page.evaluate(() => getComputedStyle(document.body).userSelect);
    expect(userSelectDesktop).not.toBe('none');
    expect(errors).toEqual([]);
  });

  for (const th of ['dark', 'light'] as const) {
    test(`T13 AC17: stored ${th} wins over the opposite OS scheme and gives a distinct page background`, async ({
      page,
    }) => {
      const errors = watchErrors(page);
      await page.emulateMedia({ colorScheme: th === 'dark' ? 'light' : 'dark' });
      await page.addInitScript(
        ([k, v]) => {
          localStorage.setItem(k, v);
          const w = window as unknown as { __first?: string };
          // Theme at the moment React first puts content into #root.
          new MutationObserver(() => {
            const root = document.getElementById('root');
            if (w.__first === undefined && root && root.childElementCount > 0)
              w.__first = document.documentElement.dataset.theme ?? 'none';
          }).observe(document, { childList: true, subtree: true });
        },
        ['tanzi-os:theme', th],
      );
      await page.setViewportSize(PHONE);
      await page.goto('/');
      await expectPhone(page);
      expect(await theme(page)).toBe(th);
      expect(await page.evaluate(() => (window as unknown as { __first?: string }).__first)).toBe(
        th,
      );
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      const text = await page.evaluate(() => getComputedStyle(document.querySelector('h1')!).color);
      expect(bg).not.toBe(text);
      // Dark theme background is darker than the light one.
      const lum = bg
        .match(/\d+/g)!
        .slice(0, 3)
        .map(Number)
        .reduce((a, b) => a + b, 0);
      if (th === 'dark') expect(lum).toBeLessThan(200);
      else expect(lum).toBeGreaterThan(500);
      expect(errors).toEqual([]);
    });
  }

  for (const scheme of ['dark', 'light'] as const) {
    test(`T13 AC17: with nothing stored the OS scheme (${scheme}) decides`, async ({ page }) => {
      const errors = watchErrors(page);
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize(PHONE);
      await page.goto('/');
      await expectPhone(page);
      expect(await theme(page)).toBe(scheme);
      expect(errors).toEqual([]);
    });
  }

  test('T13 AC17: when storage throws, the phone page renders in dark even under a light OS scheme', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.addInitScript(() => {
      Storage.prototype.getItem = () => {
        throw new Error('blocked');
      };
    });
    await page.setViewportSize(PHONE);
    await page.goto('/');
    await expectPhone(page);
    expect(await theme(page)).toBe('dark');
    expect(errors).toEqual([]);
  });

  test('T13 AC18: a phone session writes nothing to storage and leaves the stored settings as they were', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.addInitScript(() => {
      const w = window as unknown as { __sets: string[] };
      w.__sets = [];
      const orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k: string, v: string) {
        w.__sets.push(k);
        return orig.call(this, k, v);
      };
    });
    await page.setViewportSize(PHONE);
    await page.goto('/');
    await expectPhone(page);
    await page.evaluate(() => {
      localStorage.setItem('tanzi-os:theme', 'light');
      localStorage.setItem('tanzi-os:wallpaper', 'grid');
      localStorage.setItem('tanzi-os:wobble', 'off');
    });
    await page.reload();
    await expectPhone(page);
    // Interact: scroll, wheel, tab through the links, then resize within the phone range.
    await page.keyboard.press('Tab');
    await page.keyboard.press('End');
    await page.setViewportSize({ width: 320, height: 568 });
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => (window as unknown as { __sets: string[] }).__sets)).toEqual(
      [],
    );
    expect(await theme(page)).toBe('light');
    expect(
      await page.evaluate(() => ({
        t: localStorage.getItem('tanzi-os:theme'),
        w: localStorage.getItem('tanzi-os:wallpaper'),
        o: localStorage.getItem('tanzi-os:wobble'),
        n: localStorage.length,
      })),
    ).toEqual({ t: 'light', w: 'grid', o: 'off', n: 3 });
    expect(errors).toEqual([]);
  });

  test('T13 AC19: a theme changed on the desktop while storage throws survives crossings both ways', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new Error('quota');
      };
    });
    await page.setViewportSize(DESKTOP);
    await page.goto('/');
    await win(page, 'hello').waitFor();
    expect(await theme(page)).toBe('dark');
    await page.getByRole('button', { name: 'Switch to light mode' }).click();
    await expect.poll(() => theme(page)).toBe('light');

    await page.setViewportSize({ width: 400, height: 800 });
    await expectPhone(page);
    expect(await theme(page)).toBe('light');

    await page.setViewportSize(DESKTOP);
    await expectDesktop(page);
    expect(await theme(page)).toBe('light');
    await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('T13 AC22: link attributes in a real browser, for every link', async ({ page }) => {
    const errors = watchErrors(page);
    await page.setViewportSize(PHONE);
    await page.goto('/');
    await expectPhone(page);
    const links = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLAnchorElement>('main.phone a')].map((a) => ({
        href: a.getAttribute('href')!,
        target: a.getAttribute('target'),
        rel: a.getAttribute('rel'),
        text: a.textContent!.trim(),
      })),
    );
    expect(links.length).toBeGreaterThanOrEqual(4);
    for (const l of links) {
      expect(l.text).not.toBe('');
      if (/^https?:/.test(l.href)) {
        expect(l.target).toBe('_blank');
        expect(l.rel).toBe('noopener noreferrer');
      } else {
        expect(l.target).toBeNull();
        expect(l.rel).toBeNull();
      }
    }
    expect(links.some((l) => l.href.startsWith('mailto:'))).toBe(true);
    expect(errors).toEqual([]);
  });

  test('T13 AC23: Tab visits every link in reading order, each with a visible unclipped focus ring', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.setViewportSize(PHONE);
    await page.goto('/');
    await expectPhone(page);
    const hrefs = await page.evaluate(() =>
      [...document.querySelectorAll('main.phone a')].map((a) => a.getAttribute('href')),
    );
    const positive = await page.evaluate(
      () =>
        [...document.querySelectorAll('[tabindex]')].filter(
          (e) => Number(e.getAttribute('tabindex')) > 0,
        ).length,
    );
    expect(positive).toBe(0);
    for (let i = 0; i < hrefs.length; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const links = [...document.querySelectorAll('main.phone a')];
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const w = parseFloat(cs.outlineWidth);
        const off = parseFloat(cs.outlineOffset);
        const grow = w + Math.max(off, 0);
        return {
          index: links.indexOf(el),
          style: cs.outlineStyle,
          width: w,
          left: r.left - grow,
          right: r.right + grow,
          top: r.top + window.scrollY - grow,
          bottom: r.bottom + window.scrollY + grow,
          iw: window.innerWidth,
          ih: document.documentElement.scrollHeight,
        };
      });
      expect(info.index).toBe(i);
      expect(info.style).toBe('solid');
      expect(info.width).toBeGreaterThan(0);
      expect(info.left).toBeGreaterThanOrEqual(0);
      expect(info.right).toBeLessThanOrEqual(info.iw);
      expect(info.top).toBeGreaterThanOrEqual(0);
      expect(info.bottom).toBeLessThanOrEqual(info.ih);
    }
    // No trap: one more Tab leaves the page's links.
    await page.keyboard.press('Tab');
    const stillInLinks = await page.evaluate(() =>
      [...document.querySelectorAll('main.phone a')].includes(document.activeElement as Element),
    );
    expect(stillInLinks).toBe(false);
    expect(errors).toEqual([]);
  });

  test('T13 AC25: every link in Projects and Links is at least 44px high when rendered', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    for (const size of [PHONE, { width: 320, height: 568 }]) {
      await page.setViewportSize(size);
      await page.goto('/');
      await expectPhone(page);
      const heights = await page.evaluate(() =>
        [...document.querySelectorAll('main.phone a')].map((a) => a.getBoundingClientRect().height),
      );
      expect(heights.length).toBeGreaterThanOrEqual(4);
      for (const h of heights) expect(h).toBeGreaterThanOrEqual(44);
    }
    expect(errors).toEqual([]);
  });

  for (const rm of ['no-preference', 'reduce'] as const) {
    test(`T13 AC27: no animations, transitions or smooth scroll on the phone page (reduced motion: ${rm})`, async ({
      page,
    }) => {
      const errors = watchErrors(page);
      await page.emulateMedia({ reducedMotion: rm });
      await page.setViewportSize(PHONE);
      await page.goto('/');
      await expectPhone(page);
      expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
      const motion = await page.evaluate(() => {
        const out: string[] = [];
        for (const el of document.querySelectorAll('main.phone, main.phone *')) {
          const cs = getComputedStyle(el);
          // The global reduced-motion rule floors every duration at 0.01ms. Real durations are larger.
          const dur = cs.transitionDuration.split(',').some((d) => parseFloat(d) > 0.01);
          if (dur || cs.animationName !== 'none') out.push(el.tagName + '.' + el.className);
        }
        return {
          out,
          html: getComputedStyle(document.documentElement).scrollBehavior,
          body: getComputedStyle(document.body).scrollBehavior,
        };
      });
      expect(motion.out).toEqual([]);
      expect(motion.html).toBe('auto');
      expect(motion.body).toBe('auto');
      expect(errors).toEqual([]);
    });
  }

  for (const rm of ['no-preference', 'reduce'] as const) {
    test(`T13 AC27: hover and keyboard focus start no animation or transition (reduced motion: ${rm})`, async ({
      page,
    }) => {
      const errors = watchErrors(page);
      await page.emulateMedia({ reducedMotion: rm });
      await page.setViewportSize(PHONE);
      await page.goto('/');
      await expectPhone(page);
      await page.locator('.phone-link').first().hover();
      expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
      await page.keyboard.press('Tab');
      const anims = await page.evaluate(() =>
        document.getAnimations().map((a) => (a as CSSTransition).transitionProperty ?? a.id),
      );
      expect(anims).toEqual([]);
      expect(errors).toEqual([]);
    });
  }

  test('T13 AC28: the viewport meta tag is unchanged and does not disable zoom', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.setViewportSize(PHONE);
    await page.goto('/');
    await expectPhone(page);
    const content = await page.evaluate(() =>
      document.querySelector('meta[name="viewport"]')!.getAttribute('content')!,
    );
    expect(content).toBe('width=device-width, initial-scale=1.0');
    expect(content).not.toMatch(/user-scalable|maximum-scale|minimum-scale/);
    expect(errors).toEqual([]);
  });

  test('T13 AC28: a crossing moves no focus and the phone page has no live region', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.setViewportSize(PHONE);
    await page.goto('/');
    await expectPhone(page);
    expect(await page.locator('[aria-live], [role="status"], [role="alert"]').count()).toBe(0);
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('A');
    await page.setViewportSize(DESKTOP);
    await expectDesktop(page);
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BODY');

    await page.getByRole('banner').getByRole('menuitem').first().focus();
    await page.setViewportSize(PHONE);
    await expectPhone(page);
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BODY');
    expect(errors).toEqual([]);
  });
});
