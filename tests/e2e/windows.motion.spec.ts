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
