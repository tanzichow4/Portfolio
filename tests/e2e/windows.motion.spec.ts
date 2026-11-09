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

test.use({ colorScheme: 'dark' });

const hello = (page: Page) => page.locator('[data-win="hello"]');
const letter = (page: Page, n: number) => hello(page).locator('.hello-letter').nth(n);
const face = (loc: Locator) => loc.locator('.hello-letter-face');
const hand = (page: Page) => hello(page).locator('.hello-hand');
const verb = (page: Page) => hello(page).locator('.hello-verb');
const primary = (page: Page) => hello(page).getByRole('button', { name: "See what I've built" });
const sayHi = (page: Page) => hello(page).getByRole('link', { name: 'Say hi' });
const ctaFace = (loc: Locator) => loc.locator('.hello-cta-face');

const computed = (loc: Locator, prop: string) =>
  loc.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);

const box = async (loc: Locator) => {
  const b = await loc.boundingBox();
  if (!b) throw new Error('no bounding box');
  return b;
};

const tokenColour = (page: Page, token: string) =>
  page.evaluate((t) => {
    const el = document.createElement('div');
    el.style.color = `var(${t})`;
    document.body.appendChild(el);
    const c = getComputedStyle(el).color;
    el.remove();
    return c;
  }, token);

const parseMatrix = (m: string): number[] => {
  const inner = /^matrix\((.+)\)$/.exec(m.trim());
  if (!inner) throw new Error(`not a matrix: ${m}`);
  return inner[1].split(',').map(Number);
};
const angle = ([a, b]: number[]) => (Math.atan2(b, a) * 180) / Math.PI;

const settle = (page: Page) => page.waitForTimeout(800);
const AWAY: [number, number] = [5, 300];

/** Raises hello above the windows that overlap it, so pointer hits land on it. */
const raiseHello = async (page: Page) => {
  const b = await box(hello(page));
  await page.mouse.click(b.x + 6, b.y + 6);
  await page.mouse.move(...AWAY);
};

/** Samples `:hover` and the transform of `target` on every frame for at least 900ms. */
const sample = (host: Locator, target: string | null) =>
  host.evaluate(
    (el, sel) =>
      new Promise<{ hover: boolean; t: string }[]>((resolve) => {
        const f = sel ? el.querySelector(sel)! : el;
        const out: { hover: boolean; t: string }[] = [];
        const start = performance.now();
        const tick = () => {
          out.push({ hover: el.matches(':hover'), t: getComputedStyle(f).transform });
          if (performance.now() - start < 900) requestAnimationFrame(tick);
          else resolve(out);
        };
        requestAnimationFrame(tick);
      }),
    target,
  );

