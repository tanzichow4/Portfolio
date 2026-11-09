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

// Playwright defaults to a light OS scheme, so pin dark to make the starting theme deterministic.
test.use({ colorScheme: 'dark' });

const IDS = ['hello', 'about', 'exp', 'proj', 'term'] as const;
type Id = (typeof IDS)[number];
const TITLES: Record<Id, string> = {
  hello: 'hello.txt',
  about: 'about.md',
  exp: 'experience.log',
  proj: 'projects',
  term: 'terminal',
};
const LINK_LABELS = ['GitHub', 'LinkedIn', 'Email'] as const;
const STATE_WORD = { open: 'Open', min: 'Minimized', closed: 'Closed' } as const;

const win = (page: Page, id: string) => page.locator(`[data-win="${id}"]`);
const dock = (page: Page) => page.getByRole('navigation', { name: 'Dock' });
const dockBtn = (page: Page, id: Id) =>
  dock(page).getByRole('button', { name: TITLES[id], exact: true });
const dockLink = (page: Page, label: string) =>
  dock(page).getByRole('link', { name: label, exact: true });

const box = async (loc: Locator) => {
  const b = await loc.boundingBox();
  if (!b) throw new Error('no bounding box');
  return b;
};
const computed = (loc: Locator, prop: string) =>
  loc.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);
const zOf = (page: Page, id: string) => win(page, id).evaluate((el) => Number(el.style.zIndex));

const tokenColour = (page: Page, token: string) =>
  page.evaluate((t) => {
    const el = document.createElement('div');
    el.style.color = `var(${t})`;
    document.body.appendChild(el);
    const c = getComputedStyle(el).color;
    el.remove();
    return c;
  }, token);
const tokenBg = (page: Page, token: string) =>
  page.evaluate((t) => {
    const el = document.createElement('div');
    el.style.backgroundColor = `var(${t})`;
    document.body.appendChild(el);
    const c = getComputedStyle(el).backgroundColor;
    el.remove();
    return c;
  }, token);

const focusedLabel = (page: Page) =>
  page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');
const tabLabels = async (page: Page, n: number) => {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    out.push(
      await page.evaluate(
        () =>
          document.activeElement?.getAttribute('aria-label') ??
          document.activeElement?.textContent?.trim() ??
          '',
      ),
    );
  }
  return out;
};

/** Reads one window's dock state from the button's own attributes. */
async function dockState(page: Page, id: Id) {
  const b = dockBtn(page, id);
  return {
    pressed: await b.getAttribute('aria-pressed'),
    desc: await b.evaluate((el) => {
      const ref = el.getAttribute('aria-describedby');
      return ref ? (document.getElementById(ref)?.textContent ?? '') : '';
    }),
    dot: await b.locator('.dock-dot').evaluate((d) => getComputedStyle(d).opacity),
  };
}

/** Waits for the dock dot's 0.2s opacity transition to settle at its target. */
async function expectDockState(page: Page, id: Id, s: keyof typeof STATE_WORD) {
  const dot = { open: '1', min: '0.4', closed: '0' }[s];
  await expect(dockBtn(page, id)).toHaveAttribute('aria-pressed', String(s === 'open'));
  await expect.poll(async () => (await dockState(page, id)).desc).toBe(STATE_WORD[s]);
  await expect.poll(async () => (await dockState(page, id)).dot).toBe(dot);
}

/** Records the inline transform and opacity of every `[data-win=id]` node as it changes. */
async function recordPoses(page: Page, id: string) {
  await page.evaluate((winId) => {
    const root = document.querySelector('header')!.parentElement!;
    const rec: { t: string; o: string }[] = [];
    (window as unknown as { __poses: typeof rec }).__poses = rec;
    const grab = (el: Element) => {
      if (el instanceof HTMLElement && el.dataset.win === winId) {
        rec.push({ t: el.style.transform, o: el.style.opacity });
      }
    };
    new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'childList') {
          m.addedNodes.forEach((n) => {
            grab(n as Element);
            if (n instanceof Element) n.querySelectorAll('[data-win]').forEach(grab);
          });
        } else grab(m.target as Element);
      }
    }).observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style'],
    });
  }, id);
}
const poses = (page: Page) =>
  page.evaluate(() => (window as unknown as { __poses: { t: string; o: string }[] }).__poses);

