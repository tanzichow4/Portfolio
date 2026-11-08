import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyTheme, readSettings, writeSetting } from '../src/storage';

const html = document.documentElement;

beforeEach(() => {
  localStorage.clear();
  delete html.dataset.theme;
});
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  delete html.dataset.theme;
});

describe('readSettings: theme comes from <html data-theme> only', () => {
  it('AC23: light attribute gives light', () => {
    html.dataset.theme = 'light';
    expect(readSettings().theme).toBe('light');
  });
  it('AC23: dark attribute gives dark', () => {
    html.dataset.theme = 'dark';
    expect(readSettings().theme).toBe('dark');
  });
  it('AC23: missing or invalid attribute gives dark', () => {
    expect(readSettings().theme).toBe('dark');
    html.dataset.theme = 'purple';
    expect(readSettings().theme).toBe('dark');
  });
  it('AC23: it never reads storage for the theme (stored light is ignored when the attribute says dark)', () => {
    localStorage.setItem('tanzi-os:theme', 'light');
    html.dataset.theme = 'dark';
    expect(readSettings().theme).toBe('dark');
  });
});

describe('readSettings: wallpaper and wobble', () => {
  it('AC25/AC26: missing values give nebula and wobble on', () => {
    expect(readSettings()).toEqual({ theme: 'dark', wall: 'nebula', wobble: true });
  });
  it('AC25: each valid wallpaper is read from tanzi-os:wallpaper', () => {
    for (const w of ['nebula', 'grid', 'plain']) {
      localStorage.setItem('tanzi-os:wallpaper', w);
      expect(readSettings().wall).toBe(w);
    }
  });
  it('AC25: invalid wallpaper values give nebula', () => {
    for (const v of ['purple', '', 'GRID', 'null']) {
      localStorage.setItem('tanzi-os:wallpaper', v);
      expect(readSettings().wall, v).toBe('nebula');
    }
  });
  it('AC26: wobble "false" gives off, "true" gives on', () => {
    localStorage.setItem('tanzi-os:wobble', 'false');
    expect(readSettings().wobble).toBe(false);
    localStorage.setItem('tanzi-os:wobble', 'true');
    expect(readSettings().wobble).toBe(true);
  });
  it('AC26: invalid wobble values give on', () => {
    for (const v of ['0', 'no', '', 'False']) {
      localStorage.setItem('tanzi-os:wobble', v);
      expect(readSettings().wobble, v).toBe(true);
    }
  });
  it('AC27: values under unprefixed keys are ignored', () => {
    localStorage.setItem('wallpaper', 'grid');
    localStorage.setItem('wobble', 'false');
    expect(readSettings()).toEqual({ theme: 'dark', wall: 'nebula', wobble: true });
  });
  it('AC27: a throwing getItem gives all defaults and does not throw', () => {
    html.dataset.theme = 'light';
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(() => readSettings()).not.toThrow();
    expect(readSettings()).toEqual({ theme: 'light', wall: 'nebula', wobble: true });
  });
  it('AC27: a throwing getItem with no attribute gives dark', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(readSettings().theme).toBe('dark');
  });
  it('AC27: if only one read throws, the other settings are still read', () => {
    localStorage.setItem('tanzi-os:wobble', 'false');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((k: string) => {
      if (k === 'tanzi-os:wallpaper') throw new Error('denied');
      return k === 'tanzi-os:wobble' ? 'false' : null;
    });
    expect(readSettings()).toMatchObject({ wall: 'nebula', wobble: false });
  });
  it('AC27: a missing localStorage object does not throw', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(() => readSettings()).not.toThrow();
    expect(readSettings().wall).toBe('nebula');
  });
});

describe('writeSetting', () => {
  it('AC24/AC27: writes the key and value', () => {
    writeSetting('tanzi-os:wallpaper', 'grid');
    expect(localStorage.getItem('tanzi-os:wallpaper')).toBe('grid');
  });
  it('AC27: a throwing setItem does not throw', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => writeSetting('tanzi-os:theme', 'light')).not.toThrow();
  });
  it('AC27: a throwing localStorage getter does not throw', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(() => writeSetting('tanzi-os:theme', 'light')).not.toThrow();
  });
});

describe('applyTheme', () => {
  it('AC24: sets <html data-theme> to light and back to dark', () => {
    applyTheme('light');
    expect(html.dataset.theme).toBe('light');
    applyTheme('dark');
    expect(html.dataset.theme).toBe('dark');
  });
  it('AC24/AC44: does not write to storage', () => {
    const set = vi.spyOn(Storage.prototype, 'setItem');
    applyTheme('light');
    expect(set).not.toHaveBeenCalled();
  });
});
