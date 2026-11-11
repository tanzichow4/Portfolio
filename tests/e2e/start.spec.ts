import { expect, test, type Page } from '@playwright/test';
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

const IDS = ['hello', 'about', 'exp', 'proj', 'term'] as const;
type Id = (typeof IDS)[number];
const TITLES: Record<Id, string> = {
  hello: 'hello.txt',
  about: 'about.md',
  exp: 'experience.log',
  proj: 'projects',
  term: 'terminal',
};
const OTHERS = IDS.filter((i) => i !== 'hello');

const win = (page: Page, id: string) => page.locator(`[data-win="${id}"]`);
const dockBtn = (page: Page, id: Id) =>
  page
    .getByRole('navigation', { name: 'Dock' })
    .locator(`button.dock-win[aria-label="${TITLES[id]}"]`);
const trigger = (page: Page, name: string) =>
  page.getByRole('banner').getByRole('menuitem', { name, exact: true });
const chooseItem = async (page: Page, menu: string, item: string) => {
  await trigger(page, menu).click();
  await page
    .getByRole('menu')
    .locator('[role^="menuitem"]')
    .filter({ hasText: item })
    .first()
    .click();
};
const helloBtn = (page: Page, name: string) =>
  win(page, 'hello').getByRole('button', { name, exact: true });
const zOf = (page: Page, id: string) =>
  win(page, id).evaluate((el) => Number(getComputedStyle(el).zIndex));
const pos = async (page: Page, id: string) => {
  const b = await win(page, id).boundingBox();
  return b && { x: Math.round(b.x), y: Math.round(b.y) };
};
const dockDesc = (page: Page, id: Id) =>
  dockBtn(page, id).evaluate((el) => {
    const ref = el.getAttribute('aria-describedby');
    return ref ? (document.getElementById(ref)?.textContent ?? '') : '';
  });
const settled = (page: Page) =>
  expect
    .poll(() =>
      page.evaluate(() =>
        [...document.querySelectorAll('[data-win]')].every((e) => e.getAnimations().length === 0),
      ),
    )
    .toBe(true);

const REFERENCE: Record<Id, { x: number; y: number }> = {
  hello: { x: 77, y: 72 },
  about: { x: 640, y: 64 },
  // DELIBERATE REQUIREMENT CHANGE (T17 AC12): exp height 290 -> 400, so y 354 -> 244.
  exp: { x: 64, y: 244 },
  proj: { x: 538, y: 259 },
  term: { x: 810, y: 340 },
};

test.describe('T15 first load: only hello.txt is open', () => {
  test('T15 AC4: first load has exactly one window, hello, at its layout position', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await expect(page.locator('[data-win]')).toHaveCount(1);
    await expect(win(page, 'hello')).toBeVisible();
    await expect(win(page, 'hello')).toHaveAttribute('data-min', 'false');
    // DELIBERATE REQUIREMENT CHANGE (T16 AC16): dataviz is also closed on first load.
    for (const id of [...OTHERS, 'viz', 'site']) await expect(win(page, id)).toHaveCount(0);
    await settled(page);
    expect(await pos(page, 'hello')).toEqual(REFERENCE.hello);
    expect(errors).toEqual([]);
  });

  test('T15 AC5: the dock shows hello as Open and the other four as Closed', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await expect(
      page.getByRole('navigation', { name: 'Dock' }).locator('button.dock-win'),
      // DELIBERATE REQUIREMENT CHANGE (T16 AC18): the dock now has six window buttons (dataviz added).
    ).toHaveCount(6);
    await expect(
      page
        .getByRole('navigation', { name: 'Dock' })
        .locator('button.dock-win[aria-label="dataviz"]'),
    ).toHaveAttribute('aria-pressed', 'false');
    for (const id of IDS) {
      const open = id === 'hello';
      await expect(dockBtn(page, id)).toHaveAttribute('aria-pressed', String(open));
      expect(await dockDesc(page, id), id).toBe(open ? 'Open' : 'Closed');
      await expect
        .poll(() =>
          dockBtn(page, id)
            .locator('.dock-dot')
            .evaluate((d) => getComputedStyle(d).opacity),
        )
        .toBe(open ? '1' : '0');
    }
    expect(errors).toEqual([]);
  });

  test('T15 AC6: the Windows menu lists five items with only hello.txt checked', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await trigger(page, 'Windows').click();
    for (const id of IDS) {
      await expect(
        page.getByRole('menuitemcheckbox', { name: TITLES[id], exact: true }),
      ).toHaveAttribute('aria-checked', String(id === 'hello'));
    }
    // DELIBERATE REQUIREMENT CHANGE (T16 AC19): the Windows menu gains a dataviz item, unchecked on load.
    await expect(
      page.getByRole('menuitemcheckbox', { name: 'dataviz', exact: true }),
    ).toHaveAttribute('aria-checked', 'false');
    expect(errors).toEqual([]);
  });

  test('T15 AC7: each closed window opens from the dock and from the Windows menu', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await dockBtn(page, 'about').click();
    await expect(win(page, 'about')).toBeVisible();
    await trigger(page, 'Windows').click();
    await page.getByRole('menuitemcheckbox', { name: TITLES.exp, exact: true }).click();
    await expect(win(page, 'exp')).toBeVisible();
    await expect(page.locator('[data-win]')).toHaveCount(3);
    expect(errors).toEqual([]);
  });
});