const dragTitle = async (page: Page, id: Id | 'site', toX: number, toY: number) => {
  const tb = await box(win(page, id).locator('.win-titlebar'));
  const sx = tb.x + 100;
  const sy = tb.y + tb.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move((sx + toX) / 2, (sy + toY) / 2, { steps: 4 });
  await page.mouse.move(toX, toY, { steps: 4 });
  await page.mouse.up();
};

test.describe('T06 dock layout and styles', () => {
  test('T06 AC1/AC2/AC3: the dock is centred, 14px from the bottom, top at vh - 76, with 5 buttons, a divider and 3 links', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    const d = dock(page);
    await expect(d).toBeVisible();
    const b = await box(d);
    expect(Math.abs(b.x + b.width / 2 - 640)).toBeLessThanOrEqual(1);
    expect(Math.abs(720 - (b.y + b.height) - 14)).toBeLessThanOrEqual(1);
    expect(Math.abs(b.y - (720 - 76))).toBeLessThanOrEqual(1);
    expect(await computed(d, 'padding')).toBe('8px');
    expect(await computed(d, 'border-radius')).toBe('18px');
    expect(await computed(d, 'column-gap')).toBe('6px');
    expect(await computed(d, 'backdrop-filter')).toBe('blur(12px)');
    expect(await computed(d, 'z-index')).toBe('900');
    expect(await computed(d, 'position')).toBe('fixed');
    expect(await computed(d, 'box-shadow')).not.toBe('none');
    expect(await computed(d, 'overflow')).toBe('visible');
    const bg = await computed(d, 'background-color');
    expect(bg).toMatch(/^(color\(srgb|rgba\()/);
    expect(bg).not.toMatch(/ 1\)$/);

    await expect(dock(page).getByRole('button')).toHaveCount(5);
    await expect(dock(page).getByRole('link')).toHaveCount(3);
    const kinds = await d
      .locator(':scope > *')
      .evaluateAll((els) =>
        els.map((e) => (e.classList.contains('dock-sep') ? 'sep' : e.getAttribute('aria-label'))),
      );
    expect(kinds).toEqual([...IDS.map((i) => TITLES[i]), 'sep', ...LINK_LABELS]);
    await expect(d.getByRole('button', { name: 'About this site' })).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('T06 AC1: the dock stays centred and 14px from the bottom after a viewport resize', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    for (const [w, h] of [
      [1600, 900],
      [1280, 720],
      [1920, 1080],
    ]) {
      await page.setViewportSize({ width: w, height: h });
      await expect
        .poll(async () => {
          const b = await box(dock(page));
          return [
            Math.abs(b.x + b.width / 2 - w / 2) <= 1,
            Math.abs(h - (b.y + b.height) - 14) <= 1,
            Math.abs(b.y - (h - 76)) <= 1,
          ];
        })
        .toEqual([true, true, true]);
    }
    expect(errors).toEqual([]);
  });

  test('T06 AC4/AC5/AC6/AC7: item, icon, divider and dot geometry and colours', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    const bgToken = await tokenBg(page, '--color-bg');
    const accent400 = await tokenColour(page, '--color-accent-400');
    const neutral300 = await tokenColour(page, '--color-neutral-300');
    const accent = await tokenBg(page, '--color-accent');
    const dockBox = await box(dock(page));

    for (const id of IDS) {
      const host = dockBtn(page, id);
      const hb = await box(host);
      expect(Math.round(hb.width)).toBe(46);
      expect(Math.round(hb.height)).toBe(46);
      expect(await computed(host, 'cursor')).toBe('pointer');
      const face = host.locator('.dock-face');
      expect(await computed(face, 'border-radius')).toBe('12px');
      expect(await computed(face, 'background-color')).toBe(bgToken);
      expect(await computed(face, 'color')).toBe(accent400);
      const icon = face.locator('svg');
      const ib = await box(icon);
      expect(Math.round(ib.width)).toBe(22);
      expect(Math.round(ib.height)).toBe(22);
      await expect(icon).toHaveAttribute('aria-hidden', 'true');

      const dot = host.locator('.dock-dot');
      const db = await box(dot);
      expect(Math.round(db.width)).toBe(4);
      expect(Math.round(db.height)).toBe(4);
      expect(Math.abs(db.x + db.width / 2 - (hb.x + hb.width / 2))).toBeLessThanOrEqual(1);
      expect(db.y).toBeGreaterThanOrEqual(hb.y + hb.height);
      expect(db.y + db.height).toBeLessThanOrEqual(dockBox.y + dockBox.height - 1);
      expect(await computed(dot, 'background-color')).toBe(accent);
      expect(await computed(dot, 'transition')).toMatch(/opacity 0\.2s/);
      await expect(dot).toHaveAttribute('aria-hidden', 'true');
    }

    for (const label of LINK_LABELS) {
      const host = dockLink(page, label);
      const hb = await box(host);
      expect(Math.round(hb.width)).toBe(46);
      expect(Math.round(hb.height)).toBe(46);
      const face = host.locator('.dock-face');
      expect(await computed(face, 'border-radius')).toBe('12px');
      expect(await computed(face, 'background-color')).toBe(bgToken);
      expect(await computed(face, 'color')).toBe(neutral300);
      const ib = await box(face.locator('svg'));
      expect(Math.round(ib.width)).toBe(22);
      await expect(host.locator('.dock-dot')).toHaveCount(0);
    }

    const sep = dock(page).locator('.dock-sep');
    const sb = await box(sep);
    expect(Math.round(sb.width)).toBe(1);
    expect(Math.round(sb.height)).toBe(34);
    expect(await computed(sep, 'margin')).toBe('0px 4px 6px');
    await expect(sep).toHaveAttribute('aria-hidden', 'true');
    expect(await sep.evaluate((el) => (el as HTMLElement).tabIndex)).toBe(-1);
    expect(await computed(sep, 'background-color')).toBe(await tokenBg(page, '--color-divider'));
    expect(errors).toEqual([]);
  });

  test('T06 AC7: the dots read 1 when open, 0.4 minimized and 0 closed', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Minimize about.md' }).click();
    await page.getByRole('button', { name: 'Close terminal' }).click();
    await expectDockState(page, 'hello', 'open');
    await expectDockState(page, 'about', 'min');
    await expectDockState(page, 'term', 'closed');
    expect(errors).toEqual([]);
  });

  test('T06 AC8: the dock uses the light theme tokens after switching theme', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Switch to light mode' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    const face = dockBtn(page, 'hello').locator('.dock-face');
    await expect
      .poll(() => computed(face, 'color'))
      .toBe(await tokenColour(page, '--color-accent-400'));
    expect(await computed(face, 'background-color')).toBe(await tokenBg(page, '--color-bg'));
    expect(errors).toEqual([]);
  });

  for (const [w, h] of [
    [1280, 720],
    [1920, 1080],
  ] as const) {
    test(`T06 AC32: the minimize target (vw/2, vh-40) lies inside the dock at ${w}x${h}`, async ({
      page,
    }) => {
      const errors = watchErrors(page);
      await page.setViewportSize({ width: w, height: h });
      await page.goto('/');
      const b = await box(dock(page));
      expect(w / 2).toBeGreaterThanOrEqual(b.x);
      expect(w / 2).toBeLessThanOrEqual(b.x + b.width);
      expect(h - 40).toBeGreaterThanOrEqual(b.y);
      expect(h - 40).toBeLessThanOrEqual(b.y + b.height);
      expect(errors).toEqual([]);
    });
  }

  test('T06 AC2: at 1280x720 no default window rectangle intersects the dock', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    const d = await box(dock(page));
    for (const id of IDS) {
      const w = await box(win(page, id));
      const overlaps =
        w.x < d.x + d.width && w.x + w.width > d.x && w.y < d.y + d.height && w.y + w.height > d.y;
      expect(overlaps, id).toBe(false);
    }
    expect(errors).toEqual([]);
  });
});

