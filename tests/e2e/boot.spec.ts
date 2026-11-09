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

// Math.random fixed at 0 gives the longest boot (15 ticks, 1350ms).
const slowBoot = async (page: Page) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
};

const WINS = ['hello', 'about', 'exp', 'proj', 'term'] as const;
const win = (page: Page, id: string) => page.locator(`[data-win="${id}"]`);
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Restarting tanzi.os' });
const anyDialog = (page: Page) => page.locator('[role="dialog"]');
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
const restartFromMenu = (page: Page) => chooseItem(page, 'tanzi.os', 'Restart…');
const restartFromKeyboard = async (page: Page) => {
  await trigger(page, 'tanzi.os').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('End');
  expect(await page.evaluate(() => document.activeElement?.textContent?.trim())).toBe('Restart…');
  await page.keyboard.press('Enter');
};
const restartFromTerminal = async (page: Page) => {
  const input = page.getByRole('textbox', { name: 'Terminal command' });
  await input.fill('restart');
  await input.press('Enter');
};
const theme = (page: Page) => page.evaluate(() => document.documentElement.dataset.theme);
const stored = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(k), key);
const wallpaper = (page: Page) =>
  page.evaluate(
    () => (document.querySelector('header')!.parentElement as HTMLElement).style.background,
  );
const pos = async (page: Page, id: string) => {
  const b = await box(win(page, id));
  return { x: Math.round(b.x), y: Math.round(b.y) };
};
const allPos = async (page: Page) => {
  const out: Record<string, { x: number; y: number }> = {};
  for (const id of WINS) out[id] = await pos(page, id);
  return out;
};
// A short description of the focused element, used to compare Tab sequences.
const describeActive = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return 'none';
    return `${el.tagName}|${el.getAttribute('aria-label') ?? ''}|${(el.textContent ?? '').trim().slice(0, 30)}`;
  });
const tabSequence = async (page: Page, n: number) => {
  const seq: string[] = [];
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    seq.push(await describeActive(page));
  }
  return seq;
};

// Records, in the page, when the dialog is added and removed, plus each window's computed
// transform and opacity synchronously at the moment of removal.
const installRecorder = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __boot: Record<string, unknown> };
    const rec = {
      added: [] as number[],
      removed: [] as number[],
      values: [] as number[],
      atRemoval: null as null | Record<string, { transform: string; opacity: string }>,
      inertAtRemoval: null as null | boolean,
      everDialog: false,
    };
    w.__boot = rec;
    const isDialog = (n: Node) => n instanceof Element && n.matches('[role="dialog"]');
    new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'attributes') {
          const t = m.target as Element;
          if (t.getAttribute('role') === 'progressbar')
            rec.values.push(Number(t.getAttribute('aria-valuenow')));
          continue;
        }
        m.addedNodes.forEach((n) => {
          if (isDialog(n)) {
            rec.added.push(performance.now());
            rec.everDialog = true;
          }
        });
        m.removedNodes.forEach((n) => {
          if (isDialog(n)) {
            rec.removed.push(performance.now());
            const snap: Record<string, { transform: string; opacity: string }> = {};
            document.querySelectorAll('[data-win]').forEach((el) => {
              const cs = getComputedStyle(el);
              snap[(el as HTMLElement).dataset.win!] = {
                transform: cs.transform,
                opacity: cs.opacity,
              };
            });
            rec.atRemoval = snap;
            rec.inertAtRemoval = (
              document.querySelector('header')!.parentElement as HTMLElement
            ).inert;
          }
        });
      }
    }).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-valuenow'],
    });
  });
const recorded = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __boot: Record<string, unknown> }).__boot as {
        added: number[];
        removed: number[];
        values: number[];
        atRemoval: null | Record<string, { transform: string; opacity: string }>;
        inertAtRemoval: null | boolean;
        everDialog: boolean;
      },
  );

