import { expect, test, type Locator, type Page } from '@playwright/test';

// Keep in step with WIN_META.about.height in src/logic/windows.ts (a measured value).
const ABOUT_HEIGHT = 396;
const DOCK_TOP = 720 - 76;

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
const dock = (page: Page) => page.getByRole('navigation', { name: 'Dock' });
const dockBtn = (page: Page, title: string) =>
  dock(page).locator(`button.dock-win[aria-label="${title}"]`);
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
const box = async (loc: Locator) => {
  const b = await loc.boundingBox();
  if (!b) throw new Error('no bounding box');
  return b;
};
const settled = async (page: Page) => {
  // Layout is only stable once web fonts have loaded and no window animation is running.
  await page.evaluate(() => document.fonts.ready);
  await settledAnimations(page);
};
const settledAnimations = (page: Page) =>
  expect
    .poll(() =>
      page.evaluate(() =>
        [...document.querySelectorAll('[data-win]')].every((e) => e.getAnimations().length === 0),
      ),
    )
    .toBe(true);
const vizButton = (page: Page) =>
  win(page, 'about').getByRole('button', { name: 'See some data viz', exact: true });
const openAbout = async (page: Page) => {
  await dockBtn(page, 'about.md').click();
  await expect(win(page, 'about')).toBeVisible();
  await settled(page);
};
const zOf = (page: Page, id: string) =>
  win(page, id).evaluate((el) => Number(getComputedStyle(el).zIndex));

