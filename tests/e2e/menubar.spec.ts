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

const DOCK5 = ['hello', 'about', 'exp', 'proj', 'term'] as const;
const win = (page: Page, id: string) => page.locator(`[data-win="${id}"]`);
const bar = (page: Page) => page.getByRole('banner');
const trigger = (page: Page, name: string) =>
  bar(page).getByRole('menuitem', { name, exact: true });
const computed = (loc: Locator, prop: string) =>
  loc.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);
const box = async (loc: Locator) => {
  const b = await loc.boundingBox();
  if (!b) throw new Error('no bounding box');
  return b;
};
const activeName = (page: Page) =>
  page.evaluate(
    () =>
      document.activeElement?.getAttribute('aria-label') ??
      document.activeElement?.textContent?.trim() ??
      '',
  );
const theme = (page: Page) => page.evaluate(() => document.documentElement.dataset.theme);
const stored = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(k), key);
const wallpaper = (page: Page) =>
  page.evaluate(
    () => (document.querySelector('header')!.parentElement as HTMLElement).style.background,
  );
const parseMatrix = (t: string) => {
  const m = t.match(/^matrix\(([^)]+)\)$/);
  if (!m) return null;
  const [a, b] = m[1].split(',').map(Number);
  return { deg: (Math.atan2(b, a) * 180) / Math.PI };
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
const REFERENCE = {
  hello: { x: 77, y: 72 },
  about: { x: 640, y: 64 },
  // DELIBERATE REQUIREMENT CHANGE (T07 AC52): exp height 300 -> 290, so y 344 -> 354.
  exp: { x: 64, y: 354 },
  // DELIBERATE REQUIREMENT CHANGE (T07 AC52): proj height 330 -> 385, so y 300 -> 644 - 385 = 259.
  proj: { x: 538, y: 259 },
  // DELIBERATE REQUIREMENT CHANGE (T07 AC52): term height 310 -> 270, so y 334 -> 340.
  term: { x: 810, y: 340 },
};
const pos = async (page: Page, id: string) => {
  const b = await box(win(page, id));
  return { x: Math.round(b.x), y: Math.round(b.y) };
};
const dragHello = async (page: Page, dx: number, dy: number) => {
  const tb = await box(win(page, 'hello').locator('.win-titlebar'));
  const sx = tb.x + 100;
  const sy = tb.y + tb.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + dx / 2, sy + dy / 2);
  await page.mouse.move(sx + dx, sy + dy);
  return async () => page.mouse.up();
};

test.describe('menubar layout (AC1-AC4)', () => {
  test('AC1: the bar is fixed, 36px tall, 13px, padded 0 12px, z-index 1000 and above every window', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await win(page, 'hello').waitFor();
    const header = bar(page);
    expect(await computed(header, 'position')).toBe('fixed');
    expect(await computed(header, 'z-index')).toBe('1000');
    expect(await computed(header, 'font-size')).toBe('13px');
    expect(await computed(header, 'padding-left')).toBe('12px');
    expect(await computed(header, 'padding-right')).toBe('12px');
    const b = await box(header);
    expect(b.height).toBe(36);
    expect(b.y).toBe(0);
    expect(b.width).toBe(1280);
    expect(await computed(header, 'backdrop-filter')).toContain('blur(10px)');
    for (const id of DOCK5) {
      expect(
        Number(await win(page, id).evaluate((el) => (el as HTMLElement).style.zIndex)),
      ).toBeLessThan(1000);
    }
    const hit = await page.evaluate(
      () => document.elementFromPoint(640, 18)?.closest('header') !== null,
    );
    expect(hit).toBe(true);
    expect(errors).toEqual([]);
  });

  test('AC2: the landmark, menubar and the four triggers in order', async ({ page }) => {
    await page.goto('/');
    await expect(bar(page)).toHaveAttribute('aria-label', 'System menu bar');
    const menubar = bar(page).getByRole('menubar', { name: 'Menus' });
    await expect(menubar.getByRole('menuitem')).toHaveText(['tanzi.os', 'Windows', 'View', 'Help']);
    expect(await computed(trigger(page, 'tanzi.os'), 'font-weight')).toBe('600');
    expect(await computed(trigger(page, 'Windows'), 'font-weight')).toBe('400');
    expect(await computed(trigger(page, 'Help'), 'padding')).toBe('5px 10px');
    expect(await computed(trigger(page, 'Help'), 'border-radius')).toBe('6px');
  });

  test('AC3/AC4: links, toggle and clock sit on the right with the right attributes', async ({
    page,
  }) => {
    await page.goto('/');
    const right = bar(page).locator('.mb-right');
    const kids = right.locator(':scope > *');
    await expect(kids).toHaveCount(4);
    expect(await kids.evaluateAll((els) => els.map((e) => e.tagName))).toEqual([
      'A',
      'A',
      'BUTTON',
      'TIME',
    ]);
    const gh = bar(page).getByRole('link', { name: 'LinkedIn' });
    await expect(gh).toHaveAttribute('target', '_blank');
    await expect(gh).toHaveAttribute('rel', /noopener/);
    await expect(gh).toHaveAttribute('rel', /noreferrer/);
    const mail = bar(page).getByRole('link', { name: 'Email' });
    await expect(mail).toHaveAttribute('href', /^mailto:/);
    expect(await mail.getAttribute('target')).toBeNull();
    const g = await box(gh);
    expect(Math.round(g.width)).toBe(30);
    expect(Math.round(g.height)).toBe(28);
  });
});

