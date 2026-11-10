import { StrictMode, useLayoutEffect, useReducer, type ReactNode } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MenuBar from '../src/MenuBar';
import WindowLayer from '../src/WindowLayer';
import { appReducer, initialApp, type App } from '../src/logic/system';
import type { Settings } from '../src/logic/settings';
import { EMAIL, LINKS, RESUME_URL } from '../src/data';
import css from '../src/MenuBar.css?raw';

const dflt: Settings = { theme: 'dark', wall: 'nebula', wobble: true };
const latest: { app: App } = { app: initialApp(1280, 720, dflt) };

function Harness({
  settings = dflt,
  extra,
  onTerminalHelp,
}: {
  settings?: Settings;
  extra?: ReactNode;
  onTerminalHelp?: () => void;
}) {
  const [app, dispatch] = useReducer(appReducer, undefined, () => initialApp(1280, 720, settings));
  useLayoutEffect(() => {
    latest.app = app;
  });
  return (
    <div>
      <MenuBar
        wins={app.desk.wins}
        settings={app.settings}
        dispatch={dispatch}
        onTerminalHelp={onTerminalHelp}
      />
      <WindowLayer
        state={app.desk}
        dispatch={dispatch}
        flyIn={false}
        wobble={app.settings.wobble}
      />
      {extra}
    </div>
  );
}

const setup = (settings?: Settings, extra?: ReactNode) => {
  const user = userEvent.setup();
  const utils = render(<Harness settings={settings} extra={extra} />);
  return { user, ...utils };
};

const anyItems = (scope: HTMLElement) =>
  Array.from(scope.querySelectorAll<HTMLElement>('[role^="menuitem"]'));
const focusEl = (el: HTMLElement) => act(() => el.focus());
const checkedTexts = () =>
  anyItems(screen.getByRole('menu'))
    .filter((e) => e.getAttribute('aria-checked') === 'true')
    .map((e) => e.textContent);

const TRIGGERS = ['tanzi.os', 'Windows', 'View', 'Help'] as const;
const trigger = (name: string) => screen.getByRole('menuitem', { name });
const menu = () => screen.queryByRole('menu');
const winEl = (id: string) => document.querySelector<HTMLElement>(`[data-win="${id}"]`);
const itemNames = () => anyItems(screen.getByRole('menu')).map((e) => e.textContent);

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('structure, names and links (AC2-AC5, AC10, AC11)', () => {
  it('AC2: a labelled header landmark wraps a labelled menubar', () => {
    const { container } = setup();
    const header = container.querySelector('header')!;
    expect(header).toHaveAttribute('aria-label', 'System menu bar');
    const bar = within(header).getByRole('menubar', { name: 'Menus' });
    expect(header).toContainElement(bar);
  });

  it('AC2: the four triggers are in order tanzi.os, Windows, View, Help', () => {
    setup();
    const bar = screen.getByRole('menubar');
    expect(
      within(bar)
        .getAllByRole('menuitem')
        .map((e) => e.textContent),
    ).toEqual([...TRIGGERS]);
  });

  it('AC2: the tanzi.os trigger has a decorative hidden icon and the exact name "tanzi.os"', () => {
    setup();
    const t = trigger('tanzi.os');
    const svg = t.querySelector('svg')!;
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(t.textContent).toBe('tanzi.os');
    for (const name of ['Windows', 'View', 'Help'])
      expect(trigger(name).querySelector('svg')).toBeNull();
  });

  it('AC10: every trigger is a menuitem with aria-haspopup="menu" and aria-expanded=false when closed', () => {
    setup();
    for (const name of TRIGGERS) {
      expect(trigger(name)).toHaveAttribute('aria-haspopup', 'menu');
      expect(trigger(name)).toHaveAttribute('aria-expanded', 'false');
      expect(trigger(name).tagName).toBe('BUTTON');
    }
  });

  it('AC3: the right side has GitHub, LinkedIn and Email links from data.ts, then the toggle, then the clock', () => {
    const { container } = setup();
    const right = container.querySelector('.mb-right')!;
    const kids = Array.from(right.children);
    expect(kids.map((k) => k.tagName)).toEqual(['A', 'A', 'A', 'BUTTON', 'TIME']);
    LINKS.forEach((l, i) => {
      expect(kids[i]).toHaveAttribute('href', l.href);
      expect(kids[i]).toHaveAccessibleName(l.label);
      expect(kids[i].querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    });
    expect(LINKS.map((l) => l.label)).toEqual(['GitHub', 'LinkedIn', 'Email']);
  });

  it('AC4: GitHub and LinkedIn open in a new tab with noopener noreferrer', () => {
    setup();
    for (const name of ['GitHub', 'LinkedIn']) {
      const a = screen.getByRole('link', { name });
      expect(a).toHaveAttribute('target', '_blank');
      const rel = (a.getAttribute('rel') ?? '').split(/\s+/);
      expect(rel).toContain('noopener');
      expect(rel).toContain('noreferrer');
    }
  });

  it('AC4: Email is a plain mailto: link with no target', () => {
    setup();
    const a = screen.getByRole('link', { name: 'Email' });
    expect(a).toHaveAttribute('href', `mailto:${EMAIL}`);
    expect(a).not.toHaveAttribute('target');
  });

  it('AC3: the toggle is named for the action in dark and in light', async () => {
    const { user } = setup();
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Switch to light mode' })).toBeNull();
  });

  it('AC3: the toggle icon flips with the theme', async () => {
    const { user } = setup();
    const before = screen.getByRole('button', { name: 'Switch to light mode' }).innerHTML;
    await user.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    const after = screen.getByRole('button', { name: 'Switch to dark mode' }).innerHTML;
    expect(after).not.toBe(before);
  });

  it('AC24: the toggle updates the settings state', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(latest.app.settings.theme).toBe('light');
    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(latest.app.settings.theme).toBe('dark');
  });

  it('AC32: the clock shows text in the menubar format and is not focusable', () => {
    const { container } = setup();
    const t = container.querySelector('time')!;
    expect(t.textContent).toMatch(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) (1[0-2]|[1-9]):[0-5]\d (AM|PM)$/);
    expect(t.tabIndex).toBe(-1);
  });
});

