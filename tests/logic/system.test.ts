import { describe, expect, it } from 'vitest';
import { appReducer, effectToAction, initialApp, type App } from '../../src/logic/system';
import { menuModel, type MenuEntry } from '../../src/logic/menu';
import { persistDiff, type Settings } from '../../src/logic/settings';
import type { TerminalEffect } from '../../src/logic/terminal';

const dflt: Settings = { theme: 'dark', wall: 'nebula', wobble: true };
const custom: Settings = { theme: 'light', wall: 'grid', wobble: false };

/** An app where hello is minimized, term is closed and about has been dragged. */
function busy(settings: Settings): App {
  let a = initialApp(1280, 720, settings);
  a = appReducer(a, { type: 'minimize', id: 'hello' });
  a = appReducer(a, { type: 'close', id: 'term' });
  a = appReducer(a, { type: 'move', id: 'about', x: 300, y: 200 });
  return a;
}

/** The action a menu item dispatches, found by its label. */
function menuAction(app: App, menu: 'os' | 'win' | 'view' | 'help', label: string) {
  const entries = menuModel(menu, { wins: app.desk.wins, settings: app.settings });
  const item = entries.find((e): e is Extract<MenuEntry, { kind: 'item' }> => {
    return e.kind === 'item' && e.label === label;
  });
  if (!item) throw new Error(`no menu item "${label}" in ${menu}`);
  if (item.cmd.type !== 'action') throw new Error(`"${label}" is not an action`);
  return item.cmd.action;
}

const cases: Array<{
  name: string;
  effect: TerminalEffect;
  menu: 'os' | 'win' | 'view' | 'help';
  label: string;
}> = [
  {
    name: 'theme light',
    effect: { type: 'theme', theme: 'light' },
    menu: 'view',
    label: 'Light mode',
  },
  {
    name: 'theme dark',
    effect: { type: 'theme', theme: 'dark' },
    menu: 'view',
    label: 'Dark mode',
  },
  {
    name: 'wallpaper grid',
    effect: { type: 'wallpaper', wall: 'grid' },
    menu: 'view',
    label: 'Wallpaper: Grid',
  },
  {
    name: 'wallpaper plain',
    effect: { type: 'wallpaper', wall: 'plain' },
    menu: 'view',
    label: 'Wallpaper: Plain',
  },
  {
    name: 'open hello (minimized)',
    effect: { type: 'open', id: 'hello' },
    menu: 'win',
    label: 'hello.txt',
  },
  {
    name: 'open term (closed)',
    effect: { type: 'open', id: 'term' },
    menu: 'win',
    label: 'terminal',
  },
  { name: 'tidy', effect: { type: 'tidy' }, menu: 'win', label: 'Tidy up' },
  { name: 'restart', effect: { type: 'restart' }, menu: 'os', label: 'Restart…' },
];

