import { describe, expect, it } from 'vitest';
import {
  MENU_ORDER,
  firstItem,
  itemIndexes,
  lastItem,
  linkAttrs,
  menuModel,
  menuTransition,
  nextTrigger,
  stepItem,
  wrapIndex,
  type MenuEntry,
} from '../../src/logic/menu';
import { initialApp } from '../../src/logic/system';
import { appReducer } from '../../src/logic/system';
import type { Settings } from '../../src/logic/settings';
import { EMAIL, WIN_TITLES } from '../../src/data';
import { DOCK_IDS } from '../../src/logic/windows';

const dflt: Settings = { theme: 'dark', wall: 'nebula', wobble: true };
// DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, start from the explicit all-open (Tidy up) state.
const allOpen = (): ReturnType<typeof initialApp> =>
  appReducer(initialApp(1280, 720, dflt), { type: 'tidy' });
const desk = () => allOpen().desk;
const ctx = (settings: Settings = dflt, wins = desk().wins) => ({ wins, settings });

type Item = Extract<MenuEntry, { kind: 'item' }>;
const items = (es: MenuEntry[]): Item[] => es.filter((e): e is Item => e.kind === 'item');
const labels = (es: MenuEntry[]) => es.map((e) => (e.kind === 'sep' ? '---' : e.label));
const find = (es: MenuEntry[], label: string): Item => {
  const it = items(es).find((i) => i.label === label);
  if (!it) throw new Error(`missing ${label}`);
  return it;
};

describe('menuModel: tanzi.os', () => {
  it('AC18: About this site, a divider, Restart… (U+2026)', () => {
    const m = menuModel('os', ctx());
    expect(labels(m)).toEqual([WIN_TITLES.site, '---', 'Restart…']);
    expect(WIN_TITLES.site).toBe('About this site');
    expect(find(m, 'Restart…').label.endsWith('…')).toBe(true);
  });
  it('AC18: About opens site and Restart restarts, both plain menuitems', () => {
    const m = menuModel('os', ctx());
    const about = find(m, 'About this site');
    const restart = find(m, 'Restart…');
    expect(about.role).toBe('menuitem');
    expect(restart.role).toBe('menuitem');
    expect(about.cmd).toEqual({ type: 'action', action: { type: 'open', id: 'site' } });
    expect(restart.cmd).toEqual({ type: 'action', action: { type: 'restart' } });
    expect(about.checked).toBeUndefined();
  });
});

describe('menuModel: Windows', () => {
  it('AC19: five window items, a divider, then Minimize all, Show all, Tidy up', () => {
    const m = menuModel('win', ctx());
    expect(labels(m)).toEqual([
      'hello.txt',
      'about.md',
      'experience.log',
      'projects',
      'terminal',
      // DELIBERATE REQUIREMENT CHANGE (T16 AC19): the Windows menu lists dataviz as its sixth window.
      'dataviz',
      '---',
      'Minimize all',
      'Show all',
      'Tidy up',
    ]);
  });
  it('AC11/AC19: the window items are menuitemcheckbox and open the matching window', () => {
    const m = items(menuModel('win', ctx())).slice(0, 5);
    const ids = ['hello', 'about', 'exp', 'proj', 'term'];
    m.forEach((it, i) => {
      expect(it.role).toBe('menuitemcheckbox');
      expect(it.cmd).toEqual({ type: 'action', action: { type: 'open', id: ids[i] } });
    });
  });
  it('AC19: the three arrangement items are plain menuitems with the right actions', () => {
    const m = menuModel('win', ctx());
    expect(find(m, 'Minimize all')).toMatchObject({
      role: 'menuitem',
      cmd: { type: 'action', action: { type: 'minimizeAll' } },
    });
    expect(find(m, 'Show all')).toMatchObject({
      role: 'menuitem',
      cmd: { type: 'action', action: { type: 'showAll' } },
    });
    expect(find(m, 'Tidy up')).toMatchObject({
      role: 'menuitem',
      cmd: { type: 'action', action: { type: 'tidy' } },
    });
  });
  it('AC19: checked means open and not minimized (open, minimized and closed)', () => {
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, start from the all-open state.
    let app = allOpen();
    app = appReducer(app, { type: 'minimize', id: 'about' });
    app = appReducer(app, { type: 'close', id: 'exp' });
    const m = menuModel('win', ctx(dflt, app.desk.wins));
    expect(find(m, 'hello.txt').checked).toBe(true);
    expect(find(m, 'about.md').checked).toBe(false);
    expect(find(m, 'experience.log').checked).toBe(false);
    expect(find(m, 'projects').checked).toBe(true);
    expect(find(m, 'terminal').checked).toBe(true);
  });
  it('AC19: with everything closed no window is checked', () => {
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, start from the all-open state.
    let app = allOpen();
    for (const id of ['hello', 'about', 'exp', 'proj', 'term'] as const)
      app = appReducer(app, { type: 'close', id });
    const m = items(menuModel('win', ctx(dflt, app.desk.wins))).slice(0, 5);
    expect(m.map((i) => i.checked)).toEqual([false, false, false, false, false]);
  });
});

