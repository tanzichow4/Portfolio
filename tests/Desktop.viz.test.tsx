import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Desktop from '../src/Desktop';
import { ABOUT_LABELS, VIZ_COPY, WIN_TITLES } from '../src/data';
import { INITIAL_ORDER, layout } from '../src/logic/layout';
import { zIndexFor } from '../src/logic/zorder';
import { DOCK_IDS } from '../src/logic/windows';

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  vi.stubGlobal(
    'matchMedia',
    vi.fn((q: string) => ({
      matches: q.includes('prefers-reduced-motion'),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    })),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

const viz = () => document.querySelector<HTMLElement>('[data-win="viz"]');
const hello = () => document.querySelector<HTMLElement>('[data-win="hello"]')!;
const wins = () => Array.from(document.querySelectorAll<HTMLElement>('[data-win]'));
const dock = () => screen.getByRole('navigation', { name: 'Dock' });
const dockBtn = (name = 'dataviz') => within(dock()).getByRole('button', { name });
const trigger = (name: string) => screen.getByRole('menuitem', { name });
const pos = () => layout(window.innerWidth, window.innerHeight);
const input = () => screen.getByRole('textbox', { name: 'Terminal command', hidden: true });
const typeCommand = (cmd: string) => {
  fireEvent.change(input(), { target: { value: cmd } });
  fireEvent.keyDown(input(), { key: 'Enter' });
};

async function choose(user: ReturnType<typeof userEvent.setup>, menu: string, item: string) {
  await user.click(trigger(menu));
  const target = Array.from(
    screen.getByRole('menu').querySelectorAll<HTMLElement>('[role^="menuitem"]'),
  ).find((e) => e.textContent === item);
  expect(target, item).toBeDefined();
  await user.click(target!);
}

describe('T16 viz on the desktop', () => {
  it('T16 AC16: on first load there is no viz window and its dock button reads Closed', () => {
    render(<Desktop />);
    expect(viz()).toBeNull();
    expect(dockBtn()).toHaveAttribute('aria-pressed', 'false');
    expect(dockBtn()).toHaveAccessibleDescription('Closed');
    expect(dockBtn().querySelector<HTMLElement>('.dock-dot')!.style.opacity).toBe('0');
  });

  it('T16 AC18: the dock has six window buttons, dataviz last', () => {
    render(<Desktop />);
    const labels = within(dock())
      .getAllByRole('button')
      .map((b) => b.getAttribute('aria-label'));
    expect(labels).toHaveLength(6);
    expect(labels).toEqual(DOCK_IDS.map((id) => WIN_TITLES[id]));
    expect(labels[labels.length - 1]).toBe('dataviz');
  });

  it('T16 AC18: the dock opens viz at its layout position and on top, titled dataviz with the Coming soon text', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await user.click(dockBtn());
    const el = viz()!;
    expect(el).not.toBeNull();
    expect(el).toHaveAttribute('data-min', 'false');
    expect(el.style.left).toBe(`${pos().viz.x}px`);
    expect(el.style.top).toBe(`${pos().viz.y}px`);
    expect(Number(el.style.zIndex)).toBe(
      zIndexFor('viz', [...INITIAL_ORDER.filter((w) => w !== 'viz'), 'viz']),
    );
    for (const w of wins()) {
      if (w !== el) expect(Number(el.style.zIndex)).toBeGreaterThan(Number(w.style.zIndex));
    }
    expect(screen.getByRole('region', { name: 'dataviz' })).toBe(el);
    expect(el.querySelector('.win-title')?.textContent).toBe('dataviz');
    expect(within(el).getByText(VIZ_COPY.body)).toBeInTheDocument();
    expect(dockBtn()).toHaveAttribute('aria-pressed', 'true');
  });

  it('T16 AC13: the window has only its Minimize and Close buttons', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await user.click(dockBtn());
    expect(
      within(viz()!)
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label')),
    ).toEqual(['Minimize dataviz', 'Close dataviz']);
  });

  it('T16 AC13: drag moves viz, minimize hides it, the dock restores it, close removes it', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await user.click(dockBtn());
    const bar = viz()!.querySelector<HTMLElement>('.win-titlebar')!;
    fireEvent.pointerDown(bar, { pointerId: 1, button: 0, clientX: 300, clientY: 150 });
    fireEvent.pointerMove(bar, { pointerId: 1, clientX: 270, clientY: 170 });
    fireEvent.pointerUp(bar, { pointerId: 1, clientX: 270, clientY: 170 });
    expect(viz()!.style.left).toBe(`${pos().viz.x - 30}px`);
    expect(viz()!.style.top).toBe(`${pos().viz.y + 20}px`);

    await user.click(screen.getByRole('button', { name: 'Minimize dataviz' }));
    expect(viz()).toHaveAttribute('data-min', 'true');
    expect(viz()).toHaveAttribute('inert');
    expect(dockBtn()).toHaveAccessibleDescription('Minimized');
    expect(screen.queryByRole('button', { name: 'Close dataviz' })).toBeNull();

    await user.click(dockBtn());
    expect(viz()).toHaveAttribute('data-min', 'false');
    expect(viz()!.style.left).toBe(`${pos().viz.x - 30}px`);

    await user.click(screen.getByRole('button', { name: 'Close dataviz' }));
    expect(viz()).toBeNull();
    expect(dockBtn()).toHaveAccessibleDescription('Closed');
  });

  it('T16 AC13: raising another window puts viz behind it, and a dock click brings viz back to the front', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await user.click(dockBtn());
    fireEvent.pointerDown(hello(), { pointerId: 1, button: 0 });
    expect(Number(viz()!.style.zIndex)).toBeLessThan(Number(hello().style.zIndex));
    await user.click(dockBtn());
    expect(viz()).toHaveAttribute('data-min', 'false');
    expect(Number(viz()!.style.zIndex)).toBeGreaterThan(Number(hello().style.zIndex));
  });

  it('T16 AC19: the Windows menu lists dataviz unchecked, opens viz and then checks it', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await user.click(trigger('Windows'));
    expect(screen.getByRole('menuitemcheckbox', { name: 'dataviz' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await user.keyboard('{Escape}');
    await choose(user, 'Windows', 'dataviz');
    expect(viz()).not.toBeNull();
    expect(viz()!.style.left).toBe(`${pos().viz.x}px`);
    await user.click(trigger('Windows'));
    expect(screen.getByRole('menuitemcheckbox', { name: 'dataviz' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('T16 AC17: Tidy up from the menu opens all six windows with distinct z-indexes', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await choose(user, 'Windows', 'Tidy up');
    expect(wins()).toHaveLength(6);
    expect(viz()).toHaveAttribute('data-min', 'false');
    expect(new Set(wins().map((w) => w.style.zIndex)).size).toBe(6);
    expect(viz()!.style.left).toBe(`${pos().viz.x}px`);
  });

  it('T16 AC17: the terminal tidy command also opens viz', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await user.click(dockBtn('terminal'));
    typeCommand('tidy');
    expect(wins()).toHaveLength(6);
    expect(viz()).not.toBeNull();
  });

  it('T16 AC16: Restart from the menu leaves only hello and no viz', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await choose(user, 'Windows', 'Tidy up');
    expect(viz()).not.toBeNull();
    await choose(user, 'tanzi.os', 'Restart…');
    expect(viz()).toBeNull();
    expect(wins().map((w) => w.dataset.win)).toEqual(['hello']);
    expect(dockBtn()).toHaveAccessibleDescription('Closed');
  });

  it('T16 AC16: Restart from the terminal leaves only hello and no viz', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await user.click(dockBtn());
    await user.click(dockBtn('terminal'));
    expect(viz()).not.toBeNull();
    await act(async () => typeCommand('restart'));
    expect(viz()).toBeNull();
    expect(wins().map((w) => w.dataset.win)).toEqual(['hello']);
  });

  it('T16 AC20: the terminal cannot open viz', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await user.click(dockBtn('terminal'));
    typeCommand('open viz');
    typeCommand('open dataviz');
    expect(viz()).toBeNull();
  });
});