test.describe('T06 dock click outcomes with real clicks', () => {
  test('T06 AC9: closed -> the window opens, front-most, in the dock', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Close terminal' }).click();
    await expect(win(page, 'term')).toHaveCount(0);
    await dockBtn(page, 'term').click();
    await expect(win(page, 'term')).toHaveAttribute('data-min', 'false');
    for (const id of IDS.filter((i) => i !== 'term')) {
      expect(await zOf(page, 'term')).toBeGreaterThan(await zOf(page, id));
    }
    await expectDockState(page, 'term', 'open');
    expect(errors).toEqual([]);
  });

  test('T06 AC9: minimized -> the window restores and is front-most', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Minimize terminal' }).click();
    await expect(win(page, 'term')).toHaveAttribute('data-min', 'true');
    await expectDockState(page, 'term', 'min');
    await dockBtn(page, 'term').click();
    await expect(win(page, 'term')).toHaveAttribute('data-min', 'false');
    for (const id of IDS.filter((i) => i !== 'term')) {
      expect(await zOf(page, 'term')).toBeGreaterThan(await zOf(page, id));
    }
    await expectDockState(page, 'term', 'open');
    expect(errors).toEqual([]);
  });

  test('T06 AC9: open but not front-most -> it comes to the front without moving', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    expect(await zOf(page, 'proj')).toBeLessThan(await zOf(page, 'hello'));
    const before = await box(win(page, 'proj'));
    await dockBtn(page, 'proj').click();
    await expect(win(page, 'proj')).toHaveAttribute('data-min', 'false');
    for (const id of IDS.filter((i) => i !== 'proj')) {
      expect(await zOf(page, 'proj')).toBeGreaterThan(await zOf(page, id));
    }
    await page.waitForTimeout(600);
    const after = await box(win(page, 'proj'));
    expect(after.x).toBeCloseTo(before.x, 0);
    expect(after.y).toBeCloseTo(before.y, 0);
    expect(errors).toEqual([]);
  });

  test('T06 AC9: open and front-most -> it minimizes into the dock', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await dockBtn(page, 'hello').click();
    await expect(win(page, 'hello')).toHaveAttribute('data-min', 'true');
    await expect(win(page, 'hello')).toHaveCSS('opacity', '0');
    await expectDockState(page, 'hello', 'min');
    expect(errors).toEqual([]);
  });

  test('T06 AC31: close then dock click first renders the minimized pose then flies out to none', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Close terminal' }).click();
    await expect(win(page, 'term')).toHaveCount(0);
    await recordPoses(page, 'term');
    await dockBtn(page, 'term').click();
    await expect(win(page, 'term')).toHaveCount(1);
    await expect(win(page, 'term')).toHaveCSS('opacity', '1');
    await expect(win(page, 'term')).toHaveCSS('transform', 'none');
    const rec = await poses(page);
    expect(rec.length).toBeGreaterThan(0);
    expect(rec[0].t).toContain('scale(0.06)');
    expect(rec[0].o).toBe('0');
    expect(rec[rec.length - 1]).toEqual({ t: 'none', o: '1' });
    expect(errors).toEqual([]);
  });

  test('T06 AC31/AC12: minimize then dock click returns to transform none at the previous position', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await dragTitle(page, 'hello', 500, 300);
    await page.waitForTimeout(700);
    const before = await box(win(page, 'hello'));
    await dockBtn(page, 'hello').click();
    await expect(win(page, 'hello')).toHaveAttribute('data-min', 'true');
    await page.waitForTimeout(700);
    await dockBtn(page, 'hello').click();
    await expect(win(page, 'hello')).toHaveAttribute('data-min', 'false');
    await expect(win(page, 'hello')).toHaveCSS('transform', 'none');
    await expect(win(page, 'hello')).toHaveCSS('opacity', '1');
    await page.waitForTimeout(700);
    const after = await box(win(page, 'hello'));
    expect(after.x).toBeCloseTo(before.x, 0);
    expect(after.y).toBeCloseTo(before.y, 0);
    expect(errors).toEqual([]);
  });

  test('T06 AC12: a moved window keeps its position across close and reopen from the dock', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await dragTitle(page, 'about', 400, 250);
    await page.waitForTimeout(700);
    const before = await box(win(page, 'about'));
    await page.getByRole('button', { name: 'Close about.md' }).click();
    await expect(win(page, 'about')).toHaveCount(0);
    await dockBtn(page, 'about').click();
    await expect(win(page, 'about')).toHaveCSS('transform', 'none');
    await page.waitForTimeout(700);
    const after = await box(win(page, 'about'));
    expect(after.x).toBeCloseTo(before.x, 0);
    expect(after.y).toBeCloseTo(before.y, 0);
    expect(errors).toEqual([]);
  });

  test('T06 AC11: rapid clicks during the genie leave the window consistent with data-min', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    const btn = dockBtn(page, 'hello');
    for (let i = 0; i < 5; i++) await btn.click({ delay: 0 });
    // Five clicks from front-most: minimize, restore, minimize, restore, minimize.
    await expect(win(page, 'hello')).toHaveAttribute('data-min', 'true');
    await expect(win(page, 'hello')).toHaveCSS('opacity', '0');
    expect(await computed(win(page, 'hello'), 'transform')).not.toBe('none');
    await expectDockState(page, 'hello', 'min');

    for (let i = 0; i < 4; i++) await btn.click({ delay: 0 });
    await expect(win(page, 'hello')).toHaveAttribute('data-min', 'true');
    await btn.click();
    await expect(win(page, 'hello')).toHaveAttribute('data-min', 'false');
    await expect(win(page, 'hello')).toHaveCSS('opacity', '1');
    await expect(win(page, 'hello')).toHaveCSS('transform', 'none');
    await expectDockState(page, 'hello', 'open');
    expect(errors).toEqual([]);
  });
});