test.describe('T07 hello motion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await raiseHello(page);
  });

  test('T07 AC15: a hovered letter face settles at translateY(-12px) rotate(-6deg), the host stays none', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    const host = letter(page, 1);
    expect(await computed(face(host), 'transform')).toBe('none');
    await host.hover();
    await settle(page);
    const m = parseMatrix(await computed(face(host), 'transform'));
    expect(angle(m)).toBeCloseTo(-6, 0);
    expect(Math.hypot(m[0], m[1])).toBeCloseTo(1, 2);
    // Rotation is about the centre, so the net lift is -12px for the origin offset by the rotation.
    expect(m[5]).toBeLessThan(-10);
    expect(m[5]).toBeGreaterThan(-14);
    expect(await computed(host, 'transform')).toBe('none');
    expect(await computed(face(host), 'color')).toBe(await tokenColour(page, '--color-accent-400'));
    await page.mouse.move(...AWAY);
    await settle(page);
    expect(await computed(face(host), 'transform')).toBe('none');
    expect(errors).toEqual([]);
  });

  test('T07 AC13: the hovered hand rotates -28deg', async ({ page }) => {
    const errors = watchErrors(page);
    await hand(page).hover();
    await settle(page);
    expect(angle(parseMatrix(await computed(hand(page), 'transform')))).toBeCloseTo(-28, 0);
    expect(errors).toEqual([]);
  });

  test('T07 AC17: the hovered verb is rotate(-4deg) scale(1.06) and the pressed verb is scale(.92)', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    const v = verb(page);
    await v.hover();
    await settle(page);
    const h = parseMatrix(await computed(v, 'transform'));
    expect(Math.hypot(h[0], h[1])).toBeCloseTo(1.06, 2);
    expect(angle(h)).toBeCloseTo(-4, 0);
    await page.mouse.down();
    await settle(page);
    const p = parseMatrix(await computed(v, 'transform'));
    expect(Math.hypot(p[0], p[1])).toBeCloseTo(0.92, 2);
    expect(angle(p)).toBeCloseTo(0, 1);
    // Release away from the verb so no click changes it.
    await page.mouse.move(...AWAY);
    await page.mouse.up();
    expect(errors).toEqual([]);
  });

  test('T07 AC21: a hovered primary face settles at translate(-3px, -3px) with the shadow, the host stays none', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    const host = primary(page);
    await host.hover();
    await settle(page);
    const m = parseMatrix(await computed(ctaFace(host), 'transform'));
    expect([m[4], m[5]]).toEqual([-3, -3]);
    expect(await computed(host, 'transform')).toBe('none');
    const shadow = await computed(host.locator('.btn-primary'), 'box-shadow');
    expect(shadow).toContain(await tokenColour(page, '--color-accent'));
    expect(shadow).toContain('3px 3px 0px 0px');
    expect(errors).toEqual([]);
  });

  test('T07 AC12: the hovered primary label uses --color-accent-300', async ({ page }) => {
    const errors = watchErrors(page);
    const host = primary(page);
    await host.hover();
    await settle(page);
    expect(await computed(host.locator('.btn-primary'), 'color')).toBe(
      await tokenColour(page, '--color-accent-300'),
    );
    expect(errors).toEqual([]);
  });

  test('T07 AC21: a hovered Say hi face settles at translate(-3px, -3px) with a neutral-700 shadow (no click)', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    const host = sayHi(page);
    await host.hover();
    await settle(page);
    const m = parseMatrix(await computed(ctaFace(host), 'transform'));
    expect([m[4], m[5]]).toEqual([-3, -3]);
    expect(await computed(host, 'transform')).toBe('none');
    expect(await computed(host.locator('.btn-secondary'), 'box-shadow')).toContain(
      await tokenColour(page, '--color-neutral-700'),
    );
    expect(errors).toEqual([]);
  });

  test('T07 AC21: pressed buttons return to no offset and no shadow, then lift again after release away', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    for (const host of [primary(page), sayHi(page)]) {
      await host.hover();
      await page.mouse.down();
      await settle(page);
      expect(await computed(ctaFace(host), 'transform')).toBe('none');
      const surf = host.locator('.btn-primary, .btn-secondary');
      expect(await computed(surf, 'box-shadow')).toBe('none');
      // Move off before releasing, so neither button activates.
      await page.mouse.move(...AWAY);
      await page.mouse.up();
      await settle(page);
      expect(await computed(ctaFace(host), 'transform')).toBe('none');
    }
    expect(errors).toEqual([]);
  });

  test('T07 AC9: resting at the bottom edge and corners of a letter keeps hover and a settled pose', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    const host = letter(page, 1);
    const b = await box(host);
    const pts = [
      // The two name lines abut, and hit-testing snaps to whole pixels, so the last whole pixel is the edge.
      [b.x + b.width / 2, b.y + b.height - 1],
      [b.x + 2, b.y + b.height - 1],
      [b.x + b.width - 2, b.y + b.height - 1],
      [b.x + b.width / 2, b.y + 1],
    ];
    for (const [x, y] of pts) {
      await page.mouse.move(...AWAY);
      await settle(page);
      await page.mouse.move(x, y);
      const samples = await sample(host, '.hello-letter-face');
      expect(samples.length).toBeGreaterThan(10);
      expect(
        samples.every((s) => s.hover),
        `hover lost at ${x},${y}`,
      ).toBe(true);
      const tail = samples.slice(-Math.floor(samples.length / 3)).map((s) => s.t);
      expect(new Set(tail).size).toBe(1);
      expect(angle(parseMatrix(tail[0]))).toBeCloseTo(-6, 0);
    }
    expect(errors).toEqual([]);
  });

  test('T07 AC9: resting at the bottom edge and corners of each button keeps hover and a settled pose', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    for (const host of [primary(page), sayHi(page)]) {
      const b = await box(host);
      // The 10px radius means only points inside the arc hit-test: 4px in is inside it.
      const pts = [
        [b.x + b.width / 2, b.y + b.height - 0.5],
        [b.x + 4, b.y + b.height - 4],
        [b.x + b.width - 4, b.y + b.height - 4],
        [b.x + 4, b.y + 4],
        [b.x + b.width - 4, b.y + 4],
      ];
      for (const [x, y] of pts) {
        await page.mouse.move(...AWAY);
        await settle(page);
        await page.mouse.move(x, y);
        const samples = await sample(host, '.hello-cta-face');
        expect(samples.length).toBeGreaterThan(10);
        expect(
          samples.every((s) => s.hover),
          `hover lost at ${x},${y}`,
        ).toBe(true);
        const tail = samples.slice(-Math.floor(samples.length / 3)).map((s) => s.t);
        expect(new Set(tail).size).toBe(1);
        const m = parseMatrix(tail[0]);
        expect([m[4], m[5]]).toEqual([-3, -3]);
      }
    }
    expect(errors).toEqual([]);
  });

  test("T07 AC9: a click at the bottom edge and corners of See what I've built activates it", async ({
    page,
  }) => {
    const errors = watchErrors(page);
    const host = primary(page);
    const b = await box(host);
    const pts = [
      [b.x + b.width / 2, b.y + b.height - 0.5],
      [b.x + 4, b.y + b.height - 4],
      [b.x + b.width - 4, b.y + 4],
    ];
    const z = (id: string) =>
      page.locator(`[data-win="${id}"]`).evaluate((e) => Number((e as HTMLElement).style.zIndex));
    for (const [x, y] of pts) {
      await page.mouse.click(5, 300);
      // Raise hello above proj, then the click must raise proj again by opening it.
      const hb = await box(hello(page));
      await page.mouse.click(hb.x + 6, hb.y + 6);
      expect(await z('hello')).toBeGreaterThan(await z('proj'));
      await page.mouse.move(x, y);
      await settle(page);
      await page.mouse.click(x, y);
      await expect.poll(async () => (await z('proj')) > (await z('hello'))).toBe(true);
      await expect(page.locator('[data-win="hello"]')).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

  test('T07 AC13: hello does not change height while the letter and button poses change', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    const before = await box(hello(page));
    await letter(page, 1).hover();
    await settle(page);
    await primary(page).hover();
    await settle(page);
    const after = await box(hello(page));
    expect(after.height).toBe(before.height);
    expect(after.width).toBe(before.width);
    expect(errors).toEqual([]);
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('T07 AC8: hover and press leave every hello transform at none', async ({ page }) => {
      const errors = watchErrors(page);
      const targets: [Locator, Locator][] = [
        [letter(page, 1), face(letter(page, 1))],
        [hand(page), hand(page)],
        [verb(page), verb(page)],
        [primary(page), ctaFace(primary(page))],
        [sayHi(page), ctaFace(sayHi(page))],
      ];
      for (const [host, moving] of targets) {
        await host.hover();
        await settle(page);
        expect(await computed(moving, 'transform')).toBe('none');
        expect(await computed(host, 'transform')).toBe('none');
        await page.mouse.down();
        await settle(page);
        expect(await computed(moving, 'transform')).toBe('none');
        await page.mouse.move(...AWAY);
        await page.mouse.up();
      }
      expect(errors).toEqual([]);
    });

    test('T07 AC8: colour changes remain under reduced motion', async ({ page }) => {
      const errors = watchErrors(page);
      await letter(page, 1).hover();
      await settle(page);
      expect(await computed(face(letter(page, 1)), 'color')).toBe(
        await tokenColour(page, '--color-accent-400'),
      );
      await primary(page).hover();
      await settle(page);
      expect(await computed(primary(page).locator('.btn-primary'), 'color')).toBe(
        await tokenColour(page, '--color-accent-300'),
      );
      expect(errors).toEqual([]);
    });

    test('T07 AC8: the verb still advances on click under reduced motion', async ({ page }) => {
      const errors = watchErrors(page);
      const before = await verb(page).textContent();
      await verb(page).click();
      await expect.poll(() => verb(page).textContent()).not.toBe(before);
      expect(errors).toEqual([]);
    });
  });
});