test.describe('opening and closing menus (AC6-AC8, AC13, AC15)', () => {
  test('AC6: each trigger opens its own menu by click, one at a time', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    for (const name of ['tanzi.os', 'Windows', 'View', 'Help']) {
      await trigger(page, name).click();
      await expect(trigger(page, name)).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByRole('menu')).toHaveCount(1);
      await expect(page.getByRole('menu')).toHaveAccessibleName(name);
    }
    await trigger(page, 'Help').click();
    await expect(page.getByRole('menu')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('AC9: the dropdown is under its trigger, at least 240px wide, below the 34px line', async ({
    page,
  }) => {
    await page.goto('/');
    await trigger(page, 'View').click();
    const m = await box(page.getByRole('menu'));
    const t = await box(trigger(page, 'View'));
    expect(Math.abs(m.x - (t.x - 0))).toBeLessThanOrEqual(1);
    expect(m.width).toBeGreaterThanOrEqual(240);
    expect(Math.round(m.y)).toBe(34);
  });

  test('AC7: with a menu open, hovering another trigger switches; with none open it does nothing', async ({
    page,
  }) => {
    await page.goto('/');
    await trigger(page, 'Help').hover();
    await expect(page.getByRole('menu')).toHaveCount(0);
    await trigger(page, 'tanzi.os').click();
    await trigger(page, 'Help').hover();
    await expect(page.getByRole('menu')).toHaveAccessibleName('Help');
    await expect(page.getByRole('menu')).toHaveCount(1);
  });

  test('AC13/AC15: keyboard opens a menu, Enter chooses an item and focus returns to the trigger', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.keyboard.press('Tab');
    expect(await activeName(page)).toBe('tanzi.os');
    await page.keyboard.press('ArrowRight');
    expect(await activeName(page)).toBe('Windows');
    await page.keyboard.press('ArrowDown');
    expect(await activeName(page)).toBe('hello.txt');
    await page.keyboard.press('ArrowDown');
    expect(await activeName(page)).toBe('about.md');
    await page.keyboard.press('End');
    expect(await activeName(page)).toBe('Tidy up');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu')).toHaveCount(0);
    expect(await activeName(page)).toBe('Windows');
    expect(errors).toEqual([]);
  });

  test('AC13: Space and ArrowUp open menus; ArrowUp focuses the last item', async ({ page }) => {
    await page.goto('/');
    await trigger(page, 'Help').focus();
    await page.keyboard.press('ArrowUp');
    expect(await activeName(page)).toMatch(/^Say hi/);
    await page.keyboard.press('Escape');
    expect(await activeName(page)).toBe('Help');
    await page.keyboard.press('Space');
    expect(await activeName(page)).toBe('Terminal commands');
  });

  test('AC14: ArrowRight in a menu opens the next menu with its first item focused', async ({
    page,
  }) => {
    await page.goto('/');
    await trigger(page, 'View').focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('menu')).toHaveAccessibleName('Help');
    expect(await activeName(page)).toBe('Terminal commands');
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('menu')).toHaveAccessibleName('tanzi.os');
  });

  test('AC15: Escape closes the menu and returns focus to the trigger', async ({ page }) => {
    await page.goto('/');
    await trigger(page, 'View').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    expect(await activeName(page)).toBe('View');
  });

  test('AC15: Escape after opening with the mouse also closes and focuses the trigger', async ({
    page,
  }) => {
    await page.goto('/');
    await trigger(page, 'Windows').click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    expect(await activeName(page)).toBe('Windows');
  });

  test('AC16: Escape with no menu open changes nothing', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await page.keyboard.press('Escape');
    for (const id of DOCK5) await expect(win(page, id)).toHaveAttribute('data-min', 'false');
    await expect(page.getByRole('menu')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('AC15: Tab from an open menu closes it', async ({ page }) => {
    await page.goto('/');
    await trigger(page, 'Windows').focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('menu')).toHaveCount(0);
  });

  test('AC8: clicking the empty desktop closes the menu', async ({ page }) => {
    await page.goto('/');
    await trigger(page, 'View').click();
    await page.mouse.click(20, 700);
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(trigger(page, 'View')).toHaveAttribute('aria-expanded', 'false');
  });

  test('AC8/AC42: clicking a window closes the menu, raises that window and does not refocus the trigger', async ({
    page,
  }) => {
    await page.goto('/');
    const z = (id: string) =>
      win(page, id).evaluate((el) => Number((el as HTMLElement).style.zIndex));
    await trigger(page, 'Windows').click();
    const b = await box(win(page, 'proj'));
    await page.mouse.click(b.x + 120, b.y + b.height - 10);
    await expect(page.getByRole('menu')).toHaveCount(0);
    for (const id of DOCK5.filter((i) => i !== 'proj'))
      expect(await z('proj')).toBeGreaterThan(await z(id));
    expect(await activeName(page)).not.toBe('Windows');
  });
});

