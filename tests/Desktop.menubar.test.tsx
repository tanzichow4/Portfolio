import { StrictMode } from 'react';
import {
  act,
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Desktop from '../src/Desktop';
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

const root = (c: HTMLElement) => c.firstElementChild as HTMLElement;
const trigger = (name: string) => screen.getByRole('menuitem', { name });
const winEl = (id: string) => document.querySelector<HTMLElement>(`[data-win="${id}"]`)!;
const bg = (c: HTMLElement) => root(c).style.background || root(c).style.backgroundImage;

async function choose(user: ReturnType<typeof userEvent.setup>, menu: string, item: string) {
  await user.click(trigger(menu));
  const m = screen.getByRole('menu');
  const target = Array.from(m.querySelectorAll<HTMLElement>('[role^="menuitem"]')).find(
    (e) => e.textContent === item,
  );
  expect(target, item).toBeDefined();
  await user.click(target!);
}

const rotation = (id: string) => {
  const m = winEl(id).style.transform.match(/rotate\((-?[\d.]+)deg\)/);
  return m ? Number(m[1]) : 0;
};
const drag = (id: string) => {
  const bar = winEl(id).querySelector<HTMLElement>('.win-titlebar')!;
  fireEvent.pointerDown(bar, { pointerId: 1, button: 0, clientX: 300, clientY: 150 });
  const ev = createEvent.pointerMove(bar, { pointerId: 1, clientX: 340, clientY: 150 });
  Object.defineProperty(ev, 'movementX', { value: 40 });
  fireEvent(bar, ev);
  return bar;
};

describe('Desktop with the menubar', () => {
  it('AC1: the menubar renders before the window layer in DOM order', () => {
    const { container } = render(<Desktop />);
    const header = container.querySelector('header')!;
    const firstWin = container.querySelector('[data-win]')!;
    expect(header).not.toBeNull();
    expect(
      header.compareDocumentPosition(firstWin) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(root(container).firstElementChild).toBe(header);
  });

  it('AC12: the menubar triggers are reached before any window control', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await user.tab();
    expect(document.activeElement).toBe(trigger('tanzi.os'));
  });
});

describe('theme (AC23, AC24, AC44)', () => {
  it('AC23: the first theme equals <html data-theme> (light)', () => {
    html.dataset.theme = 'light';
    render(<Desktop />);
    expect(html.dataset.theme).toBe('light');
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument();
  });

  it('AC23: the first theme equals <html data-theme> (dark)', () => {
    html.dataset.theme = 'dark';
    render(<Desktop />);
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
  });

  it('AC23: a missing attribute and a throwing storage both give dark', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    render(<Desktop />);
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
  });

  it('AC23: React does not read the theme from storage (the inline script owns that)', () => {
    localStorage.setItem('tanzi-os:theme', 'light');
    html.dataset.theme = 'dark';
    render(<Desktop />);
    expect(html.dataset.theme).toBe('dark');
  });

  it('AC24: the toggle updates data-theme at once, flips its label and writes the key', async () => {
    const user = userEvent.setup();
    html.dataset.theme = 'dark';
    render(<Desktop />);
    await user.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(html.dataset.theme).toBe('light');
    expect(localStorage.getItem('tanzi-os:theme')).toBe('light');
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(html.dataset.theme).toBe('dark');
    expect(localStorage.getItem('tanzi-os:theme')).toBe('dark');
  });

  it('AC24: the View menu changes data-theme, the toggle label and storage', async () => {
    const user = userEvent.setup();
    html.dataset.theme = 'dark';
    render(<Desktop />);
    await choose(user, 'View', 'Light mode');
    expect(html.dataset.theme).toBe('light');
    expect(localStorage.getItem('tanzi-os:theme')).toBe('light');
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument();
    await choose(user, 'View', 'Dark mode');
    expect(html.dataset.theme).toBe('dark');
    expect(localStorage.getItem('tanzi-os:theme')).toBe('dark');
  });

  it('AC44: nothing is written to storage at mount, also under StrictMode', () => {
    const set = vi.spyOn(Storage.prototype, 'setItem');
    render(
      <StrictMode>
        <Desktop />
      </StrictMode>,
    );
    expect(set).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
  });

  it('AC44/AC22: choosing the current theme or wallpaper writes nothing', async () => {
    const user = userEvent.setup();
    html.dataset.theme = 'dark';
    render(<Desktop />);
    const set = vi.spyOn(Storage.prototype, 'setItem');
    await choose(user, 'View', 'Dark mode');
    await choose(user, 'View', 'Wallpaper: Nebula');
    expect(set).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
  });

  it('AC27: only prefixed keys are ever written', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await choose(user, 'View', 'Light mode');
    await choose(user, 'View', 'Wallpaper: Grid');
    await choose(user, 'View', 'Wobbly windows');
    await user.click(screen.getByRole('button', { name: 'Close hello.txt' }));
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!);
    expect(keys.sort()).toEqual(['tanzi-os:theme', 'tanzi-os:wallpaper', 'tanzi-os:wobble']);
  });
});