describe('opening, switching and closing (AC6-AC8, AC10)', () => {
  it('AC6: clicking a trigger opens its menu and sets aria-expanded', async () => {
    const { user } = setup();
    await user.click(trigger('Windows'));
    expect(trigger('Windows')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: 'Windows' })).toBeInTheDocument();
  });

  it('AC10: the open dropdown is role=menu and labelled by its trigger', async () => {
    const { user } = setup();
    await user.click(trigger('View'));
    const m = screen.getByRole('menu');
    expect(m).toHaveAttribute('aria-labelledby', trigger('View').id);
    expect(m).toHaveAccessibleName('View');
  });

  it('AC6: clicking the open trigger again closes it', async () => {
    const { user } = setup();
    await user.click(trigger('Help'));
    await user.click(trigger('Help'));
    expect(menu()).toBeNull();
    expect(trigger('Help')).toHaveAttribute('aria-expanded', 'false');
  });

  it('AC6: clicking another trigger switches menus, never two at once', async () => {
    const { user } = setup();
    await user.click(trigger('Windows'));
    // fireEvent: no pointer move, so hover-switching does not run first.
    fireEvent.click(trigger('View'));
    expect(screen.getAllByRole('menu')).toHaveLength(1);
    expect(screen.getByRole('menu', { name: 'View' })).toBeInTheDocument();
    expect(trigger('Windows')).toHaveAttribute('aria-expanded', 'false');
    expect(trigger('View')).toHaveAttribute('aria-expanded', 'true');
  });

  it('AC7: hovering a trigger does nothing while no menu is open', () => {
    setup();
    fireEvent.pointerEnter(trigger('View'), { pointerId: 1 });
    expect(menu()).toBeNull();
  });

  it('AC7: while a menu is open, hovering another trigger switches to it', async () => {
    const { user } = setup();
    await user.click(trigger('tanzi.os'));
    fireEvent.pointerEnter(trigger('Help'), { pointerId: 1 });
    expect(screen.getByRole('menu', { name: 'Help' })).toBeInTheDocument();
    expect(screen.getAllByRole('menu')).toHaveLength(1);
    fireEvent.pointerEnter(trigger('Windows'), { pointerId: 1 });
    expect(screen.getByRole('menu', { name: 'Windows' })).toBeInTheDocument();
  });

  it('AC7: hover does not open a menu after the menu was closed again', async () => {
    const { user } = setup();
    await user.click(trigger('View'));
    await user.click(trigger('View'));
    fireEvent.pointerEnter(trigger('Help'), { pointerId: 1 });
    expect(menu()).toBeNull();
  });

  it('AC8: a pointer-down on the empty desktop closes the menu', async () => {
    const { user } = setup();
    await user.click(trigger('Windows'));
    fireEvent.pointerDown(document.body, { pointerId: 1, button: 0 });
    expect(menu()).toBeNull();
    expect(trigger('Windows')).toHaveAttribute('aria-expanded', 'false');
  });

  it('AC8: a pointer-down on a window closes the menu and still raises that window', async () => {
    const { user } = setup();
    const z = (id: string) => Number(winEl(id)!.style.zIndex);
    const ids = ['hello', 'about', 'exp', 'proj', 'term'];
    const back = ids.reduce((a, b) => (z(a) <= z(b) ? a : b));
    expect(z(back)).toBeLessThan(Math.max(...ids.map(z)));
    await user.click(trigger('Windows'));
    fireEvent.pointerDown(winEl(back)!, { pointerId: 1, button: 0 });
    expect(menu()).toBeNull();
    expect(z(back)).toBe(Math.max(...ids.map(z)));
    for (const id of ids.filter((i) => i !== back)) expect(z(back)).toBeGreaterThan(z(id));
  });

  it('AC8: a pointer-down inside the menubar or the dropdown does not close the menu', async () => {
    const { user } = setup();
    await user.click(trigger('Windows'));
    fireEvent.pointerDown(screen.getByRole('menuitemcheckbox', { name: 'hello.txt' }), {
      pointerId: 1,
      button: 0,
    });
    expect(menu()).not.toBeNull();
    fireEvent.pointerDown(screen.getByRole('menubar'), { pointerId: 1, button: 0 });
    expect(menu()).not.toBeNull();
  });

  it('AC8: Escape closes the menu', async () => {
    const { user } = setup();
    await user.click(trigger('View'));
    await user.keyboard('{Escape}');
    expect(menu()).toBeNull();
  });

  it('AC8: choosing an item closes the menu', async () => {
    const { user } = setup();
    await user.click(trigger('Windows'));
    await user.click(screen.getByRole('menuitem', { name: 'Minimize all' }));
    expect(menu()).toBeNull();
  });
});

