import { EMAIL, MENU_ITEMS, WIN_TITLES } from '../data';
import type { MenuId, State } from '../types';
import type { Settings } from './settings';
import type { AppAction } from './system';
import { DOCK_IDS } from './windows';

export type TopMenu = Exclude<MenuId, null>;
export const MENU_ORDER: readonly TopMenu[] = ['os', 'win', 'view', 'help'];

export type MenuCmd =
  | { type: 'action'; action: AppAction; runHelp?: true }
  | { type: 'link'; href: string; newTab: boolean };

export type MenuEntry =
  | { kind: 'sep'; key: string }
  | {
      kind: 'item';
      key: string;
      role: 'menuitem' | 'menuitemcheckbox' | 'menuitemradio';
      label: string;
      hint?: string;
      checked?: boolean;
      cmd: MenuCmd;
    };

export function wrapIndex(i: number, delta: number, n: number): number {
  if (n <= 0) return 0;
  return (((i + delta) % n) + n) % n;
}

export function nextTrigger(id: TopMenu, delta: 1 | -1): TopMenu {
  return MENU_ORDER[wrapIndex(MENU_ORDER.indexOf(id), delta, MENU_ORDER.length)];
}

const sep = (key: string): MenuEntry => ({ kind: 'sep', key });

function act(
  key: string,
  label: string,
  action: AppAction,
  role: 'menuitem' | 'menuitemcheckbox' | 'menuitemradio' = 'menuitem',
  checked?: boolean,
): MenuEntry {
  return {
    kind: 'item',
    key,
    role,
    label,
    ...(checked === undefined ? {} : { checked }),
    cmd: { type: 'action', action },
  };
}

export function menuModel(
  id: TopMenu,
  ctx: { wins: State['wins']; settings: Settings },
): MenuEntry[] {
  const { wins, settings } = ctx;
  switch (id) {
    case 'os':
      return [
        act('site', WIN_TITLES.site, { type: 'open', id: 'site' }),
        sep('sep-1'),
        act('restart', MENU_ITEMS.restart, { type: 'restart' }),
      ];
    case 'win':
      return [
        ...DOCK_IDS.map((w) =>
          act(
            w,
            WIN_TITLES[w],
            { type: 'open', id: w },
            'menuitemcheckbox',
            wins[w].open && !wins[w].min,
          ),
        ),
        sep('sep-1'),
        act('minimizeAll', MENU_ITEMS.minimizeAll, { type: 'minimizeAll' }),
        act('showAll', MENU_ITEMS.showAll, { type: 'showAll' }),
        act('tidy', MENU_ITEMS.tidy, { type: 'tidy' }),
      ];
    case 'view':
      return [
        act(
          'dark',
          MENU_ITEMS.dark,
          { type: 'theme', theme: 'dark' },
          'menuitemradio',
          settings.theme === 'dark',
        ),
        act(
          'light',
          MENU_ITEMS.light,
          { type: 'theme', theme: 'light' },
          'menuitemradio',
          settings.theme === 'light',
        ),
        sep('sep-1'),
        act(
          'nebula',
          MENU_ITEMS.wallNebula,
          { type: 'wallpaper', wall: 'nebula' },
          'menuitemradio',
          settings.wall === 'nebula',
        ),
        act(
          'grid',
          MENU_ITEMS.wallGrid,
          { type: 'wallpaper', wall: 'grid' },
          'menuitemradio',
          settings.wall === 'grid',
        ),
        act(
          'plain',
          MENU_ITEMS.wallPlain,
          { type: 'wallpaper', wall: 'plain' },
          'menuitemradio',
          settings.wall === 'plain',
        ),
        sep('sep-2'),
        act(
          'wobble',
          MENU_ITEMS.wobble,
          { type: 'toggleWobble' },
          'menuitemcheckbox',
          settings.wobble,
        ),
      ];
    case 'help':
      return [
        {
          kind: 'item',
          key: 'term',
          role: 'menuitem',
          label: MENU_ITEMS.termCommands,
          cmd: { type: 'action', action: { type: 'open', id: 'term' }, runHelp: true },
        },
        sep('sep-1'),
        {
          kind: 'item',
          key: 'sayHi',
          role: 'menuitem',
          label: MENU_ITEMS.sayHi,
          hint: MENU_ITEMS.sayHiHint,
          cmd: { type: 'link', href: 'mailto:' + EMAIL, newTab: false },
        },
      ];
    default:
      return [];
  }
}

export function itemIndexes(entries: readonly MenuEntry[]): number[] {
  const out: number[] = [];
  entries.forEach((e, i) => {
    if (e.kind === 'item') out.push(i);
  });
  return out;
}

export function stepItem(entries: readonly MenuEntry[], from: number, delta: 1 | -1): number {
  const idx = itemIndexes(entries);
  if (idx.length === 0) return -1;
  const pos = idx.indexOf(from);
  if (pos === -1) return delta === 1 ? idx[0] : idx[idx.length - 1];
  return idx[wrapIndex(pos, delta, idx.length)];
}

export function firstItem(entries: readonly MenuEntry[]): number {
  return stepItem(entries, -1, 1);
}

export function lastItem(entries: readonly MenuEntry[]): number {
  return stepItem(entries, -1, -1);
}

export function menuTransition(
  open: MenuId,
  ev: { type: 'click' | 'hover'; id: TopMenu } | { type: 'close' },
): MenuId {
  switch (ev.type) {
    case 'click':
      return open === ev.id ? null : ev.id;
    case 'hover':
      return open === null ? open : ev.id;
    case 'close':
      return null;
    default:
      return open;
  }
}

export function linkAttrs(href: string): { target?: '_blank'; rel?: string } {
  return /^https?:/i.test(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {};
}