describe('menuModel: View', () => {
  it('AC20: Dark, Light, divider, three wallpapers, divider, Wobbly windows', () => {
    expect(labels(menuModel('view', ctx()))).toEqual([
      'Dark mode',
      'Light mode',
      '---',
      'Wallpaper: Nebula',
      'Wallpaper: Grid',
      'Wallpaper: Plain',
      '---',
      'Wobbly windows',
    ]);
  });
  it('AC11/AC20: theme and wallpaper items are menuitemradio, Wobbly is menuitemcheckbox', () => {
    const m = items(menuModel('view', ctx()));
    expect(m.slice(0, 5).map((i) => i.role)).toEqual(Array(5).fill('menuitemradio'));
    expect(m[5].role).toBe('menuitemcheckbox');
  });
  it('AC20: exactly one theme radio and one wallpaper radio is checked, for every combination', () => {
    for (const theme of ['dark', 'light'] as const)
      for (const wall of ['nebula', 'grid', 'plain'] as const) {
        const m = menuModel('view', ctx({ theme, wall, wobble: true }));
        const its = items(m);
        const themes = its.slice(0, 2);
        const walls = its.slice(2, 5);
        expect(themes.filter((i) => i.checked)).toHaveLength(1);
        expect(walls.filter((i) => i.checked)).toHaveLength(1);
        expect(find(m, theme === 'dark' ? 'Dark mode' : 'Light mode').checked).toBe(true);
        const wallLabel = { nebula: 'Nebula', grid: 'Grid', plain: 'Plain' }[wall];
        expect(find(m, `Wallpaper: ${wallLabel}`).checked).toBe(true);
      }
  });
  it('AC20: Wobbly is checked when wobble is on and unchecked when off, and toggles', () => {
    const on = find(menuModel('view', ctx({ ...dflt, wobble: true })), 'Wobbly windows');
    const off = find(menuModel('view', ctx({ ...dflt, wobble: false })), 'Wobbly windows');
    expect(on.checked).toBe(true);
    expect(off.checked).toBe(false);
    expect(on.cmd).toEqual({ type: 'action', action: { type: 'toggleWobble' } });
    expect(off.cmd).toEqual({ type: 'action', action: { type: 'toggleWobble' } });
  });
  it('AC20: radio items carry absolute (not toggle) actions', () => {
    const m = menuModel('view', ctx());
    expect(find(m, 'Dark mode').cmd).toEqual({
      type: 'action',
      action: { type: 'theme', theme: 'dark' },
    });
    expect(find(m, 'Light mode').cmd).toEqual({
      type: 'action',
      action: { type: 'theme', theme: 'light' },
    });
    expect(find(m, 'Wallpaper: Nebula').cmd).toEqual({
      type: 'action',
      action: { type: 'wallpaper', wall: 'nebula' },
    });
    expect(find(m, 'Wallpaper: Grid').cmd).toEqual({
      type: 'action',
      action: { type: 'wallpaper', wall: 'grid' },
    });
    expect(find(m, 'Wallpaper: Plain').cmd).toEqual({
      type: 'action',
      action: { type: 'wallpaper', wall: 'plain' },
    });
  });
});