test.describe('T06 dock pointer isolation (AC13, AC14, AC16)', () => {
  test('T06 AC13: pointer-down on the dock raises nothing and the dock is on top of a window dragged under it', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    // Drag proj so its body sits under the dock.
    await dragTitle(page, 'proj', 640, 660);
    await page.waitForTimeout(700);
    const p = await box(win(page, 'proj'));
    const d = await box(dock(page));
    expect(p.y + p.height).toBeGreaterThan(d.y);
    expect(p.x).toBeLessThan(d.x + d.width);

    const before = await Promise.all(IDS.map((i) => zOf(page, i)));
    const boxesBefore = await Promise.all(IDS.map((i) => box(win(page, i))));
    // Dock padding above the controls, centred.
    const px = d.x + d.width / 2;
    const py = d.y + 3;
    const hit = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.closest('nav')?.getAttribute('aria-label'),
      [px, py],
    );
    expect(hit).toBe('Dock');
    await page.mouse.move(px, py);
    await page.mouse.down();
    await page.mouse.move(px + 120, py - 150, { steps: 4 });
    await page.mouse.up();
    expect(await Promise.all(IDS.map((i) => zOf(page, i)))).toEqual(before);
    const boxesAfter = await Promise.all(IDS.map((i) => box(win(page, i))));
    expect(boxesAfter).toEqual(boxesBefore);
    for (const id of IDS) await expect(win(page, id)).toHaveAttribute('data-min', 'false');

    // The dock controls remain clickable over the window beneath.
    const centre = async (loc: Locator) => {
      const b = await box(loc);
      return [b.x + b.width / 2, b.y + b.height / 2] as const;
    };
    for (const loc of [dockBtn(page, 'proj'), dockBtn(page, 'term'), dockLink(page, 'GitHub')]) {
      const [x, y] = await centre(loc);
      const inside = await page.evaluate(
        ([cx, cy]) => !!document.elementFromPoint(cx, cy)?.closest('nav[aria-label="Dock"]'),
        [x, y],
      );
      expect(inside).toBe(true);
    }
    expect(errors).toEqual([]);
  });

  test('T06 AC13: the dock draws above the pinned site window', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.getByRole('menuitem', { name: 'tanzi.os', exact: true }).click();
    await page.getByRole('menu').locator('[role^="menuitem"]').first().click();
    await expect(win(page, 'site')).toHaveCount(1);
    await page.waitForTimeout(700);
    await dragTitle(page, 'site', 640, 690);
    await page.waitForTimeout(700);
    const s = await box(win(page, 'site'));
    const d = await box(dock(page));
    expect(s.y + s.height).toBeGreaterThan(d.y);
    const hit = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.closest('nav')?.getAttribute('aria-label'),
      [d.x + d.width / 2, d.y + 3],
    );
    expect(hit).toBe('Dock');
    const zs = await Promise.all(IDS.map((i) => zOf(page, i)));
    await page.mouse.move(d.x + d.width / 2, d.y + 3);
    await page.mouse.down();
    await page.mouse.up();
    expect(await Promise.all(IDS.map((i) => zOf(page, i)))).toEqual(zs);
    expect(errors).toEqual([]);
  });

  test('T06 AC14: clicking a dock button with a menu open closes the menu and still acts', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.getByRole('menuitem', { name: 'Windows', exact: true }).click();
    await expect(page.getByRole('menu')).toHaveCount(1);
    await dockBtn(page, 'hello').click();
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(win(page, 'hello')).toHaveAttribute('data-min', 'true');
    expect(errors).toEqual([]);
  });

  test('T06 AC14/AC16: clicking GitHub with a menu open closes the menu, opens a new tab and changes no window', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page
      .context()
      .route('https://github.com/**', (r) =>
        r.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub</title>' }),
      );
    await page.goto('/');
    await page.getByRole('menuitem', { name: 'View', exact: true }).click();
    await expect(page.getByRole('menu')).toHaveCount(1);
    const popup = page.waitForEvent('popup');
    await dockLink(page, 'GitHub').click();
    const p = await popup;
    expect(p.url()).toMatch(/^https:\/\/github\.com\//);
    await p.close();
    await expect(page.getByRole('menu')).toHaveCount(0);
    for (const id of IDS) {
      await expect(win(page, id)).toHaveAttribute('data-min', 'false');
      await expectDockState(page, id, 'open');
    }
    expect(errors).toEqual([]);
  });

  test('T06 AC16: link hrefs and attributes come from the spec; Email has no target', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await expect(dockLink(page, 'GitHub')).toHaveAttribute('href', /^https:\/\/github\.com/);
    await expect(dockLink(page, 'LinkedIn')).toHaveAttribute('href', /^https:\/\/linkedin\.com/);
    for (const l of ['GitHub', 'LinkedIn']) {
      await expect(dockLink(page, l)).toHaveAttribute('target', '_blank');
      await expect(dockLink(page, l)).toHaveAttribute('rel', 'noopener noreferrer');
    }
    await expect(dockLink(page, 'Email')).toHaveAttribute('href', /^mailto:.+@.+/);
    expect(await dockLink(page, 'Email').getAttribute('target')).toBeNull();
    // Same hrefs as the menubar links.
    for (const l of LINK_LABELS) {
      const bar = await page
        .getByRole('banner')
        .getByRole('link', { name: l, exact: true })
        .getAttribute('href');
      expect(await dockLink(page, l).getAttribute('href')).toBe(bar);
      await expect(dockLink(page, l)).toHaveAttribute('title', l);
    }
    expect(errors).toEqual([]);
  });
});

