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

test.use({ colorScheme: 'dark' });

const dock = (page: Page) => page.getByRole('navigation', { name: 'Dock' });
const winBtn = (page: Page) => dock(page).getByRole('button', { name: 'about.md', exact: true });
const link = (page: Page, label: string) =>
  dock(page).getByRole('link', { name: label, exact: true });
const face = (loc: Locator) => loc.locator('.dock-face');
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

const snapshot = (page: Page) =>
  page.evaluate(() =>
    JSON.stringify([
      [...document.querySelectorAll('.dock-win')].map((e) => e.getAttribute('aria-pressed')),
      [...document.querySelectorAll('[data-win]')].map((e) => [
        e.getAttribute('data-win'),
        (e as HTMLElement).style.zIndex,
        e.getAttribute('data-min'),
      ]),
    ]),
  );

const parseMatrix = (m: string): number[] => {
  const inner = /^matrix\((.+)\)$/.exec(m.trim());
  if (!inner) throw new Error(`not a matrix: ${m}`);
  return inner[1].split(',').map(Number);
};

// The control has a 12px corner radius, so only points inside the rounded shape hit-test.
// 4px in on both axes is inside the arc (distance 11.3 from the radius centre).
const INSET = 4;

const settle = (page: Page) => page.waitForTimeout(700);

/** Records clicks on dock links and cancels them, so no navigation or popup happens. */
const trapLinkClicks = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __linkClicks: string[] };
    w.__linkClicks = [];
    window.addEventListener(
      'click',
      (e) => {
        const a = (e.target as Element).closest('a');
        if (a) {
          w.__linkClicks.push(a.getAttribute('aria-label') ?? '');
          e.preventDefault();
        }
      },
      true,
    );
  });
const linkClicks = (page: Page) =>
  page.evaluate(() => (window as unknown as { __linkClicks: string[] }).__linkClicks);

