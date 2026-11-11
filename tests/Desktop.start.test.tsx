import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Desktop from '../src/Desktop';
import { WIN_TITLES } from '../src/data';
import { INITIAL_ORDER, layout } from '../src/logic/layout';
import { zIndexFor } from '../src/logic/zorder';
import { DOCK_IDS } from '../src/logic/windows';
import type { WinId } from '../src/types';
import { openAllFromDock } from './helpers/openAll';

const html = document.documentElement;
const reset = () => {
  localStorage.clear();
  delete html.dataset.theme;
};

const stubMotion = (reduce: boolean) =>
  vi.stubGlobal(
    'matchMedia',
    vi.fn((q: string) => ({
      matches: reduce && q.includes('prefers-reduced-motion'),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    })),
  );

beforeEach(() => {
  reset();
  stubMotion(true);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  reset();
});

const winEl = (id: string) => document.querySelector<HTMLElement>(`[data-win="${id}"]`);
const allWins = () => Array.from(document.querySelectorAll<HTMLElement>('[data-win]'));
const winIds = () => allWins().map((w) => w.dataset.win);
const dock = () => screen.getByRole('navigation', { name: 'Dock' });
const dockBtn = (id: WinId) => within(dock()).getByRole('button', { name: WIN_TITLES[id] });
const dotOf = (id: WinId) => dockBtn(id).querySelector<HTMLElement>('.dock-dot')!.style.opacity;
const trigger = (name: string) => screen.getByRole('menuitem', { name });
const input = () => screen.getByRole('textbox', { name: 'Terminal command', hidden: true });
const typeCommand = (cmd: string) => {
  fireEvent.change(input(), { target: { value: cmd } });
  fireEvent.keyDown(input(), { key: 'Enter' });
};
const pos = () => layout(window.innerWidth, window.innerHeight);
const NON_HELLO: WinId[] = ['about', 'exp', 'proj', 'term'];

async function menuItem(user: ReturnType<typeof userEvent.setup>, menu: string, label: string) {
  await user.click(trigger(menu));
  const target = Array.from(
    screen.getByRole('menu').querySelectorAll<HTMLElement>('[role^="menuitem"]'),
  ).find((e) => e.textContent === label);
  expect(target, label).toBeDefined();
  await user.click(target!);
}

async function windowsChecks(user: ReturnType<typeof userEvent.setup>) {
  await user.click(trigger('Windows'));
  const out = Object.fromEntries(
    screen
      .getAllByRole('menuitemcheckbox')
      .map((m) => [m.textContent, m.getAttribute('aria-checked')]),
  );
  await user.keyboard('{Escape}');
  return out;
}

const expectStartState = () => {
  expect(winIds()).toEqual(['hello']);
  expect(winEl('hello')).toHaveAttribute('data-min', 'false');
  for (const id of NON_HELLO) expect(winEl(id), id).toBeNull();
  expect(winEl('site')).toBeNull();
};

describe('T15 first load', () => {
  it('T15 AC4: first load renders exactly one window, hello, not minimized, at its layout position', () => {
    render(<Desktop />);
    expect(allWins()).toHaveLength(1);
    const hello = winEl('hello')!;
    expect(hello).not.toBeNull();
    expect(hello).toHaveAttribute('data-min', 'false');
    expect(hello.style.left).toBe(`${pos().hello.x}px`);
    expect(hello.style.top).toBe(`${pos().hello.y}px`);
    for (const id of [...NON_HELLO, 'site']) expect(winEl(id), id).toBeNull();
  });

  it('T15 AC5: the dock shows five buttons, hello Open and the other four Closed with no dot', () => {
    render(<Desktop />);
    expect(DOCK_IDS).toHaveLength(5);
    for (const id of DOCK_IDS) {
      const b = dockBtn(id);
      const open = id === 'hello';
      expect(b, `${id} pressed`).toHaveAttribute('aria-pressed', String(open));
      expect(b, `${id} description`).toHaveAccessibleDescription(open ? 'Open' : 'Closed');
      expect(dotOf(id), `${id} dot`).toBe(open ? '1' : '0');
    }
  });

  it('T15 AC6: the Windows menu lists five items with only hello.txt checked', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    const checks = await windowsChecks(user);
    expect(Object.keys(checks).sort()).toEqual(DOCK_IDS.map((id) => WIN_TITLES[id]).sort());
    expect(checks['hello.txt']).toBe('true');
    for (const id of NON_HELLO) expect(checks[WIN_TITLES[id]], id).toBe('false');
  });
});

