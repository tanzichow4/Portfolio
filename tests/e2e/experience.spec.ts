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

test.use({ colorScheme: 'dark', viewport: { width: 1280, height: 720 } });

const STATS: Record<string, string[]> = {
  'Tartigrade Ltd.': [
    'Led onboarding for a multi-tenant web platform',
    'Built a natural-language-to-SQL engine on a local model',
    'Wrote a security review',
  ],
  'General Dynamics Mission Systems': [
    'Redesigned a legacy system, cutting runtime from 33 hours to 3',
    'Raised coverage by 80% with PyTest',
    'Automated deploy config in Python',
  ],
  'University of Calgary': ['IoT, data and ML projects'],
};
const ORGS = Object.keys(STATS);

const win = (page: Page) => page.locator('[data-win="exp"]');
const tabs = (page: Page) => win(page).getByRole('tab');
const panel = (page: Page) => win(page).getByRole('tabpanel');
const dock = (page: Page) => page.getByRole('navigation', { name: 'Dock' });
const box = async (loc: Locator) => {
  const b = await loc.boundingBox();
  if (!b) throw new Error('no bounding box');
  return b;
};
const waitSettled = (page: Page) =>
  expect
    .poll(
      () =>
        page.evaluate(() => {
          const w = document.querySelector('[data-win="exp"]');
          if (!w || w.getAnimations().length > 0) return false;
          return Math.abs(w.getBoundingClientRect().height - 400) <= 2;
        }),
      { timeout: 5000 },
    )
    .toBe(true);

const openFromDock = async (page: Page) => {
  await page.goto('/');
  await dock(page).locator('button.dock-win[aria-label="experience.log"]').click();
  await expect(win(page)).toBeVisible();
  await waitSettled(page);
};
const setLight = async (page: Page) => {
  await page.getByRole('menuitem', { name: 'View', exact: true }).click();
  await page
    .getByRole('menu')
    .locator('[role^="menuitem"]')
    .filter({ hasText: /^Light mode$/ })
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
};

/** Asserts exp is on top and its pill and first stat are hit-testable inside the exp window. */
const expectUsable = async (page: Page) => {
  await expect(win(page)).toBeVisible();
  await waitSettled(page);
  const zs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-win]')).map((w) => ({
      id: (w as HTMLElement).dataset.win,
      z: Number(getComputedStyle(w).zIndex),
    })),
  );
  const expZ = zs.find((w) => w.id === 'exp')!.z;
  for (const w of zs) if (w.id !== 'exp') expect(expZ, `exp above ${w.id}`).toBeGreaterThan(w.z);
  for (const sel of ['.exp-org', '.exp-stats li']) {
    const hit = await page.evaluate((s) => {
      const el = document.querySelector(`[data-win="exp"] ${s}`)!;
      const r = el.getBoundingClientRect();
      const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return h?.closest('[data-win]')?.getAttribute('data-win');
    }, sel);
    expect(hit, `${sel} hit-tests to exp`).toBe('exp');
  }
};