test.describe('T08 first load and reload (AC1)', () => {
  test('T08 AC1: first load never shows the boot screen, with default or stored settings', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.addInitScript(() => {
      new MutationObserver(() => {
        if (document.querySelector('[role="dialog"]'))
          (window as unknown as { __seen: boolean }).__seen = true;
      }).observe(document, { childList: true, subtree: true });
    });
    await page.goto('/');
    await win(page, 'hello').waitFor();
    await page.waitForTimeout(300);
    await expect(anyDialog(page)).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __seen?: boolean }).__seen)).toBe(
      undefined,
    );
    await page.evaluate(() => {
      localStorage.setItem('tanzi-os:theme', 'light');
      localStorage.setItem('tanzi-os:wallpaper', 'grid');
      localStorage.setItem('tanzi-os:wobble', 'false');
    });
    await page.reload();
    await win(page, 'hello').waitFor();
    await page.waitForTimeout(300);
    await expect(anyDialog(page)).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __seen?: boolean }).__seen)).toBe(
      undefined,
    );
    expect(errors).toEqual([]);
  });

  test('T08 AC1: reloading during a boot gives a normal first load and persists nothing about booting', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await slowBoot(page);
    await page.goto('/');
    await win(page, 'hello').waitFor();
    await restartFromMenu(page);
    await expect(dialog(page)).toBeVisible();
    await page.reload();
    await win(page, 'hello').waitFor();
    await page.waitForTimeout(300);
    await expect(anyDialog(page)).toHaveCount(0);
    const keys = await page.evaluate(() => Object.keys(localStorage));
    for (const k of keys) expect(k).not.toMatch(/boot|restart/i);
    expect(errors).toEqual([]);
  });
});