describe('roving tabindex and trigger keys (AC12, AC13)', () => {
  it('AC12: exactly one trigger is a tab stop (tabIndex 0), the rest are -1', () => {
    setup();
    expect(TRIGGERS.map((n) => trigger(n).tabIndex)).toEqual([0, -1, -1, -1]);
  });

  it('AC12: the first Tab lands on tanzi.os, before any window control', async () => {
    const { user } = setup();
    await user.tab();
    expect(document.activeElement).toBe(trigger('tanzi.os'));
  });

  it('AC12: the next Tab leaves the menubar triggers (GitHub), not Windows', async () => {
    const { user } = setup();
    await user.tab();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'GitHub' }));
  });

  it('AC12: before any window control the tab order is tanzi.os, GitHub, LinkedIn, Email, toggle, then a window', async () => {
    const { user } = setup();
    const names: string[] = [];
    for (let i = 0; i < 6; i++) {
      await user.tab();
      const el = document.activeElement as HTMLElement;
      names.push(el.getAttribute('aria-label') ?? el.textContent ?? '');
    }
    expect(names).toEqual([
      'tanzi.os',
      'GitHub',
      'LinkedIn',
      'Email',
      'Switch to light mode',
      'Minimize hello.txt',
    ]);
  });

  it('AC12: ArrowRight/ArrowLeft move between triggers and wrap, without opening a menu', async () => {
    const { user } = setup();
    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(trigger('Windows'));
    expect(trigger('Windows').tabIndex).toBe(0);
    expect(trigger('tanzi.os').tabIndex).toBe(-1);
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(document.activeElement).toBe(trigger('Help'));
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(trigger('tanzi.os'));
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(trigger('Help'));
    expect(menu()).toBeNull();
  });

  it('AC12: Home and End go to the first and last trigger', async () => {
    const { user } = setup();
    focusEl(trigger('View'));
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(trigger('tanzi.os'));
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(trigger('Help'));
  });

  it('AC13: Enter on a trigger opens the menu and focuses the first item', async () => {
    const { user } = setup();
    focusEl(trigger('Windows'));
    await user.keyboard('{Enter}');
    expect(menu()).not.toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole('menuitemcheckbox', { name: 'hello.txt' }),
    );
  });

  it('AC13: Space on a trigger opens the menu and focuses the first item', async () => {
    const { user } = setup();
    focusEl(trigger('tanzi.os'));
    await user.keyboard(' ');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'About this site' }));
  });

  it('AC13: ArrowDown opens the menu and focuses the first item', async () => {
    const { user } = setup();
    focusEl(trigger('View'));
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(screen.getByRole('menuitemradio', { name: 'Dark mode' }));
  });

  it('AC13: ArrowUp opens the menu and focuses the last item', async () => {
    const { user } = setup();
    focusEl(trigger('Help'));
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: /^Say hi/ }));
  });

  it('AC13: Enter does not open then immediately close (no double toggle)', async () => {
    const { user } = setup();
    focusEl(trigger('View'));
    await user.keyboard('{Enter}');
    expect(trigger('View')).toHaveAttribute('aria-expanded', 'true');
    expect(menu()).not.toBeNull();
  });
});

