import { expect, test, type Locator, type Page } from '@playwright/test';

const DOCK5 = ['hello', 'about', 'exp', 'proj', 'term'] as const;
const TITLES: Record<(typeof DOCK5)[number], string> = {
  hello: 'hello.txt',
  about: 'about.md',
  exp: 'experience.log',
  proj: 'projects',
  term: 'terminal',
};

const watchErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on(
    'console',
    (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text()),
  );
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

const win = (page: Page, id: string) => page.locator(`[data-win="${id}"]`);
const bar = (page: Page, id: string) => win(page, id).locator('.win-titlebar');

const box = async (loc: Locator) => {
  const b = await loc.boundingBox();
  if (!b) throw new Error('no bounding box');
  return b;
};

/** Resolves a token to its computed colour by painting a probe element. */
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

const computed = (loc: Locator, prop: string) =>
  loc.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);

/** Rotation in degrees and uniform scale from a computed matrix. */
const parseMatrix = (t: string) => {
  const m = t.match(/^matrix\(([^)]+)\)$/);
  if (!m) return null;
  const [a, b] = m[1].split(',').map(Number);
  return { deg: (Math.atan2(b, a) * 180) / Math.PI, scale: Math.hypot(a, b) };
};

const focusedLabel = (page: Page) =>
  page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');

const tabLabels = async (page: Page, n: number) => {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    out.push(await focusedLabel(page));
  }
  return out;
};

const focusedName = (page: Page) =>
  page.evaluate(
    () =>
      document.activeElement?.getAttribute('aria-label') ??
      document.activeElement?.textContent?.trim() ??
      '',
  );

// DELIBERATE REQUIREMENT CHANGE (T05 AC40): the menubar adds five tab stops before the first
// window control. This helper pins them exactly, so any drift in count or order fails loudly.
const tabPastMenubar = async (page: Page) => {
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  const names: string[] = [];
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    names.push(await focusedName(page));
  }
  expect(names).toEqual([
    'tanzi.os',
    'GitHub',
    'LinkedIn',
    'Email',
    theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode',
  ]);
};

const zOf = (page: Page, id: string) => win(page, id).evaluate((el) => Number(el.style.zIndex));