test.describe('T17 experience window (e2e)', () => {
  for (const mode of ['dark', 'light'] as const) {
    test(`T17 AC11 AC14: ${mode}: window is 600 wide and 400 tall on every tab`, async ({
      page,
    }) => {
      const errors = watchErrors(page);
      await openFromDock(page);
      if (mode === 'light') await setLight(page);
      await expect(tabs(page)).toHaveCount(ORGS.length);
      for (let i = 0; i < ORGS.length; i++) {
        await tabs(page).nth(i).click();
        await expect(tabs(page).nth(i)).toHaveAttribute('aria-selected', 'true');
        const b = await box(win(page));
        expect(Math.abs(b.width - 600), `tab ${i} width ${b.width}`).toBeLessThanOrEqual(2);
        expect(Math.abs(b.height - 400), `tab ${i} height ${b.height}`).toBeLessThanOrEqual(2);
        const rail = await box(win(page).locator('.exp-rail'));
        expect(Math.abs(rail.width - 150)).toBeLessThanOrEqual(1);
      }
      expect(errors).toEqual([]);
    });

    test(`T17 AC7 AC8: ${mode}: the pill shows @ Tartigrade Ltd. in the theme token colours`, async ({
      page,
    }) => {
      const errors = watchErrors(page);
      await openFromDock(page);
      if (mode === 'light') await setLight(page);
      const pill = win(page).locator('.exp-org');
      await expect(pill).toBeVisible();
      await expect(pill).toHaveText('@ Tartigrade Ltd.');
      const got = await pill.evaluate((el) => {
        const probe = document.createElement('span');
        probe.style.backgroundColor = 'var(--color-org-pill-bg)';
        probe.style.color = 'var(--color-org-pill-text)';
        document.body.appendChild(probe);
        const p = getComputedStyle(probe);
        const exp = { bg: p.backgroundColor, fg: p.color };
        probe.remove();
        const c = getComputedStyle(el);
        return { bg: c.backgroundColor, fg: c.color, exp, radius: c.borderTopLeftRadius };
      });
      expect(got.bg).not.toBe('rgba(0, 0, 0, 0)');
      expect(got.bg).toBe(got.exp.bg);
      expect(got.fg).toBe(got.exp.fg);
      expect(parseFloat(got.radius)).toBeGreaterThan(8);
      const pb = await box(pill);
      const inner = await panel(page).evaluate((el) => {
        const cs = getComputedStyle(el);
        return el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      });
      expect(pb.width, 'pill sizes to content').toBeLessThan(inner - 40);
      expect(errors).toEqual([]);
    });
  }

  test('T17 AC13: the window sits between the menubar and the dock at (64, 244)', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await openFromDock(page);
    const b = await box(win(page));
    const d = await box(dock(page));
    expect(Math.round(b.x)).toBe(64);
    expect(Math.round(b.y)).toBe(244);
    expect(b.y).toBeGreaterThanOrEqual(36);
    expect(b.y + b.height).toBeLessThanOrEqual(d.y + 0.5);
    expect(b.x).toBeGreaterThanOrEqual(16);
    expect(b.x + b.width).toBeLessThanOrEqual(1264);
    expect(errors).toEqual([]);
  });

  test('T17 AC5 AC4: each tab lists exactly its own stats in order and no paragraph description', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await openFromDock(page);
    for (let i = 0; i < ORGS.length; i++) {
      await tabs(page).nth(i).click();
      await expect(win(page).locator('.exp-org')).toHaveText(`@ ${ORGS[i]}`);
      await expect(win(page).locator('ul.exp-stats li')).toHaveText(STATS[ORGS[i]]);
      await expect(win(page).locator('.exp-desc')).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  });

  test('T17 AC15: forced tall content scrolls the panel, not the window or page', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await openFromDock(page);
    await panel(page).evaluate((el) => {
      const d = document.createElement('div');
      d.style.height = '900px';
      d.textContent = 'tall filler';
      el.appendChild(d);
    });
    const before = await box(win(page));
    const m = await panel(page).evaluate((el) => ({
      sh: el.scrollHeight,
      ch: el.clientHeight,
      sw: el.scrollWidth,
      cw: el.clientWidth,
      oy: getComputedStyle(el).overflowY,
    }));
    expect(m.sh).toBeGreaterThan(m.ch);
    expect(m.sw).toBeLessThanOrEqual(m.cw);
    expect(m.oy).toBe('auto');
    expect(Math.abs(before.height - 400)).toBeLessThanOrEqual(2);

    const pb = await box(panel(page));
    await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
    await page.mouse.wheel(0, 200);
    await expect.poll(() => panel(page).evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    const after = await box(win(page));
    expect(after.x).toBe(before.x);
    expect(after.y).toBe(before.y);
    expect(Math.abs(after.height - 400)).toBeLessThanOrEqual(2);
    expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(0);

    await panel(page).evaluate((el) => (el.scrollTop = 0));
    await panel(page).focus();
    await page.keyboard.press('End');
    await expect.poll(() => panel(page).evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    expect(await panel(page).evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none');
    expect(errors).toEqual([]);
  });

  test('T17 AC16: opening from the dock raises exp with pill and stats clickable', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await openFromDock(page);
    await expectUsable(page);
    expect(errors).toEqual([]);
  });

  test('T17 AC16: opening from the Windows menu raises exp with pill and stats clickable', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.getByRole('menuitem', { name: 'Windows', exact: true }).click();
    await page
      .getByRole('menu')
      .locator('[role^="menuitem"]')
      .filter({ hasText: /experience\.log/ })
      .click();
    await expectUsable(page);
    expect(errors).toEqual([]);
  });

  test("T17 AC16: opening from hello's What I've been up to raises exp", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.getByRole('button', { name: /What I've been up to/ }).click();
    await expectUsable(page);
    expect(errors).toEqual([]);
  });

  test('T17 AC16: terminal open experience raises exp', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await dock(page).locator('button.dock-win[aria-label="terminal"]').click();
    const input = page
      .locator('[data-win="term"]')
      .getByRole('textbox', { name: 'Terminal command' });
    await expect(input).toBeVisible();
    await page.waitForTimeout(600);
    await input.fill('open experience');
    await input.press('Enter');
    await expectUsable(page);
    expect(errors).toEqual([]);
  });

  test('T17 AC16: drag clamps with 80px left on screen, minimize and restore work, close removes it', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await openFromDock(page);
    const tb = await box(win(page).locator('.win-titlebar'));
    const sx = tb.x + tb.width / 2;
    const sy = tb.y + tb.height / 2;
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(sx - 400, sy, { steps: 8 });
    await page.mouse.move(sx - 900, sy, { steps: 8 });
    await page.mouse.up();
    expect(Math.abs((await box(win(page))).x - -520)).toBeLessThanOrEqual(4);

    const btn = dock(page).locator('button.dock-win[aria-label="experience.log"]');
    await btn.click();
    await expect(win(page)).toHaveAttribute('data-min', 'true');
    await btn.click();
    await expect(win(page)).toHaveAttribute('data-min', 'false');
    await waitSettled(page);
    expect(Math.abs((await box(win(page))).height - 400)).toBeLessThanOrEqual(2);

    await win(page).getByRole('button', { name: 'Close experience.log' }).click();
    await expect(win(page)).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('T17 AC18: the phone page lists the stats without horizontal overflow at 320px', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/');
    const main = page.locator('main.phone');
    await expect(main).toBeVisible();
    for (const s of ORGS.flatMap((o) => STATS[o])) {
      await expect(main.getByText(s, { exact: true })).toBeVisible();
    }
    const ov = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
    }));
    expect(ov.sw).toBeLessThanOrEqual(ov.cw);
    expect(errors).toEqual([]);
  });
});
