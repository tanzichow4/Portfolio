import type { Theme, Wall } from '../types';

export interface Settings {
  theme: Theme;
  wall: Wall;
  wobble: boolean;
}

export const DEFAULT_WALL: Wall = 'nebula';
export const DEFAULT_WOBBLE = true;

export const STORAGE_KEYS = {
  theme: 'tanzi-os:theme',
  wall: 'tanzi-os:wallpaper',
  wobble: 'tanzi-os:wobble',
} as const;

export function parseTheme(raw: unknown): Theme | null {
  return raw === 'dark' || raw === 'light' ? raw : null;
}

export function parseWall(raw: unknown): Wall {
  return raw === 'nebula' || raw === 'grid' || raw === 'plain' ? raw : DEFAULT_WALL;
}

export function parseWobble(raw: unknown): boolean {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return DEFAULT_WOBBLE;
}

export type SettingsAction =
  | { type: 'theme'; theme: Theme }
  | { type: 'wallpaper'; wall: Wall }
  | { type: 'toggleTheme' }
  | { type: 'toggleWobble' };

export function settingsReducer(s: Settings, a: SettingsAction): Settings {
  switch (a.type) {
    case 'theme': {
      const theme = parseTheme(a.theme);
      return theme === null || theme === s.theme ? s : { ...s, theme };
    }
    case 'wallpaper': {
      if (a.wall !== 'nebula' && a.wall !== 'grid' && a.wall !== 'plain') return s;
      return a.wall === s.wall ? s : { ...s, wall: a.wall };
    }
    case 'toggleTheme':
      return { ...s, theme: s.theme === 'dark' ? 'light' : 'dark' };
    case 'toggleWobble':
      return { ...s, wobble: !s.wobble };
    default:
      return s;
  }
}

/** Storage entries for the fields that differ, in theme, wall, wobble order. */
export function persistDiff(prev: Settings, next: Settings): Array<[key: string, value: string]> {
  const out: Array<[string, string]> = [];
  if (prev.theme !== next.theme) out.push([STORAGE_KEYS.theme, next.theme]);
  if (prev.wall !== next.wall) out.push([STORAGE_KEYS.wall, next.wall]);
  if (prev.wobble !== next.wobble) out.push([STORAGE_KEYS.wobble, next.wobble ? 'true' : 'false']);
  return out;
}