describe('menuModel: Help', () => {
  it('AC21: Terminal commands, a divider, Say hi', () => {
    expect(labels(menuModel('help', ctx()))).toEqual(['Terminal commands', '---', 'Say hi']);
  });
  it('AC21: Terminal commands opens the terminal', () => {
    expect(find(menuModel('help', ctx()), 'Terminal commands')).toMatchObject({
      role: 'menuitem',
      cmd: { type: 'action', action: { type: 'open', id: 'term' } },
    });
  });
  it('AC21/AC4: Say hi is mailto: plus EMAIL, same tab, with the hint "email"', () => {
    const it = find(menuModel('help', ctx()), 'Say hi');
    expect(it.cmd).toEqual({ type: 'link', href: `mailto:${EMAIL}`, newTab: false });
    expect(it.hint).toBe('email');
    expect(it.role).toBe('menuitem');
  });
});

describe('menuModel: structure', () => {
  it('AC11: separators are kind sep; no item has an empty label; keys are unique per menu', () => {
    for (const id of MENU_ORDER) {
      const m = menuModel(id, ctx());
      expect(m.length).toBeGreaterThan(0);
      expect(new Set(m.map((e) => e.key)).size).toBe(m.length);
      for (const e of items(m)) expect(e.label.length).toBeGreaterThan(0);
      expect(m[0].kind).toBe('item');
      expect(m[m.length - 1].kind).toBe('item');
    }
  });
  it('AC11: only checkable roles have a checked flag', () => {
    for (const id of MENU_ORDER)
      for (const e of items(menuModel(id, ctx()))) {
        if (e.role === 'menuitem') expect(e.checked).toBeUndefined();
        else expect(typeof e.checked).toBe('boolean');
      }
  });
});

describe('index helpers', () => {
  it('AC12: MENU_ORDER is os, win, view, help', () => {
    expect([...MENU_ORDER]).toEqual(['os', 'win', 'view', 'help']);
  });
  it('AC12: wrapIndex wraps forwards, backwards and handles negatives', () => {
    expect(wrapIndex(0, 1, 4)).toBe(1);
    expect(wrapIndex(3, 1, 4)).toBe(0);
    expect(wrapIndex(0, -1, 4)).toBe(3);
    expect(wrapIndex(2, -1, 4)).toBe(1);
    expect(wrapIndex(-1, -1, 4)).toBe(2);
    expect(wrapIndex(0, -9, 4)).toBe(3);
    expect(wrapIndex(0, 0, 1)).toBe(0);
  });
  it('AC12: nextTrigger wraps both ways', () => {
    expect(nextTrigger('os', 1)).toBe('win');
    expect(nextTrigger('win', 1)).toBe('view');
    expect(nextTrigger('view', 1)).toBe('help');
    expect(nextTrigger('help', 1)).toBe('os');
    expect(nextTrigger('os', -1)).toBe('help');
    expect(nextTrigger('help', -1)).toBe('view');
  });
});

describe('item navigation', () => {
  const win = menuModel('win', ctx());
  // DELIBERATE REQUIREMENT CHANGE (T16 AC19): six window items now, so win: items at 0-5, separator at 6, items at 7-9.
  it('AC14: itemIndexes lists non-separator positions', () => {
    expect(itemIndexes(win)).toEqual([0, 1, 2, 3, 4, 5, 7, 8, 9]);
  });
  it('AC14: stepItem moves down and skips the separator', () => {
    expect(stepItem(win, 5, 1)).toBe(7);
    expect(stepItem(win, 0, 1)).toBe(1);
  });
  it('AC14: stepItem moves up and skips the separator', () => {
    expect(stepItem(win, 7, -1)).toBe(5);
    expect(stepItem(win, 3, -1)).toBe(2);
  });
  it('AC14: stepItem wraps at both ends', () => {
    expect(stepItem(win, 9, 1)).toBe(0);
    expect(stepItem(win, 0, -1)).toBe(9);
  });
  it('AC13/AC14: from -1, stepping down gives the first item and up gives the last', () => {
    expect(stepItem(win, -1, 1)).toBe(0);
    expect(stepItem(win, -1, -1)).toBe(9);
  });
  it('AC14: firstItem and lastItem ignore separators', () => {
    expect(firstItem(win)).toBe(0);
    expect(lastItem(win)).toBe(9);
    const view = menuModel('view', ctx());
    expect(firstItem(view)).toBe(0);
    expect(lastItem(view)).toBe(view.length - 1);
  });
  it('AC14: a single-item list wraps onto itself', () => {
    const one: MenuEntry[] = [
      {
        kind: 'item',
        key: 'a',
        role: 'menuitem',
        label: 'A',
        cmd: { type: 'action', action: { type: 'restart' } },
      },
    ];
    expect(stepItem(one, 0, 1)).toBe(0);
    expect(stepItem(one, 0, -1)).toBe(0);
  });
  it('AC14: with leading and trailing separators they are still skipped', () => {
    const cmd = { type: 'action', action: { type: 'restart' } } as const;
    const es: MenuEntry[] = [
      { kind: 'sep', key: 's0' },
      { kind: 'item', key: 'a', role: 'menuitem', label: 'A', cmd },
      { kind: 'sep', key: 's1' },
      { kind: 'sep', key: 's2' },
      { kind: 'item', key: 'b', role: 'menuitem', label: 'B', cmd },
      { kind: 'sep', key: 's3' },
    ];
    expect(firstItem(es)).toBe(1);
    expect(lastItem(es)).toBe(4);
    expect(stepItem(es, 1, 1)).toBe(4);
    expect(stepItem(es, 4, 1)).toBe(1);
    expect(stepItem(es, 1, -1)).toBe(4);
  });
});