describe('AC28: the terminal effect path and the menu path are one path', () => {
  for (const settings of [dflt, custom]) {
    for (const c of cases) {
      it(`AC28: ${c.name} (${settings.theme}/${settings.wall}/${settings.wobble ? 'wobble' : 'still'}) gives the same state and the same writes`, () => {
        const app = busy(settings);
        const viaEffect = effectToAction(c.effect);
        expect(viaEffect).not.toBeNull();
        const viaMenu = menuAction(app, c.menu, c.label);
        const a = appReducer(app, viaEffect!);
        const b = appReducer(app, viaMenu);
        expect(a).toEqual(b);
        expect(persistDiff(app.settings, a.settings)).toEqual(
          persistDiff(app.settings, b.settings),
        );
      });
    }
  }

  it('AC28: the effects really change what they claim to (the comparison is not vacuous)', () => {
    const app = busy(dflt);
    expect(appReducer(app, effectToAction({ type: 'theme', theme: 'light' })!).settings.theme).toBe(
      'light',
    );
    expect(
      appReducer(app, effectToAction({ type: 'wallpaper', wall: 'grid' })!).settings.wall,
    ).toBe('grid');
    const opened = appReducer(app, effectToAction({ type: 'open', id: 'term' })!);
    expect(opened.desk.wins.term.open).toBe(true);
    const restored = appReducer(app, effectToAction({ type: 'open', id: 'hello' })!);
    expect(restored.desk.wins.hello.min).toBe(false);
    const tidy = appReducer(app, effectToAction({ type: 'tidy' })!);
    expect(tidy.desk.wins.about.x).not.toBe(300);
  });

  it('AC28: clear has no app action', () => {
    expect(effectToAction({ type: 'clear' })).toBeNull();
  });

  it('AC28: theme and wallpaper effects through the app write the same keys as the diff says', () => {
    const app = initialApp(1280, 720, dflt);
    const next = appReducer(app, effectToAction({ type: 'theme', theme: 'light' })!);
    expect(persistDiff(app.settings, next.settings)).toEqual([['tanzi-os:theme', 'light']]);
    const next2 = appReducer(app, effectToAction({ type: 'wallpaper', wall: 'plain' })!);
    expect(persistDiff(app.settings, next2.settings)).toEqual([['tanzi-os:wallpaper', 'plain']]);
  });
});

describe('AC29: Restart and Tidy keep the settings', () => {
  for (const type of ['restart', 'tidy'] as const) {
    it(`AC29: ${type} from light/grid/wobble-off keeps settings by reference and writes nothing`, () => {
      const app = busy(custom);
      const next = appReducer(app, { type });
      expect(next.settings).toBe(app.settings);
      expect(next.settings).toEqual(custom);
      expect(persistDiff(app.settings, next.settings)).toEqual([]);
      // The windows did reset.
      expect(next.desk.wins.hello.min).toBe(false);
      expect(next.desk.wins.term.open).toBe(true);
    });
  }
});

describe('appReducer delegation', () => {
  it('window actions leave settings by reference', () => {
    const app = initialApp(1280, 720, custom);
    for (const a of [
      { type: 'minimize', id: 'hello' },
      { type: 'close', id: 'about' },
      { type: 'minimizeAll' },
      { type: 'resize', vw: 1000, vh: 700 },
    ] as const) {
      expect(appReducer(app, a).settings).toBe(app.settings);
    }
  });
  it('settings actions leave desk by reference', () => {
    const app = initialApp(1280, 720, dflt);
    for (const a of [
      { type: 'theme', theme: 'light' },
      { type: 'wallpaper', wall: 'grid' },
      { type: 'toggleTheme' },
      { type: 'toggleWobble' },
    ] as const) {
      const next = appReducer(app, a);
      expect(next.desk).toBe(app.desk);
      expect(next).not.toBe(app);
    }
  });
  it('AC22/AC44: a no-op settings action returns the same App', () => {
    const app = initialApp(1280, 720, dflt);
    expect(appReducer(app, { type: 'theme', theme: 'dark' })).toBe(app);
    expect(appReducer(app, { type: 'wallpaper', wall: 'nebula' })).toBe(app);
  });
  it('a no-op window action returns the same App', () => {
    const app = initialApp(1280, 720, dflt);
    expect(appReducer(app, { type: 'showAll' })).toBe(app);
  });
  it('unknown input returns the same App', () => {
    const app = initialApp(1280, 720, dflt);
    expect(appReducer(app, { type: 'nope' } as never)).toBe(app);
  });
  it('initialApp builds the desktop for the viewport and keeps the given settings', () => {
    const app = initialApp(1920, 1080, custom);
    expect(app.settings).toEqual(custom);
    expect(app.desk.vw).toBe(1920);
    expect(app.desk.vh).toBe(1080);
    // DELIBERATE REQUIREMENT CHANGE (T07 AC52): term height 310 -> 270, so term y at 1920x1080 is 700 (was 694).
    expect(app.desk.wins.term).toMatchObject({ x: 1450, y: 700, open: true, min: false });
  });
});