describe('inside an open menu (AC11, AC14, AC15)', () => {
  it('AC14: ArrowDown and ArrowUp move between items, skip separators and wrap', async () => {
    const { user } = setup();
    focusEl(trigger('tanzi.os'));
    await user.keyboard('{ArrowDown}'); // About this site
    await user.keyboard('{ArrowDown}'); // skips the divider
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Restart…' }));
    await user.keyboard('{ArrowDown}'); // wraps
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'About this site' }));
    await user.keyboard('{ArrowUp}'); // wraps back
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Restart…' }));
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'About this site' }));
  });

  it('AC14: ArrowDown never lands on a separator in the Windows and View menus', async () => {
    const { user } = setup();
    focusEl(trigger('View'));
    await user.keyboard('{ArrowDown}');
    const seen: string[] = [];
    for (let i = 0; i < 6; i++) {
      seen.push(document.activeElement!.textContent ?? '');
      expect(document.activeElement!.getAttribute('role')).not.toBe('separator');
      await user.keyboard('{ArrowDown}');
    }
    expect(seen).toEqual([
      'Dark mode',
      'Light mode',
      'Wallpaper: Nebula',
      'Wallpaper: Grid',
      'Wallpaper: Plain',
      'Wobbly windows',
    ]);
  });

  it('AC14: Home and End jump to the first and last item', async () => {
    const { user } = setup();
    focusEl(trigger('Windows'));
    await user.keyboard('{ArrowDown}{End}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Tidy up' }));
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(
      screen.getByRole('menuitemcheckbox', { name: 'hello.txt' }),
    );
  });

  it('AC14: Enter activates the focused item', async () => {
    const { user } = setup();
    focusEl(trigger('Windows'));
    await user.keyboard('{ArrowDown}{End}{Enter}'); // Tidy up
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger('Windows'));
  });

  it('AC14: Space activates the focused item', async () => {
    const { user } = setup();
    focusEl(trigger('View'));
    await user.keyboard('{ArrowDown}{ArrowDown} '); // Light mode
    expect(latest.app.settings.theme).toBe('light');
    expect(menu()).toBeNull();
  });

  it('AC14: ArrowRight opens the next menu with its first item focused', async () => {
    const { user } = setup();
    focusEl(trigger('tanzi.os'));
    await user.keyboard('{ArrowDown}{ArrowRight}');
    expect(screen.getByRole('menu', { name: 'Windows' })).toBeInTheDocument();
    expect(screen.getAllByRole('menu')).toHaveLength(1);
    expect(document.activeElement).toBe(
      screen.getByRole('menuitemcheckbox', { name: 'hello.txt' }),
    );
  });

  it('AC14: ArrowLeft opens the previous menu, wrapping from the first to Help', async () => {
    const { user } = setup();
    focusEl(trigger('tanzi.os'));
    await user.keyboard('{ArrowDown}{ArrowLeft}');
    expect(screen.getByRole('menu', { name: 'Help' })).toBeInTheDocument();
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Terminal commands' }),
    );
  });

  it('AC14: ArrowRight from the last menu wraps to the first', async () => {
    const { user } = setup();
    focusEl(trigger('Help'));
    await user.keyboard('{ArrowDown}{ArrowRight}');
    expect(screen.getByRole('menu', { name: 'tanzi.os' })).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'About this site' }));
  });

  it('AC12/AC14: with a menu open from a click, ArrowRight on the trigger switches menus', async () => {
    const { user } = setup();
    await user.click(trigger('tanzi.os'));
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('menu', { name: 'Windows' })).toBeInTheDocument();
    expect(document.activeElement).toBe(trigger('Windows'));
  });

  it('AC15: Escape from an item closes the menu and focuses its trigger', async () => {
    const { user } = setup();
    focusEl(trigger('View'));
    await user.keyboard('{ArrowDown}{ArrowDown}{Escape}');
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger('View'));
  });

  it('AC15: Escape after opening by pointer (focus on body) focuses the trigger', async () => {
    const { user } = setup();
    await user.click(trigger('Help'));
    (document.activeElement as HTMLElement).blur();
    await user.keyboard('{Escape}');
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger('Help'));
  });

  it('AC15: choosing an item by pointer returns focus to the trigger, not body', async () => {
    const { user } = setup();
    await user.click(trigger('Windows'));
    await user.click(screen.getByRole('menuitem', { name: 'Show all' }));
    expect(document.activeElement).toBe(trigger('Windows'));
    expect(document.activeElement).not.toBe(document.body);
  });

  it('AC15: choosing an item by keyboard returns focus to the trigger', async () => {
    const { user } = setup();
    focusEl(trigger('tanzi.os'));
    await user.keyboard('{ArrowDown}{Enter}'); // About this site
    expect(menu()).toBeNull();
    expect(document.activeElement).not.toBe(document.body);
    expect(
      document.activeElement === trigger('tanzi.os') ||
        winEl('site')!.contains(document.activeElement),
    ).toBe(true);
  });

  it('AC15: after every action item focus is never lost to body', async () => {
    const { user } = setup();
    const choose = async (menuName: string, itemName: string | RegExp) => {
      await user.click(trigger(menuName));
      const target = anyItems(screen.getByRole('menu')).find((e) => e.textContent === itemName);
      expect(target, String(itemName)).toBeDefined();
      await user.click(target!);
      expect(menu()).toBeNull();
      expect(document.activeElement).not.toBe(document.body);
    };
    await choose('Windows', 'Minimize all');
    await choose('Windows', 'Show all');
    await choose('Windows', 'terminal');
    await choose('Windows', 'Tidy up');
    await choose('View', 'Light mode');
    await choose('View', 'Wallpaper: Grid');
    await choose('View', 'Wobbly windows');
    await choose('tanzi.os', 'Restart…');
    await choose('Help', 'Terminal commands');
  });

  it('AC15: Tab from an item closes the menu', async () => {
    const { user } = setup();
    focusEl(trigger('Windows'));
    await user.keyboard('{ArrowDown}');
    await user.tab();
    expect(menu()).toBeNull();
    expect(document.activeElement).not.toBe(document.body);
  });

  it('AC15: Shift+Tab from an item closes the menu', async () => {
    const { user } = setup();
    focusEl(trigger('Windows'));
    await user.keyboard('{ArrowDown}');
    await user.tab({ shift: true });
    expect(menu()).toBeNull();
  });

  it('AC15: Tab from the trigger of a pointer-opened menu closes it', async () => {
    const { user } = setup();
    await user.click(trigger('View'));
    await user.tab();
    expect(menu()).toBeNull();
  });

  it('AC16: Escape with no menu open changes nothing and throws nothing', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { user } = setup();
    const before = latest.app;
    focusEl(trigger('Help'));
    await user.keyboard('{Escape}');
    document.body.focus();
    await user.keyboard('{Escape}');
    expect(latest.app).toBe(before);
    expect(menu()).toBeNull();
    expect(err).not.toHaveBeenCalled();
  });

  it('AC42: closing by a pointer-down outside does not move focus to the trigger', async () => {
    const { user } = setup(undefined, <button data-testid="elsewhere">elsewhere</button>);
    await user.click(trigger('View'));
    await user.click(screen.getByTestId('elsewhere'));
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(screen.getByTestId('elsewhere'));
  });

  it('AC42: the outside pointer-down leaves the window it pressed with normal focus behaviour', async () => {
    const { user } = setup();
    await user.click(trigger('Windows'));
    await user.click(winEl('about')!.querySelector<HTMLElement>('.win-titlebar')!);
    expect(menu()).toBeNull();
    expect(document.activeElement).not.toBe(trigger('Windows'));
  });
});

describe('item roles and ARIA (AC11)', () => {
  it('AC11: the Windows menu has five menuitemcheckbox items, three menuitems and one separator', async () => {
    const { user } = setup();
    await user.click(trigger('Windows'));
    const m = within(screen.getByRole('menu'));
    expect(m.getAllByRole('menuitemcheckbox')).toHaveLength(5);
    expect(m.getAllByRole('menuitem')).toHaveLength(3);
    expect(m.getAllByRole('separator')).toHaveLength(1);
  });

  it('AC11: the View menu has five menuitemradio, one menuitemcheckbox and two separators', async () => {
    const { user } = setup();
    await user.click(trigger('View'));
    const m = within(screen.getByRole('menu'));
    expect(m.getAllByRole('menuitemradio')).toHaveLength(5);
    expect(m.getAllByRole('menuitemcheckbox')).toHaveLength(1);
    expect(m.getAllByRole('separator')).toHaveLength(2);
    expect(m.queryAllByRole('menuitem')).toHaveLength(0);
  });

  it('AC11: plain menuitems have no aria-checked; checkable ones always have it', async () => {
    const { user } = setup();
    await user.click(trigger('View'));
    for (const el of anyItems(screen.getByRole('menu')).filter(
      (e) => e.getAttribute('role') !== 'menuitem',
    ))
      expect(el.getAttribute('aria-checked')).toMatch(/^(true|false)$/);
    fireEvent.click(trigger('tanzi.os'));
    for (const el of within(screen.getByRole('menu')).getAllByRole('menuitem'))
      expect(el).not.toHaveAttribute('aria-checked');
  });

  it('AC11: check icons are hidden from assistive technology', async () => {
    const { user } = setup();
    await user.click(trigger('View'));
    const icons = screen.getByRole('menu').querySelectorAll('.mb-check svg');
    expect(icons.length).toBeGreaterThan(0);
    for (const i of icons) expect(i).toHaveAttribute('aria-hidden', 'true');
  });

  it('AC11: the check column reserves space for every item, checked or not', async () => {
    const { user } = setup();
    await user.click(trigger('View'));
    const items = anyItems(screen.getByRole('menu'));
    for (const it of items) expect(it.querySelector('.mb-check')).not.toBeNull();
  });

  it('AC11: only checked items draw a check icon', async () => {
    const { user } = setup();
    await user.click(trigger('View'));
    const items = anyItems(screen.getByRole('menu'));
    for (const it of items) {
      const checked = it.getAttribute('aria-checked') === 'true';
      expect(it.querySelector('.mb-check svg') !== null, it.textContent!).toBe(checked);
    }
  });
});