test.describe('T15 hello.txt buttons (AC11, AC15)', () => {
  test('T15 AC11: Tab visits See what I have built, More about me, What I have been up to, then Say hi', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await helloBtn(page, 'build').focus();
    const names: string[] = [];
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      names.push(await page.evaluate(() => document.activeElement?.textContent?.trim() ?? ''));
    }
    expect(names).toEqual([
      "See what I've built",
      'More about me',
      "What I've been up to",
      'Say hi',
    ]);
    expect(errors).toEqual([]);
  });

  const BUTTONS = [
    ["See what I've built", 'proj'],
    ['More about me', 'about'],
    ["What I've been up to", 'exp'],
  ] as const;

  for (const [label, id] of BUTTONS) {
    test(`T15 AC15: "${label}" opens ${TITLES[id]} when it is closed`, async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto('/');
      await expect(win(page, id)).toHaveCount(0);
      await helloBtn(page, label).click();
      await expect(win(page, id)).toBeVisible();
      await expect(win(page, id)).toHaveAttribute('data-min', 'false');
      await expect(page.locator('[data-win]')).toHaveCount(2);
      await settled(page);
      expect(await zOf(page, id)).toBeGreaterThan(await zOf(page, 'hello'));
      expect(errors).toEqual([]);
    });

    test(`T15 AC15: "${label}" restores ${TITLES[id]} when it is minimized`, async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto('/');
      await helloBtn(page, label).click();
      await expect(win(page, id)).toBeVisible();
      await page
        .getByRole('button', { name: `Minimize ${TITLES[id]}`, exact: true })
        .dispatchEvent('click');
      await expect(win(page, id)).toHaveAttribute('data-min', 'true');
      await helloBtn(page, label).click();
      await expect(win(page, id)).toHaveAttribute('data-min', 'false');
      expect(errors).toEqual([]);
    });

    test(`T15 AC15: "${label}" raises ${TITLES[id]} when it is open behind hello`, async ({
      page,
    }) => {
      const errors = watchErrors(page);
      await page.goto('/');
      await helloBtn(page, label).click();
      await expect(win(page, id)).toBeVisible();
      await settled(page);
      // Raise hello above it by pressing on its title bar.
      await win(page, 'hello').locator('.win-titlebar').dispatchEvent('pointerdown');
      await expect.poll(async () => (await zOf(page, 'hello')) > (await zOf(page, id))).toBe(true);
      await helloBtn(page, label).click();
      await expect.poll(async () => (await zOf(page, id)) > (await zOf(page, 'hello'))).toBe(true);
      expect(errors).toEqual([]);
    });

    test(`T15 AC15: "${label}" never minimizes ${TITLES[id]} when it is already on top`, async ({
      page,
    }) => {
      const errors = watchErrors(page);
      await page.goto('/');
      await helloBtn(page, label).click();
      await settled(page);
      const z = await zOf(page, id);
      await helloBtn(page, label).click();
      await helloBtn(page, label).click();
      await expect(win(page, id)).toHaveAttribute('data-min', 'false');
      await expect(win(page, id)).toBeVisible();
      expect(await zOf(page, id)).toBeGreaterThanOrEqual(z);
      expect(await zOf(page, id)).toBeGreaterThan(await zOf(page, 'hello'));
      expect(errors).toEqual([]);
    });
  }
});