// ---- T8: pills, experience tabs and project tiles ----

const dockTitles: Record<string, string> = { about: 'about', exp: 'experience', proj: 'projects' };

/** Opens the window if needed, then raises it by a pointer-down on its title bar. */
const raise = async (page: Page, id: string) => {
  const win = page.locator(`[data-win="${id}"]`);
  if (!(await win.isVisible())) {
    await page
      .getByRole('navigation', { name: 'Dock' })
      .getByRole('button', { name: dockTitles[id], exact: true })
      .click();
  }
  await expect(win).toBeVisible();
  // Windows overlap: find a point where this window is the topmost, non-interactive hit and press there.
  const pt = await win.evaluate((el) => {
    const r = el.getBoundingClientRect();
    for (let y = r.top + 4; y < r.bottom; y += 6) {
      for (let x = r.left + 4; x < r.right; x += 6) {
        const hit = document.elementFromPoint(x, y);
        if (hit && el.contains(hit) && !hit.closest('a, button, [role="tab"], [role="tabpanel"]')) {
          return [x, y];
        }
      }
    }
    return null;
  });
  if (!pt) throw new Error(`no uncovered point on ${id}`);
  await page.mouse.click(pt[0], pt[1]);
  await page.mouse.move(...AWAY);
};

/** Fails the test on any navigation attempt from a click in the page. */
const blockNavigation = (page: Page) =>
  page.evaluate(() => {
    document.addEventListener('click', (e) => e.preventDefault(), true);
  });