test.describe('T06 dock keyboard (AC25, AC26, AC27)', () => {
  test('T06 AC25: Tab reaches the menubar, then the windows, then the eight dock controls in order', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    // DELIBERATE REQUIREMENT CHANGE (T07 AC52): the hello body adds three stops, so 23 -> 26,
    // the dock starts at index 18, and the distinct stops after the menubar go 18 -> 21.
    // DELIBERATE REQUIREMENT CHANGE (T07 AC52): the experience body adds two stops, so 26 -> 28,
    // the dock starts at index 20, and the distinct stops after the menubar go 21 -> 23.
    // DELIBERATE REQUIREMENT CHANGE (T07 AC52): the projects body adds four tile stops, so
    // 28 -> 32, the dock starts at index 24, and the distinct stops after the menubar go 23 -> 27.
    // DELIBERATE REQUIREMENT CHANGE (T07 AC52): the terminal input adds one stop, so 32 -> 33,
    // the dock starts at index 25, and the distinct stops after the menubar go 27 -> 28.
    const labels = await tabLabels(page, 33);
    expect(labels[0]).toBe('tanzi.os');
    expect(labels[5]).toBe('Minimize hello.txt');
    expect(labels.slice(25)).toEqual([...IDS.map((i) => TITLES[i]), ...LINK_LABELS]);
    expect(new Set(labels.slice(5)).size).toBe(28);
    expect(errors).toEqual([]);
  });

  test('T06 AC27: minimized windows are skipped and every dock control shows a focus ring', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Minimize terminal' }).click();
    await page.getByRole('button', { name: 'Minimize about.md' }).click();
    await expect(win(page, 'term')).toHaveAttribute('data-min', 'true');
    // DELIBERATE REQUIREMENT CHANGE (T07 AC52): 5 menubar + 9 window stops (3 windows, hello
    // having 5) + 8 dock stops.
    const ringed: string[] = [];
    const labels: string[] = [];
    // DELIBERATE REQUIREMENT CHANGE (T07 AC52): the experience body adds two window stops,
    // so 22 -> 24.
    // DELIBERATE REQUIREMENT CHANGE (T07 AC52): the projects body adds four window stops,
    // so 24 -> 28.
    for (let i = 0; i < 28; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const cs = getComputedStyle(el);
        return {
          label: el.getAttribute('aria-label') ?? '',
          inDock: !!el.closest('nav[aria-label="Dock"]'),
          style: cs.outlineStyle,
          width: parseFloat(cs.outlineWidth),
        };
      });
      labels.push(info.label);
      if (info.inDock) {
        expect(info.style, info.label).not.toBe('none');
        expect(info.width, info.label).toBeGreaterThan(0);
        ringed.push(info.label);
      }
    }
    expect(labels.some((l) => l.endsWith('terminal') && l !== 'terminal')).toBe(false);
    expect(labels.some((l) => l.endsWith('about.md') && l !== 'about.md')).toBe(false);
    expect(ringed).toEqual([...IDS.map((i) => TITLES[i]), ...LINK_LABELS]);
    expect(await computed(dock(page), 'overflow')).toBe('visible');
    expect(errors).toEqual([]);
  });

  for (const [name, key] of [
    ['Enter', 'Enter'],
    ['Space', 'Space'],
  ] as const) {
    test(`T06 AC25/AC26: ${name} on a dock button gives all four outcomes and focus stays on it`, async ({
      page,
    }) => {
      const errors = watchErrors(page);
      await page.goto('/');
      const activeIs = async (label: string) => expect(await focusedLabel(page)).toBe(label);

      // closed -> open
      await page.getByRole('button', { name: 'Close terminal' }).click();
      await dockBtn(page, 'term').focus();
      await page.keyboard.press(key);
      await expect(win(page, 'term')).toHaveAttribute('data-min', 'false');
      await activeIs('terminal');
      // front-most -> minimize
      await page.keyboard.press(key);
      await expect(win(page, 'term')).toHaveAttribute('data-min', 'true');
      await expectDockState(page, 'term', 'min');
      await activeIs('terminal');
      // minimized -> restore
      await page.keyboard.press(key);
      await expect(win(page, 'term')).toHaveAttribute('data-min', 'false');
      await activeIs('terminal');
      // open, not front-most -> focus
      await dockBtn(page, 'proj').focus();
      expect(await zOf(page, 'proj')).toBeLessThan(await zOf(page, 'term'));
      await page.keyboard.press(key);
      expect(await zOf(page, 'proj')).toBeGreaterThan(await zOf(page, 'term'));
      await activeIs('projects');
      expect(await page.evaluate(() => document.activeElement === document.body)).toBe(false);
      expect(errors).toEqual([]);
    });
  }
});

