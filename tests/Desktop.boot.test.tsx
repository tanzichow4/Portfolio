import { StrictMode } from 'react';
import { act, createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Desktop from '../src/Desktop';
import { BOOT_COPY, VERBS } from '../src/data';

// Every Restart here runs under stubbed reduced motion, so these tests stay valid once the
// boot screen is wired in (T4). Fly-in and the boot path are covered elsewhere.
const html = document.documentElement;
const IDS = ['hello', 'about', 'exp', 'proj', 'term'] as const;

const reset = () => {
  localStorage.clear();
  delete html.dataset.theme;
};
beforeEach(() => {
  reset();
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
  reset();
});

const winEl = (id: string) => document.querySelector<HTMLElement>(`[data-win="${id}"]`);
const trigger = (name: string) => screen.getByRole('menuitem', { name });
const input = () => screen.getByRole('textbox', { name: 'Terminal command', hidden: true });
const logLines = () =>
  Array.from(screen.getByRole('log', { hidden: true }).children).map((c) => c.textContent);
const verbBtn = () => document.querySelector<HTMLElement>('.hello-verb')!;
const tabs = () => screen.getAllByRole('tab', { hidden: true });

type User = ReturnType<typeof userEvent.setup>;

async function choose(user: User, menu: string, item: string) {
  await user.click(trigger(menu));
  const target = Array.from(
    screen.getByRole('menu').querySelectorAll<HTMLElement>('[role^="menuitem"]'),
  ).find((e) => e.textContent === item);
  expect(target, item).toBeDefined();
  await user.click(target!);
}

function typeCommand(cmd: string) {
  fireEvent.change(input(), { target: { value: cmd } });
  fireEvent.keyDown(input(), { key: 'Enter' });
}

/** Position, stacking and minimized flag of every window: what "layout" means here. */
function layout() {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-win]'))
    .map((w) => ({
      id: w.dataset.win,
      left: w.style.left,
      top: w.style.top,
      z: w.style.zIndex,
      min: w.dataset.min,
    }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

/** The layout a fresh load produces at the current viewport. */
function freshLayout() {
  const { unmount } = render(<Desktop />);
  const l = layout();
  unmount();
  return l;
}

const restartFromMenu = (user: User) => choose(user, 'tanzi.os', 'Restart…');
const restartFromTerminal = () => typeCommand('restart');

type Via = 'menu' | 'terminal';
type Variant = 'open' | 'minimized' | 'closed';
const restart = async (via: Via, user: User) =>
  via === 'menu' ? restartFromMenu(user) : act(async () => restartFromTerminal());

/** Dirty the verb, tab and terminal, then leave the windows open, minimized or closed. */
async function dirty(user: User, variant: Variant, via: Via) {
  await user.click(verbBtn());
  await user.click(tabs()[1]);
  typeCommand('whoami');
  fireEvent.change(input(), { target: { value: 'unsent' } });
  expect(verbBtn().textContent).toBe(VERBS[1]);
  expect(tabs()[1]).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(input(), { key: 'ArrowUp' });
  expect(input()).toHaveValue('whoami');
  fireEvent.change(input(), { target: { value: 'unsent' } });
  const ids =
    via === 'terminal' ? (['hello', 'exp'] as const) : (['hello', 'exp', 'term'] as const);
  const titles = { hello: 'hello.txt', exp: 'experience.log', term: 'terminal' } as const;
  if (variant === 'closed') {
    // Closing resets the window itself; Restart must still bring everything back to initial.
    for (const id of ids) {
      await user.click(screen.getByRole('button', { name: `Close ${titles[id]}` }));
    }
  } else if (variant === 'minimized') {
    for (const id of ids) {
      await user.click(screen.getByRole('button', { name: `Minimize ${titles[id]}` }));
    }
  }
}

function expectInitialWindowState() {
  expect(verbBtn().textContent).toBe(VERBS[0]);
  expect(tabs()[0]).toHaveAttribute('aria-selected', 'true');
  expect(tabs()[1]).toHaveAttribute('aria-selected', 'false');
  expect(logLines()).toHaveLength(1);
  expect(logLines()[0]).toContain('type "help"');
  expect(input()).toHaveValue('');
  fireEvent.keyDown(input(), { key: 'ArrowUp' });
  expect(input()).toHaveValue('');
}

describe('T08 Restart resets the desktop by remounting (T3)', () => {
  for (const via of ['menu', 'terminal'] as const) {
    for (const variant of ['open', 'minimized', 'closed'] as const) {
      it(`T08 AC15 AC16: Restart from the ${via} with windows ${variant} gives a fresh layout and initial window state`, async () => {
        const user = userEvent.setup();
        const expected = freshLayout();
        render(<Desktop />);
        // Move things off default: raise a window by clicking it.
        await user.click(winEl('about')!);
        await dirty(user, variant, via);
        if (variant === 'closed') {
          expect(winEl('hello')).toBeNull();
          expect(winEl('exp')).toBeNull();
        }
        // The terminal path needs a reachable terminal, so only the menu closes it.
        if (via === 'terminal' && variant === 'minimized') {
          expect(winEl('term')).toHaveAttribute('data-min', 'false');
        }
        await restart(via, user);
        expect(layout()).toEqual(expected);
        expect(winEl('site')).toBeNull();
        for (const id of IDS) {
          expect(winEl(id), id).not.toBeNull();
          expect(winEl(id), id).toHaveAttribute('data-min', 'false');
        }
        expectInitialWindowState();
      });
    }
  }

  it('T08 AC16: Restart from a minimized terminal discards its lines, input and history', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    typeCommand('whoami');
    await user.click(screen.getByRole('button', { name: 'Minimize terminal' }));
    expect(winEl('term')).toHaveAttribute('data-min', 'true');
    typeCommand('restart');
    await act(async () => {});
    expect(winEl('term')).toHaveAttribute('data-min', 'false');
    expect(logLines()).toHaveLength(1);
    expect(input()).toHaveValue('');
    fireEvent.keyDown(input(), { key: 'ArrowUp' });
    expect(input()).toHaveValue('');
  });

  for (const via of ['menu', 'terminal'] as const) {
    it(`T08 AC15: About this site is closed after Restart from the ${via}`, async () => {
      const user = userEvent.setup();
      render(<Desktop />);
      await choose(user, 'tanzi.os', 'About this site');
      expect(winEl('site')).not.toBeNull();
      await restart(via, user);
      expect(winEl('site')).toBeNull();
    });

    it(`T08 AC15: windows dragged and raised return to default after Restart from the ${via}`, async () => {
      const user = userEvent.setup();
      const expected = freshLayout();
      render(<Desktop />);
      const bar = winEl('hello')!.querySelector<HTMLElement>('.win-titlebar')!;
      fireEvent.pointerDown(bar, { pointerId: 1, button: 0, clientX: 300, clientY: 150 });
      fireEvent.pointerMove(bar, { pointerId: 1, clientX: 340, clientY: 190 });
      fireEvent.pointerUp(bar, { pointerId: 1, clientX: 340, clientY: 190 });
      await user.click(winEl('proj')!);
      expect(layout()).not.toEqual(expected);
      await restart(via, user);
      expect(layout()).toEqual(expected);
    });
  }

  it('T08 AC15: a resize before Restart makes the layout use the latest viewport', async () => {
    const user = userEvent.setup();
    const { innerWidth: w0, innerHeight: h0 } = window;
    try {
      window.innerWidth = 1600;
      window.innerHeight = 900;
      const expected = freshLayout();
      window.innerWidth = w0;
      window.innerHeight = h0;
      const atOriginal = freshLayout();
      expect(expected).not.toEqual(atOriginal);
      render(<Desktop />);
      window.innerWidth = 1600;
      window.innerHeight = 900;
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      await restartFromMenu(user);
      expect(layout()).toEqual(expected);
    } finally {
      window.innerWidth = w0;
      window.innerHeight = h0;
    }
  });

  it('T08 AC15: repeated Restart returns the same default layout every time', async () => {
    const user = userEvent.setup();
    const expected = freshLayout();
    render(<Desktop />);
    for (let i = 0; i < 3; i++) {
      await user.click(winEl('about')!);
      await user.click(verbBtn());
      await user.click(screen.getByRole('button', { name: 'Close projects' }));
      await (i % 2 === 0 ? restartFromMenu(user) : act(async () => restartFromTerminal()));
      expect(layout()).toEqual(expected);
      expect(verbBtn().textContent).toBe(VERBS[0]);
      expect(logLines()).toHaveLength(1);
    }
  });
});

describe('T08 Restart keeps and writes nothing of the settings (T3)', () => {
  it('T08 AC17: theme, wallpaper and wobble chosen from the menu survive a menu Restart', async () => {
    const user = userEvent.setup();
    const { container } = render(<Desktop />);
    await choose(user, 'View', 'Light mode');
    await choose(user, 'View', 'Wallpaper: Grid');
    await choose(user, 'View', 'Wobbly windows');
    await restartFromMenu(user);
    expect(html.dataset.theme).toBe('light');
    expect((container.firstElementChild as HTMLElement).style.background).toContain('--wall-grid');
    await user.click(trigger('View'));
    const menu = screen.getByRole('menu');
    expect(within(menu).getByRole('menuitemradio', { name: 'Light mode' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(within(menu).getByRole('menuitemradio', { name: 'Wallpaper: Grid' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(within(menu).getByRole('menuitemcheckbox', { name: 'Wobbly windows' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('T08 AC17: settings changed in the terminal survive a terminal Restart (wobble stays on)', async () => {
    const user = userEvent.setup();
    const { container } = render(<Desktop />);
    typeCommand('theme light');
    typeCommand('wallpaper plain');
    typeCommand('restart');
    await act(async () => {});
    expect(html.dataset.theme).toBe('light');
    expect((container.firstElementChild as HTMLElement).style.background).toContain('--wall-plain');
    await user.click(trigger('View'));
    expect(
      within(screen.getByRole('menu')).getByRole('menuitemcheckbox', { name: 'Wobbly windows' }),
    ).toHaveAttribute('aria-checked', 'true');
  });

  for (const via of ['menu', 'terminal'] as const) {
    it(`T08 AC17: Restart from the ${via} writes nothing and stores nothing that was unstored`, async () => {
      const user = userEvent.setup();
      render(<Desktop />);
      const set = vi.spyOn(Storage.prototype, 'setItem');
      const remove = vi.spyOn(Storage.prototype, 'removeItem');
      await restart(via, user);
      expect(set).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
      expect(localStorage.length).toBe(0);
    });

    it(`T08 AC17: Restart from the ${via} does not re-read storage`, async () => {
      const user = userEvent.setup();
      render(<Desktop />);
      const get = vi.spyOn(Storage.prototype, 'getItem');
      await restart(via, user);
      expect(get).not.toHaveBeenCalled();
    });

    it(`T08 AC17: stored values are not re-applied by a Restart from the ${via}`, async () => {
      const user = userEvent.setup();
      const { container } = render(<Desktop />);
      // Tamper with storage behind the app's back: a re-read would pick this up.
      localStorage.setItem('tanzi-os:wallpaper', 'plain');
      localStorage.setItem('tanzi-os:wobble', 'false');
      await restart(via, user);
      expect((container.firstElementChild as HTMLElement).style.background).toContain(
        '--wall-nebula',
      );
      await user.click(trigger('View'));
      expect(
        within(screen.getByRole('menu')).getByRole('menuitemcheckbox', { name: 'Wobbly windows' }),
      ).toHaveAttribute('aria-checked', 'true');
    });

    it(`T08 AC17: with a throwing setItem the session theme survives a Restart from the ${via}`, async () => {
      const user = userEvent.setup();
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota');
      });
      render(<Desktop />);
      await choose(user, 'View', 'Light mode');
      expect(html.dataset.theme).toBe('light');
      await restart(via, user);
      expect(html.dataset.theme).toBe('light');
      await user.click(trigger('View'));
      expect(
        within(screen.getByRole('menu')).getByRole('menuitemradio', { name: 'Light mode' }),
      ).toHaveAttribute('aria-checked', 'true');
    });
  }
});

describe('T08 Restart leaves existing behaviour alone (T3)', () => {
  it('T08 AC19: a drag released after Restart leaves the default layout', async () => {
    const user = userEvent.setup();
    const expected = freshLayout();
    render(<Desktop />);
    const oldBar = winEl('about')!.querySelector<HTMLElement>('.win-titlebar')!;
    fireEvent.pointerDown(oldBar, { pointerId: 1, button: 0, clientX: 300, clientY: 150 });
    fireEvent.pointerMove(oldBar, { pointerId: 1, clientX: 380, clientY: 230 });
    const mid = winEl('about')!.getAttribute('style');
    await restartFromMenu(user);
    expect(layout()).toEqual(expected);
    fireEvent.pointerUp(oldBar, { pointerId: 1, clientX: 380, clientY: 230 });
    fireEvent.pointerCancel(oldBar, { pointerId: 1 });
    const newBar = winEl('about')!.querySelector<HTMLElement>('.win-titlebar')!;
    fireEvent.pointerMove(newBar, { pointerId: 1, clientX: 400, clientY: 260 });
    fireEvent.pointerUp(newBar, { pointerId: 1, clientX: 400, clientY: 260 });
    fireEvent.pointerUp(document.body, { pointerId: 1 });
    expect(layout()).toEqual(expected);
    expect(winEl('about')!.getAttribute('style')).not.toBe(mid);
  });

  it('T08 AC20: Tidy up keeps a dirtied verb and resets the layout', async () => {
    const user = userEvent.setup();
    const expected = freshLayout();
    render(<Desktop />);
    await user.click(verbBtn());
    await user.click(winEl('proj')!);
    await choose(user, 'Windows', 'Tidy up');
    expect(verbBtn().textContent).toBe(VERBS[1]);
    expect(layout()).toEqual(expected);
  });

  it('T08 AC20: Tidy up keeps terminal lines of a window that stays open', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    typeCommand('whoami');
    const before = logLines();
    await choose(user, 'Windows', 'Tidy up');
    expect(logLines()).toEqual(before);
  });

  it('T08 AC20: Close still resets a window and minimize still keeps its state', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await user.click(verbBtn());
    await user.click(screen.getByRole('button', { name: 'Minimize hello.txt' }));
    await user.click(screen.getByRole('button', { name: 'hello.txt' }));
    expect(verbBtn().textContent).toBe(VERBS[1]);
    await user.click(screen.getByRole('button', { name: 'Close hello.txt' }));
    await user.click(screen.getByRole('button', { name: 'hello.txt' }));
    expect(verbBtn().textContent).toBe(VERBS[0]);
  });

  for (const via of ['menu', 'terminal'] as const) {
    it(`T08 AC20: after a Restart from the ${via} the terminal runs commands normally`, async () => {
      const user = userEvent.setup();
      render(<Desktop />);
      await restart(via, user);
      typeCommand('whoami');
      expect(logLines()).toHaveLength(3);
      fireEvent.keyDown(input(), { key: 'ArrowUp' });
      expect(input()).toHaveValue('whoami');
      typeCommand('theme light');
      expect(html.dataset.theme).toBe('light');
    });

    it(`T08 AC20: after a Restart from the ${via}, Help then Terminal commands runs help once (StrictMode)`, async () => {
      const user = userEvent.setup();
      render(
        <StrictMode>
          <Desktop />
        </StrictMode>,
      );
      await restart(via, user);
      expect(logLines()).toHaveLength(1);
      await choose(user, 'Help', 'Terminal commands');
      expect(logLines()).toHaveLength(4);
      expect(logLines()[1]).toMatch(/help$/);
      await choose(user, 'Help', 'Terminal commands');
      expect(logLines()).toHaveLength(7);
    });
  }

  it('T08 AC20: Help then Terminal commands with a closed terminal before Restart still runs once', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await user.click(screen.getByRole('button', { name: 'Close terminal' }));
    await restartFromMenu(user);
    await choose(user, 'Help', 'Terminal commands');
    expect(logLines()).toHaveLength(4);
  });

  it('T08 AC20: the menubar and dock are not remounted by Restart', async () => {
    const user = userEvent.setup();
    const { container } = render(<Desktop />);
    const header = container.querySelector('header');
    const dockBtn = screen.getByRole('button', { name: 'terminal' });
    const dock = dockBtn.parentElement;
    const osTrigger = trigger('tanzi.os');
    const helloBefore = winEl('hello');
    await restartFromMenu(user);
    expect(container.querySelector('header')).toBe(header);
    expect(screen.getByRole('button', { name: 'terminal' })).toBe(dockBtn);
    expect(dockBtn.parentElement).toBe(dock);
    expect(trigger('tanzi.os')).toBe(osTrigger);
    expect(winEl('hello')).not.toBe(helloBefore);
  });

  it('T08 AC20: Restart can be repeated and the dock still reflects the windows', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await restartFromMenu(user);
    await user.click(screen.getByRole('button', { name: 'Close hello.txt' }));
    await restartFromMenu(user);
    expect(winEl('hello')).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'hello.txt' }));
    expect(winEl('hello')).toHaveAttribute('data-min', 'true');
  });
});

// ---------------------------------------------------------------------------------------------
// T4: the boot path. Real (non-reduced) motion, fake timers, fireEvent only.
// ---------------------------------------------------------------------------------------------

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

const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');
const bar = () => document.querySelector<HTMLElement>('[role="progressbar"]');
const rootOf = (c: HTMLElement) => c.firstElementChild as HTMLElement;
const isInert = (el: Element) => el.hasAttribute('inert');
const tick = (n = 1) =>
  act(() => {
    vi.advanceTimersByTime(90 * n);
  });
const rotation = (id: string) => {
  const m = winEl(id)!.style.transform.match(/rotate\((-?[\d.]+)deg\)/);
  return m ? Number(m[1]) : 0;
};
const dragStart = (id: string) => {
  const b = winEl(id)!.querySelector<HTMLElement>('.win-titlebar')!;
  fireEvent.pointerDown(b, { pointerId: 1, button: 0, clientX: 300, clientY: 150 });
  const ev = createEvent.pointerMove(b, { pointerId: 1, clientX: 340, clientY: 150 });
  Object.defineProperty(ev, 'movementX', { value: 40 });
  fireEvent(b, ev);
  return b;
};

function menuRestart() {
  fireEvent.click(trigger('tanzi.os'));
  const item = Array.from(
    screen.getByRole('menu').querySelectorAll<HTMLElement>('[role^="menuitem"]'),
  ).find((e) => e.textContent === 'Restart…')!;
  fireEvent.click(item);
}
const termRestart = async () => act(async () => typeCommand('restart'));
const request = async (via: Via) => {
  if (via === 'menu') menuRestart();
  else await termRestart();
};

/** Records every mutation batch; `take()` returns the records since the last call, synchronously. */
function watch() {
  const mo = new MutationObserver(() => {});
  mo.observe(document.body, { subtree: true, childList: true, attributes: true });
  return { take: () => mo.takeRecords(), stop: () => mo.disconnect() };
}
const added = (recs: MutationRecord[], sel: string) =>
  recs
    .flatMap((r) => Array.from(r.addedNodes))
    .filter((n) => n instanceof Element && (n.matches(sel) || n.querySelector(sel)));
const removed = (recs: MutationRecord[], sel: string) =>
  recs
    .flatMap((r) => Array.from(r.removedNodes))
    .filter((n) => n instanceof Element && (n.matches(sel) || n.querySelector(sel)));

describe('T08 boot path (T4)', () => {
  beforeEach(() => {
    stubMotion(false);
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('when the boot screen runs', () => {
    it('T08 AC1: first load shows no boot screen, at mount or after a frame, under StrictMode with stored settings', () => {
      localStorage.setItem('tanzi-os:wallpaper', 'grid');
      localStorage.setItem('tanzi-os:wobble', 'false');
      localStorage.setItem('tanzi-os:theme', 'light');
      const w = watch();
      const { container } = render(
        <StrictMode>
          <Desktop />
        </StrictMode>,
      );
      expect(dialog()).toBeNull();
      expect(isInert(rootOf(container))).toBe(false);
      tick(2);
      expect(dialog()).toBeNull();
      expect(added(w.take(), '[role="dialog"]')).toHaveLength(0);
      w.stop();
    });

    it('T08 AC1: reloading during a boot (fresh mount) gives a normal first load without a boot screen', async () => {
      const first = render(<Desktop />);
      await request('terminal');
      expect(dialog()).not.toBeNull();
      first.unmount();
      render(<Desktop />);
      expect(dialog()).toBeNull();
      tick(20);
      expect(dialog()).toBeNull();
    });

    for (const via of ['menu', 'terminal'] as const) {
      it(`T08 AC2: Restart from the ${via} shows the boot screen straight away, with a name saying it is restarting`, async () => {
        render(<Desktop />);
        expect(dialog()).toBeNull();
        await request(via);
        const d = dialog()!;
        expect(d).not.toBeNull();
        expect(d).toHaveAttribute('aria-modal', 'true');
        expect(d).toHaveAttribute('aria-label', 'Restarting tanzi.os');
        expect(bar()).toHaveAttribute('aria-valuenow', '0');
      });
    }

    for (const via of ['menu', 'terminal'] as const) {
      it(`T08 AC3: under reduced motion, Restart from the ${via} shows no dialog in any commit, starts no interval, and resets at once`, async () => {
        stubMotion(true);
        render(<Desktop />);
        const before = winEl('hello');
        const setI = vi.spyOn(globalThis, 'setInterval');
        const w = watch();
        await request(via);
        expect(winEl('hello')).not.toBe(before);
        expect(winEl('hello')).not.toBeNull();
        expect(dialog()).toBeNull();
        tick(20);
        expect(added(w.take(), '[role="dialog"]')).toHaveLength(0);
        expect(setI).not.toHaveBeenCalled();
        w.stop();
      });
    }

    it('T08 AC3: the preference is re-read on every request, and a change mid-boot does not interrupt the boot', async () => {
      stubMotion(true);
      render(<Desktop />);
      await request('terminal');
      expect(dialog()).toBeNull();
      // Preference turned off: the next Restart boots.
      stubMotion(false);
      await request('terminal');
      expect(dialog()).not.toBeNull();
      const helloMid = winEl('hello');
      // Preference turned on mid-boot: the boot carries on to its normal end.
      stubMotion(true);
      tick(14);
      expect(dialog()).not.toBeNull();
      expect(winEl('hello')).toBe(helloMid);
      tick(1);
      expect(dialog()).toBeNull();
      expect(winEl('hello')).not.toBe(helloMid);
      // And turned back on, the next Restart is immediate again.
      const setI = vi.spyOn(globalThis, 'setInterval');
      await request('menu');
      expect(dialog()).toBeNull();
      expect(setI).not.toHaveBeenCalled();
    });

    it('T08 AC4: Tidy up, Close, Minimize, dock clicks and the tidy and clear commands show no boot screen', async () => {
      render(<Desktop />);
      const w = watch();
      fireEvent.click(screen.getByRole('button', { name: 'Close hello.txt' }));
      fireEvent.click(screen.getByRole('button', { name: 'Minimize about.md' }));
      fireEvent.click(screen.getByRole('button', { name: 'hello.txt' }));
      fireEvent.click(trigger('Windows'));
      const tidy = Array.from(
        screen.getByRole('menu').querySelectorAll<HTMLElement>('[role^="menuitem"]'),
      ).find((e) => e.textContent === 'Tidy up')!;
      fireEvent.click(tidy);
      act(() => typeCommand('tidy'));
      act(() => typeCommand('clear'));
      act(() => typeCommand('whoami'));
      act(() => typeCommand('theme light'));
      tick(20);
      expect(dialog()).toBeNull();
      expect(added(w.take(), '[role="dialog"]')).toHaveLength(0);
      w.stop();
    });
  });

  describe('progress and lifecycle', () => {
    it('T08 AC9: a second boot in the same session starts at 0%', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      render(<Desktop />);
      await request('terminal');
      tick(3);
      expect(Number(bar()!.getAttribute('aria-valuenow'))).toBeGreaterThan(0);
      tick(20);
      expect(dialog()).toBeNull();
      await request('menu');
      expect(bar()).toHaveAttribute('aria-valuenow', '0');
      tick(1);
      expect(bar()).toHaveAttribute('aria-valuenow', '14');
    });

    for (const via of ['menu', 'terminal'] as const) {
      it(`T08 AC10: with r at 0 the desktop is not reset on tick 14 and is reset on tick 15 (${via})`, async () => {
        render(<Desktop />);
        fireEvent.click(verbBtn());
        const helloBefore = winEl('hello');
        await request(via);
        tick(14);
        expect(dialog()).not.toBeNull();
        expect(winEl('hello')).toBe(helloBefore);
        expect(verbBtn().textContent).toBe(VERBS[1]);
        tick(1);
        expect(dialog()).toBeNull();
        expect(winEl('hello')).not.toBe(helloBefore);
        expect(verbBtn().textContent).toBe(VERBS[0]);
      });
    }

    it('T08 AC10: with r just below 1 the boot is not done on tick 4 and is done on tick 5', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.999999);
      render(<Desktop />);
      const helloBefore = winEl('hello');
      await request('terminal');
      tick(4);
      expect(dialog()).not.toBeNull();
      expect(winEl('hello')).toBe(helloBefore);
      tick(1);
      expect(dialog()).toBeNull();
      expect(winEl('hello')).not.toBe(helloBefore);
    });

    it('T08 AC10: dialog removal, window remount and inert removal land in the same batch, never apart', async () => {
      const { container } = render(<Desktop />);
      await request('terminal');
      const w = watch();
      w.take();
      tick(14);
      const early = w.take();
      expect(removed(early, '[role="dialog"]')).toHaveLength(0);
      expect(added(early, '[data-win="hello"]')).toHaveLength(0);
      expect(early.filter((r) => r.attributeName === 'inert')).toHaveLength(0);
      expect(isInert(rootOf(container))).toBe(true);
      tick(1);
      const last = w.take();
      expect(removed(last, '[role="dialog"]')).toHaveLength(1);
      expect(added(last, '[data-win="hello"]').length).toBeGreaterThan(0);
      expect(last.some((r) => r.attributeName === 'inert')).toBe(true);
      expect(isInert(rootOf(container))).toBe(false);
      w.stop();
    });

    it('T08 AC12: under StrictMode the reset happens exactly once and the boot ends on tick 15', async () => {
      render(
        <StrictMode>
          <Desktop />
        </StrictMode>,
      );
      await request('terminal');
      const w = watch();
      tick(14);
      expect(dialog()).not.toBeNull();
      expect(added(w.take(), '[data-win="hello"]')).toHaveLength(0);
      tick(1);
      expect(dialog()).toBeNull();
      expect(added(w.take(), '[data-win="hello"]')).toHaveLength(1);
      tick(30);
      expect(added(w.take(), '[data-win="hello"]')).toHaveLength(0);
      w.stop();
    });

    it('T08 AC12: unmounting mid-boot stops everything and logs no warning', async () => {
      const err = vi.spyOn(console, 'error').mockImplementation(() => {});
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { unmount } = render(<Desktop />);
      await request('terminal');
      tick(3);
      unmount();
      expect(() => tick(30)).not.toThrow();
      expect(dialog()).toBeNull();
      expect(err).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    });

    for (const [name, strict] of [
      ['', false],
      [' (StrictMode)', true],
    ] as const) {
      it(`T08 AC13: a second Restart mid-boot neither lengthens the boot nor resets twice${name}`, async () => {
        const ui = strict ? (
          <StrictMode>
            <Desktop />
          </StrictMode>
        ) : (
          <Desktop />
        );
        render(ui);
        await request('terminal');
        tick(5);
        const w = watch();
        w.take();
        await request('terminal');
        await request('menu');
        tick(1);
        expect(bar()).toHaveAttribute('aria-valuenow', '42');
        tick(8);
        expect(dialog()).not.toBeNull();
        tick(1); // tick 15 counted from the FIRST request
        expect(dialog()).toBeNull();
        expect(added(w.take(), '[data-win="hello"]')).toHaveLength(1);
        tick(40);
        expect(dialog()).toBeNull();
        expect(added(w.take(), '[data-win="hello"]')).toHaveLength(0);
        w.stop();
      });
    }

    it('T08 AC13: after a boot ends a new Restart boots again', async () => {
      render(<Desktop />);
      await request('terminal');
      tick(15);
      expect(dialog()).toBeNull();
      await request('terminal');
      expect(dialog()).not.toBeNull();
      tick(15);
      expect(dialog()).toBeNull();
    });

    it('T08 AC15: a resize mid-boot still ends on tick 15 and the layout uses the latest viewport', async () => {
      const { innerWidth: w0, innerHeight: h0 } = window;
      try {
        window.innerWidth = 1600;
        window.innerHeight = 900;
        const expected = freshLayout();
        window.innerWidth = w0;
        window.innerHeight = h0;
        render(<Desktop />);
        await request('terminal');
        tick(3);
        window.innerWidth = 1600;
        window.innerHeight = 900;
        act(() => {
          window.dispatchEvent(new Event('resize'));
        });
        tick(11);
        expect(dialog()).not.toBeNull();
        tick(1);
        expect(dialog()).toBeNull();
        expect(layout()).toEqual(expected);
      } finally {
        window.innerWidth = w0;
        window.innerHeight = h0;
      }
    });
  });

  describe('what Restart resets and keeps on the boot path', () => {
    for (const via of ['menu', 'terminal'] as const) {
      it(`T08 AC15 AC16: Restart from the ${via} gives a fresh layout and initial window state once the boot ends`, async () => {
        const expected = freshLayout();
        render(<Desktop />);
        fireEvent.click(winEl('about')!);
        fireEvent.click(verbBtn());
        fireEvent.click(tabs()[1]);
        act(() => typeCommand('whoami'));
        fireEvent.click(screen.getByRole('button', { name: 'Close projects' }));
        fireEvent.click(screen.getByRole('button', { name: 'Minimize hello.txt' }));
        await request(via);
        tick(15);
        expect(layout()).toEqual(expected);
        expect(winEl('site')).toBeNull();
        expectInitialWindowState();
      });
    }

    it('T08 AC17: theme, wallpaper and wobble survive a real boot, and nothing is written', async () => {
      const { container } = render(<Desktop />);
      act(() => typeCommand('theme light'));
      act(() => typeCommand('wallpaper plain'));
      const set = vi.spyOn(Storage.prototype, 'setItem');
      const remove = vi.spyOn(Storage.prototype, 'removeItem');
      await request('menu');
      expect(html.dataset.theme).toBe('light');
      tick(15);
      expect(html.dataset.theme).toBe('light');
      expect(rootOf(container).style.background).toContain('--wall-plain');
      expect(set).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
    });

    it('T08 AC17: wobble on keeps tilting after a real boot', async () => {
      render(<Desktop />);
      await request('terminal');
      tick(15);
      // Let the windows settle out of their open pose (T5 owns that animation, not this test).
      tick(10);
      dragStart('hello');
      expect(rotation('hello')).not.toBe(0);
    });

    it('T08 AC17: wobble off stays off after a real boot (the drag does not tilt)', async () => {
      localStorage.setItem('tanzi-os:wobble', 'false');
      render(<Desktop />);
      dragStart('hello');
      expect(rotation('hello')).toBe(0);
      fireEvent.pointerUp(winEl('hello')!.querySelector('.win-titlebar')!, { pointerId: 1 });
      await request('menu');
      tick(15);
      tick(10);
      dragStart('hello');
      expect(rotation('hello')).toBe(0);
    });

    it('T08 AC19: a drag released during the boot or after it cannot change the post-Restart layout', async () => {
      const expected = freshLayout();
      render(<Desktop />);
      const oldBar = dragStart('about');
      await request('terminal');
      tick(5);
      fireEvent.pointerUp(oldBar, { pointerId: 1, clientX: 400, clientY: 200 });
      tick(10);
      expect(layout()).toEqual(expected);
      fireEvent.pointerUp(oldBar, { pointerId: 1, clientX: 420, clientY: 220 });
      fireEvent.pointerMove(oldBar, { pointerId: 1, clientX: 460, clientY: 260 });
      fireEvent.pointerUp(document.body, { pointerId: 1 });
      expect(layout()).toEqual(expected);
    });
  });

  describe('the desktop behind the boot screen (AC21)', () => {
    for (const via of ['menu', 'terminal'] as const) {
      it(`T08 AC21: during a boot from the ${via} the root is inert, the dialog is outside it and no menu is open`, async () => {
        const { container } = render(<Desktop />);
        await request(via);
        const root = rootOf(container);
        expect(isInert(root)).toBe(true);
        expect(dialog()).not.toBeNull();
        expect(root.contains(dialog())).toBe(false);
        expect(root.contains(document.activeElement)).toBe(false);
        expect(screen.queryByRole('menu', { hidden: true })).toBeNull();
        expect(container.querySelector('header')).toBe(root.querySelector('header'));
        tick(14);
        expect(isInert(root)).toBe(true);
        tick(1);
        expect(isInert(root)).toBe(false);
        expect(container.querySelector('[inert]')).toBeNull();
      });
    }

    it('T08 AC21: windows minimized before Restart are not inert afterwards', async () => {
      const { container } = render(<Desktop />);
      fireEvent.click(screen.getByRole('button', { name: 'Minimize about.md' }));
      expect(winEl('about')).toHaveAttribute('inert');
      await request('terminal');
      tick(15);
      expect(container.querySelector('[inert]')).toBeNull();
    });
  });
  describe('no fly-in after Restart (T5, AC18)', () => {
    const FLY = /scale\(0\.06\)/;
    const allWins = () => Array.from(document.querySelectorAll<HTMLElement>('[data-win]'));
    const frame = () =>
      act(() => {
        vi.advanceTimersByTime(40);
      });
    const expectInPlace = () => {
      expect(allWins().length).toBeGreaterThan(0);
      for (const w of allWins()) {
        expect(w.style.transform, w.dataset.win).toBe('none');
        expect(w.style.opacity, w.dataset.win).toBe('1');
      }
    };

    it('T08 AC18: first load behaves as before: in place at mount, and a reopened window flies in after a frame', () => {
      render(<Desktop />);
      expectInPlace();
      tick(3);
      expectInPlace();
      fireEvent.click(screen.getByRole('button', { name: 'Close about.md' }));
      tick(3);
      fireEvent.click(screen.getByRole('button', { name: 'about.md' }));
      expect(winEl('about')!.style.transform).toMatch(FLY);
    });

    for (const via of ['menu', 'terminal'] as const) {
      it(`T08 AC18: in the commit that removes the dialog after a ${via} Restart every window is in place`, async () => {
        render(<Desktop />);
        tick(3);
        await request(via);
        tick(14);
        expect(dialog()).not.toBeNull();
        tick(1);
        expect(dialog()).toBeNull();
        expectInPlace();
        tick(3);
        expectInPlace();
      });
    }

    it('T08 AC18: a window closed before Restart is also in place in the first commit after the boot', async () => {
      render(<Desktop />);
      tick(3);
      fireEvent.click(screen.getByRole('button', { name: 'Close hello.txt' }));
      tick(3);
      await request('menu');
      tick(15);
      expect(dialog()).toBeNull();
      expect(winEl('hello')).not.toBeNull();
      expectInPlace();
    });

    it('T08 AC18: after a frame, closing and reopening a window flies it in again, in its first commit', async () => {
      render(<Desktop />);
      tick(3);
      await request('terminal');
      tick(15);
      expectInPlace();
      frame();
      fireEvent.click(screen.getByRole('button', { name: 'Close about.md' }));
      tick(3);
      fireEvent.click(screen.getByRole('button', { name: 'about.md' }));
      const w = winEl('about')!;
      expect(w.style.transform).toMatch(FLY);
      expect(w.style.opacity).toBe('0');
      tick(3);
      expect(winEl('about')!.style.transform).toBe('none');
      expect(winEl('about')!.style.opacity).toBe('1');
    });

    it('T08 AC18: a second Restart is also in place, and a window opened after it still flies in', async () => {
      render(<Desktop />);
      tick(3);
      await request('menu');
      tick(15);
      frame();
      await request('terminal');
      tick(15);
      expectInPlace();
      frame();
      fireEvent.click(screen.getByRole('button', { name: 'Close experience.log' }));
      tick(3);
      fireEvent.click(screen.getByRole('button', { name: 'experience.log' }));
      expect(winEl('exp')!.style.transform).toMatch(FLY);
    });

    for (const via of ['menu', 'terminal'] as const) {
      it(`T08 AC18: under reduced motion every open window is in place right after a ${via} Restart`, async () => {
        stubMotion(true);
        render(<Desktop />);
        tick(3);
        await request(via);
        expect(dialog()).toBeNull();
        expectInPlace();
      });
    }
  });
});

// ---------------------------------------------------------------------------------------------
// T6: focus after Restart (AC25).
// ---------------------------------------------------------------------------------------------

describe('T08 focus after Restart (T6)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  for (const reduce of [true, false]) {
    for (const via of ['menu', 'terminal'] as const) {
      const path = reduce ? 'reduced motion' : 'boot';
      it(`T08 AC25: after a Restart from the ${via} on the ${path} path focus is on the tanzi.os trigger, not body`, async () => {
        stubMotion(reduce);
        if (!reduce) {
          vi.useFakeTimers();
          vi.spyOn(Math, 'random').mockReturnValue(0);
        }
        const expected = freshLayout();
        render(<Desktop />);
        if (via === 'terminal') act(() => input().focus());
        if (reduce) {
          const user = userEvent.setup();
          await restart(via, user);
        } else {
          await request(via);
          tick(15);
          expect(dialog()).toBeNull();
        }
        expect(document.activeElement).not.toBe(document.body);
        expect(document.activeElement).toBe(trigger('tanzi.os'));
        // The focus move raises no window: z-order is the default layout.
        expect(layout()).toEqual(expected);
      });
    }
  }

  it('T08 AC25: z-order stays default after a Restart that follows a raise', async () => {
    stubMotion(true);
    const expected = freshLayout();
    const user = userEvent.setup();
    render(<Desktop />);
    await user.click(winEl('about')!);
    await restartFromMenu(user);
    expect(layout().map((l) => l.z)).toEqual(expected.map((l) => l.z));
  });

  it('T08 AC25: the tanzi.os trigger is the tab stop after Restart even if another trigger was roving', async () => {
    stubMotion(true);
    const user = userEvent.setup();
    render(<Desktop />);
    await user.click(trigger('tanzi.os'));
    await user.keyboard('{Escape}{ArrowRight}');
    expect(trigger('Windows').tabIndex).toBe(0);
    await user.keyboard('{Enter}');
    const restartItem = Array.from(
      document.querySelectorAll<HTMLElement>('[role^="menuitem"]'),
    ).find((e) => e.textContent === 'Restart…');
    expect(restartItem).toBeUndefined();
    await user.keyboard('{Escape}');
    await restartFromMenu(user);
    expect(trigger('tanzi.os').tabIndex).toBe(0);
    expect(['Windows', 'View', 'Help'].map((n) => trigger(n).tabIndex)).toEqual([-1, -1, -1]);
    expect(document.activeElement).toBe(trigger('tanzi.os'));
  });

  it('T08 AC25: a fresh load does not move focus on mount', () => {
    stubMotion(true);
    render(<Desktop />);
    expect(document.activeElement).toBe(document.body);
  });
});

// ---------------------------------------------------------------------------------------------
// T7: the live region (AC26, AC28).
// ---------------------------------------------------------------------------------------------

describe('T08 live region (T7)', () => {
  const region = () => document.querySelector<HTMLElement>('[role="status"]')!;
  const ms = (n: number) =>
    act(() => {
      vi.advanceTimersByTime(n);
    });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  /** Restart on the chosen path and run it to the reset commit. */
  const doReset = async (path: 'boot' | 'reduced', via: Via) => {
    await request(via);
    if (path === 'boot') tick(15);
  };
  const setPath = (path: 'boot' | 'reduced') => stubMotion(path === 'reduced');

  it('T08 AC26: on first load the region exists and is empty', () => {
    render(<Desktop />);
    expect(region()).not.toBeNull();
    expect(region().textContent).toBe('');
    ms(1000);
    expect(region().textContent).toBe('');
  });

  it('T08 AC26: the region is a polite atomic status, a sibling after the root', () => {
    const { container } = render(<Desktop />);
    const r = region();
    expect(r).toHaveAttribute('role', 'status');
    expect(r).toHaveAttribute('aria-live', 'polite');
    expect(r).toHaveAttribute('aria-atomic', 'true');
    const root = rootOf(container);
    expect(root.contains(r)).toBe(false);
    expect(root).not.toBe(r);
    expect(root.nextElementSibling).toBe(r);
    expect(container.firstElementChild).toBe(root);
    expect(root.hasAttribute('role')).toBe(false);
  });

  for (const path of ['boot', 'reduced'] as const) {
    for (const via of ['menu', 'terminal'] as const) {
      it(`T08 AC26 AC28: ${path} path from the ${via}: empty until 100ms after the reset, then BOOT_COPY.done`, async () => {
        setPath(path);
        render(<Desktop />);
        await doReset(path, via);
        expect(dialog()).toBeNull();
        expect(region().textContent).toBe('');
        ms(99);
        expect(region().textContent).toBe('');
        ms(1);
        expect(region().textContent).toBe(BOOT_COPY.done);
        expect(BOOT_COPY.done).not.toBe('');
        ms(2000);
        expect(region().textContent).toBe(BOOT_COPY.done);
      });
    }

    it(`T08 AC26: ${path} path: a second reset empties the region at once and refills it 100ms later`, async () => {
      setPath(path);
      render(<Desktop />);
      await doReset(path, 'terminal');
      ms(100);
      expect(region().textContent).toBe(BOOT_COPY.done);
      await doReset(path, 'menu');
      expect(region().textContent).toBe('');
      ms(99);
      expect(region().textContent).toBe('');
      ms(1);
      expect(region().textContent).toBe(BOOT_COPY.done);
    });
  }

  it('T08 AC26: reduced path: a second reset inside the window cancels the first timer', async () => {
    setPath('reduced');
    render(<Desktop />);
    await doReset('reduced', 'terminal');
    ms(60);
    await doReset('reduced', 'menu');
    ms(40); // first timer's deadline passes
    expect(region().textContent).toBe('');
    ms(59);
    expect(region().textContent).toBe('');
    ms(1);
    expect(region().textContent).toBe(BOOT_COPY.done);
  });

  it('T08 AC26: during a boot the region is not inert and is empty', async () => {
    setPath('boot');
    const { container } = render(<Desktop />);
    await request('terminal');
    expect(dialog()).not.toBeNull();
    expect(isInert(rootOf(container))).toBe(true);
    expect(region().closest('[inert]')).toBeNull();
    expect(region().textContent).toBe('');
    tick(14);
    expect(region().textContent).toBe('');
    expect(region().closest('[inert]')).toBeNull();
  });

  it('T08 AC26: after the reset commit of a second boot the region is empty', async () => {
    setPath('boot');
    render(<Desktop />);
    await request('terminal');
    tick(15);
    ms(100);
    expect(region().textContent).toBe(BOOT_COPY.done);
    await request('terminal');
    // Mid-boot the old message may still be there until the reset commit; once reset it is empty.
    tick(15);
    expect(region().textContent).toBe('');
  });

  for (const path of ['boot', 'reduced'] as const) {
    it(`T08 AC26: unmounting before 100ms on the ${path} path leaves no timer effect and no warning`, async () => {
      setPath(path);
      const err = vi.spyOn(console, 'error').mockImplementation(() => {});
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { unmount } = render(<Desktop />);
      await doReset(path, 'terminal');
      ms(50);
      unmount();
      expect(() => ms(500)).not.toThrow();
      expect(document.querySelector('[role="status"]')).toBeNull();
      expect(err).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    });
  }

  for (const path of ['boot', 'reduced'] as const) {
    it(`T08 AC26: under StrictMode the ${path} path gives exactly one announcement`, async () => {
      setPath(path);
      render(
        <StrictMode>
          <Desktop />
        </StrictMode>,
      );
      expect(region().textContent).toBe('');
      const seen: string[] = [];
      const mo = new MutationObserver(() => {});
      mo.observe(region(), { childList: true, characterData: true, subtree: true });
      await doReset(path, 'menu');
      ms(99);
      expect(region().textContent).toBe('');
      ms(1);
      ms(1000);
      for (const r of mo.takeRecords()) {
        for (const n of Array.from(r.addedNodes)) seen.push(n.textContent ?? '');
      }
      mo.disconnect();
      expect(seen.filter((t) => t === BOOT_COPY.done)).toHaveLength(1);
      expect(region().textContent).toBe(BOOT_COPY.done);
      expect(region().children).toHaveLength(0);
    });
  }
});