describe('T15 AC7: a closed window can be opened and then behaves as before', () => {
  const behavesNormally = async (user: ReturnType<typeof userEvent.setup>, id: WinId) => {
    const el = winEl(id)!;
    expect(el).not.toBeNull();
    // Opens at its default layout position and in front.
    expect(el.style.left).toBe(`${pos()[id].x}px`);
    expect(el.style.top).toBe(`${pos()[id].y}px`);
    expect(Number(el.style.zIndex)).toBe(
      zIndexFor(id, [...INITIAL_ORDER.filter((w) => w !== id), id]),
    );
    // Drag.
    const bar = el.querySelector<HTMLElement>('.win-titlebar')!;
    fireEvent.pointerDown(bar, { pointerId: 1, button: 0, clientX: 300, clientY: 150 });
    fireEvent.pointerMove(bar, { pointerId: 1, clientX: 330, clientY: 170 });
    fireEvent.pointerUp(bar, { pointerId: 1, clientX: 330, clientY: 170 });
    expect(winEl(id)!.style.left).not.toBe(`${pos()[id].x}px`);
    // Minimize, then close.
    await user.click(screen.getByRole('button', { name: `Minimize ${WIN_TITLES[id]}` }));
    expect(winEl(id)).toHaveAttribute('data-min', 'true');
    await user.click(dockBtn(id));
    expect(winEl(id)).toHaveAttribute('data-min', 'false');
    await user.click(screen.getByRole('button', { name: `Close ${WIN_TITLES[id]}` }));
    expect(winEl(id)).toBeNull();
  };

  for (const id of NON_HELLO) {
    it(`T15 AC7: ${id} opens from the dock and then drags, minimizes and closes`, async () => {
      const user = userEvent.setup();
      render(<Desktop />);
      await user.click(dockBtn(id));
      await behavesNormally(user, id);
    });

    it(`T15 AC7: ${id} opens from its Windows menu item`, async () => {
      const user = userEvent.setup();
      render(<Desktop />);
      await menuItem(user, 'Windows', WIN_TITLES[id]);
      expect(winEl(id)).not.toBeNull();
      expect((await windowsChecks(user))[WIN_TITLES[id]]).toBe('true');
      await behavesNormally(user, id);
    });
  }

  for (const id of ['about', 'exp', 'proj'] as const) {
    it(`T15 AC7: ${id} opens from the terminal open command`, async () => {
      const user = userEvent.setup();
      render(<Desktop />);
      await user.click(dockBtn('term'));
      const word = { about: 'about', exp: 'experience', proj: 'projects' }[id];
      typeCommand(`open ${word}`);
      expect(winEl(id)).not.toBeNull();
      await behavesNormally(user, id);
    });
  }

  it('T15 AC7: hello reopens from the terminal open command after it is closed', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await user.click(dockBtn('term'));
    await user.click(screen.getByRole('button', { name: 'Close hello.txt' }));
    expect(winEl('hello')).toBeNull();
    typeCommand('open hello');
    expect(winEl('hello')).not.toBeNull();
  });
});

describe('T15 AC8: Restart returns to the start state', () => {
  const dirtyEverything = async (user: ReturnType<typeof userEvent.setup>) => {
    openAllFromDock();
    await user.click(winEl('about')!);
    fireEvent.pointerDown(winEl('hello')!.querySelector<HTMLElement>('.win-titlebar')!, {
      pointerId: 1,
      button: 0,
      clientX: 300,
      clientY: 150,
    });
    fireEvent.pointerUp(document.body, { pointerId: 1 });
    await user.click(screen.getByRole('button', { name: 'Minimize experience.log' }));
    await user.click(screen.getByRole('button', { name: 'Close projects' }));
  };

  for (const via of ['menu', 'terminal'] as const) {
    it(`T15 AC8: Restart from the ${via} on the reduced-motion path leaves only hello at default positions, focus on the trigger`, async () => {
      const user = userEvent.setup();
      render(<Desktop />);
      await dirtyEverything(user);
      if (via === 'menu') await menuItem(user, 'tanzi.os', 'Restart…');
      else await act(async () => typeCommand('restart'));
      expectStartState();
      expect(winEl('hello')!.style.left).toBe(`${pos().hello.x}px`);
      expect(winEl('hello')!.style.top).toBe(`${pos().hello.y}px`);
      expect(winEl('hello')!.style.zIndex).toBe(String(zIndexFor('hello', INITIAL_ORDER)));
      expect(winEl('term')).toBeNull();
      expect(document.activeElement).toBe(trigger('tanzi.os'));
      // The dock agrees.
      expect(dockBtn('hello')).toHaveAttribute('aria-pressed', 'true');
      for (const id of NON_HELLO) expect(dockBtn(id)).toHaveAttribute('aria-pressed', 'false');
    });

    it(`T15 AC8: Restart from the ${via} on the real boot path leaves only hello once the boot ends`, async () => {
      stubMotion(false);
      vi.useFakeTimers();
      vi.spyOn(Math, 'random').mockReturnValue(0);
      render(<Desktop />);
      openAllFromDock();
      fireEvent.click(winEl('about')!);
      fireEvent.click(screen.getByRole('button', { name: 'Minimize experience.log' }));
      fireEvent.click(screen.getByRole('button', { name: 'Close projects' }));
      if (via === 'menu') {
        fireEvent.click(trigger('tanzi.os'));
        const item = Array.from(
          screen.getByRole('menu').querySelectorAll<HTMLElement>('[role^="menuitem"]'),
        ).find((e) => e.textContent === 'Restart…')!;
        fireEvent.click(item);
      } else await act(async () => typeCommand('restart'));
      expect(document.querySelector('[role="dialog"]')).not.toBeNull();
      act(() => {
        vi.advanceTimersByTime(90 * 15);
      });
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      expectStartState();
      expect(winEl('hello')!.style.left).toBe(`${pos().hello.x}px`);
      expect(winEl('hello')!.style.top).toBe(`${pos().hello.y}px`);
    });
  }

  it('T15 AC8: Restart brings back a minimized hello as open and not minimized', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await user.click(screen.getByRole('button', { name: 'Minimize hello.txt' }));
    expect(winEl('hello')).toHaveAttribute('data-min', 'true');
    await menuItem(user, 'tanzi.os', 'Restart…');
    expect(winEl('hello')).toHaveAttribute('data-min', 'false');
  });
});