test.describe('T08 boot from both entry points (AC2, AC5, AC8)', () => {
  for (const entry of ['menu', 'terminal'] as const) {
    test(`T08 AC2: Restart from the ${entry} shows the boot screen and then returns the desktop`, async ({
      page,
    }) => {
      const errors = watchErrors(page);
      await slowBoot(page);
      await page.goto('/');
      await win(page, 'hello').waitFor();
      await installRecorder(page);
      if (entry === 'menu') await restartFromMenu(page);
      else await restartFromTerminal(page);
      await expect(dialog(page)).toBeVisible();
      await expect(page.getByRole('progressbar', { name: 'Restart progress' })).toHaveAttribute(
        'aria-valuemin',
        '0',
      );
      await expect(dialog(page)).toHaveCount(0, { timeout: 4000 });
      for (const id of WINS) await expect(win(page, id)).toBeVisible();
      const r = await recorded(page);
      expect(r.added).toHaveLength(1);
      expect(r.removed).toHaveLength(1);
      expect(errors).toEqual([]);
    });
  }

  test('T08 AC2: the boot lasts between 450ms and 1350ms (plus margin) with visibly advancing progress', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/'); // real Math.random
    await win(page, 'hello').waitFor();
    await installRecorder(page);
    await restartFromMenu(page);
    await expect(dialog(page)).toHaveCount(0, { timeout: 4000 });
    const r = await recorded(page);
    const ms = r.removed[0] - r.added[0];
    // Margin of 250ms for timer jitter and a busy machine.
    expect(ms).toBeGreaterThanOrEqual(450 - 50);
    expect(ms).toBeLessThanOrEqual(1350 + 250);
    // Every tick but the last updates the bar: 4 to 14 updates, strictly rising, below 100.
    expect(r.values.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < r.values.length; i++) expect(r.values[i]).toBeGreaterThan(r.values[i - 1]);
    expect(r.values[0]).toBeGreaterThan(0);
    expect(r.values[r.values.length - 1]).toBeLessThan(100);
    expect(errors).toEqual([]);
  });

  for (const th of ['dark', 'light'] as const) {
    test(`T08 AC5/AC8: in ${th} mode the boot screen covers the viewport, menubar and dock, is opaque --color-bg and shows no other text`, async ({
      page,
    }) => {
      const errors = watchErrors(page);
      await slowBoot(page);
      await page.goto('/');
      await win(page, 'hello').waitFor();
      if (th === 'light') await chooseItem(page, 'View', 'Light mode');
      expect(await theme(page)).toBe(th);
      await restartFromMenu(page);
      await expect(dialog(page)).toBeVisible();

      const dock = await box(page.locator('nav.dock'));
      const hdr = await box(bar(page));
      const points: Array<[string, number, number]> = [
        ['top-left', 0, 0],
        ['top-right', 1279, 0],
        ['bottom-left', 0, 719],
        ['bottom-right', 1279, 719],
        ['menubar', 640, hdr.height / 2],
        ['menubar trigger', 20, hdr.height / 2],
        ['dock', dock.x + dock.width / 2, dock.y + dock.height / 2],
      ];
      for (const [name, x, y] of points) {
        const hit = await page.evaluate(
          ([px, py]) => !!document.elementFromPoint(px, py)?.closest('[role="dialog"]'),
          [x, y],
        );
        expect(hit, name).toBe(true);
      }

      const b = await box(dialog(page));
      expect(b).toMatchObject({ x: 0, y: 0, width: 1280, height: 720 });

      const info = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"]') as HTMLElement;
        const probe = document.createElement('div');
        probe.style.background = 'var(--color-bg)';
        document.body.appendChild(probe);
        const expected = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return {
          bg: getComputedStyle(d).backgroundColor,
          expected,
          text: d.innerText.trim(),
          kids: d.children.length,
          transition: getComputedStyle(d).transitionDuration,
          animation: getComputedStyle(d).animationName,
        };
      });
      expect(info.bg).toBe(info.expected);
      expect(info.bg).not.toMatch(/rgba|, 0\)/);
      expect(info.text).toBe('TC'); // only the mark; the bar has no text
      expect(info.kids).toBe(2);
      expect(info.transition).toBe('0s');
      expect(info.animation).toBe('none');

      // Resizing mid-boot keeps it full viewport.
      await page.setViewportSize({ width: 1000, height: 600 });
      await expect(dialog(page)).toBeVisible();
      expect(await box(dialog(page))).toMatchObject({ x: 0, y: 0, width: 1000, height: 600 });

      await expect(dialog(page)).toHaveCount(0, { timeout: 4000 });
      expect(await theme(page)).toBe(th);
      expect(errors).toEqual([]);
    });
  }
});