test.describe('T16 dataviz window', () => {
  test('T16 AC16: viz starts closed, with a Closed dock button', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await expect(win(page, 'viz')).toHaveCount(0);
    await expect(page.locator('[data-win]')).toHaveCount(1);
    await expect(dockBtn(page, 'dataviz')).toHaveAttribute('aria-pressed', 'false');
    expect(errors).toEqual([]);
  });

  test('T16 AC18: the dock shows six window buttons, dataviz last, titled dataviz', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    const labels = await dock(page)
      .locator('button.dock-win')
      .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    expect(labels).toEqual([
      'hello.txt',
      'about.md',
      'experience.log',
      'projects',
      'terminal',
      'dataviz',
    ]);
    await expect(dockBtn(page, 'dataviz')).toHaveAttribute('title', 'dataviz');
    expect(errors).toEqual([]);
  });

  test('T16 AC13/AC18: the dock opens dataviz with Coming soon and a dataviz titlebar', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await dockBtn(page, 'dataviz').click();
    await expect(win(page, 'viz')).toBeVisible();
    await expect(win(page, 'viz')).toContainText('Coming soon');
    await expect(win(page, 'viz').locator('.win-titlebar')).toContainText('dataviz');
    await expect(dockBtn(page, 'dataviz')).toHaveAttribute('aria-pressed', 'true');
    expect(errors).toEqual([]);
  });

  test('T16 AC19: the Windows menu dataviz item is unchecked, opens viz and becomes checked', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await trigger(page, 'Windows').click();
    await expect(page.getByRole('menuitemcheckbox')).toHaveCount(6);
    const item = page.getByRole('menuitemcheckbox', { name: 'dataviz', exact: true });
    await expect(item).toHaveAttribute('aria-checked', 'false');
    await item.click();
    await expect(win(page, 'viz')).toBeVisible();
    await expect(win(page, 'viz')).toContainText('Coming soon');
    await trigger(page, 'Windows').click();
    await expect(
      page.getByRole('menuitemcheckbox', { name: 'dataviz', exact: true }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(errors).toEqual([]);
  });

  test('T16 AC1/AC2: about shows the new first paragraph and the unchanged second one', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await openAbout(page);
    const paras = win(page, 'about').locator('p.about-para');
    await expect(paras).toHaveCount(2);
    await expect(paras.nth(0)).toHaveText(
      "I'm a software engineer who enjoys seeing projects built from the ground up and making ideas come to life. I'm fascinated by random facts and love visualizing data.",
    );
    await expect(paras.nth(1)).toHaveText(
      'Currently building web platforms, automation and data tooling.',
    );
    await expect(win(page, 'about')).not.toContainText('last pixel');
    expect(errors).toEqual([]);
  });

  test('T16 AC6/AC7/AC12: the button sits below the text, above the facts, and opens dataviz', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await openAbout(page);
    await expect(vizButton(page)).toHaveCount(1);
    // Measure all three rects in one synchronous read so a late reflow cannot split them.
    const { lastPara, btn, facts } = await win(page, 'about').evaluate((el) => {
      const r = (e: Element | null) => {
        if (!e) throw new Error('missing element');
        const b = e.getBoundingClientRect();
        return { y: b.y, height: b.height };
      };
      const paras = el.querySelectorAll('p.about-para');
      const button = [...el.querySelectorAll('button')].find(
        (b) => b.textContent?.trim() === 'See some data viz',
      );
      return {
        lastPara: r(paras[paras.length - 1] ?? null),
        btn: r(button ?? null),
        facts: r(el.querySelector('ul.about-facts')),
      };
    });
    expect(btn.y).toBeGreaterThanOrEqual(lastPara.y + lastPara.height - 1);
    expect(btn.y + btn.height).toBeLessThanOrEqual(facts.y + 1);
    await vizButton(page).click();
    await expect(win(page, 'viz')).toBeVisible();
    await expect(win(page, 'viz')).toContainText('Coming soon');
    expect(errors).toEqual([]);
  });

  test('T16 AC7: the about button restores a minimized dataviz', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await dockBtn(page, 'dataviz').click();
    await expect(win(page, 'viz')).toBeVisible();
    await openAbout(page);
    await page.getByRole('button', { name: 'Minimize dataviz' }).click();
    await expect(win(page, 'viz')).toHaveAttribute('data-min', 'true');
    await vizButton(page).click();
    await expect(win(page, 'viz')).toHaveAttribute('data-min', 'false');
    await settled(page);
    await expect(win(page, 'viz')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('T16 AC7: the about button raises dataviz from behind and never minimizes it', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await dockBtn(page, 'dataviz').click();
    await openAbout(page);
    // about was opened last, so it is on top of viz.
    expect(await zOf(page, 'about')).toBeGreaterThan(await zOf(page, 'viz'));
    await vizButton(page).click();
    await expect.poll(async () => (await zOf(page, 'viz')) > (await zOf(page, 'about'))).toBe(true);
    await settled(page);
    await expect(win(page, 'viz')).toHaveAttribute('data-min', 'false');
    // Pressing again while dataviz is on top changes nothing.
    await vizButton(page).click();
    await expect(win(page, 'viz')).toHaveAttribute('data-min', 'false');
    await expect(win(page, 'viz')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('T16 AC7: Enter and Space on the about button open dataviz', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await openAbout(page);
    await vizButton(page).focus();
    await page.keyboard.press('Enter');
    await expect(win(page, 'viz')).toBeVisible();
    await page.getByRole('button', { name: 'Close dataviz' }).click();
    await expect(win(page, 'viz')).toHaveCount(0);
    await vizButton(page).focus();
    await page.keyboard.press('Space');
    await expect(win(page, 'viz')).toBeVisible();
    expect(errors).toEqual([]);
  });

  for (const scheme of ['dark', 'light'] as const) {
    test(`T16 AC9/AC14: in ${scheme} about and dataviz are fully above the dock, about does not scroll and its button stays uncovered`, async ({
      page,
    }) => {
      const errors = watchErrors(page);
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/');
      await dockBtn(page, 'dataviz').click();
      await openAbout(page);
      await vizButton(page).click();
      await settled(page);
      const a = await box(win(page, 'about'));
      const v = await box(win(page, 'viz'));
      expect(a.y).toBeGreaterThanOrEqual(36);
      expect(v.y).toBeGreaterThanOrEqual(36);
      expect(a.y + a.height).toBeLessThanOrEqual(DOCK_TOP);
      expect(v.y + v.height).toBeLessThanOrEqual(DOCK_TOP);
      expect(v.x).toBeGreaterThanOrEqual(0);
      expect(v.x + v.width).toBeLessThanOrEqual(1280);
      expect(Math.abs(a.height - ABOUT_HEIGHT)).toBeLessThanOrEqual(2);
      const noScroll = await win(page, 'about').evaluate((el) => {
        const body = el.querySelector<HTMLElement>('.about-body') ?? el;
        return body.scrollHeight <= body.clientHeight + 1 && el.scrollHeight <= el.clientHeight + 1;
      });
      expect(noScroll).toBe(true);
      // The about button is the topmost element at its centre, so dataviz does not cover it.
      const b = await box(vizButton(page));
      const uncovered = await page.evaluate(
        ([x, y]) => document.elementFromPoint(x, y)?.closest('button')?.textContent,
        [b.x + b.width / 2, b.y + b.height / 2],
      );
      expect(uncovered).toBe('See some data viz');
      expect(errors).toEqual([]);
    });
  }

  test('T16 AC17: Tidy up from the Windows menu opens six windows including dataviz', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await chooseItem(page, 'Windows', 'Tidy up');
    await expect(page.locator('[data-win]')).toHaveCount(6);
    await expect(win(page, 'viz')).toHaveAttribute('data-min', 'false');
    await expect(win(page, 'site')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  for (const reduced of [false, true]) {
    for (const via of ['menu', 'terminal'] as const) {
      test(`T16 AC16: Restart from the ${via} returns to hello only${reduced ? ' (reduced motion)' : ''}`, async ({
        page,
      }) => {
        const errors = watchErrors(page);
        if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto('/');
        await chooseItem(page, 'Windows', 'Tidy up');
        await expect(win(page, 'viz')).toBeVisible();
        if (via === 'menu') {
          await chooseItem(page, 'tanzi.os', 'Restart');
        } else {
          const input = page.getByRole('textbox', { name: 'Terminal command' });
          await input.fill('restart');
          await input.press('Enter');
        }
        await expect(win(page, 'viz')).toHaveCount(0, { timeout: 15000 });
        await expect(page.locator('[data-win]')).toHaveCount(1, { timeout: 15000 });
        await expect(win(page, 'hello')).toBeVisible();
        await expect(dockBtn(page, 'dataviz')).toHaveAttribute('aria-pressed', 'false');
        expect(errors).toEqual([]);
      });
    }
  }
});
