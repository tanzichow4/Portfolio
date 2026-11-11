import { createEvent, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Desktop from '../src/Desktop';
import { LINKS, WIN_TITLES } from '../src/data';
import { layout } from '../src/logic/layout';
import { DOCK_IDS, WIN_META } from '../src/logic/windows';
import type { WinId } from '../src/types';
import { openAllFromDock } from './helpers/openAll';

const html = document.documentElement;
const reset = () => {
  localStorage.clear();
  delete html.dataset.theme;
};
beforeEach(reset);
afterEach(() => {
  vi.restoreAllMocks();
  reset();
});

const dock = () => screen.getByRole('navigation', { name: 'Dock' });
const dockBtn = (id: WinId) => within(dock()).getByRole('button', { name: WIN_TITLES[id] });
const winEl = (id: WinId) => document.querySelector<HTMLElement>(`[data-win="${id}"]`);
const z = (id: WinId) => Number(winEl(id)!.style.zIndex);
const dotOf = (id: WinId) => dockBtn(id).querySelector<HTMLElement>('.dock-dot')!.style.opacity;
const trigger = (name: string) => screen.getByRole('menuitem', { name });

type DockState = 'Open' | 'Minimized' | 'Closed';
const expectDock = (id: WinId, state: DockState) => {
  const b = dockBtn(id);
  expect(b, `${id} pressed`).toHaveAttribute('aria-pressed', String(state === 'Open'));
  expect(b, `${id} description`).toHaveAccessibleDescription(state);
  expect(dotOf(id), `${id} dot`).toBe({ Open: '1', Minimized: '0.4', Closed: '0' }[state]);
  expect(b).toHaveAccessibleName(WIN_TITLES[id]);
};
const expectAll = (states: Record<WinId, DockState>) => {
  for (const id of DOCK_IDS) expectDock(id, states[id]);
};
const ALL_OPEN: Record<string, DockState> = {
  hello: 'Open',
  about: 'Open',
  exp: 'Open',
  proj: 'Open',
  term: 'Open',
};
const states = (patch: Partial<Record<WinId, DockState>> = {}) =>
  ({ ...ALL_OPEN, ...patch }) as Record<WinId, DockState>;

const START_CLOSED: Partial<Record<WinId, DockState>> = {
  about: 'Closed',
  exp: 'Closed',
  proj: 'Closed',
  term: 'Closed',
};

async function choose(user: ReturnType<typeof userEvent.setup>, menu: string, item: string) {
  await user.click(trigger(menu));
  const m = screen.getByRole('menu');
  const target = Array.from(m.querySelectorAll<HTMLElement>('[role^="menuitem"]')).find(
    (e) => e.textContent === item,
  );
  expect(target, item).toBeDefined();
  await user.click(target!);
}

const dragBy = (id: WinId, dx: number, dy: number) => {
  const bar = winEl(id)!.querySelector<HTMLElement>('.win-titlebar')!;
  fireEvent.pointerDown(bar, { pointerId: 1, button: 0, clientX: 300, clientY: 150 });
  const ev = createEvent.pointerMove(bar, { pointerId: 1, clientX: 300 + dx, clientY: 150 + dy });
  Object.defineProperty(ev, 'movementX', { value: dx });
  fireEvent(bar, ev);
  fireEvent.pointerUp(bar, { pointerId: 1, button: 0, clientX: 300 + dx, clientY: 150 + dy });
};

const pos = (id: WinId) => ({ left: winEl(id)!.style.left, top: winEl(id)!.style.top });

/** Stops the browser from navigating when a link is clicked. Returns the seen events. */
function blockNavigation() {
  const seen: Event[] = [];
  const h = (e: Event) => {
    seen.push(e);
    e.preventDefault();
  };
  document.addEventListener('click', h);
  return { seen, off: () => document.removeEventListener('click', h) };
}

describe('T06 dock on the desktop', () => {
  it('T06 AC25: the dock is the last child of the desktop root, after the windows', () => {
    const { container } = render(<Desktop />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.lastElementChild).toBe(dock());
    const lastWin = Array.from(root.querySelectorAll('[data-win]')).pop()!;
    expect(lastWin.compareDocumentPosition(dock()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('T06 AC2: no default window rectangle at 1280x720 reaches the dock top edge (vh - 76 = 644)', () => {
    const pos720 = layout(1280, 720);
    for (const id of DOCK_IDS) {
      expect(pos720[id].y + WIN_META[id].height, id).toBeLessThanOrEqual(644);
    }
  });

  it('T06 AC2: at a 1280x720 viewport the rendered default windows end at or above y 644', () => {
    const saved = { w: window.innerWidth, h: window.innerHeight };
    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 720, configurable: true });
    try {
      render(<Desktop />);
      // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, only hello is open at start, so open the other windows from the dock first.
      openAllFromDock();
      for (const id of DOCK_IDS) {
        const s = winEl(id)!.style;
        expect(parseFloat(s.top) + parseFloat(s.minHeight), id).toBeLessThanOrEqual(644);
      }
    } finally {
      Object.defineProperty(window, 'innerWidth', { value: saved.w, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: saved.h, configurable: true });
    }
  });

  it('T06 AC15: initially all five windows read Open with full dots', () => {
    render(<Desktop />);
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): first load opens only hello (T15 AC1, AC5); the other four read Closed.
    expectAll(states(START_CLOSED));
  });
});

describe('T06 AC9 click outcomes through the full desktop', () => {
  it('T06 AC9: closed -> the window opens and becomes front-most', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, only hello is open at start, so open the other windows from the dock first.
    openAllFromDock();
    await user.click(screen.getByRole('button', { name: 'Close terminal' }));
    expect(winEl('term')).toBeNull();
    expectDock('term', 'Closed');
    await user.click(dockBtn('term'));
    expect(winEl('term')).not.toBeNull();
    expect(winEl('term')).toHaveAttribute('data-min', 'false');
    for (const id of DOCK_IDS.filter((i) => i !== 'term')) expect(z('term')).toBeGreaterThan(z(id));
    expectDock('term', 'Open');
  });

  it('T06 AC9: minimized -> the window restores and becomes front-most', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, only hello is open at start, so open the other windows from the dock first.
    openAllFromDock();
    await user.click(screen.getByRole('button', { name: 'Minimize projects' }));
    expect(winEl('proj')).toHaveAttribute('data-min', 'true');
    expectDock('proj', 'Minimized');
    await user.click(dockBtn('proj'));
    expect(winEl('proj')).toHaveAttribute('data-min', 'false');
    for (const id of DOCK_IDS.filter((i) => i !== 'proj')) expect(z('proj')).toBeGreaterThan(z(id));
    expectDock('proj', 'Open');
  });

  it('T06 AC9: open but not front-most -> it becomes front-most and keeps its position', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, only hello is open at start, so open the other windows from the dock first.
    openAllFromDock();
    // hello is front-most on load, so projects is behind it.
    expect(z('proj')).toBeLessThan(z('hello'));
    const before = pos('proj');
    await user.click(dockBtn('proj'));
    expect(winEl('proj')).toHaveAttribute('data-min', 'false');
    for (const id of DOCK_IDS.filter((i) => i !== 'proj')) expect(z('proj')).toBeGreaterThan(z(id));
    expect(pos('proj')).toEqual(before);
    expectAll(states());
  });

  it('T06 AC9: open and front-most -> it minimizes', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, only hello is open at start, so open the other windows from the dock first.
    openAllFromDock();
    await user.click(dockBtn('hello'));
    expect(winEl('hello')).toHaveAttribute('data-min', 'true');
    expectAll(states({ hello: 'Minimized' }));
  });

  it('T06 AC11: clicking the front-most button alternates minimize and restore', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    for (let i = 0; i < 3; i++) {
      await user.click(dockBtn('hello'));
      expect(winEl('hello')).toHaveAttribute('data-min', 'true');
      expectDock('hello', 'Minimized');
      await user.click(dockBtn('hello'));
      expect(winEl('hello')).toHaveAttribute('data-min', 'false');
      expectDock('hello', 'Open');
    }
  });

  it('T06 AC12: a moved window keeps its position across minimize/restore and close/reopen', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    const initial = pos('hello');
    dragBy('hello', 120, 60);
    const moved = pos('hello');
    expect(moved).not.toEqual(initial);

    await user.click(dockBtn('hello')); // minimize
    await user.click(dockBtn('hello')); // restore
    expect(pos('hello')).toEqual(moved);

    await user.click(screen.getByRole('button', { name: 'Close hello.txt' }));
    expect(winEl('hello')).toBeNull();
    await user.click(dockBtn('hello'));
    expect(pos('hello')).toEqual(moved);
  });
});