describe('tanzi.os menu (AC18)', () => {
  it('AC18: items are About this site, a divider and Restart…', async () => {
    const { user } = setup();
    await user.click(trigger('tanzi.os'));
    expect(itemNames()).toEqual(['About this site', 'Restart…']);
    expect(within(screen.getByRole('menu')).getAllByRole('separator')).toHaveLength(1);
  });

  it('AC18: About this site opens the site window', async () => {
    const { user } = setup();
    expect(winEl('site')).toBeNull();
    await user.click(trigger('tanzi.os'));
    await user.click(screen.getByRole('menuitem', { name: 'About this site' }));
    expect(winEl('site')).not.toBeNull();
    expect(screen.getByRole('region', { name: 'About this site' })).toBeInTheDocument();
  });

  it('AC18/AC29: Restart resets the windows and keeps theme, wallpaper and wobble', async () => {
    const { user } = setup({ theme: 'light', wall: 'grid', wobble: false });
    await user.click(screen.getByRole('button', { name: 'Close hello.txt' }));
    expect(winEl('hello')).toBeNull();
    await user.click(trigger('tanzi.os'));
    await user.click(screen.getByRole('menuitem', { name: 'Restart…' }));
    expect(winEl('hello')).not.toBeNull();
    expect(latest.app.settings).toEqual({ theme: 'light', wall: 'grid', wobble: false });
  });
});