describe('T15 AC10: Restart and Tidy up differ', () => {
  it('T15 AC10: Tidy up opens all five dock windows while Restart leaves only hello', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await menuItem(user, 'Windows', 'Tidy up');
    expect(winIds().sort()).toEqual([...DOCK_IDS].sort());
    for (const id of DOCK_IDS) expect(winEl(id), id).toHaveAttribute('data-min', 'false');
    expect(winEl('site')).toBeNull();
    for (const id of DOCK_IDS) {
      expect(winEl(id)!.style.zIndex, id).toBe(String(zIndexFor(id, INITIAL_ORDER)));
      expect(winEl(id)!.style.left, id).toBe(`${pos()[id].x}px`);
    }
    await menuItem(user, 'tanzi.os', 'Restart…');
    expectStartState();
  });

  it('T15 AC10: Tidy up from a mixed state opens every dock window and keeps hello state', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await user.click(screen.getByRole('button', { name: 'Close hello.txt' }));
    await menuItem(user, 'Windows', 'Tidy up');
    expect(winIds().sort()).toEqual([...DOCK_IDS].sort());
  });

  it('T15 AC10: the terminal tidy command also opens all five', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await user.click(dockBtn('term'));
    typeCommand('tidy');
    expect(winIds().sort()).toEqual([...DOCK_IDS].sort());
  });
});

describe('T15 AC15: hello buttons open, restore and raise their window', () => {
  const BUTTONS: [string, WinId][] = [
    ["See what I've built", 'proj'],
    ['More about me', 'about'],
    ["What I've been up to", 'exp'],
  ];
  const z = (id: string) => Number(winEl(id)!.style.zIndex);
  const maxZ = () => Math.max(...allWins().map((w) => Number(w.style.zIndex)));
  const helloBtn = (name: string) => within(winEl('hello')!).getByRole('button', { name });

  for (const [label, id] of BUTTONS) {
    it(`T15 AC15: "${label}" opens ${id} when closed, on top, at its layout position`, async () => {
      const user = userEvent.setup();
      render(<Desktop />);
      expect(winEl(id)).toBeNull();
      await user.click(helloBtn(label));
      expect(winEl(id)).not.toBeNull();
      expect(winEl(id)).toHaveAttribute('data-min', 'false');
      expect(z(id)).toBe(maxZ());
      expect(winEl(id)!.style.left).toBe(`${pos()[id].x}px`);
    });

    it(`T15 AC15: "${label}" restores a minimized ${id} and raises it`, async () => {
      const user = userEvent.setup();
      render(<Desktop />);
      await user.click(helloBtn(label));
      await user.click(screen.getByRole('button', { name: `Minimize ${WIN_TITLES[id]}` }));
      expect(winEl(id)).toHaveAttribute('data-min', 'true');
      await user.click(helloBtn(label));
      expect(winEl(id)).toHaveAttribute('data-min', 'false');
      expect(z(id)).toBe(maxZ());
    });

    it(`T15 AC15: "${label}" raises ${id} when it is open behind hello`, async () => {
      const user = userEvent.setup();
      render(<Desktop />);
      await user.click(helloBtn(label));
      fireEvent.pointerDown(winEl('hello')!.querySelector<HTMLElement>('.win-titlebar')!, {
        pointerId: 1,
        button: 0,
        clientX: 300,
        clientY: 150,
      });
      fireEvent.pointerUp(document.body, { pointerId: 1 });
      expect(z('hello')).toBeGreaterThan(z(id));
      await user.click(helloBtn(label));
      expect(z(id)).toBe(maxZ());
      expect(z(id)).toBeGreaterThan(z('hello'));
    });

    it(`T15 AC15: "${label}" never minimizes ${id} when it is already open and on top`, async () => {
      const user = userEvent.setup();
      render(<Desktop />);
      await user.click(helloBtn(label));
      await user.click(helloBtn(label));
      await user.click(helloBtn(label));
      expect(winEl(id)).not.toBeNull();
      expect(winEl(id)).toHaveAttribute('data-min', 'false');
      expect(z(id)).toBe(maxZ());
    });
  }
});