test.describe('T08 reduced motion (AC3)', () => {
  for (const entry of ['menu', 'terminal'] as const) {
    test(`T08 AC3: under reduced motion Restart from the ${entry} never attaches the dialog and resets at once`, async ({
      page,
    }) => {
      const errors = watchErrors(page);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      await win(page, 'hello').waitFor();
      const fresh = await allPos(page);
      await installRecorder(page);
      // Dirty a verb and the layout.
      const verb = win(page, 'hello')
        .locator('button')
        .filter({ hasText: /^build$/ });
      await verb.click();
      await expect(win(page, 'hello')).toContainText('break');
      await page.getByRole('button', { name: 'Close hello.txt' }).click();
      await expect(win(page, 'hello')).toHaveCount(0);

      if (entry === 'menu') await restartFromMenu(page);
      else await restartFromTerminal(page);

      await expect(win(page, 'hello')).toBeVisible();
      await expect(win(page, 'hello')).toContainText('build');
      expect(await allPos(page)).toEqual(fresh);
      await page.waitForTimeout(1500); // longer than any boot
      const r = await recorded(page);
      expect(r.everDialog).toBe(false);
      await expect(anyDialog(page)).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  }

  test('T08 AC3: the preference is read on each Restart without a reload', async ({ page }) => {
    const errors = watchErrors(page);
    await slowBoot(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await win(page, 'hello').waitFor();
    await installRecorder(page);
    await restartFromMenu(page);
    await page.waitForTimeout(200);
    expect((await recorded(page)).everDialog).toBe(false);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await restartFromMenu(page);
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page)).toHaveCount(0, { timeout: 4000 });
    expect(errors).toEqual([]);
  });
});

test.describe('T08 Restart end to end (AC30 section D)', () => {
  for (const reduced of [false, true]) {
    test(`T08 AC30: a dirtied verb, tab, terminal, layout and settings are reset or kept (${reduced ? 'reduced motion' : 'boot'})`, async ({
      page,
    }) => {
      const errors = watchErrors(page);
      if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
      else await slowBoot(page);
      await page.goto('/');
      await win(page, 'hello').waitFor();
      const fresh = await allPos(page);
      const freshLines = await win(page, 'term').locator('.term-line').count();
      const firstTab = await win(page, 'exp').getByRole('tab', { selected: true }).textContent();

      // Settings
      await chooseItem(page, 'View', 'Light mode');
      await chooseItem(page, 'View', 'Wallpaper: Grid');
      await chooseItem(page, 'View', 'Wobbly windows');

      // Window internals
      await win(page, 'hello')
        .locator('button')
        .filter({ hasText: /^build$/ })
        .click();
      await expect(win(page, 'hello')).toContainText('break');
      await win(page, 'exp').getByRole('tab').nth(1).dispatchEvent('click'); // hello overlaps it
      expect(await win(page, 'exp').getByRole('tab', { selected: true }).textContent()).not.toBe(
        firstTab,
      );
      const input = page.getByRole('textbox', { name: 'Terminal command' });
      await input.fill('help');
      await input.press('Enter');
      expect(await win(page, 'term').locator('.term-line').count()).toBeGreaterThan(freshLines);
      await input.fill('half typed');

      // Layout: tidy up moves windows, then minimize one and close another.
      await chooseItem(page, 'Windows', 'Tidy up');
      await page.getByRole('button', { name: 'Minimize about.md' }).click();
      await page.getByRole('button', { name: 'Close projects' }).click();

      await restartFromMenu(page);
      if (!reduced) {
        await expect(dialog(page)).toBeVisible();
        await expect(dialog(page)).toHaveCount(0, { timeout: 4000 });
      }

      for (const id of WINS) {
        await expect(win(page, id)).toBeVisible();
        await expect(win(page, id)).toHaveAttribute('data-min', 'false');
      }
      await expect(win(page, 'site')).toHaveCount(0);
      await expect.poll(() => allPos(page)).toEqual(fresh);
      await expect(win(page, 'hello')).toContainText('build');
      expect(await win(page, 'exp').getByRole('tab', { selected: true }).textContent()).toBe(
        firstTab,
      );
      expect(await win(page, 'term').locator('.term-line').count()).toBe(freshLines);
      await expect(input).toHaveValue('');
      await input.focus();
      await input.press('ArrowUp');
      await expect(input).toHaveValue('');

      // Settings are kept
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
  }

  test('T08 AC30: wobble, theme and wallpaper kept across a real boot in both themes', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await slowBoot(page);
    await page.goto('/');
    await win(page, 'hello').waitFor();
    for (const th of ['dark', 'light'] as const) {
      await chooseItem(page, 'View', th === 'light' ? 'Light mode' : 'Dark mode');
      await restartFromTerminal(page);
      await expect(dialog(page)).toBeVisible();
      await expect(dialog(page)).toHaveCount(0, { timeout: 4000 });
      expect(await theme(page)).toBe(th);
      if (th === 'light') expect(await stored(page, 'tanzi-os:theme')).toBe(th);
    }
    // Wobble stays on (default) and the drag still tilts after a boot.
    const tb = await box(win(page, 'hello').locator('.win-titlebar'));
    await page.mouse.move(tb.x + 100, tb.y + 10);
    await page.mouse.down();
    await page.mouse.move(tb.x + 120, tb.y + 12);
    await page.mouse.move(tb.x + 160, tb.y + 20);
    const t = await win(page, 'hello').evaluate((el) => getComputedStyle(el).transform);
    expect(t).not.toBe('none');
    await page.mouse.up();
    expect(errors).toEqual([]);
  });
});

test.describe('T08 no fly-in after Restart (AC18)', () => {
  test('T08 AC18: in the commit that removes the boot screen every window has no transform and full opacity; later opens fly in', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await slowBoot(page);
    await page.goto('/');
    await win(page, 'hello').waitFor();
    // Close one window first so it is reopened by the reset.
    await page.getByRole('button', { name: 'Close hello.txt' }).click();
    await installRecorder(page);
    await restartFromMenu(page);
    await expect(dialog(page)).toHaveCount(0, { timeout: 4000 });
    const r = await recorded(page);
    expect(r.atRemoval).not.toBeNull();
    expect(Object.keys(r.atRemoval!).sort()).toEqual([...WINS].sort());
    for (const id of WINS) {
      expect(r.atRemoval![id].transform, id).toBe('none');
      expect(Number(r.atRemoval![id].opacity), id).toBe(1);
    }
    expect(r.inertAtRemoval).toBe(false);

    // A window opened later still flies in: record its first computed pose.
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Close hello.txt' }).click();
    await expect(win(page, 'hello')).toHaveCount(0);
    await page.evaluate(() => {
      const w = window as unknown as { __open: { transform: string; opacity: string } | null };
      w.__open = null;
      new MutationObserver((muts) => {
        for (const m of muts)
          m.addedNodes.forEach((n) => {
            if (n instanceof HTMLElement && n.dataset.win === 'hello' && !w.__open) {
              const cs = getComputedStyle(n);
              w.__open = { transform: cs.transform, opacity: cs.opacity };
            }
          });
      }).observe(document.body, { childList: true, subtree: true });
    });
    await page.locator('.dock-win[aria-label="hello.txt"]').click();
    await expect(win(page, 'hello')).toBeVisible();
    const open = await page.evaluate(
      () => (window as unknown as { __open: { transform: string; opacity: string } | null }).__open,
    );
    expect(open).not.toBeNull();
    expect(open!.transform !== 'none' || Number(open!.opacity) < 1).toBe(true);
    expect(errors).toEqual([]);
  });

  test('T08 AC18: immediately after a reduced-motion Restart every open window has no transform and full opacity', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await win(page, 'hello').waitFor();
    await page.getByRole('button', { name: 'Close hello.txt' }).click();
    await restartFromMenu(page);
    const snap = await page.evaluate(() => {
      const out: Record<string, { transform: string; opacity: string }> = {};
      document.querySelectorAll('[data-win]').forEach((el) => {
        const cs = getComputedStyle(el);
        out[(el as HTMLElement).dataset.win!] = { transform: cs.transform, opacity: cs.opacity };
      });
      return out;
    });
    expect(Object.keys(snap).sort()).toEqual([...WINS].sort());
    for (const id of WINS) {
      expect(snap[id].transform, id).toBe('none');
      expect(Number(snap[id].opacity), id).toBe(1);
    }
    expect(errors).toEqual([]);
  });
});