describe('Windows menu (AC19)', () => {
  it('AC19: lists the five windows then Minimize all, Show all, Tidy up', async () => {
    const { user } = setup();
    await user.click(trigger('Windows'));
    expect(itemNames()).toEqual([
      'hello.txt',
      'about.md',
      'experience.log',
      'projects',
      'terminal',
      'Minimize all',
      'Show all',
      'Tidy up',
    ]);
  });

  it('AC19: all five are checked when all windows are open', async () => {
    const { user } = setup();
    await user.click(trigger('Windows'));
    expect(screen.getAllByRole('menuitemcheckbox', { checked: true })).toHaveLength(5);
  });

  it('AC38/AC19: minimizing hello unchecks "hello.txt"', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Minimize hello.txt' }));
    await user.click(trigger('Windows'));
    expect(screen.getByRole('menuitemcheckbox', { name: 'hello.txt' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(screen.getByRole('menuitemcheckbox', { name: 'about.md' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('AC19: closing a window unchecks it', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Close projects' }));
    await user.click(trigger('Windows'));
    expect(screen.getByRole('menuitemcheckbox', { name: 'projects' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('AC19: choosing a minimized window restores and raises it, and the check comes back', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Minimize terminal' }));
    expect(winEl('term')).toHaveAttribute('data-min', 'true');
    await user.click(trigger('Windows'));
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'terminal' }));
    expect(winEl('term')).toHaveAttribute('data-min', 'false');
    const zs = ['hello', 'about', 'exp', 'proj', 'term'].map((i) => Number(winEl(i)!.style.zIndex));
    expect(Number(winEl('term')!.style.zIndex)).toBe(Math.max(...zs));
    await user.click(trigger('Windows'));
    expect(screen.getByRole('menuitemcheckbox', { name: 'terminal' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('AC19: choosing a closed window opens it', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Close hello.txt' }));
    await user.click(trigger('Windows'));
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'hello.txt' }));
    expect(winEl('hello')).not.toBeNull();
    expect(winEl('hello')).toHaveAttribute('data-min', 'false');
  });

  it('AC19: choosing an already open window does not toggle it closed', async () => {
    const { user } = setup();
    await user.click(trigger('Windows'));
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'about.md' }));
    expect(winEl('about')).not.toBeNull();
    expect(winEl('about')).toHaveAttribute('data-min', 'false');
  });

  it('AC19: Minimize all minimizes every open window and unchecks all five', async () => {
    const { user } = setup();
    await user.click(trigger('Windows'));
    await user.click(screen.getByRole('menuitem', { name: 'Minimize all' }));
    for (const id of ['hello', 'about', 'exp', 'proj', 'term'])
      expect(winEl(id)).toHaveAttribute('data-min', 'true');
    await user.click(trigger('Windows'));
    expect(screen.queryAllByRole('menuitemcheckbox', { checked: true })).toHaveLength(0);
  });

  it('AC19: Show all brings every minimized window back', async () => {
    const { user } = setup();
    await user.click(trigger('Windows'));
    await user.click(screen.getByRole('menuitem', { name: 'Minimize all' }));
    await user.click(trigger('Windows'));
    await user.click(screen.getByRole('menuitem', { name: 'Show all' }));
    for (const id of ['hello', 'about', 'exp', 'proj', 'term'])
      expect(winEl(id)).toHaveAttribute('data-min', 'false');
  });

  it('AC19: Show all with nothing minimized changes nothing', async () => {
    const { user } = setup();
    const before = latest.app;
    await user.click(trigger('Windows'));
    await user.click(screen.getByRole('menuitem', { name: 'Show all' }));
    expect(latest.app).toBe(before);
  });

  it('AC19: Tidy up puts windows back at their layout positions and reopens closed ones', async () => {
    const { user } = setup();
    const start = latest.app.desk.wins.hello;
    await user.click(screen.getByRole('button', { name: 'Close hello.txt' }));
    await user.click(trigger('Windows'));
    await user.click(screen.getByRole('menuitem', { name: 'Tidy up' }));
    expect(latest.app.desk.wins.hello).toEqual(start);
    expect(winEl('hello')).not.toBeNull();
  });

  it('AC36: after Minimize all no window control is reachable', async () => {
    const { user } = setup();
    await user.click(trigger('Windows'));
    await user.click(screen.getByRole('menuitem', { name: 'Minimize all' }));
    const buttons = Array.from(document.querySelectorAll<HTMLElement>('[data-win] button'));
    expect(buttons.length).toBe(10);
    for (const b of buttons) expect(b.closest('[inert]')).not.toBeNull();
    for (const id of ['hello', 'about', 'exp', 'proj', 'term'])
      expect(within(winEl(id)!).queryAllByRole('button')).toHaveLength(0);
  });

  it('AC36: a minimized window stays unreachable while a menu is open', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Minimize terminal' }));
    await user.click(trigger('Windows'));
    expect(winEl('term')).toHaveAttribute('inert');
    expect(screen.queryByRole('button', { name: 'Close terminal' })).toBeNull();
  });
});

describe('View menu (AC20, AC22)', () => {
  it('AC20: lists Dark, Light, three wallpapers and Wobbly windows', async () => {
    const { user } = setup();
    await user.click(trigger('View'));
    expect(itemNames()).toEqual([
      'Dark mode',
      'Light mode',
      'Wallpaper: Nebula',
      'Wallpaper: Grid',
      'Wallpaper: Plain',
      'Wobbly windows',
    ]);
  });

  it('AC20: the initial checks are Dark mode, Nebula and Wobbly', async () => {
    const { user } = setup();
    await user.click(trigger('View'));
    expect(checkedTexts()).toEqual(['Dark mode', 'Wallpaper: Nebula', 'Wobbly windows']);
  });

  it('AC20: choosing Light mode switches the theme and moves the radio check', async () => {
    const { user } = setup();
    await user.click(trigger('View'));
    await user.click(screen.getByRole('menuitemradio', { name: 'Light mode' }));
    expect(latest.app.settings.theme).toBe('light');
    await user.click(trigger('View'));
    expect(screen.getByRole('menuitemradio', { name: 'Light mode' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('menuitemradio', { name: 'Dark mode' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('AC20: choosing a wallpaper moves only the wallpaper check', async () => {
    const { user } = setup();
    await user.click(trigger('View'));
    await user.click(screen.getByRole('menuitemradio', { name: 'Wallpaper: Grid' }));
    expect(latest.app.settings.wall).toBe('grid');
    await user.click(trigger('View'));
    expect(screen.getByRole('menuitemradio', { name: 'Wallpaper: Grid' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('menuitemradio', { name: 'Wallpaper: Nebula' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(screen.getByRole('menuitemradio', { name: 'Dark mode' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('AC20: Wobbly windows toggles off and back on', async () => {
    const { user } = setup();
    await user.click(trigger('View'));
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Wobbly windows' }));
    expect(latest.app.settings.wobble).toBe(false);
    await user.click(trigger('View'));
    expect(screen.getByRole('menuitemcheckbox', { name: 'Wobbly windows' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Wobbly windows' }));
    expect(latest.app.settings.wobble).toBe(true);
  });

  it('AC20: the menu reflects stored light, grid and wobble off from the start', async () => {
    const { user } = setup({ theme: 'light', wall: 'plain', wobble: false });
    await user.click(trigger('View'));
    expect(checkedTexts()).toEqual(['Light mode', 'Wallpaper: Plain']);
  });

  it('AC22: choosing the already-checked theme changes no state and still closes the menu', async () => {
    const { user } = setup();
    const before = latest.app;
    await user.click(trigger('View'));
    await user.click(screen.getByRole('menuitemradio', { name: 'Dark mode' }));
    expect(latest.app).toBe(before);
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger('View'));
  });

  it('AC22: choosing the already-checked wallpaper changes no state and still closes the menu', async () => {
    const { user } = setup();
    const before = latest.app;
    await user.click(trigger('View'));
    await user.click(screen.getByRole('menuitemradio', { name: 'Wallpaper: Nebula' }));
    expect(latest.app).toBe(before);
    expect(menu()).toBeNull();
  });
});

describe('Help menu (AC21)', () => {
  it('T07 AC45: onTerminalHelp fires once for Terminal commands and for no other item', async () => {
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener('click', stop);
    try {
      const onHelp = vi.fn();
      const user = userEvent.setup();
      render(<Harness onTerminalHelp={onHelp} />);
      for (const t of ['tanzi.os', 'Windows', 'View']) {
        await user.click(trigger(t));
        for (const el of anyItems(screen.getByRole('menu'))) {
          if (el.tagName === 'A') continue;
          await user.click(el);
          if (!menu()) continue;
          await user.keyboard('{Escape}');
        }
        if (menu()) await user.keyboard('{Escape}');
      }
      await user.click(trigger('Help'));
      await user.click(screen.getByRole('menuitem', { name: /^Say hi/ }));
      expect(onHelp).not.toHaveBeenCalled();
      await user.click(trigger('Help'));
      await user.click(screen.getByRole('menuitem', { name: 'Terminal commands' }));
      expect(onHelp).toHaveBeenCalledTimes(1);
    } finally {
      document.removeEventListener('click', stop);
    }
  });

  it('AC21: lists Terminal commands, a divider and Say hi with the hint', async () => {
    const { user } = setup();
    await user.click(trigger('Help'));
    expect(itemNames()).toEqual(['Terminal commands', 'Say hiemail']);
    expect(within(screen.getByRole('menu')).getAllByRole('separator')).toHaveLength(1);
    expect(screen.getByText('email')).toBeInTheDocument();
  });

  it('AC21: Terminal commands opens the terminal window (restoring if minimized)', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Minimize terminal' }));
    await user.click(trigger('Help'));
    await user.click(screen.getByRole('menuitem', { name: 'Terminal commands' }));
    expect(winEl('term')).toHaveAttribute('data-min', 'false');
  });

  it('AC21/AC4: Say hi is a mailto: link with no target', async () => {
    const { user } = setup();
    await user.click(trigger('Help'));
    const a = screen.getByRole('menuitem', { name: /^Say hi/ });
    expect(a.tagName).toBe('A');
    expect(a).toHaveAttribute('href', `mailto:${EMAIL}`);
    expect(a).not.toHaveAttribute('target');
  });

  it('AC15: choosing a link item closes the menu and returns focus to the trigger', async () => {
    const stop = (e: Event) => e.preventDefault(); // jsdom cannot navigate
    document.addEventListener('click', stop);
    try {
      const { user } = setup();
      await user.click(trigger('Help'));
      await user.click(screen.getByRole('menuitem', { name: /^Say hi/ }));
      expect(menu()).toBeNull();
      expect(document.activeElement).toBe(trigger('Help'));
    } finally {
      document.removeEventListener('click', stop);
    }
  });

  it('AC14: Space activates a link item from the keyboard', async () => {
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener('click', stop);
    try {
      const { user } = setup();
      focusEl(trigger('Help'));
      await user.keyboard('{ArrowDown}{ArrowDown} '); // Say hi
      expect(menu()).toBeNull();
      expect(document.activeElement).toBe(trigger('Help'));
    } finally {
      document.removeEventListener('click', stop);
    }
  });
});

describe('document listeners and StrictMode (AC43)', () => {
  const net = (
    add: { mock: { calls: unknown[][] } },
    rem: { mock: { calls: unknown[][] } },
    t: string,
  ) =>
    add.mock.calls.filter((c) => c[0] === t).length -
    rem.mock.calls.filter((c) => c[0] === t).length;

  it('AC43: no document pointerdown or keydown listener exists while no menu is open', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const rem = vi.spyOn(document, 'removeEventListener');
    render(<Harness />);
    expect(net(add, rem, 'pointerdown')).toBe(0);
    expect(net(add, rem, 'keydown')).toBe(0);
  });

  it('AC43: opening adds the listeners and closing removes them all', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const rem = vi.spyOn(document, 'removeEventListener');
    render(<Harness />);
    fireEvent.click(trigger('View'));
    expect(net(add, rem, 'pointerdown')).toBe(1);
    expect(net(add, rem, 'keydown')).toBe(1);
    fireEvent.click(trigger('View'));
    expect(net(add, rem, 'pointerdown')).toBe(0);
    expect(net(add, rem, 'keydown')).toBe(0);
  });

  it('AC43: switching menus never accumulates listeners', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const rem = vi.spyOn(document, 'removeEventListener');
    render(<Harness />);
    for (const n of ['View', 'Help', 'Windows', 'tanzi.os']) fireEvent.click(trigger(n));
    expect(net(add, rem, 'pointerdown')).toBe(1);
    expect(net(add, rem, 'keydown')).toBe(1);
    fireEvent.pointerDown(document.body);
    expect(net(add, rem, 'pointerdown')).toBe(0);
    expect(net(add, rem, 'keydown')).toBe(0);
  });

  it('AC43: unmounting with a menu open leaves no listeners, under StrictMode, and logs nothing', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const add = vi.spyOn(document, 'addEventListener');
    const rem = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    );
    fireEvent.click(trigger('Windows'));
    expect(net(add, rem, 'pointerdown')).toBe(1);
    expect(net(add, rem, 'keydown')).toBe(1);
    unmount();
    expect(net(add, rem, 'pointerdown')).toBe(0);
    expect(net(add, rem, 'keydown')).toBe(0);
    expect(err).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('AC43: after closing, a pointer-down or Escape elsewhere does nothing', () => {
    render(<Harness />);
    fireEvent.click(trigger('View'));
    fireEvent.click(trigger('View'));
    const before = latest.app;
    fireEvent.pointerDown(document.body);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(latest.app).toBe(before);
    expect(menu()).toBeNull();
  });
});

describe('source checks (AC5, AC9, AC17, AC33)', () => {
  const sources = import.meta.glob('/src/**/*.{ts,tsx}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  it('AC5: no email, link URL or menu copy is hard-coded outside data.ts', () => {
    const banned = [
      EMAIL,
      'https://github.com',
      'https://linkedin.com',
      RESUME_URL,
      'System menu bar',
      'Switch to light mode',
      'Switch to dark mode',
      'Wobbly windows',
      'Tidy up',
      'Minimize all',
      'Show all',
      'Terminal commands',
      'Say hi',
      'Restart',
      'Dark mode',
      'Light mode',
    ];
    for (const [path, src] of Object.entries(sources)) {
      if (path.endsWith('/src/data.ts')) continue;
      for (const b of banned) expect(src, `${path} contains "${b}"`).not.toContain(b);
    }
  });

  it('AC17: the stylesheet never removes the focus ring', () => {
    expect(css).not.toMatch(/all\s*:\s*unset/);
    expect(css).not.toMatch(/outline\s*:\s*(none|0)\b/);
    expect(css).not.toMatch(/outline-style\s*:\s*none/);
  });

  const norm = (s: string) => s.replace(/\s+/g, ' ');
  /** Declarations of every rule whose selector list includes `sel`, outside media queries. */
  const decls = (sel: string, source = css): string => {
    const stripped = source.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
    const out: string[] = [];
    for (const m of stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const sels = m[1].split(',').map((s) => s.trim());
      if (sels.includes(sel)) out.push(m[2]);
    }
    return norm(out.join(' '));
  };

  it('AC1: the bar is fixed, 36px, padded 0 12px, 13px, blurred, divided, z-index 1000', () => {
    const d = decls('.mb');
    expect(d).toMatch(/position: fixed/);
    expect(d).toMatch(/top: 0/);
    expect(d).toMatch(/left: 0/);
    expect(d).toMatch(/right: 0/);
    expect(d).toMatch(/height: 36px/);
    expect(d).toMatch(/padding: 0 12px/);
    expect(d).toMatch(/font-size: 13px/);
    expect(d).toMatch(/z-index: 1000/);
    expect(d).toMatch(/color-mix\(in srgb, var\(--color-bg\) 72%, transparent\)/);
    expect(d).toMatch(/backdrop-filter: blur\(10px\)/);
    expect(d).toMatch(/box-shadow: 0 1px 0 var\(--color-divider\)/);
  });

  it('AC2: trigger metrics, weights, colours and hover backgrounds', () => {
    const t = decls('.mb-trigger');
    expect(t).toMatch(/padding: 5px 10px/);
    expect(t).toMatch(/border-radius: 6px/);
    expect(t).toMatch(/color: var\(--color-neutral-300\)/);
    expect(decls('.mb-trigger:hover')).toMatch(/var\(--color-text\) 8%/);
    expect(decls(".mb-trigger[data-open='true']")).toMatch(/var\(--color-text\) 10%/);
    const os = decls('.mb-trigger-os');
    expect(os).toMatch(/font-weight: 600/);
    expect(os).toMatch(/color: var\(--color-accent\)/);
  });

  it('AC9: dropdown geometry', () => {
    const m = decls('.mb-menu');
    expect(m).toMatch(/top: 34px/);
    expect(m).toMatch(/left: 0/);
    expect(m).toMatch(/min-width: 240px/);
    expect(m).toMatch(/padding: 6px/);
    expect(m).toMatch(/border-radius: (var\(--radius-lg\)|14px)/);
    expect(m).toMatch(/background: var\(--color-surface\)/);
    expect(m).toMatch(/box-shadow: var\(--shadow-lg\)/);
    expect(m).not.toMatch(/transition|animation/);
  });

  it('AC9: item, check, hint and divider metrics', () => {
    const i = decls('.mb-item');
    expect(i).toMatch(/padding: 7px 10px/);
    expect(i).toMatch(/border-radius: 6px/);
    expect(i).toMatch(/font-size: 13px/);
    expect(decls('.mb-item:hover')).toMatch(/var\(--color-accent\) 16%/);
    expect(decls('.mb-item:active')).toMatch(/var\(--color-accent\) 26%/);
    expect(decls('.mb-check')).toMatch(/width: 14px/);
    const h = decls('.mb-hint');
    expect(h).toMatch(/font-size: 11px/);
    expect(h).toMatch(/color: var\(--color-neutral-500\)/);
    const s = decls('.mb-sep');
    expect(s).toMatch(/height: 1px/);
    expect(s).toMatch(/margin: 5px 8px/);
  });

  it('AC3/AC32: links, toggle and clock metrics', () => {
    const l = decls('.mb-link');
    expect(l).toMatch(/width: 30px/);
    expect(l).toMatch(/height: 28px/);
    expect(l).toMatch(/color: var\(--color-neutral-400\)/);
    expect(decls('.mb-link:hover')).toMatch(/color: var\(--color-text\)/);
    const c = decls('.mb-clock');
    expect(c).toMatch(/tabular-nums/);
    expect(c).toMatch(/color: var\(--color-neutral-300\)/);
    expect(c).toMatch(/padding: 0 6px 0 10px/);
  });

  it('AC33: hover transforms use the bouncy ease', () => {
    expect(decls('.mb-link:hover')).toMatch(/translateY\(-2px\) rotate\(-8deg\)/);
    expect(decls('.mb-toggle:hover')).toMatch(/rotate\(40deg\)/);
    expect(decls('.mb-link')).toMatch(/var\(--ease-bouncy\)/);
  });

  it('AC33: under reduced motion the hover transforms are removed', () => {
    const m = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?\})\s*\}/);
    expect(m, 'reduced motion block').not.toBeNull();
    const body = norm(m![1]);
    expect(body).toMatch(/\.mb-link:hover/);
    expect(body).toMatch(/\.mb-toggle:hover/);
    expect(body).toMatch(/transform: none/);
  });

  it('AC1: the stylesheet uses tokens only, no hex colours', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe('T08 focusSignal (AC25)', () => {
  const bare = (focusSignal?: number) => (
    <MenuBar
      wins={initialApp(1280, 720, dflt).desk.wins}
      settings={dflt}
      dispatch={() => {}}
      focusSignal={focusSignal}
    />
  );

  it('T08 AC25: focusSignal 0 does not move focus on mount', () => {
    render(bare(0));
    expect(document.activeElement).toBe(document.body);
  });

  it('T08 AC25: an undefined focusSignal does not move focus on mount', () => {
    render(bare());
    expect(document.activeElement).toBe(document.body);
  });

  it('T08 AC25: with focusSignal 0 the first Tab still reaches tanzi.os', async () => {
    const user = userEvent.setup();
    render(bare(0));
    await user.tab();
    expect(document.activeElement).toBe(trigger('tanzi.os'));
  });

  it('T08 AC25: a bumped focusSignal focuses the tanzi.os trigger', () => {
    const { rerender } = render(bare(0));
    rerender(bare(1));
    expect(document.activeElement).toBe(trigger('tanzi.os'));
  });

  it('T08 AC25: a bump pulls focus back from elsewhere and makes tanzi.os the tab stop after another trigger roved', async () => {
    const user = userEvent.setup();
    const { rerender } = render(bare(0));
    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(trigger('Windows').tabIndex).toBe(0);
    rerender(bare(1));
    expect(document.activeElement).toBe(trigger('tanzi.os'));
    expect(trigger('tanzi.os').tabIndex).toBe(0);
  });

  it('T08 AC25: an unchanged focusSignal on re-render does not steal focus', async () => {
    const user = userEvent.setup();
    const { rerender } = render(bare(0));
    rerender(bare(1));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'GitHub' }));
    rerender(bare(1));
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'GitHub' }));
  });
});