describe('wallpaper (AC25)', () => {
  it('AC25: the default is nebula', () => {
    const { container } = render(<Desktop />);
    expect(bg(container)).toContain('--wall-nebula');
  });

  it('AC25: choosing Grid sets --wall-grid on the root and writes the key', async () => {
    const user = userEvent.setup();
    const { container } = render(<Desktop />);
    await choose(user, 'View', 'Wallpaper: Grid');
    expect(bg(container)).toContain('--wall-grid');
    expect(localStorage.getItem('tanzi-os:wallpaper')).toBe('grid');
    await choose(user, 'View', 'Wallpaper: Plain');
    expect(bg(container)).toContain('--wall-plain');
    expect(localStorage.getItem('tanzi-os:wallpaper')).toBe('plain');
  });

  it('AC25: a stored grid is used on load', () => {
    localStorage.setItem('tanzi-os:wallpaper', 'grid');
    const { container } = render(<Desktop />);
    expect(bg(container)).toContain('--wall-grid');
  });

  it('AC25: a stored invalid wallpaper gives nebula', () => {
    localStorage.setItem('tanzi-os:wallpaper', 'purple');
    const { container } = render(<Desktop />);
    expect(bg(container)).toContain('--wall-nebula');
  });

  it('AC25/AC27: a throwing getItem gives nebula and the app still renders', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const { container } = render(<Desktop />);
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, only hello is open at start, so open the other windows from the dock first.
    openAllFromDock();
    expect(bg(container)).toContain('--wall-nebula');
    expect(document.querySelectorAll('[data-win]')).toHaveLength(5);
  });
});