test.describe('T08 input during a boot (AC21, AC22, AC24)', () => {
  test('T08 AC21/AC24: the desktop is inert and keys and clicks change nothing and do not end the boot', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await slowBoot(page);
    await page.goto('/');
    await win(page, 'hello').waitFor();
    const verb = win(page, 'hello')
      .locator('button')
      .filter({ hasText: /^build$/ });
    await verb.click();
    await expect(win(page, 'hello')).toContainText('break');
    await restartFromMenu(page);
    await expect(dialog(page)).toBeVisible();

    // The root is inert, the dialog is not.
    const inert = await page.evaluate(() => {
      const root = document.querySelector('header')!.parentElement as HTMLElement;
      const d = document.querySelector('[role="dialog"]')!;
      return {
        root: root.inert,
        contains: root.contains(d),
        menus: document.querySelectorAll('[role="menu"]').length,
      };
    });
    expect(inert).toEqual({ root: true, contains: false, menus: 0 });

    // Keyboard
    for (const key of ['Escape', 'Enter', 'Space', 'Tab', 'Shift+Tab', 'ArrowDown']) {
      await page.keyboard.press(key);
      await expect(dialog(page)).toBeFocused();
    }
    // Pointer: menubar, dock, window, and the dialog itself
    const hdr = await box(bar(page));
    const dock = await box(page.locator('nav.dock'));
    const clicks: Array<[number, number]> = [
      [20, hdr.height / 2],
      [100, hdr.height / 2],
      [dock.x + 30, dock.y + dock.height / 2],
      [300, 300],
      [640, 360],
    ];
    for (const [x, y] of clicks) await page.mouse.click(x, y);

    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page)).toBeFocused();
    expect(await page.locator('[role="menu"]').count()).toBe(0);
    // The old desktop is untouched until the boot ends: the dirtied verb is still there.
    await expect(win(page, 'hello')).toContainText('break');
    // And it did not end early: the bar is below 100 or the dialog is still present.
    await expect(dialog(page)).toHaveCount(0, { timeout: 4000 });
    await expect(win(page, 'hello')).toContainText('build');
    expect(
      await page.evaluate(
        () => (document.querySelector('header')!.parentElement as HTMLElement).inert,
      ),
    ).toBe(false);
    expect(errors).toEqual([]);
  });

  test('T08 AC21: windows minimized before Restart are not inert afterwards', async ({ page }) => {
    const errors = watchErrors(page);
    await slowBoot(page);
    await page.goto('/');
    await win(page, 'hello').waitFor();
    await page.getByRole('button', { name: 'Minimize about.md' }).click();
    await restartFromMenu(page);
    await expect(dialog(page)).toHaveCount(0, { timeout: 4000 });
    const states = await page.evaluate(() =>
      [...document.querySelectorAll('[data-win]')].map((el) => (el as HTMLElement).inert),
    );
    expect(states).toEqual([false, false, false, false, false]);
    expect(errors).toEqual([]);
  });

  for (const entry of ['keyboard', 'pointer'] as const) {
    test(`T08 AC22: the dialog holds focus with no visible outline after ${entry} entry`, async ({
      page,
    }) => {
      const errors = watchErrors(page);
      await slowBoot(page);
      await page.goto('/');
      await win(page, 'hello').waitFor();
      if (entry === 'pointer') await restartFromMenu(page);
      else {
        await restartFromKeyboard(page);
      }
      const d = dialog(page);
      await expect(d).toBeVisible();
      await expect(d).toBeFocused();
      await expect(d).toHaveAttribute('aria-modal', 'true');
      expect(await d.evaluate((el) => (el as HTMLElement).tabIndex)).toBe(-1);
      const outline = await d.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { style: cs.outlineStyle, width: cs.outlineWidth };
      });
      expect(outline.style === 'none' || outline.width === '0px').toBe(true);
      await expect(page.getByRole('progressbar', { name: 'Restart progress' })).toBeVisible();
      await expect(d).toHaveCount(0, { timeout: 4000 });
      expect(errors).toEqual([]);
    });
  }
});

