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

type Id = 'hello' | 'about' | 'exp' | 'proj' | 'term' | 'site';
const DEFAULT5: Id[] = ['hello', 'about', 'exp', 'proj', 'term'];
// Heights from the T07 plan (WIN_META after the coder's measurements).
const ABOUT_H = 396;
const HEIGHTS: Record<Id, number> = {
  // DELIBERATE REQUIREMENT CHANGE (T15 AC25): hello now wraps its four buttons onto two rows, so WIN_META.hello.height is 473 (AC17).
  hello: 473,
  // DELIBERATE REQUIREMENT CHANGE (T16 AC9): the 'See some data viz' button makes about taller, so WIN_META.about.height is the new measured value.
  about: ABOUT_H,
  // DELIBERATE REQUIREMENT CHANGE (T17 AC14): experience window grows from 290 to 400 (AC11).
  exp: 400,
  proj: 385,
  term: 270,
  site: 282,
};
const TITLES: Record<Id, string> = {
  hello: 'hello.txt',
  about: 'about.md',
  exp: 'experience.log',
  proj: 'projects',
  term: 'terminal',
  site: 'About this site',
};

const win = (page: Page, id: Id) => page.locator(`[data-win="${id}"]`);
const dock = (page: Page) => page.locator('nav[aria-label="Dock"]');
const dockBtn = (page: Page, id: Id) =>
  dock(page).getByRole('button', { name: TITLES[id], exact: true });
const minBtn = (page: Page, id: Id) =>
  page.getByRole('button', { name: `Minimize ${TITLES[id]}`, exact: true });
const closeBtn = (page: Page, id: Id) =>
  page.getByRole('button', { name: `Close ${TITLES[id]}`, exact: true });
const input = (page: Page) => win(page, 'term').getByRole('textbox', { name: 'Terminal command' });
const log = (page: Page) => win(page, 'term').getByRole('log');
const verb = (page: Page) => win(page, 'hello').locator('.hello-verb');
const tabs = (page: Page) => win(page, 'exp').getByRole('tab');
const panel = (page: Page) => win(page, 'exp').getByRole('tabpanel');
const bar = (page: Page) => page.getByRole('banner');
const trigger = (page: Page, name: string) =>
  bar(page).getByRole('menuitem', { name, exact: true });

const box = async (loc: Locator) => {
  const b = await loc.boundingBox();
  if (!b) throw new Error('no bounding box');
  return b;
};
const chooseItem = async (page: Page, menu: string, item: string) => {
  await trigger(page, menu).click();
  const escaped = item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await page
    .getByRole('menu')
    .locator('[role^="menuitem"]')
    .filter({ hasText: new RegExp(`^${escaped}$`) })
    .click();
};
const load = async (page: Page, size?: { width: number; height: number }) => {
  if (size) await page.setViewportSize(size);
  await page.goto('/');
  // DELIBERATE REQUIREMENT CHANGE (T15 AC25): only hello is open on load, so open the other windows from the dock first.
  await openAllFromDock(page);
  await page.evaluate(() => document.fonts.ready);
  await expect(win(page, 'hello')).toBeVisible();
};
const openSite = async (page: Page) => {
  await chooseItem(page, 'tanzi.os', 'About this site');
  await expect(win(page, 'site')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000); // let the open animation settle before measuring
};
const z = (page: Page, id: Id) =>
  win(page, id).evaluate((el) => Number(getComputedStyle(el).zIndex));
const activeInWin = (page: Page) =>
  page.evaluate(() => document.activeElement?.closest('[data-win]')?.getAttribute('data-win'));
const inputFocused = (page: Page) =>
  page.evaluate(() => document.activeElement?.classList.contains('term-input') === true);
const selectionText = (page: Page) => page.evaluate(() => window.getSelection()?.toString() ?? '');