describe('T06 AC14 clicking the dock with a menu open', () => {
  it('T06 AC14: a window button closes the menu and still acts', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await user.click(trigger('Windows'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.click(dockBtn('hello'));
    expect(screen.queryByRole('menu')).toBeNull();
    expect(winEl('hello')).toHaveAttribute('data-min', 'true');
  });

  it('T06 AC14: a dock link closes the menu and the click reaches the link', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    const { seen, off } = blockNavigation();
    await user.click(trigger('View'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    const gh = within(dock()).getByRole('link', { name: 'LinkedIn' });
    await user.click(gh);
    off();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(seen.some((e) => gh.contains(e.target as Node))).toBe(true);
  });
});

describe('T06 AC15 dock stays in sync with every other route', () => {
  it('T06 AC15: the window Minimize and Close buttons', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, only hello is open at start, so open the other windows from the dock first.
    openAllFromDock();
    await user.click(screen.getByRole('button', { name: 'Minimize about.md' }));
    expectAll(states({ about: 'Minimized' }));
    await user.click(screen.getByRole('button', { name: 'Close experience.log' }));
    expectAll(states({ about: 'Minimized', exp: 'Closed' }));
  });

  it('T06 AC15: title-bar double-click', () => {
    render(<Desktop />);
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, only hello is open at start, so open the other windows from the dock first.
    openAllFromDock();
    const bar = winEl('about')!.querySelector<HTMLElement>('.win-titlebar')!;
    fireEvent.doubleClick(bar);
    expectAll(states({ about: 'Minimized' }));
  });

  it('T06 AC15: each Windows menu item restores or opens its window and the dock follows', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, only hello is open at start, so open the other windows from the dock first.
    openAllFromDock();
    for (const id of DOCK_IDS) {
      await user.click(screen.getByRole('button', { name: `Close ${WIN_TITLES[id]}` }));
      expectDock(id, 'Closed');
      await choose(user, 'Windows', WIN_TITLES[id]);
      expectDock(id, 'Open');
    }
    expectAll(states());
    // From minimized too.
    await user.click(screen.getByRole('button', { name: 'Minimize projects' }));
    expectDock('proj', 'Minimized');
    await choose(user, 'Windows', 'projects');
    expectDock('proj', 'Open');
  });

  it('T06 AC15: Minimize all, then Show all', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, only hello is open at start, so open the other windows from the dock first.
    openAllFromDock();
    await user.click(screen.getByRole('button', { name: 'Close terminal' }));
    await choose(user, 'Windows', 'Minimize all');
    expectAll(
      states({
        hello: 'Minimized',
        about: 'Minimized',
        exp: 'Minimized',
        proj: 'Minimized',
        term: 'Closed',
      }),
    );
    await choose(user, 'Windows', 'Show all');
    expectAll(states({ term: 'Closed' }));
  });

  it('T06 AC15: Tidy up and Restart reset the dock to all open', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, only hello is open at start, so open the other windows from the dock first.
    openAllFromDock();
    for (const label of ['Tidy up', 'Restart…']) {
      await user.click(screen.getByRole('button', { name: 'Close terminal' }));
      await user.click(screen.getByRole('button', { name: 'Minimize about.md' }));
      expectAll(states({ term: 'Closed', about: 'Minimized' }));
      await choose(user, label === 'Restart…' ? 'tanzi.os' : 'Windows', label);
      // DELIBERATE REQUIREMENT CHANGE (T08 AC32): Restart now applies when the boot ends.
      // DELIBERATE REQUIREMENT CHANGE (T15 AC25): Restart returns to the start state (only hello open, T15 AC8); Tidy up still opens all five.
      // After Restart the windows are opened from the dock again so the next loop pass starts from all open.
      if (label === 'Restart…') {
        await waitFor(() => expectAll(states(START_CLOSED)), { timeout: 3000 });
        expectAll(states(START_CLOSED));
        openAllFromDock();
      }
      expectAll(states());
    }
  });

  it('T06 AC15: the Windows menu checks follow a dock click', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, only hello is open at start, so open the other windows from the dock first.
    openAllFromDock();
    const checks = async () => {
      await user.click(trigger('Windows'));
      const out = Object.fromEntries(
        screen
          .getAllByRole('menuitemcheckbox')
          .map((m) => [m.textContent, m.getAttribute('aria-checked')]),
      );
      await user.keyboard('{Escape}');
      return out;
    };
    expect((await checks())['hello.txt']).toBe('true');
    await user.click(dockBtn('hello')); // minimize
    expect((await checks())['hello.txt']).toBe('false');
    await user.click(dockBtn('hello')); // restore
    expect((await checks())['hello.txt']).toBe('true');
    await user.click(screen.getByRole('button', { name: 'Close terminal' }));
    expect((await checks())['terminal']).toBe('false');
    await user.click(dockBtn('term'));
    expect((await checks())['terminal']).toBe('true');
  });
});