test.describe('T15 hello.txt fits at 1280x720 (AC17)', () => {
  for (const scheme of ['dark', 'light'] as const) {
    test(`T15 AC17: in ${scheme} mode hello is fully above the dock, buttons do not overlap and nothing scrolls`, async ({
      page,
    }) => {
      const errors = watchErrors(page);
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      await expect(win(page, 'hello')).toBeVisible();
      await settled(page);
      const hello = await win(page, 'hello').boundingBox();
      expect(hello).not.toBeNull();
      expect(hello!.y).toBeGreaterThanOrEqual(36); // below the menubar
      expect(hello!.y + hello!.height).toBeLessThanOrEqual(720 - 76);

      const ctas = win(page, 'hello').locator('.hello-cta');
      expect(await ctas.count()).toBe(4); // three buttons and the Say hi link
      const boxes = [];
      for (let i = 0; i < 4; i++) boxes.push((await ctas.nth(i).boundingBox())!);
      for (const b of boxes) {
        expect(b.x).toBeGreaterThanOrEqual(hello!.x);
        expect(b.y).toBeGreaterThanOrEqual(hello!.y);
        expect(b.x + b.width).toBeLessThanOrEqual(hello!.x + hello!.width + 0.5);
        expect(b.y + b.height).toBeLessThanOrEqual(hello!.y + hello!.height + 0.5);
      }
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i];
          const b = boxes[j];
          const overlap =
            a.x < b.x + b.width - 0.5 &&
            b.x < a.x + a.width - 0.5 &&
            a.y < b.y + b.height - 0.5 &&
            b.y < a.y + a.height - 0.5;
          expect(overlap, `buttons ${i} and ${j} overlap`).toBe(false);
        }
      const noScroll = await win(page, 'hello').evaluate((el) =>
        [el, ...el.querySelectorAll<HTMLElement>('*')].every(
          (e) =>
            e.scrollHeight <= e.clientHeight + 1 || getComputedStyle(e).overflowY === 'visible',
        ),
      );
      expect(noScroll).toBe(true);
      expect(errors).toEqual([]);
    });
  }
});

test.describe('T15 Restart and Tidy up (AC8, AC10)', () => {
  for (const reduced of [false, true]) {
    for (const entry of ['menu', 'terminal'] as const) {
      test(`T15 AC8: Restart from the ${entry} (${reduced ? 'reduced motion' : 'boot'}) leaves only hello at its default position`, async ({
        page,
      }) => {
        const errors = watchErrors(page);
        if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto('/');
        await openAllFromDock(page);
        await page
          .getByRole('button', { name: 'Minimize about.md', exact: true })
          .dispatchEvent('click');
        if (entry === 'menu') await chooseItem(page, 'tanzi.os', 'Restart');
        else {
          const input = page.getByRole('textbox', { name: 'Terminal command' });
          await input.fill('restart');
          await input.press('Enter');
        }
        await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 5000 });
        await expect(page.locator('[data-win]')).toHaveCount(1);
        await expect(win(page, 'hello')).toBeVisible();
        for (const id of OTHERS) await expect(win(page, id)).toHaveCount(0);
        await settled(page);
        expect(await pos(page, 'hello')).toEqual(REFERENCE.hello);
        for (const id of OTHERS) {
          await expect(dockBtn(page, id)).toHaveAttribute('aria-pressed', 'false');
          expect(await dockDesc(page, id)).toBe('Closed');
        }
        await expect(trigger(page, 'tanzi.os')).toBeFocused();
        expect(errors).toEqual([]);
      });
    }
  }

  test('T15 AC10: Tidy up from the Windows menu opens all five windows at their reference positions', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await chooseItem(page, 'Windows', 'Tidy up');
    // DELIBERATE REQUIREMENT CHANGE (T16 AC17): Tidy up now also opens dataviz, so 5 -> 6.
    await expect(page.locator('[data-win]')).toHaveCount(6);
    await expect(win(page, 'site')).toHaveCount(0);
    await settled(page);
    for (const id of IDS) {
      await expect(win(page, id)).toHaveAttribute('data-min', 'false');
      expect(await pos(page, id), id).toEqual(REFERENCE[id]);
    }
    expect(errors).toEqual([]);
  });

  test('T15 AC10: Tidy up from the terminal command opens all five windows', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await dockBtn(page, 'term').click();
    const input = page.getByRole('textbox', { name: 'Terminal command' });
    await input.fill('tidy');
    await input.press('Enter');
    // DELIBERATE REQUIREMENT CHANGE (T16 AC17): Tidy up now also opens dataviz, so 5 -> 6.
    await expect(page.locator('[data-win]')).toHaveCount(6);
    expect(errors).toEqual([]);
  });
});