test.describe('menu actions (AC18-AC21)', () => {
  test('AC19: the Windows menu checks follow the windows and restore a minimized one', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Minimize terminal' }).click();
    await trigger(page, 'Windows').click();
    await expect(page.getByRole('menuitemcheckbox', { name: 'terminal' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await expect(page.getByRole('menuitemcheckbox', { name: 'hello.txt' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page.getByRole('menuitemcheckbox', { name: 'terminal' }).click();
    await expect(win(page, 'term')).toHaveAttribute('data-min', 'false');
    await expect(page.getByRole('menu')).toHaveCount(0);
  });

  test('AC18: About this site opens the site window', async ({ page }) => {
    await page.goto('/');
    await chooseItem(page, 'tanzi.os', 'About this site');
    await expect(win(page, 'site')).toHaveCount(1);
  });

  test('AC21/AC4: Say hi has the right attributes (not activated)', async ({ page }) => {
    await page.goto('/');
    await trigger(page, 'Help').click();
    const hi = page.getByRole('menuitem', { name: /^Say hi/ });
    await expect(hi).toHaveAttribute('href', /^mailto:.+@.+/);
    expect(await hi.getAttribute('target')).toBeNull();
    await expect(hi).toContainText('email');
  });
});

test.describe('settings persist (AC23-AC26, AC29)', () => {
  test('AC24/AC23: the toggle switches the theme at once and it survives a reload', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    expect(await theme(page)).toBe('dark');
    await page.getByRole('button', { name: 'Switch to light mode' }).click();
    expect(await theme(page)).toBe('light');
    expect(await stored(page, 'tanzi-os:theme')).toBe('light');
    await page.reload();
    expect(await theme(page)).toBe('light');
    await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible();
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await page.reload();
    expect(await theme(page)).toBe('dark');
    expect(errors).toEqual([]);
  });

  test('AC24: the View menu theme item changes data-theme and its radio check', async ({
    page,
  }) => {
    await page.goto('/');
    await chooseItem(page, 'View', 'Light mode');
    expect(await theme(page)).toBe('light');
    await trigger(page, 'View').click();
    await expect(page.getByRole('menuitemradio', { name: 'Light mode' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('AC44: a visitor who changes nothing keeps following the OS and nothing is stored', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    expect(await theme(page)).toBe('light');
    expect(await page.evaluate(() => localStorage.length)).toBe(0);
    await chooseItem(page, 'View', 'Light mode');
    expect(await page.evaluate(() => localStorage.length)).toBe(0);
  });

  test('AC23/AC27: when storage throws the app renders dark and settings change for the session', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Storage.prototype.getItem = () => {
        throw new Error('denied');
      };
      Storage.prototype.setItem = () => {
        throw new Error('denied');
      };
    });
    await page.emulateMedia({ colorScheme: 'light' });
    const errors = watchErrors(page);
    await page.goto('/');
    await win(page, 'hello').waitFor();
    expect(await theme(page)).toBe('dark');
    await page.getByRole('button', { name: 'Switch to light mode' }).click();
    expect(await theme(page)).toBe('light');
    await chooseItem(page, 'View', 'Wallpaper: Plain');
    expect(await wallpaper(page)).toContain('--wall-plain');
    expect(errors).toEqual([]);
  });

  test('AC25: the default wallpaper is nebula; grid is chosen from the menu and survives a reload', async ({
    page,
  }) => {
    await page.goto('/');
    expect(await wallpaper(page)).toContain('--wall-nebula');
    await chooseItem(page, 'View', 'Wallpaper: Grid');
    expect(await wallpaper(page)).toContain('--wall-grid');
    expect(await stored(page, 'tanzi-os:wallpaper')).toBe('grid');
    await page.reload();
    expect(await wallpaper(page)).toContain('--wall-grid');
    await trigger(page, 'View').click();
    await expect(page.getByRole('menuitemradio', { name: 'Wallpaper: Grid' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('AC25: an invalid stored wallpaper gives nebula', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('tanzi-os:wallpaper', 'purple'));
    await page.goto('/');
    expect(await wallpaper(page)).toContain('--wall-nebula');
  });

  test('AC26: with Wobbly windows off, dragging a window does not tilt it, and the setting survives a reload', async ({
    page,
  }) => {
    await page.goto('/');
    await chooseItem(page, 'View', 'Wobbly windows');
    expect(await stored(page, 'tanzi-os:wobble')).toBe('false');
    await page.reload();
    await win(page, 'hello').waitFor();
    const release = await dragHello(page, 40, 10);
    const m = parseMatrix(await computed(win(page, 'hello'), 'transform'));
    expect(m === null || Math.abs(m.deg) < 0.01).toBe(true);
    await release();
  });

  test('AC26: with wobble on (control) the same drag does tilt', async ({ page }) => {
    await page.goto('/');
    const release = await dragHello(page, 40, 10);
    const m = parseMatrix(await computed(win(page, 'hello'), 'transform'));
    expect(m).not.toBeNull();
    expect(Math.abs(m!.deg)).toBeGreaterThan(0.1);
    await release();
  });

  test('AC29: Tidy up and then Restart reset the windows and keep theme, wallpaper and wobble', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await chooseItem(page, 'View', 'Light mode');
    await chooseItem(page, 'View', 'Wallpaper: Grid');
    await chooseItem(page, 'View', 'Wobbly windows');

    const release = await dragHello(page, 60, 40);
    await release();
    await expect(win(page, 'hello')).toHaveCSS('transform', 'none');
    expect(await pos(page, 'hello')).toEqual({ x: 137, y: 112 });
    await chooseItem(page, 'Windows', 'Tidy up');
    for (const [id, p] of Object.entries(REFERENCE)) expect(await pos(page, id), id).toEqual(p);

    await page.getByRole('button', { name: 'Close hello.txt' }).click();
    await chooseItem(page, 'tanzi.os', 'Restart…');
    // A reopened window flies in, so wait for it to settle.
    for (const [id, p] of Object.entries(REFERENCE))
      await expect.poll(() => pos(page, id), { message: id }).toEqual(p);

    expect(await theme(page)).toBe('light');
    expect(await wallpaper(page)).toContain('--wall-grid');
    expect(await stored(page, 'tanzi-os:theme')).toBe('light');
    expect(await stored(page, 'tanzi-os:wallpaper')).toBe('grid');
    expect(await stored(page, 'tanzi-os:wobble')).toBe('false');
    await trigger(page, 'View').click();
    await expect(page.getByRole('menuitemcheckbox', { name: 'Wobbly windows' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(errors).toEqual([]);
  });
});

test.describe('clock and keyboard reach (AC32, AC36, AC12)', () => {
  test('AC32/AC39: the clock matches the exact format, with ASCII spaces, and is a <time>', async ({
    page,
  }) => {
    await page.goto('/');
    const t = bar(page).locator('time');
    await expect(t).toHaveText(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) (1[0-2]|[1-9]):[0-5]\d (AM|PM)$/);
    const text = (await t.textContent())!;
    expect(text).toMatch(/^[\x20-\x7e]+$/);
    await expect(t).toHaveAttribute('datetime', /^([01]\d|2[0-3]):[0-5]\d$/);
    expect(await t.evaluate((el) => (el as HTMLElement).tabIndex)).toBe(-1);
    expect(await computed(t, 'font-variant-numeric')).toContain('tabular-nums');
    expect(await computed(t, 'padding')).toBe('0px 6px 0px 10px');
  });

  test('AC12: the first five tab stops are the menubar, then the first window control', async ({
    page,
  }) => {
    await page.goto('/');
    const names: string[] = [];
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      names.push(await activeName(page));
    }
    expect(names).toEqual([
      'tanzi.os',
      'LinkedIn',
      'Email',
      'Switch to light mode',
      'Minimize hello.txt',
    ]);
  });

  test('AC36: after Minimize all, tabbing through everything never reaches a window control', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await chooseItem(page, 'Windows', 'Minimize all');
    for (const id of DOCK5) await expect(win(page, id)).toHaveAttribute('data-min', 'true');
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Tab');
      const inWindow = await page.evaluate(
        () => document.activeElement?.closest('[data-win]') !== null,
      );
      expect(inWindow, `tab ${i + 1}`).toBe(false);
    }
    expect(errors).toEqual([]);
  });

  test('AC17: keyboard focus on a trigger, an item, a link and the toggle shows an outline', async ({
    page,
  }) => {
    await page.goto('/');
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const el = page.locator(':focus');
      expect(await computed(el, 'outline-style'), `stop ${i}`).not.toBe('none');
      expect(Number.parseFloat(await computed(el, 'outline-width'))).toBeGreaterThan(0);
    }
    await trigger(page, 'tanzi.os').focus();
    await page.keyboard.press('ArrowDown');
    const item = page.locator(':focus');
    expect(await computed(item, 'outline-style')).not.toBe('none');
  });
});

test.describe('hover motion (AC33)', () => {
  test('AC33: hovering a link tilts and lifts it; the toggle rotates', async ({ page }) => {
    await page.goto('/');
    const gh = bar(page).getByRole('link', { name: 'LinkedIn' });
    await gh.hover();
    await expect.poll(async () => computed(gh, 'transform')).not.toBe('none');
    const toggle = bar(page).getByRole('button', { name: 'Switch to light mode' });
    await toggle.hover();
    await expect.poll(async () => computed(toggle, 'transform')).not.toBe('none');
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('AC33: hovering a link or the toggle applies no transform', async ({ page }) => {
      await page.goto('/');
      const gh = bar(page).getByRole('link', { name: 'LinkedIn' });
      await gh.hover();
      await page.waitForTimeout(500);
      expect(await computed(gh, 'transform')).toBe('none');
      const toggle = bar(page).getByRole('button', { name: 'Switch to light mode' });
      await toggle.hover();
      await page.waitForTimeout(500);
      expect(await computed(toggle, 'transform')).toBe('none');
    });

    test('AC34: Wobbly still toggles and persists under reduced motion, and a drag never tilts', async ({
      page,
    }) => {
      await page.goto('/');
      await chooseItem(page, 'View', 'Wobbly windows');
      expect(await stored(page, 'tanzi-os:wobble')).toBe('false');
      await chooseItem(page, 'View', 'Wobbly windows');
      expect(await stored(page, 'tanzi-os:wobble')).toBe('true');
      const release = await dragHello(page, 40, 10);
      expect(await computed(win(page, 'hello'), 'transform')).toBe('none');
      await release();
    });
  });
});