test.describe('T06 dock motion', () => {
  test('T06 AC17: a hovered window button settles at matrix(1.15, 0, 0, 1.15, 0, -10) on the face only', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): only hello is open on load, so open the other windows from the dock first.
    await openAllFromDock(page);
    const host = winBtn(page);
    expect(await computed(face(host), 'transform')).toBe('none');
    await host.hover();
    await settle(page);
    const m = parseMatrix(await computed(face(host), 'transform'));
    [1.15, 0, 0, 1.15, 0, -10].forEach((v, i) => expect(m[i]).toBeCloseTo(v, 2));
    expect(await computed(host, 'transform')).toBe('none');
    expect(errors).toEqual([]);
  });

  test('T06 AC17: a hovered link settles lifted 10px, scaled 1.15 and rotated about -8deg', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): open the other windows from the dock (only hello is open on load).
    await openAllFromDock(page);
    const host = link(page, 'LinkedIn');
    await host.hover();
    await settle(page);
    const [a, b, , , tx, ty] = parseMatrix(await computed(face(host), 'transform'));
    expect(Math.hypot(a, b)).toBeCloseTo(1.15, 2);
    expect((Math.atan2(b, a) * 180) / Math.PI).toBeCloseTo(-8, 0);
    expect(tx).toBeCloseTo(0, 1);
    expect(ty).toBeCloseTo(-10, 1);
    expect(await computed(host, 'transform')).toBe('none');
    expect(errors).toEqual([]);
  });

  test('T06 AC17: the pressed window button is translateY(-4px) scale(.95) between mouse down and up', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): open the other windows from the dock (only hello is open on load).
    await openAllFromDock(page);
    const host = winBtn(page);
    await host.hover();
    await page.mouse.down();
    await settle(page);
    const m = parseMatrix(await computed(face(host), 'transform'));
    [0.95, 0, 0, 0.95, 0, -4].forEach((v, i) => expect(m[i]).toBeCloseTo(v, 2));
    expect(await computed(host, 'transform')).toBe('none');
    await page.mouse.up();
    await settle(page);
    const after = parseMatrix(await computed(face(host), 'transform'));
    expect(after[3]).toBeCloseTo(1.15, 2);
    expect(errors).toEqual([]);
  });

  test('T06 AC5: link icon colour changes from --color-neutral-300 to --color-text on hover', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): open the other windows from the dock (only hello is open on load).
    await openAllFromDock(page);
    const host = link(page, 'LinkedIn');
    expect(await computed(face(host), 'color')).toBe(
      await tokenColour(page, '--color-neutral-300'),
    );
    await host.hover();
    await settle(page);
    expect(await computed(face(host), 'color')).toBe(await tokenColour(page, '--color-text'));
    await page.mouse.move(5, 300);
    await settle(page);
    expect(await computed(face(host), 'color')).toBe(
      await tokenColour(page, '--color-neutral-300'),
    );
    expect(errors).toEqual([]);
  });

  test('T06 AC18: resting at the bottom edge and corners keeps hover on every frame and the pose settled', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): open the other windows from the dock (only hello is open on load).
    await openAllFromDock(page);
    const targets: Locator[] = [winBtn(page), link(page, 'LinkedIn')];
    for (const host of targets) {
      const b = await box(host);
      const pts = [
        [b.x + b.width / 2, b.y + b.height - 0.5],
        [b.x + INSET, b.y + b.height - INSET],
        [b.x + b.width - INSET, b.y + b.height - INSET],
        [b.x + INSET, b.y + INSET],
        [b.x + b.width - INSET, b.y + INSET],
      ];
      for (const [x, y] of pts) {
        await page.mouse.move(5, 300);
        await settle(page);
        await page.mouse.move(x, y);
        const samples = await host.evaluate(
          (el) =>
            new Promise<{ hover: boolean; t: string }[]>((resolve) => {
              const f = el.querySelector('.dock-face')!;
              const out: { hover: boolean; t: string }[] = [];
              const start = performance.now();
              const tick = () => {
                out.push({ hover: el.matches(':hover'), t: getComputedStyle(f).transform });
                if (performance.now() - start < 1000) requestAnimationFrame(tick);
                else resolve(out);
              };
              requestAnimationFrame(tick);
            }),
        );
        expect(samples.length).toBeGreaterThan(10);
        expect(
          samples.every((s) => s.hover),
          `hover lost at ${x},${y}`,
        ).toBe(true);
        // After the .35s transition (with overshoot) the pose must not change again.
        const tail = samples.slice(-Math.floor(samples.length / 3)).map((s) => s.t);
        expect(new Set(tail).size).toBe(1);
        const [a, b] = parseMatrix(tail[0]);
        expect(Math.hypot(a, b)).toBeCloseTo(1.15, 2);
      }
    }
    expect(errors).toEqual([]);
  });

  test('T06 AC18: a click at the bottom edge and at the corners activates the window button', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): open the other windows from the dock (only hello is open on load).
    await openAllFromDock(page);
    const host = winBtn(page);
    const b = await box(host);
    const pts = [
      [b.x + b.width / 2, b.y + b.height - 0.5],
      [b.x + INSET, b.y + b.height - INSET],
      [b.x + b.width - INSET, b.y + INSET],
    ];
    let prev = await snapshot(page);
    for (const [x, y] of pts) {
      await page.mouse.move(x, y);
      await settle(page);
      await page.mouse.click(x, y);
      const next = await snapshot(page);
      // Each click focuses, minimizes or restores, so the desktop state always changes.
      expect(next, `no action at ${x},${y}`).not.toBe(prev);
      prev = next;
      await page.waitForTimeout(500);
    }
    expect(errors).toEqual([]);
  });

  test('T06 AC18: a click at the bottom edge and corners activates a link', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): open the other windows from the dock (only hello is open on load).
    await openAllFromDock(page);
    await trapLinkClicks(page);
    const host = link(page, 'LinkedIn');
    const b = await box(host);
    const pts = [
      [b.x + b.width / 2, b.y + b.height - 0.5],
      [b.x + INSET, b.y + b.height - INSET],
      [b.x + b.width - INSET, b.y + INSET],
    ];
    for (const [x, y] of pts) {
      await page.mouse.move(x, y);
      await settle(page);
      await page.mouse.click(x, y);
    }
    expect(await linkClicks(page)).toEqual(['LinkedIn', 'LinkedIn', 'LinkedIn']);
    expect(errors).toEqual([]);
  });

  test('T06 AC18: the dock does not clip a lifted control; its top is painted above the dock box', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): open the other windows from the dock (only hello is open on load).
    await openAllFromDock(page);
    const nav = dock(page);
    expect(await computed(nav, 'overflow')).toBe('visible');
    const host = winBtn(page);
    const d = await box(nav);
    const b = await box(host);
    const strip = { x: b.x + 6, y: d.y - 4, width: b.width - 12, height: 3 };
    await page.mouse.move(5, 300);
    await settle(page);
    const rest = await page.screenshot({ clip: strip });
    await host.hover();
    await settle(page);
    const fb = await box(face(host));
    expect(fb.y).toBeLessThan(d.y);
    const lifted = await page.screenshot({ clip: strip });
    expect(lifted.equals(rest)).toBe(false);
    expect(errors).toEqual([]);
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('T06 AC19: hover and press leave the face at transform none', async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto('/');
      // DELIBERATE REQUIREMENT CHANGE (T15 AC25): open the other windows from the dock (only hello is open on load).
      await openAllFromDock(page);
      for (const host of [winBtn(page), link(page, 'LinkedIn')]) {
        await host.hover();
        await settle(page);
        expect(await computed(face(host), 'transform')).toBe('none');
        expect(await computed(host, 'transform')).toBe('none');
        await page.mouse.down();
        await settle(page);
        expect(await computed(face(host), 'transform')).toBe('none');
        await page.mouse.move(5, 300);
        await page.mouse.up();
      }
      expect(errors).toEqual([]);
    });

    test('T06 AC19: the link colour change may remain under reduced motion', async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto('/');
      // DELIBERATE REQUIREMENT CHANGE (T15 AC25): open the other windows from the dock (only hello is open on load).
      await openAllFromDock(page);
      const host = link(page, 'Email');
      await host.hover();
      await settle(page);
      expect(await computed(face(host), 'color')).toBe(await tokenColour(page, '--color-text'));
      expect(errors).toEqual([]);
    });

    test('T06 AC19: a dock click still toggles the window', async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto('/');
      // DELIBERATE REQUIREMENT CHANGE (T15 AC25): open the other windows from the dock (only hello is open on load).
      await openAllFromDock(page);
      const host = winBtn(page);
      const before = await snapshot(page);
      await host.click();
      await expect.poll(() => snapshot(page)).not.toBe(before);
      expect(errors).toEqual([]);
    });
  });
});