test.describe('T08 focus and Tab order after Restart (AC25)', () => {
  for (const reduced of [false, true]) {
    for (const entry of ['menu', 'terminal'] as const) {
      test(`T08 AC25: after Restart from the ${entry} (${reduced ? 'reduced motion' : 'boot'}) focus is on tanzi.os and Tab order matches a fresh load`, async ({
        page,
      }) => {
        const errors = watchErrors(page);
        if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
        else await slowBoot(page);
        await page.goto('/');
        await win(page, 'hello').waitFor();
        const N = 14;
        const fresh = await tabSequence(page, N);
        expect(fresh[0]).toContain('tanzi.os');

        // Move things around, then restart.
        await page.getByRole('button', { name: 'Close hello.txt' }).click();
        const zBefore = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('[data-win]')].map((e) => e.style.zIndex),
        );
        expect(zBefore.length).toBeGreaterThan(0);
        // Other triggers must not stay roving.
        await trigger(page, 'Help').focus();

        if (entry === 'menu') await restartFromMenu(page);
        else await restartFromTerminal(page);
        if (!reduced) {
          await expect(dialog(page)).toBeVisible();
          await expect(dialog(page)).toHaveCount(0, { timeout: 4000 });
        }

        await expect(trigger(page, 'tanzi.os')).toBeFocused();
        expect(await page.evaluate(() => document.activeElement === document.body)).toBe(false);
        // Default z-order: same as a fresh load (focus did not raise a window).
        const zAfter = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('[data-win]')].map((e) => e.style.zIndex),
        );
        const order = (zs: string[]) =>
          zs
            .map((z, i) => [Number(z), i])
            .sort((a, b) => a[0] - b[0])
            .map((p) => p[1]);
        await page.reload();
        await win(page, 'hello').waitFor();
        const zFresh = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('[data-win]')].map((e) => e.style.zIndex),
        );
        expect(order(zAfter)).toEqual(order(zFresh));
        expect(errors).toEqual([]);
      });
    }
  }

  test('T08 AC25: the Tab sequence after a boot equals the sequence on a fresh load', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await slowBoot(page);
    await page.goto('/');
    await win(page, 'hello').waitFor();
    const N = 14;
    const fresh = await tabSequence(page, N);
    await page.reload();
    await win(page, 'hello').waitFor();
    await trigger(page, 'Help').focus(); // leave the roving stop elsewhere
    await restartFromMenu(page);
    await expect(dialog(page)).toHaveCount(0, { timeout: 4000 });
    await expect(trigger(page, 'tanzi.os')).toBeFocused();
    const after = [await describeActive(page), ...(await tabSequence(page, N - 1))];
    expect(after).toEqual(fresh);
    expect(errors).toEqual([]);
  });

  test('T08 AC25: the Tab sequence after a reduced-motion Restart from the terminal equals a fresh load', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await win(page, 'hello').waitFor();
    const N = 14;
    const fresh = await tabSequence(page, N);
    await restartFromTerminal(page);
    await expect(trigger(page, 'tanzi.os')).toBeFocused();
    const after = [await describeActive(page), ...(await tabSequence(page, N - 1))];
    expect(after).toEqual(fresh);
    expect(errors).toEqual([]);
  });
});

test.describe('T08 drag through a boot (AC19)', () => {
  test('T08 AC19: a drag held through a keyboard-started boot and released after it leaves the default layout', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await slowBoot(page);
    await page.goto('/');
    await win(page, 'hello').waitFor();
    const fresh = await allPos(page);
    const tb = await box(win(page, 'hello').locator('.win-titlebar'));
    const sx = tb.x + 100;
    const sy = tb.y + tb.height / 2;
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(sx + 30, sy + 20);
    await page.mouse.move(sx + 80, sy + 50);

    await restartFromKeyboard(page);
    await expect(dialog(page)).toBeVisible();
    await page.mouse.move(sx + 120, sy + 70); // still held during the boot
    await expect(dialog(page)).toHaveCount(0, { timeout: 4000 });
    await page.mouse.move(sx + 200, sy + 90);
    await page.mouse.up();
    await page.waitForTimeout(300);
    expect(await allPos(page)).toEqual(fresh);
    expect(errors).toEqual([]);
  });
});