test.describe('window chrome', () => {
  test('AC8: at rest every window has an identity transform immediately after load (no fly-out)', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await win(page, 'hello').waitFor();
    for (const id of DOCK5) {
      expect(await computed(win(page, id), 'transform'), id).toBe('none');
      expect(await computed(win(page, id), 'opacity'), id).toBe('1');
    }
    expect(errors).toEqual([]);
  });

  test('AC8: at 1920x1080 positions match T03 and the transform is identity', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await win(page, 'term').waitFor();
    const b = await box(win(page, 'term'));
    expect(Math.round(b.x)).toBe(1450);
    expect(Math.round(b.y)).toBe(694);
    expect(await computed(win(page, 'term'), 'transform')).toBe('none');
  });

  test('AC4/AC6: titlebar metrics, colours and cursor follow the spec', async ({ page }) => {
    await page.goto('/');
    const tb = bar(page, 'hello');
    expect(await computed(tb, 'padding-top')).toBe('8px');
    expect(await computed(tb, 'padding-right')).toBe('8px');
    expect(await computed(tb, 'padding-bottom')).toBe('8px');
    expect(await computed(tb, 'padding-left')).toBe('16px');
    expect(await computed(tb, 'font-size')).toBe('12px');
    expect(await computed(tb, 'color')).toBe(await tokenColour(page, '--color-neutral-400'));
    expect(await computed(tb, 'background-color')).toBe(await tokenBg(page, '--color-bg'));
    expect(await computed(tb, 'cursor')).toBe('grab');
    expect(await computed(tb, 'touch-action')).toBe('none');
    for (const name of ['Minimize hello.txt', 'Close hello.txt']) {
      const b = await box(page.getByRole('button', { name }));
      expect(Math.round(b.width)).toBe(24);
      expect(Math.round(b.height)).toBe(24);
    }
  });

  test('AC4: the site window shows no minimize button', async ({ page }) => {
    await page.goto('/');
    for (const id of DOCK5) {
      await expect(
        win(page, id).getByRole('button', { name: `Minimize ${TITLES[id]}` }),
      ).toHaveCount(1);
      await expect(win(page, id).getByRole('button', { name: `Close ${TITLES[id]}` })).toHaveCount(
        1,
      );
    }
    // DELIBERATE REQUIREMENT CHANGE (T05 AC40): the menubar adds one button (the theme toggle).
    await expect(page.locator('[data-win]').getByRole('button')).toHaveCount(10);
    await expect(page.getByRole('banner').getByRole('button')).toHaveCount(1);
    await expect(page.getByRole('button')).toHaveCount(11);
  });

  test('AC11/AC16: dragging tilts right then left, scales up, and springs flat on release', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    const before = await box(win(page, 'hello'));
    const others = await Promise.all(
      DOCK5.filter((i) => i !== 'hello').map((i) => box(win(page, i))),
    );
    const tb = await box(bar(page, 'hello'));
    const sx = tb.x + 100;
    const sy = tb.y + tb.height / 2;
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(sx + 30, sy + 10);
    const right = parseMatrix(await computed(win(page, 'hello'), 'transform'));
    expect(right).not.toBeNull();
    expect(right!.deg).toBeGreaterThan(0);
    expect(right!.deg).toBeLessThanOrEqual(7.01);
    expect(right!.scale).toBeCloseTo(1.015, 2);
    await page.mouse.move(sx + 10, sy + 10);
    const left = parseMatrix(await computed(win(page, 'hello'), 'transform'));
    expect(left!.deg).toBeLessThan(0);
    expect(left!.deg).toBeGreaterThanOrEqual(-7.01);
    await page.mouse.move(sx + 60, sy + 40);
    await page.mouse.up();

    await expect(win(page, 'hello')).toHaveCSS('transform', 'none');
    const after = await box(win(page, 'hello'));
    expect(Math.round(after.x - before.x)).toBe(60);
    expect(Math.round(after.y - before.y)).toBe(40);
    const othersAfter = await Promise.all(
      DOCK5.filter((i) => i !== 'hello').map((i) => box(win(page, i))),
    );
    expect(othersAfter).toEqual(others);
    expect(await page.evaluate(() => window.getSelection()?.toString() ?? '')).toBe('');
    expect(errors).toEqual([]);
  });

  test('AC15: dragging selects no text', async ({ page }) => {
    await page.goto('/');
    const tb = await box(bar(page, 'about'));
    await page.mouse.move(tb.x + 40, tb.y + 10);
    await page.mouse.down();
    await page.mouse.move(tb.x + 200, tb.y + 120, { steps: 5 });
    await page.mouse.move(tb.x - 20, tb.y + 20, { steps: 5 });
    await page.mouse.up();
    expect(await page.evaluate(() => window.getSelection()?.toString() ?? '')).toBe('');
  });

  test('AC11: dragging far away clamps the window to the allowed range', async ({ page }) => {
    await page.goto('/');
    const vp = page.viewportSize()!;
    const tb = await box(bar(page, 'hello'));
    const w = (await box(win(page, 'hello'))).width;
    await page.mouse.move(tb.x + 10, tb.y + 10);
    await page.mouse.down();
    await page.mouse.move(vp.width - 1, vp.height - 1, { steps: 4 });
    await page.mouse.up();
    await expect(win(page, 'hello')).toHaveCSS('transform', 'none');
    let b = await box(win(page, 'hello'));
    expect(b.x).toBeLessThanOrEqual(vp.width - 80 + 0.5);
    expect(b.y).toBeLessThanOrEqual(vp.height - 60 + 0.5);

    const tb2 = await box(bar(page, 'hello'));
    await page.mouse.move(tb2.x + 10, tb2.y + 10);
    await page.mouse.down();
    await page.mouse.move(0, 0, { steps: 4 });
    await page.mouse.up();
    await expect(win(page, 'hello')).toHaveCSS('transform', 'none');
    b = await box(win(page, 'hello'));
    expect(b.y).toBeGreaterThanOrEqual(36 - 0.5);
    expect(b.x).toBeGreaterThanOrEqual(80 - w - 0.5);
  });

  test('AC11: a vertical drag above the menubar clamps y to 36', async ({ page }) => {
    await page.goto('/');
    const tb = await box(bar(page, 'hello'));
    await page.mouse.move(tb.x + 100, tb.y + 10);
    await page.mouse.down();
    await page.mouse.move(tb.x + 100, 0, { steps: 4 });
    await page.mouse.up();
    await expect(win(page, 'hello')).toHaveCSS('transform', 'none');
    expect(Math.round((await box(win(page, 'hello'))).y)).toBe(36);
  });

  test('AC11: pressing and dragging on a button or the body does not move the window', async ({
    page,
  }) => {
    await page.goto('/');
    const before = await box(win(page, 'hello'));
    const btn = await box(page.getByRole('button', { name: 'Minimize hello.txt' }));
    await page.mouse.move(btn.x + 12, btn.y + 12);
    await page.mouse.down();
    await page.mouse.move(btn.x + 112, btn.y + 112, { steps: 4 });
    await page.mouse.up();
    // Releasing off the button must not have produced a click that closes or minimizes.
    const after = await box(win(page, 'hello'));
    expect(after.x).toBe(before.x);
    expect(after.y).toBe(before.y);

    await page.mouse.move(before.x + 200, before.y + 200);
    await page.mouse.down();
    await page.mouse.move(before.x + 300, before.y + 260, { steps: 4 });
    await page.mouse.up();
    const body = await box(win(page, 'hello'));
    expect(body.x).toBe(before.x);
    expect(body.y).toBe(before.y);
  });

  test('AC9: pressing anywhere on a window raises it with the large shadow', async ({ page }) => {
    await page.goto('/');
    const b = await box(win(page, 'proj'));
    // A spot of proj not covered by any other window (below about, right of exp, left of term).
    await page.mouse.click(b.x + 120, b.y + b.height - 10);
    for (const id of DOCK5.filter((i) => i !== 'proj')) {
      expect(await zOf(page, 'proj')).toBeGreaterThan(await zOf(page, id));
    }
    const shadows = await Promise.all(DOCK5.map((i) => computed(win(page, i), 'box-shadow')));
    const proj = shadows[DOCK5.indexOf('proj')];
    for (const [i, id] of DOCK5.entries()) if (id !== 'proj') expect(shadows[i]).not.toBe(proj);
  });

  test('AC21: clicking Close removes the window', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Close hello.txt' }).click();
    await expect(win(page, 'hello')).toHaveCount(0);
    await expect(win(page, 'about')).toHaveCount(1);
  });

  test('AC17/AC19: Minimize makes the window inert, hidden from AT and untabbable', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Minimize terminal' }).click();
    const term = win(page, 'term');
    await expect(term).toHaveAttribute('data-min', 'true');
    await expect(term).toHaveAttribute('inert', '');
    await expect(page.getByRole('region', { name: 'terminal', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Close terminal' })).toHaveCount(0);
    await expect(term).toHaveCSS('pointer-events', 'none');
    await expect(term).toHaveCSS('opacity', '0');
    // DELIBERATE REQUIREMENT CHANGE (T05 AC40): 5 menubar stops + 8 window stops + 5 margin.
    const labels = await tabLabels(page, 18);
    expect(labels.filter((l) => l.includes('terminal'))).toEqual([]);
    expect(labels).toContain('Close projects');
  });

  test('AC17: double-clicking a titlebar minimizes the window', async ({ page }) => {
    await page.goto('/');
    await bar(page, 'about').dblclick({ position: { x: 150, y: 14 } });
    await expect(win(page, 'about')).toHaveAttribute('data-min', 'true');
    await expect(win(page, 'hello')).toHaveAttribute('data-min', 'false');
  });

  test('AC17: double-clicking the body does not minimize', async ({ page }) => {
    await page.goto('/');
    const b = await box(win(page, 'hello'));
    await page.mouse.dblclick(b.x + 200, b.y + 200);
    await expect(win(page, 'hello')).toHaveAttribute('data-min', 'false');
  });

  test('AC23: Tab visits Minimize then Close of each visible window in DOM order', async ({
    page,
  }) => {
    await page.goto('/');
    // DELIBERATE REQUIREMENT CHANGE (T05 AC40): skip the five menubar tab stops.
    await tabPastMenubar(page);
    const want = DOCK5.flatMap((id) => [`Minimize ${TITLES[id]}`, `Close ${TITLES[id]}`]);
    expect(await tabLabels(page, 10)).toEqual(want);
  });

  test('AC23: Enter activates Minimize', async ({ page }) => {
    await page.goto('/');
    // DELIBERATE REQUIREMENT CHANGE (T05 AC40): skip the five menubar tab stops.
    await tabPastMenubar(page);
    await page.keyboard.press('Tab');
    expect(await focusedLabel(page)).toBe('Minimize hello.txt');
    await page.keyboard.press('Enter');
    await expect(win(page, 'hello')).toHaveAttribute('data-min', 'true');
  });

  test('AC23: Space activates Close', async ({ page }) => {
    await page.goto('/');
    // DELIBERATE REQUIREMENT CHANGE (T05 AC40): skip the five menubar tab stops.
    await tabPastMenubar(page);
    expect(await tabLabels(page, 4)).toEqual([
      'Minimize hello.txt',
      'Close hello.txt',
      'Minimize about.md',
      'Close about.md',
    ]);
    await page.keyboard.press('Space');
    await expect(win(page, 'about')).toHaveCount(0);
  });

  test('AC10: keyboard focus on a back window raises it', async ({ page }) => {
    await page.goto('/');
    // DELIBERATE REQUIREMENT CHANGE (T05 AC40): skip the five menubar tab stops.
    await tabPastMenubar(page);
    await tabLabels(page, 7); // reaches "Minimize projects"
    expect(await focusedLabel(page)).toBe('Minimize projects');
    for (const id of DOCK5.filter((i) => i !== 'proj')) {
      expect(await zOf(page, 'proj')).toBeGreaterThan(await zOf(page, id));
    }
  });

  test('AC23: the focus ring is visible and stays inside the window box', async ({ page }) => {
    await page.goto('/');
    // DELIBERATE REQUIREMENT CHANGE (T05 AC40): skip the five menubar tab stops.
    await tabPastMenubar(page);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // Close hello.txt, nearest the clipped corner
    expect(await focusedLabel(page)).toBe('Close hello.txt');
    const btn = page.getByRole('button', { name: 'Close hello.txt' });
    expect(await computed(btn, 'outline-style')).not.toBe('none');
    expect(Number.parseFloat(await computed(btn, 'outline-width'))).toBeGreaterThan(0);
    const b = await box(btn);
    const w = await box(win(page, 'hello'));
    expect(b.x - 3).toBeGreaterThanOrEqual(w.x);
    expect(b.y - 3).toBeGreaterThanOrEqual(w.y);
    expect(b.x + b.width + 3).toBeLessThanOrEqual(w.x + w.width);
    expect(b.y + b.height + 3).toBeLessThanOrEqual(w.y + w.height);
  });

  test('AC25: minimize and close work from the keyboard alone', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Minimize hello.txt' }).focus();
    await page.keyboard.press('Space');
    await expect(win(page, 'hello')).toHaveAttribute('data-min', 'true');
    await page.getByRole('button', { name: 'Close about.md' }).focus();
    await page.keyboard.press('Enter');
    await expect(win(page, 'about')).toHaveCount(0);
  });
});