test.describe('T06 AC19 dock clicks under reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('T06 AC19: open, minimize and restore from the dock still work with no genie or fly-out transform', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Close terminal' }).click();
    await recordPoses(page, 'term');
    await dockBtn(page, 'term').click();
    await expect(win(page, 'term')).toHaveAttribute('data-min', 'false');
    await expect(win(page, 'term')).toHaveCSS('opacity', '1');
    await expect(win(page, 'term')).toHaveCSS('transform', 'none');
    await expectDockState(page, 'term', 'open');

    // Front-most now, so a click minimizes: fades only, no genie transform.
    await dockBtn(page, 'term').click();
    await expect(win(page, 'term')).toHaveAttribute('data-min', 'true');
    await expect(win(page, 'term')).toHaveCSS('opacity', '0');
    await expect(win(page, 'term')).toHaveCSS('transform', 'none');
    await expectDockState(page, 'term', 'min');

    await dockBtn(page, 'term').click();
    await expect(win(page, 'term')).toHaveAttribute('data-min', 'false');
    await expect(win(page, 'term')).toHaveCSS('transform', 'none');
    await expect(win(page, 'term')).toHaveCSS('opacity', '1');

    for (const r of await poses(page)) expect(r.t).not.toContain('scale(');
    // Focus outcome still works.
    await dockBtn(page, 'proj').click();
    expect(await zOf(page, 'proj')).toBeGreaterThan(await zOf(page, 'term'));
    expect(errors).toEqual([]);
  });
});
