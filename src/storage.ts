import { parseTheme, parseWall, parseWobble, STORAGE_KEYS, type Settings } from './logic/settings';

function readKey(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Theme is read from the attribute the inline script set, never from storage. */
export function readSettings(): Settings {
  return {
    theme: parseTheme(document.documentElement.dataset.theme) ?? 'dark',
    wall: parseWall(readKey(STORAGE_KEYS.wall)),
    wobble: parseWobble(readKey(STORAGE_KEYS.wobble)),
  };
}

export function writeSetting(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable; the setting still changes for the session.
  }
}

export function applyTheme(theme: Settings['theme']): void {
  document.documentElement.dataset.theme = theme;
}