/** Types a command into the terminal and presses Enter. */
const run = async (page: Page, cmd: string) => {
  await input(page).fill(cmd);
  await input(page).press('Enter');
};
/** Raises a window by clicking any part of it that is hit-tested to it (windows overlap). */
const raise = async (page: Page, id: Id) => {
  const p = await page.evaluate((wid) => {
    const w = document.querySelector(`[data-win="${wid}"]`)!;
    const r = w.getBoundingClientRect();
    for (let y = r.top + 6; y < r.bottom - 4; y += 6) {
      for (let x = r.left + 6; x < r.right - 4; x += 6) {
        const hit = document.elementFromPoint(x, y);
        if (hit?.closest('[data-win]') === w && !hit.closest('a,button,input,[role="tab"]'))
          return { x, y };
      }
    }
    return null;
  }, id);
  if (!p) throw new Error(`no exposed point on ${id}`);
  await page.mouse.click(p.x, p.y);
};

/** Finds a point inside the body of `id` that is actually hit-tested to that window. */
const exposedPoint = (page: Page, id: Id) =>
  page.evaluate((wid) => {
    const w = document.querySelector(`[data-win="${wid}"]`)!;
    const r = w.getBoundingClientRect();
    const tb = w.querySelector('.win-titlebar')!.getBoundingClientRect();
    for (let y = r.bottom - 8; y > tb.bottom + 4; y -= 10) {
      for (let x = r.right - 8; x > r.left + 4; x -= 10) {
        const hit = document.elementFromPoint(x, y);
        if (hit?.closest('[data-win]') === w && !hit.closest('a,button,input,[role="tab"]'))
          return { x, y };
      }
    }
    return null;
  }, id);