/** Points on the at-rest box of `host`, including the bottom edge and corners. */
const edgePoints = (b: { x: number; y: number; width: number; height: number }, inset: number) => [
  [b.x + b.width / 2, b.y + b.height - 1],
  [b.x + inset, b.y + b.height - 1],
  [b.x + b.width - inset, b.y + b.height - 1],
  [b.x + b.width / 2, b.y + 1],
];

/** Hit-testing at a point must land on `host` (or inside it); guards against overlapping windows. */
const hitsHost = (host: Locator, x: number, y: number) =>
  host.evaluate((el, [px, py]) => el.contains(document.elementFromPoint(px, py)), [x, y]);

test.describe('T07 pill, tab and tile motion', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await blockNavigation(page);
  });

  const pill = (page: Page, n: number) => page.locator('[data-win="about"] .fact').nth(n);
  const tab = (page: Page, n: number) => page.locator('[data-win="exp"] .exp-tab').nth(n);
  const tile = (page: Page, n: number) => page.locator('[data-win="proj"] .proj-tile').nth(n);

  test('T07 AC24: a hovered pill face settles at rotate(-4deg) translateY(-3px), the host stays none', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await raise(page, 'about');
    const host = pill(page, 0);
    expect(await computed(host.locator('.fact-face'), 'transform')).toBe('none');
    await host.hover();
    await settle(page);
    const m = parseMatrix(await computed(host.locator('.fact-face'), 'transform'));
    expect(angle(m)).toBeCloseTo(-4, 0);
    expect(Math.hypot(m[0], m[1])).toBeCloseTo(1, 2);
    expect(m[5]).toBeLessThan(-2);
    expect(m[5]).toBeGreaterThan(-5);
    expect(await computed(host, 'transform')).toBe('none');
    await page.mouse.move(...AWAY);
    await settle(page);
    expect(await computed(host.locator('.fact-face'), 'transform')).toBe('none');
    expect(errors).toEqual([]);
  });

  test('T07 AC29: a hovered tab face settles at translateX(4px), the host stays none', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await raise(page, 'exp');
    const host = tab(page, 1);
    expect(await computed(host.locator('.exp-tab-face'), 'transform')).toBe('none');
    await host.hover();
    await settle(page);
    const m = parseMatrix(await computed(host.locator('.exp-tab-face'), 'transform'));
    expect([m[0], m[1], m[2], m[3], m[4], m[5]]).toEqual([1, 0, 0, 1, 4, 0]);
    expect(await computed(host, 'transform')).toBe('none');
    await page.mouse.move(...AWAY);
    await settle(page);
    expect(await computed(host.locator('.exp-tab-face'), 'transform')).toBe('none');
    expect(errors).toEqual([]);
  });

  test('T07 AC29: the active tab also translates on hover', async ({ page }) => {
    const errors = watchErrors(page);
    await raise(page, 'exp');
    const host = tab(page, 0);
    await host.hover();
    await settle(page);
    const m = parseMatrix(await computed(host.locator('.exp-tab-face'), 'transform'));
    expect(m[4]).toBe(4);
    expect(errors).toEqual([]);
  });

  test('T07 AC33: a hovered tile face settles at translateY(-5px) rotate(-1.5deg) with --shadow-md, the host stays none', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await raise(page, 'proj');
    const host = tile(page, 0);
    const f = host.locator('.proj-face');
    const restShadow = await computed(f, 'box-shadow');
    await host.hover();
    await settle(page);
    const m = parseMatrix(await computed(f, 'transform'));
    expect(angle(m)).toBeCloseTo(-1.5, 0);
    expect(Math.hypot(m[0], m[1])).toBeCloseTo(1, 2);
    expect(m[5]).toBeLessThan(-4);
    expect(m[5]).toBeGreaterThan(-6);
    expect(await computed(host, 'transform')).toBe('none');
    const shadow = await computed(f, 'box-shadow');
    expect(shadow).not.toBe(restShadow);
    expect(shadow).toContain('18px');
    await page.mouse.move(...AWAY);
    await settle(page);
    expect(await computed(f, 'transform')).toBe('none');
    expect(errors).toEqual([]);
  });

  test('T07 AC33: a pressed tile face is scale(.97); releasing away does not navigate', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await raise(page, 'proj');
    const host = tile(page, 0);
    await host.hover();
    await page.mouse.down();
    await settle(page);
    const m = parseMatrix(await computed(host.locator('.proj-face'), 'transform'));
    expect(Math.hypot(m[0], m[1])).toBeCloseTo(0.97, 2);
    expect(angle(m)).toBeCloseTo(0, 1);
    expect(await computed(host, 'transform')).toBe('none');
    await page.mouse.move(...AWAY);
    await page.mouse.up();
    expect(errors).toEqual([]);
  });

  const stability = (
    name: string,
    ac: string,
    getHost: (page: Page) => Locator,
    win: string,
    faceSel: string,
    inset: number,
    check: (m: number[]) => void,
  ) =>
    test(`T07 AC9: resting at the bottom edge and corners of a ${name} keeps hover and a settled pose (${ac})`, async ({
      page,
    }) => {
      const errors = watchErrors(page);
      await raise(page, win);
      const host = getHost(page);
      const b = await box(host);
      for (const [x, y] of edgePoints(b, inset)) {
        await page.mouse.move(...AWAY);
        await settle(page);
        expect(await hitsHost(host, x, y), `window covered at ${x},${y}`).toBe(true);
        await page.mouse.move(x, y);
        const samples = await sample(host, faceSel);
        expect(samples.length).toBeGreaterThan(10);
        expect(
          samples.every((s) => s.hover),
          `hover lost at ${x},${y}`,
        ).toBe(true);
        const tail = samples.slice(-Math.floor(samples.length / 3)).map((s) => s.t);
        expect(new Set(tail).size).toBe(1);
        check(parseMatrix(tail[0]));
      }
      expect(errors).toEqual([]);
    });

  stability(
    'pill',
    'AC24',
    (p) => pill(p, 0),
    'about',
    '.fact-face',
    14, // pill radius: only points inside the arc hit-test
    (m) => expect(angle(m)).toBeCloseTo(-4, 0),
  );
  stability(
    'tab',
    'AC29',
    (p) => tab(p, 1),
    'exp',
    '.exp-tab-face',
    8,
    (m) => expect(m[4]).toBe(4),
  );
  stability(
    'tile',
    'AC33',
    (p) => tile(p, 0),
    'proj',
    '.proj-face',
    8,
    (m) => expect(angle(m)).toBeCloseTo(-1.5, 0),
  );

  test('T07 AC9: a click at the bottom edge of a tab selects it', async ({ page }) => {
    const errors = watchErrors(page);
    await raise(page, 'exp');
    const host = tab(page, 1);
    const b = await box(host);
    const x = b.x + b.width / 2;
    const y = b.y + b.height - 1;
    await page.mouse.move(x, y);
    await settle(page);
    await page.mouse.click(x, y);
    await expect(host).toHaveAttribute('aria-selected', 'true');
    expect(errors).toEqual([]);
  });

  test('T07 AC9: a click at the bottom edge of a tile reaches the link (navigation is cancelled)', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await raise(page, 'proj');
    const host = tile(page, 0);
    await page.evaluate(() => {
      (window as unknown as { __clicks: number }).__clicks = 0;
      document.addEventListener(
        'click',
        (e) => {
          if ((e.target as Element).closest('.proj-tile')) (window as any).__clicks++; // eslint-disable-line @typescript-eslint/no-explicit-any
        },
        true,
      );
    });
    const b = await box(host);
    const x = b.x + b.width / 2;
    const y = b.y + b.height - 1;
    await page.mouse.move(x, y);
    await settle(page);
    await page.mouse.click(x, y);
    expect(await page.evaluate(() => (window as unknown as { __clicks: number }).__clicks)).toBe(1);
    expect(errors).toEqual([]);
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('T07 AC8: hover and press leave every pill, tab and tile transform at none', async ({
      page,
    }) => {
      const errors = watchErrors(page);
      const targets: [string, Locator, string][] = [
        ['about', pill(page, 0), '.fact-face'],
        ['exp', tab(page, 1), '.exp-tab-face'],
        ['proj', tile(page, 0), '.proj-face'],
      ];
      for (const [win, host, faceSel] of targets) {
        await raise(page, win);
        const f = host.locator(faceSel);
        await host.hover();
        await settle(page);
        expect(await computed(f, 'transform'), `${faceSel} hover`).toBe('none');
        expect(await computed(host, 'transform')).toBe('none');
        await page.mouse.down();
        await settle(page);
        expect(await computed(f, 'transform'), `${faceSel} press`).toBe('none');
        await page.mouse.move(...AWAY);
        await page.mouse.up();
      }
      expect(errors).toEqual([]);
    });

    test('T07 AC8: the tile shadow change may remain under reduced motion', async ({ page }) => {
      const errors = watchErrors(page);
      await raise(page, 'proj');
      const f = tile(page, 0).locator('.proj-face');
      const rest = await computed(f, 'box-shadow');
      await tile(page, 0).hover();
      await settle(page);
      expect(await computed(f, 'box-shadow')).not.toBe(rest);
      expect(errors).toEqual([]);
    });
  });
});