describe('T06 AC16 dock links leave the desktop alone', () => {
  it('T06 AC16: clicking each link changes no window state and reaches the link', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, only hello is open at start, so open the other windows from the dock first.
    openAllFromDock();
    await user.click(screen.getByRole('button', { name: 'Minimize about.md' }));
    await user.click(screen.getByRole('button', { name: 'Close terminal' }));
    const snapshot = states({ about: 'Minimized', term: 'Closed' });
    const zs = DOCK_IDS.filter((i) => winEl(i)).map((i) => [i, z(i)]);
    const { seen, off } = blockNavigation();
    for (const l of LINKS) {
      const a = within(dock()).getByRole('link', { name: l.label });
      await user.click(a);
      expect(
        seen.some((e) => a.contains(e.target as Node)),
        l.label,
      ).toBe(true);
      expectAll(snapshot);
    }
    off();
    expect(DOCK_IDS.filter((i) => winEl(i)).map((i) => [i, z(i)])).toEqual(zs);
  });
});

describe('T06 AC25 and AC26 keyboard', () => {
  it('T06 AC25: Tab runs menubar, window controls, then the seven dock controls in order', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, only hello is open at start, so open the other windows from the dock first.
    openAllFromDock();
    const stops: HTMLElement[] = [];
    // DELIBERATE REQUIREMENT CHANGE: GitHub link removed per Tanzi (LINKS is now LinkedIn and Email). 33 -> 31 stops (one fewer menubar link, one fewer dock link).
    // DELIBERATE REQUIREMENT CHANGE (T07 AC52): the hello body adds three tab stops (verb,
    // primary button, "Say hi" link), so 23 -> 26 stops and the dock starts at index 18.
    // DELIBERATE REQUIREMENT CHANGE (T07 AC52): the experience body adds two more stops (the
    // selected tab and the panel), so 26 -> 28 stops and the dock starts at index 20.
    // DELIBERATE REQUIREMENT CHANGE (T07 AC52): the projects body adds four tile links, so
    // 28 -> 32 stops and the dock starts at index 24.
    // DELIBERATE REQUIREMENT CHANGE (T07 AC52): the terminal body adds its input as a stop, so 32 -> 33 stops and the dock starts at index 25.
    for (let i = 0; i < 31; i++) {
      await user.tab();
      stops.push(document.activeElement as HTMLElement);
    }
    expect(stops[0]).toBe(trigger('tanzi.os'));
    expect(stops[4]).toBe(screen.getByRole('button', { name: 'Minimize hello.txt' }));
    const tail = stops.slice(24);
    expect(tail.map((e) => e.getAttribute('aria-label'))).toEqual([
      'hello.txt',
      'about.md',
      'experience.log',
      'projects',
      'terminal',
      'LinkedIn',
      'Email',
    ]);
    for (const e of tail) expect(dock().contains(e)).toBe(true);
    // Each is its own stop: no duplicates.
    expect(new Set(stops).size).toBe(31);
  });

  it('T06 AC25: tabbing back from the dock does not skip a control (shift+tab walks the same order)', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    dockBtn('term').focus();
    await user.tab();
    expect(document.activeElement).toBe(within(dock()).getByRole('link', { name: 'LinkedIn' }));
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(dockBtn('term'));
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(dockBtn('proj'));
  });

  for (const [name, key] of [
    ['Enter', '{Enter}'],
    ['Space', ' '],
  ] as const) {
    it(`T06 AC25/AC26: ${name} activates a dock button and focus stays on it in all four outcomes`, async () => {
      const user = userEvent.setup();
      render(<Desktop />);
      // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, only hello is open at start, so open the other windows from the dock first.
      openAllFromDock();

      // closed -> open
      await user.click(screen.getByRole('button', { name: 'Close terminal' }));
      dockBtn('term').focus();
      await user.keyboard(key);
      expect(winEl('term')).toHaveAttribute('data-min', 'false');
      expectDock('term', 'Open');
      expect(document.activeElement).toBe(dockBtn('term'));

      // front-most -> minimize
      await user.keyboard(key);
      expect(winEl('term')).toHaveAttribute('data-min', 'true');
      expectDock('term', 'Minimized');
      expect(document.activeElement).toBe(dockBtn('term'));

      // minimized -> restore
      await user.keyboard(key);
      expect(winEl('term')).toHaveAttribute('data-min', 'false');
      expectDock('term', 'Open');
      expect(document.activeElement).toBe(dockBtn('term'));

      // open, not front-most -> focus
      dockBtn('proj').focus();
      expect(z('proj')).toBeLessThan(z('term'));
      await user.keyboard(key);
      expect(winEl('proj')).toHaveAttribute('data-min', 'false');
      expect(z('proj')).toBeGreaterThan(z('term'));
      expectDock('proj', 'Open');
      expect(document.activeElement).toBe(dockBtn('proj'));
    });
  }
});