test.describe('T07 window contents, cross-window', () => {
  test('T07 AC47: every default window renders within 2px of its WIN_META height at 1280x720', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await load(page, { width: 1280, height: 720 });
    for (const id of DEFAULT5) {
      const b = await box(win(page, id));
      expect(Math.abs(b.height - HEIGHTS[id]), `${id} height ${b.height}`).toBeLessThanOrEqual(2);
    }
    expect(errors).toEqual([]);
  });

  test('T07 AC47: the About this site window renders within 2px of its height', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await load(page, { width: 1280, height: 720 });
    await openSite(page);
    const b = await box(win(page, 'site'));
    expect(Math.abs(b.height - HEIGHTS.site), `site height ${b.height}`).toBeLessThanOrEqual(2);
    expect(errors).toEqual([]);
  });

  test('T07 AC47 AC30: the experience window keeps its height on every tab', async ({ page }) => {
    const errors = watchErrors(page);
    await load(page, { width: 1280, height: 720 });
    await raise(page, 'exp');
    const n = await tabs(page).count();
    expect(n).toBeGreaterThan(1);
    for (let i = 0; i < n; i++) {
      await tabs(page).nth(i).click();
      await expect(tabs(page).nth(i)).toHaveAttribute('aria-selected', 'true');
      const b = await box(win(page, 'exp'));
      expect(Math.abs(b.height - HEIGHTS.exp), `tab ${i} height ${b.height}`).toBeLessThanOrEqual(
        2,
      );
    }
    expect(errors).toEqual([]);
  });

  for (const size of [
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
  ]) {
    test(`T07 AC48: every default window sits above the dock and inside the viewport at ${size.width}x${size.height}`, async ({
      page,
    }) => {
      const errors = watchErrors(page);
      await load(page, size);
      const d = await box(dock(page));
      for (const id of DEFAULT5) {
        const b = await box(win(page, id));
        expect(b.y + b.height, `${id} bottom`).toBeLessThanOrEqual(d.y + 0.5);
        expect(b.y, `${id} top`).toBeGreaterThanOrEqual(36);
        expect(b.x, `${id} left`).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width, `${id} right`).toBeLessThanOrEqual(size.width);
      }
      expect(errors).toEqual([]);
    });
  }

  test('T07 AC22: dragging across the about text selects it and the selection survives release', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await load(page);
    await raise(page, 'about');
    const p = await box(win(page, 'about').locator('p').first());
    await page.mouse.move(p.x + 2, p.y + 4);
    await page.mouse.down();
    await page.mouse.move(p.x + p.width - 4, p.y + p.height - 4, { steps: 8 });
    await page.mouse.up();
    const text = await selectionText(page);
    expect(text.length).toBeGreaterThan(10);
    expect(await page.evaluate(() => window.getSelection()!.isCollapsed)).toBe(false);
    // The selection lies inside the about window.
    expect(
      await page.evaluate(
        () =>
          !!document
            .querySelector('[data-win="about"]')
            ?.contains(window.getSelection()!.anchorNode),
      ),
    ).toBe(true);
    await page.waitForTimeout(200);
    expect(await selectionText(page)).toBe(text);
    expect(errors).toEqual([]);
  });

  test('T07 AC30: dragging across the experience panel text selects it and the selection survives release', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await load(page);
    await raise(page, 'exp');
    // DELIBERATE REQUIREMENT CHANGE (T17 AC4): p.exp-desc is replaced by ul.exp-stats.
    const d = await box(panel(page).locator('.exp-stats'));
    await page.mouse.move(d.x + 2, d.y + 4);
    await page.mouse.down();
    await page.mouse.move(d.x + d.width - 4, d.y + d.height - 4, { steps: 8 });
    await page.mouse.up();
    const text = await selectionText(page);
    expect(text.length).toBeGreaterThan(10);
    await page.waitForTimeout(200);
    expect(await selectionText(page)).toBe(text);
    expect(errors).toEqual([]);
  });

  test('T07 AC44: dragging across terminal output selects it, survives release, and focus does not move to the input', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await load(page);
    await raise(page, 'term');
    await run(page, 'help');
    await run(page, 'whoami');
    // Move focus away from the input so we can see whether a drag pulls it back.
    await page.locator('body').click({ position: { x: 5, y: 300 } });
    expect(await inputFocused(page)).toBe(false);
    await raise(page, 'term');
    const lines = log(page).locator('.term-line');
    const a = await box(lines.nth(1));
    const b = await box(lines.nth(3));
    await page.mouse.move(a.x + 4, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width - 20, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
    const text = await selectionText(page);
    expect(text.length).toBeGreaterThan(5);
    expect(await inputFocused(page)).toBe(false);
    await page.waitForTimeout(200);
    expect(await selectionText(page)).toBe(text);
    expect(await inputFocused(page)).toBe(false);
    expect(errors).toEqual([]);
  });

  test('T07 AC44: a plain click in the terminal body focuses the input', async ({ page }) => {
    const errors = watchErrors(page);
    await load(page);
    await raise(page, 'term');
    expect(await inputFocused(page)).toBe(false);
    const p = await exposedPoint(page, 'term');
    expect(p).not.toBeNull();
    await page.mouse.click(p!.x, p!.y);
    expect(await inputFocused(page)).toBe(true);
    await page.locator('body').click({ position: { x: 5, y: 300 } });
    expect(await inputFocused(page)).toBe(false);
    const l = await box(log(page).locator('.term-line').first());
    await page.mouse.click(l.x + 6, l.y + l.height / 2);
    expect(await inputFocused(page)).toBe(true);
    expect(errors).toEqual([]);
  });

  test('T07 AC6: dragging from inside a window body leaves the window in place', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await load(page);
    for (const id of DEFAULT5) {
      await raise(page, id);
      const before = await box(win(page, id));
      const p = await exposedPoint(page, id);
      expect(p, `${id} has an exposed body point`).not.toBeNull();
      await page.mouse.move(p!.x, p!.y);
      await page.mouse.down();
      await page.mouse.move(p!.x - 80, p!.y - 60, { steps: 6 });
      await page.mouse.move(p!.x - 160, p!.y - 90, { steps: 6 });
      await page.mouse.up();
      await page.waitForTimeout(100);
      const after = await box(win(page, id));
      expect(Math.round(after.x), `${id} x`).toBe(Math.round(before.x));
      expect(Math.round(after.y), `${id} y`).toBe(Math.round(before.y));
      await page.mouse.click(5, 300);
    }
    expect(errors).toEqual([]);
  });

  test('T07 AC6: pointer-down in a body raises that window', async ({ page }) => {
    const errors = watchErrors(page);
    await load(page);
    for (const id of ['proj', 'term', 'exp', 'about', 'hello'] as Id[]) {
      const p = await exposedPoint(page, id);
      expect(p, `${id} has an exposed body point`).not.toBeNull();
      await page.mouse.click(p!.x, p!.y);
      const mine = await z(page, id);
      for (const other of DEFAULT5.filter((o) => o !== id)) {
        expect(mine, `${id} above ${other}`).toBeGreaterThan(await z(page, other));
      }
    }
    expect(errors).toEqual([]);
  });

  test('T07 AC11: exact Tab order inside each window, ring on every stop, ring inside its window, and no stops in minimized windows', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await load(page);
    await openSite(page);
    const tile = (i: number) => win(page, 'proj').locator('a').nth(i);
    const orders: Record<Id, Locator[]> = {
      hello: [
        minBtn(page, 'hello'),
        closeBtn(page, 'hello'),
        verb(page),
        // DELIBERATE REQUIREMENT CHANGE (T15 AC25): the two new hello buttons add two tab stops, so 5 -> 7.
        win(page, 'hello').getByRole('button', { name: "See what I've built" }),
        win(page, 'hello').getByRole('button', { name: 'More about me' }),
        win(page, 'hello').getByRole('button', { name: "What I've been up to" }),
        win(page, 'hello').getByRole('link', { name: 'Say hi' }),
      ],
      // DELIBERATE REQUIREMENT CHANGE (T16 AC6): about's body adds the 'See some data viz' stop.
      about: [
        minBtn(page, 'about'),
        closeBtn(page, 'about'),
        win(page, 'about').getByRole('button', { name: 'See some data viz' }),
      ],
      exp: [minBtn(page, 'exp'), closeBtn(page, 'exp'), tabs(page).first(), panel(page)],
      proj: [minBtn(page, 'proj'), closeBtn(page, 'proj'), tile(0), tile(1), tile(2), tile(3)],
      term: [minBtn(page, 'term'), closeBtn(page, 'term'), input(page)],
      site: [closeBtn(page, 'site')],
    };
    // The page holds exactly these focusable controls in each window.
    for (const id of Object.keys(orders) as Id[]) {
      const count = await win(page, id).evaluate(
        (el) =>
          Array.from(
            el.querySelectorAll<HTMLElement>('a[href],button,input,textarea,select,[tabindex]'),
          ).filter((e) => e.tabIndex >= 0).length,
      );
      expect(count, `${id} stop count`).toBe(orders[id].length);
    }
    expect(await tile(3).count()).toBe(1);
    expect(await win(page, 'proj').locator('a').count()).toBe(4);

    for (const id of Object.keys(orders) as Id[]) {
      const stops = orders[id];
      await stops[0].focus();
      // Programmatic focus after a pointer click is not :focus-visible; a key press switches modality.
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      for (let i = 0; i < stops.length; i++) {
        if (i > 0) await page.keyboard.press('Tab');
        await expect(stops[i], `${id} stop ${i}`).toBeFocused();
        const info = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement;
          const cs = getComputedStyle(el);
          const w = el.closest('[data-win]')!.getBoundingClientRect();
          const r = el.getBoundingClientRect();
          const grow = parseFloat(cs.outlineOffset) + parseFloat(cs.outlineWidth);
          const ring = {
            l: r.left - grow,
            t: r.top - grow,
            r: r.right + grow,
            b: r.bottom + grow,
          };
          // The ring must also fit inside every ancestor that clips (overflow other than visible).
          const clips: string[] = [];
          for (let p = el.parentElement; p; p = p.parentElement) {
            const o = getComputedStyle(p).overflow;
            if (o === 'visible') continue;
            const pr = p.getBoundingClientRect();
            if (
              ring.l < pr.left - 0.5 ||
              ring.t < pr.top - 0.5 ||
              ring.r > pr.right + 0.5 ||
              ring.b > pr.bottom + 0.5
            )
              clips.push(p.className || p.tagName);
            if (p.hasAttribute('data-win')) break;
          }
          return {
            style: cs.outlineStyle,
            width: parseFloat(cs.outlineWidth),
            matches: el.matches(':focus-visible'),
            inWin:
              ring.l >= w.left - 0.5 &&
              ring.t >= w.top - 0.5 &&
              ring.r <= w.right + 0.5 &&
              ring.b <= w.bottom + 0.5,
            clips,
          };
        });
        expect(info.matches, `${id} stop ${i} :focus-visible`).toBe(true);
        expect(info.style, `${id} stop ${i} outline-style`).not.toBe('none');
        expect(info.width, `${id} stop ${i} outline-width`).toBeGreaterThanOrEqual(2);
        expect(info.inWin, `${id} stop ${i} ring inside window`).toBe(true);
        expect(info.clips, `${id} stop ${i} ring clipped by`).toEqual([]);
      }
      // Tab out of the last stop must leave this window or reach the next DOM-order stop; never an extra stop.
      await page.keyboard.press('Tab');
      expect(await activeInWin(page), `${id} has no stop after its last`).not.toBe(id);
    }
    expect(errors).toEqual([]);
  });

  test('T07 AC10: minimized windows contribute no tab stops', async ({ page }) => {
    const errors = watchErrors(page);
    await load(page);
    await minBtn(page, 'about').click();
    await minBtn(page, 'term').click();
    await expect(win(page, 'about')).toHaveAttribute('data-min', 'true');
    await expect(win(page, 'term')).toHaveAttribute('data-min', 'true');
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    const seen = new Map<string, Set<string>>();
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Tab');
      const hit = await page.evaluate(() => {
        const el = document.activeElement;
        const w = el?.closest('[data-win]');
        if (!el || !w) return null;
        const all = Array.from(w.querySelectorAll('*'));
        return { id: w.getAttribute('data-win')!, key: String(all.indexOf(el)) };
      });
      if (hit) {
        if (!seen.has(hit.id)) seen.set(hit.id, new Set());
        seen.get(hit.id)!.add(hit.key);
      }
    }
    expect(seen.has('about')).toBe(false);
    expect(seen.has('term')).toBe(false);
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): the two new hello buttons add two tab stops, so 5 -> 7.
    expect(seen.get('hello')?.size).toBe(7);
    expect(seen.get('exp')?.size).toBe(4);
    expect(seen.get('proj')?.size).toBe(6);
    expect(errors).toEqual([]);
  });

  test('T07 AC28: tab keyboard navigation moves, wraps, and focus follows the selection', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await load(page);
    await raise(page, 'exp');
    const n = await tabs(page).count();
    await tabs(page).first().focus();
    await expect(tabs(page).first()).toHaveAttribute('aria-selected', 'true');
    const labelOf = async () =>
      (await win(page, 'exp').locator('.exp-org').textContent())!.replace(/^@\s*/, '').trim();
    const orgs: string[] = [];
    for (let i = 0; i < n; i++) orgs.push((await tabs(page).nth(i).innerText()).trim());
    expect(await labelOf()).toBe(orgs[0]);
    await page.keyboard.press('ArrowDown');
    await expect(tabs(page).nth(1)).toBeFocused();
    await expect(tabs(page).nth(1)).toHaveAttribute('aria-selected', 'true');
    expect(await labelOf()).toBe(orgs[1]);
    await expect(panel(page)).toHaveAttribute(
      'aria-labelledby',
      (await tabs(page).nth(1).getAttribute('id'))!,
    );
    await page.keyboard.press('End');
    await expect(tabs(page).nth(n - 1)).toBeFocused();
    expect(await labelOf()).toBe(orgs[n - 1]);
    await page.keyboard.press('ArrowDown');
    await expect(tabs(page).first()).toBeFocused();
    expect(await labelOf()).toBe(orgs[0]);
    await page.keyboard.press('ArrowUp');
    await expect(tabs(page).nth(n - 1)).toBeFocused();
    await page.keyboard.press('Home');
    await expect(tabs(page).first()).toBeFocused();
    expect(await labelOf()).toBe(orgs[0]);
    // Only the selected tab is a tab stop.
    const stops = await tabs(page).evaluateAll((els) =>
      els.map((e) => (e as HTMLElement).tabIndex),
    );
    expect(stops.filter((t) => t === 0)).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  test('T07 AC42: output past the visible height scrolls the body to the bottom and keeps the input visible', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await load(page);
    await raise(page, 'term');
    for (let i = 0; i < 6; i++) await run(page, 'help');
    const m = await win(page, 'term')
      .locator('.term-body')
      .evaluate((el) => ({
        overflow: el.scrollHeight > el.clientHeight + 1,
        gap: el.scrollHeight - el.clientHeight - el.scrollTop,
      }));
    expect(m.overflow).toBe(true);
    expect(m.gap).toBeLessThanOrEqual(1);
    const body = await box(win(page, 'term').locator('.term-body'));
    const inp = await box(input(page));
    expect(inp.y).toBeGreaterThanOrEqual(body.y - 0.5);
    expect(inp.y + inp.height).toBeLessThanOrEqual(body.y + body.height + 0.5);
    await run(page, 'whoami');
    const gap = await win(page, 'term')
      .locator('.term-body')
      .evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop);
    expect(gap).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });

  test('T07 AC41: focus stays in the input after every command except restart', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await load(page);
    await raise(page, 'term');
    await input(page).focus();
    for (const cmd of [
      'help',
      'whoami',
      'ls',
      'nonsense',
      '',
      'open projects',
      'open about',
      'wallpaper grid',
      'theme light',
      'theme dark',
      'tidy',
      'clear',
    ]) {
      await run(page, cmd);
      await expect(input(page), `after "${cmd}"`).toBeFocused();
    }
    expect(errors).toEqual([]);
  });

  test('T07 AC41: terminal commands theme light and open projects work end to end and persist the theme', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await load(page);
    await raise(page, 'term');
    await raise(page, 'proj');
    await minBtn(page, 'proj').click();
    await expect(win(page, 'proj')).toHaveAttribute('data-min', 'true');
    await raise(page, 'term');
    await run(page, 'open projects');
    await expect(win(page, 'proj')).toHaveAttribute('data-min', 'false');
    for (const other of DEFAULT5.filter((o) => o !== 'proj')) {
      expect(await z(page, 'proj')).toBeGreaterThan(await z(page, other));
    }
    await raise(page, 'about');
    await closeBtn(page, 'about').click();
    await expect(win(page, 'about')).toHaveCount(0);
    await run(page, 'open about');
    await expect(win(page, 'about')).toHaveCount(1);
    await run(page, 'theme light');
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
    expect(await page.evaluate(() => localStorage.getItem('tanzi-os:theme'))).toBe('light');
    await run(page, 'theme dark');
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
    expect(await page.evaluate(() => localStorage.getItem('tanzi-os:theme'))).toBe('dark');
    expect(errors).toEqual([]);
  });

  test('T07 AC45: Help, Terminal commands from closed runs help once after the banner', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await load(page);
    await closeBtn(page, 'term').click();
    await expect(win(page, 'term')).toHaveCount(0);
    await chooseItem(page, 'Help', 'Terminal commands');
    await expect(win(page, 'term')).toBeVisible();
    await expect(win(page, 'term')).toHaveAttribute('data-min', 'false');
    const lines = log(page).locator('.term-line');
    await expect(lines.nth(0)).toContainText('type "help"');
    await expect(lines.nth(1)).toHaveText(/tanzi ~ % help$/);
    await expect(log(page).locator('.term-line', { hasText: 'tanzi ~ % help' })).toHaveCount(1);
    await expect(log(page)).toContainText('whoami');
    for (const other of DEFAULT5.filter((o) => o !== 'term')) {
      expect(await z(page, 'term')).toBeGreaterThan(await z(page, other));
    }
    // Opening via the menu must not focus the input (AC46).
    expect(await inputFocused(page)).toBe(false);
    expect(errors).toEqual([]);
  });

  test('T07 AC45: Help, Terminal commands from minimized and open appends help and keeps lines and unsent input', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await load(page);
    await raise(page, 'term');
    await run(page, 'whoami');
    await input(page).fill('half typed');
    const before = await log(page).locator('.term-line').count();
    // Open.
    await chooseItem(page, 'Help', 'Terminal commands');
    await expect(log(page).locator('.term-line', { hasText: 'tanzi ~ % help' })).toHaveCount(1);
    expect(await log(page).locator('.term-line').count()).toBeGreaterThan(before);
    await expect(input(page)).toHaveValue('half typed');
    await expect(log(page).locator('.term-line', { hasText: 'tanzi ~ % whoami' })).toHaveCount(1);
    // Minimized.
    await minBtn(page, 'term').click();
    await expect(win(page, 'term')).toHaveAttribute('data-min', 'true');
    await chooseItem(page, 'Help', 'Terminal commands');
    await expect(win(page, 'term')).toHaveAttribute('data-min', 'false');
    await expect(log(page).locator('.term-line', { hasText: 'tanzi ~ % help' })).toHaveCount(2);
    await expect(input(page)).toHaveValue('half typed');
    await expect(log(page).locator('.term-line', { hasText: 'tanzi ~ % whoami' })).toHaveCount(1);
    // The run is not in history: Up recalls the last typed command, not help.
    await input(page).fill('');
    await input(page).press('ArrowUp');
    await expect(input(page)).toHaveValue('whoami');
    expect(errors).toEqual([]);
  });

  test('T07 AC3: close then reopen resets the verb, the experience tab and the terminal', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await load(page);
    const firstVerb = (await verb(page).innerText()).trim();
    await verb(page).click();
    await verb(page).click();
    expect((await verb(page).innerText()).trim()).not.toBe(firstVerb);
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): hello is now 473px tall and covers the third tab, so raise
    // the experience window before clicking it.
    await raise(page, 'exp');
    await tabs(page).nth(2).click();
    await expect(tabs(page).nth(2)).toHaveAttribute('aria-selected', 'true');
    await raise(page, 'term');
    await run(page, 'whoami');
    await input(page).fill('unsent');
    for (const id of ['hello', 'exp', 'term'] as Id[]) await closeBtn(page, id).click();
    for (const id of ['hello', 'exp', 'term'] as Id[]) {
      await expect(win(page, id)).toHaveCount(0);
      await dockBtn(page, id).click();
      await expect(win(page, id)).toBeVisible();
    }
    expect((await verb(page).innerText()).trim()).toBe(firstVerb);
    await expect(tabs(page).first()).toHaveAttribute('aria-selected', 'true');
    await expect(tabs(page).nth(2)).toHaveAttribute('aria-selected', 'false');
    await expect(log(page).locator('.term-line')).toHaveCount(1);
    await expect(input(page)).toHaveValue('');
    await input(page).press('ArrowUp');
    await expect(input(page)).toHaveValue('');
    expect(errors).toEqual([]);
  });

  test('T07 AC3: minimize and restore, Minimize all and Show all, and Tidy up keep the state including unsent text', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await load(page);
    await verb(page).click();
    const changedVerb = (await verb(page).innerText()).trim();
    await raise(page, 'exp');
    await tabs(page).nth(1).click();
    await raise(page, 'term');
    await run(page, 'whoami');
    await input(page).fill('unsent');
    const lineCount = await log(page).locator('.term-line').count();
    const check = async (label: string) => {
      expect((await verb(page).innerText()).trim(), `${label} verb`).toBe(changedVerb);
      await expect(tabs(page).nth(1), `${label} tab`).toHaveAttribute('aria-selected', 'true');
      await expect(input(page), `${label} input`).toHaveValue('unsent');
      await expect(log(page).locator('.term-line'), `${label} lines`).toHaveCount(lineCount);
    };
    for (const id of ['hello', 'exp', 'term'] as Id[]) {
      await raise(page, id);
      await minBtn(page, id).click();
    }
    for (const id of ['hello', 'exp', 'term'] as Id[]) await dockBtn(page, id).click();
    await check('minimize/restore');
    await chooseItem(page, 'Windows', 'Minimize all');
    await expect(win(page, 'term')).toHaveAttribute('data-min', 'true');
    await chooseItem(page, 'Windows', 'Show all');
    await expect(win(page, 'term')).toHaveAttribute('data-min', 'false');
    await check('minimize all/show all');
    await chooseItem(page, 'Windows', 'Tidy up');
    await check('tidy up');
    expect(errors).toEqual([]);
  });
});