test.describe('window chrome with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('AC22: dragging applies no rotation or scale', async ({ page }) => {
    await page.goto('/');
    const tb = await box(bar(page, 'hello'));
    await page.mouse.move(tb.x + 100, tb.y + 10);
    await page.mouse.down();
    await page.mouse.move(tb.x + 140, tb.y + 20);
    expect(await computed(win(page, 'hello'), 'transform')).toBe('none');
    await page.mouse.move(tb.x + 100, tb.y + 20);
    expect(await computed(win(page, 'hello'), 'transform')).toBe('none');
    await page.mouse.up();
    const b = await box(win(page, 'hello'));
    expect(Math.round(b.x)).toBe(77);
    expect(Math.round(b.y)).toBe(82);
  });

  test('AC22: minimize fades only (inline transform none, opacity 0) and stays inert', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Minimize terminal' }).click();
    const term = win(page, 'term');
    await expect(term).toHaveAttribute('data-min', 'true');
    await expect(term).toHaveAttribute('inert', '');
    const inline = await term.evaluate((el) => ({
      transform: el.style.transform,
      opacity: el.style.opacity,
    }));
    expect(['', 'none']).toContain(inline.transform);
    expect(inline.opacity).toBe('0');
  });

  test('AC22: first-load positions are unchanged under reduced motion', async ({ page }) => {
    await page.goto('/');
    const b = await box(win(page, 'hello'));
    expect(Math.round(b.x)).toBe(77);
    expect(Math.round(b.y)).toBe(72);
  });
});

test.describe('window chrome with motion allowed', () => {
  test('AC18: minimize uses the genie transform inline and fades to opacity 0', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Minimize terminal' }).click();
    const inline = await win(page, 'term').evaluate((el) => ({
      transform: el.style.transform,
      opacity: el.style.opacity,
    }));
    // term at 810,334 width 440 on 1280x720: dx 640 - 1030 = -390, dy 720 - 40 - 334 = 346
    expect(inline.transform).toBe('translate(-390px, 346px) scale(0.06)');
    expect(inline.opacity).toBe('0');
  });
});