describe('wobble (AC26, AC34)', () => {
  it('AC26: with wobble on (the default) a drag tilts the window', () => {
    render(<Desktop />);
    drag('hello');
    expect(rotation('hello')).not.toBe(0);
  });

  it('AC26: turning Wobbly windows off in the menu stops the tilt and writes "false"', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await choose(user, 'View', 'Wobbly windows');
    expect(localStorage.getItem('tanzi-os:wobble')).toBe('false');
    drag('hello');
    expect(rotation('hello')).toBe(0);
  });

  it('AC26: a stored "false" loads with wobble off', () => {
    localStorage.setItem('tanzi-os:wobble', 'false');
    render(<Desktop />);
    drag('hello');
    expect(rotation('hello')).toBe(0);
  });

  it('AC26: a stored junk value loads with wobble on', () => {
    localStorage.setItem('tanzi-os:wobble', 'nope');
    render(<Desktop />);
    drag('hello');
    expect(rotation('hello')).not.toBe(0);
  });

  it('AC26: turning it back on restores the tilt and writes "true"', async () => {
    const user = userEvent.setup();
    localStorage.setItem('tanzi-os:wobble', 'false');
    render(<Desktop />);
    await choose(user, 'View', 'Wobbly windows');
    expect(localStorage.getItem('tanzi-os:wobble')).toBe('true');
    drag('hello');
    expect(rotation('hello')).not.toBe(0);
  });

  it('AC34: under reduced motion Wobbly still toggles and persists but never tilts', async () => {
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
    try {
      const user = userEvent.setup();
      render(<Desktop />);
      await choose(user, 'View', 'Wobbly windows');
      expect(localStorage.getItem('tanzi-os:wobble')).toBe('false');
      await choose(user, 'View', 'Wobbly windows');
      expect(localStorage.getItem('tanzi-os:wobble')).toBe('true');
      drag('hello');
      expect(rotation('hello')).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('Restart and Tidy keep the settings (AC29)', () => {
  const stored = () => {
    localStorage.setItem('tanzi-os:wallpaper', 'grid');
    localStorage.setItem('tanzi-os:wobble', 'false');
    html.dataset.theme = 'light';
  };

  for (const [menu, item] of [
    ['tanzi.os', 'Restart…'],
    ['Windows', 'Tidy up'],
  ] as const) {
    it(`AC29: ${item} keeps light, grid and wobble off, resets the windows and writes nothing`, async () => {
      const user = userEvent.setup();
      stored();
      const { container } = render(<Desktop />);
      await user.click(screen.getByRole('button', { name: 'Close hello.txt' }));
      expect(document.querySelector('[data-win="hello"]')).toBeNull();
      const set = vi.spyOn(Storage.prototype, 'setItem');
      await choose(user, menu, item);
      // DELIBERATE REQUIREMENT CHANGE (T08 AC32): Restart now applies when the boot ends. Wait on the real boot path: a reduced-motion stub would make the wobble-off rotation check below vacuous.
      if (item === 'Restart…')
        await waitFor(() => expect(winEl('hello')).not.toBeNull(), { timeout: 3000 });
      expect(winEl('hello')).not.toBeNull();
      expect(html.dataset.theme).toBe('light');
      expect(bg(container)).toContain('--wall-grid');
      expect(set).not.toHaveBeenCalled();
      expect(localStorage.getItem('tanzi-os:wallpaper')).toBe('grid');
      expect(localStorage.getItem('tanzi-os:wobble')).toBe('false');
      drag('hello');
      expect(rotation('hello')).toBe(0);
      await user.click(trigger('View'));
      expect(
        within(screen.getByRole('menu')).getByRole('menuitemradio', { name: 'Light mode' }),
      ).toHaveAttribute('aria-checked', 'true');
    });
  }
});

describe('storage failure (AC27)', () => {
  it('AC27: a throwing setItem still changes the session and nothing throws', async () => {
    const user = userEvent.setup();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const { container } = render(<Desktop />);
    await choose(user, 'View', 'Light mode');
    await choose(user, 'View', 'Wallpaper: Plain');
    await choose(user, 'View', 'Wobbly windows');
    expect(html.dataset.theme).toBe('light');
    expect(bg(container)).toContain('--wall-plain');
    drag('hello');
    expect(rotation('hello')).toBe(0);
    expect(err).not.toHaveBeenCalled();
  });
});

describe('minimized windows stay unreachable (AC36)', () => {
  it('AC36: Minimize all leaves every window button inert and out of the accessibility tree', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, only hello is open at start, so open the other windows from the dock first.
    openAllFromDock();
    await choose(user, 'Windows', 'Minimize all');
    const buttons = Array.from(document.querySelectorAll<HTMLElement>('[data-win] button'));
    // DELIBERATE REQUIREMENT CHANGE (T07 AC52): the hello body adds two native buttons, 10 -> 12;
    // the experience body adds three native tab buttons, 12 -> 15.
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): hello gains two buttons, 15 -> 17.
    // DELIBERATE REQUIREMENT CHANGE (T16 AC5): about gains the "See some data viz" button, 17 -> 18.
    expect(buttons).toHaveLength(18);
    for (const b of buttons) expect(b.closest('[inert]')).not.toBeNull();
    for (const w of document.querySelectorAll<HTMLElement>('[data-win]')) {
      expect(w).toHaveAttribute('aria-hidden', 'true');
      expect(within(w).queryAllByRole('button')).toHaveLength(0);
    }
    // DELIBERATE REQUIREMENT CHANGE (T06 AC30): the theme toggle and the five dock buttons are
    // left among page buttons.
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Switch to light mode',
      'hello.txt',
      'about.md',
      'experience.log',
      'projects',
      'terminal',
      // DELIBERATE REQUIREMENT CHANGE (T16 AC18): the dock gains a dataviz button after terminal.
      'dataviz',
    ]);
  });

  it('AC36: the Windows menu can bring a minimized window back', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, only hello is open at start, so open the other windows from the dock first.
    openAllFromDock();
    await choose(user, 'Windows', 'Minimize all');
    await choose(user, 'Windows', 'terminal');
    expect(winEl('term')).toHaveAttribute('data-min', 'false');
    expect(winEl('term')).not.toHaveAttribute('inert');
    expect(winEl('hello')).toHaveAttribute('data-min', 'true');
  });
});

describe('Desktop console hygiene', () => {
  it('AC41: mounting and using the menus under StrictMode logs no error or warning', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const user = userEvent.setup();
    const { unmount } = render(
      <StrictMode>
        <Desktop />
      </StrictMode>,
    );
    await choose(user, 'View', 'Light mode');
    await choose(user, 'Windows', 'Tidy up');
    await act(async () => {
      unmount();
    });
    expect(err).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
