import { StrictMode } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Desktop from '../src/Desktop';
import { VERBS } from '../src/data';

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