describe('T16 about button opens viz', () => {
  const aboutBtn = () =>
    within(document.querySelector<HTMLElement>('[data-win="about"]')!).getByRole('button', {
      name: ABOUT_LABELS.viz,
    });
  const about = () => document.querySelector<HTMLElement>('[data-win="about"]')!;
  const setup = async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await user.click(dockBtn('about.md'));
    return user;
  };

  it('T16 AC7: opens viz when it is closed, on top of every window', async () => {
    const user = await setup();
    expect(viz()).toBeNull();
    await user.click(aboutBtn());
    expect(viz()).not.toBeNull();
    expect(viz()).toHaveAttribute('data-min', 'false');
    for (const w of wins()) {
      if (w !== viz()) expect(Number(viz()!.style.zIndex)).toBeGreaterThan(Number(w.style.zIndex));
    }
    expect(dockBtn()).toHaveAttribute('aria-pressed', 'true');
  });

  it('T16 AC7: restores viz when it is minimized', async () => {
    const user = await setup();
    await user.click(aboutBtn());
    await user.click(screen.getByRole('button', { name: 'Minimize dataviz' }));
    expect(viz()).toHaveAttribute('data-min', 'true');
    await user.click(aboutBtn());
    expect(viz()).toHaveAttribute('data-min', 'false');
    expect(viz()).not.toHaveAttribute('inert');
    expect(dockBtn()).toHaveAccessibleDescription('Open');
  });

  it('T16 AC7: raises viz when it is open behind other windows', async () => {
    const user = await setup();
    await user.click(aboutBtn());
    fireEvent.pointerDown(about(), { pointerId: 1, button: 0 });
    expect(Number(viz()!.style.zIndex)).toBeLessThan(Number(about().style.zIndex));
    await user.click(aboutBtn());
    expect(Number(viz()!.style.zIndex)).toBeGreaterThan(Number(about().style.zIndex));
    expect(viz()).toHaveAttribute('data-min', 'false');
  });

  it('T16 AC7: pressing it again with viz on top never minimizes viz', async () => {
    const user = await setup();
    await user.click(aboutBtn());
    await user.click(aboutBtn());
    await user.click(aboutBtn());
    expect(viz()).toHaveAttribute('data-min', 'false');
    expect(dockBtn()).toHaveAccessibleDescription('Open');
    expect(wins().filter((w) => w.dataset.win === 'viz')).toHaveLength(1);
  });

  it('T16 AC7: Enter and Space on the button also open viz', async () => {
    const user = await setup();
    aboutBtn().focus();
    await user.keyboard('{Enter}');
    expect(viz()).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Close dataviz' }));
    expect(viz()).toBeNull();
    aboutBtn().focus();
    await user.keyboard(' ');
    expect(viz()).not.toBeNull();
  });

  it('T16 AC6: tab order inside about is Minimize, Close, then the viz button', async () => {
    const user = await setup();
    const stops = Array.from(
      about().querySelectorAll<HTMLElement>('button, a[href], input, [tabindex]'),
    ).map((e) => e.getAttribute('aria-label') ?? e.textContent);
    expect(stops).toEqual(['Minimize about.md', 'Close about.md', ABOUT_LABELS.viz]);
    screen.getByRole('button', { name: 'Close about.md' }).focus();
    await user.tab();
    expect(document.activeElement).toBe(aboutBtn());
  });
});