describe('menuTransition', () => {
  it('AC6: clicking a closed trigger opens its menu', () => {
    expect(menuTransition(null, { type: 'click', id: 'win' })).toBe('win');
  });
  it('AC6: clicking the open trigger closes it', () => {
    expect(menuTransition('win', { type: 'click', id: 'win' })).toBeNull();
  });
  it('AC6: clicking another trigger switches (at most one open)', () => {
    expect(menuTransition('win', { type: 'click', id: 'help' })).toBe('help');
  });
  it('AC7: hover switches only when a menu is already open', () => {
    expect(menuTransition('os', { type: 'hover', id: 'view' })).toBe('view');
    expect(menuTransition(null, { type: 'hover', id: 'view' })).toBeNull();
  });
  it('AC7: hovering the open trigger keeps it open', () => {
    expect(menuTransition('view', { type: 'hover', id: 'view' })).toBe('view');
  });
  it('AC8: close always gives null', () => {
    expect(menuTransition('help', { type: 'close' })).toBeNull();
    expect(menuTransition(null, { type: 'close' })).toBeNull();
  });
});

describe('linkAttrs', () => {
  it('AC4: https and http links open in a new tab with noopener noreferrer', () => {
    expect(linkAttrs('https://github.com/')).toEqual({
      target: '_blank',
      rel: 'noopener noreferrer',
    });
    expect(linkAttrs('http://example.com')).toEqual({
      target: '_blank',
      rel: 'noopener noreferrer',
    });
  });
  it('AC4: mailto links get no target and no rel', () => {
    expect(linkAttrs(`mailto:${EMAIL}`)).toEqual({});
  });
  it('AC4: relative and other-scheme links get no new-tab attributes', () => {
    expect(linkAttrs('/resume.pdf')).toEqual({});
    expect(linkAttrs('')).toEqual({});
    expect(linkAttrs('javascript:alert(1)')).toEqual({});
  });
});

describe('T16 menuModel: dataviz window item', () => {
  it('T16 AC19: the window items equal DOCK_IDS in order and open the matching window', () => {
    const w = items(menuModel('win', ctx())).slice(0, DOCK_IDS.length);
    expect(w.map((i) => i.label)).toEqual(DOCK_IDS.map((id) => WIN_TITLES[id]));
    expect(w.map((i) => i.cmd)).toEqual(
      DOCK_IDS.map((id) => ({ type: 'action', action: { type: 'open', id } })),
    );
    expect(w).toHaveLength(6);
  });

  it('T16 AC19: dataviz is checked only when viz is open and not minimized', () => {
    const base = desk().wins;
    const at = (viz: { open: boolean; min: boolean }) =>
      find(menuModel('win', ctx(dflt, { ...base, viz: { ...base.viz, ...viz } })), 'dataviz');
    expect(at({ open: true, min: false }).checked).toBe(true);
    expect(at({ open: true, min: true }).checked).toBe(false);
    expect(at({ open: false, min: false }).checked).toBe(false);
    expect(at({ open: true, min: false }).role).toBe('menuitemcheckbox');
  });
});
