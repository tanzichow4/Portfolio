import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WALL,
  DEFAULT_WOBBLE,
  STORAGE_KEYS,
  parseTheme,
  parseWall,
  parseWobble,
  persistDiff,
  settingsReducer,
  type Settings,
} from '../../src/logic/settings';

const base: Settings = { theme: 'dark', wall: 'nebula', wobble: true };

describe('storage keys and defaults', () => {
  it('AC27: keys carry the tanzi-os: prefix and are exactly theme, wallpaper, wobble', () => {
    expect(STORAGE_KEYS).toEqual({
      theme: 'tanzi-os:theme',
      wall: 'tanzi-os:wallpaper',
      wobble: 'tanzi-os:wobble',
    });
  });
  it('AC25/AC26: defaults are nebula and wobble on', () => {
    expect(DEFAULT_WALL).toBe('nebula');
    expect(DEFAULT_WOBBLE).toBe(true);
  });
});

describe('parseTheme', () => {
  it('AC23: accepts dark and light', () => {
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('light')).toBe('light');
  });
  it('AC23: anything else gives null', () => {
    for (const v of ['Light', 'DARK', '', ' light', 'purple', null, undefined, 1, {}, true])
      expect(parseTheme(v), String(v)).toBeNull();
  });
});

describe('parseWall', () => {
  it('AC25: accepts the three wallpapers', () => {
    for (const w of ['nebula', 'grid', 'plain']) expect(parseWall(w)).toBe(w);
  });
  it('AC25: missing, invalid or non-string gives nebula', () => {
    for (const v of ['Grid', '', 'purple', null, undefined, 3, {}])
      expect(parseWall(v), String(v)).toBe('nebula');
  });
});

describe('parseWobble', () => {
  it('AC26: only "true" and "false" are honoured', () => {
    expect(parseWobble('true')).toBe(true);
    expect(parseWobble('false')).toBe(false);
  });
  it('AC26: anything else gives on', () => {
    for (const v of ['False', '0', '1', '', 'yes', null, undefined, false, 0, {}])
      expect(parseWobble(v), String(v)).toBe(true);
  });
});

describe('settingsReducer', () => {
  it('AC24: theme action sets the theme', () => {
    expect(settingsReducer(base, { type: 'theme', theme: 'light' })).toEqual({
      ...base,
      theme: 'light',
    });
  });
  it('AC24: toggleTheme flips both ways', () => {
    const light = settingsReducer(base, { type: 'toggleTheme' });
    expect(light.theme).toBe('light');
    expect(settingsReducer(light, { type: 'toggleTheme' }).theme).toBe('dark');
  });
  it('AC25: wallpaper action sets the wallpaper', () => {
    expect(settingsReducer(base, { type: 'wallpaper', wall: 'grid' }).wall).toBe('grid');
    expect(settingsReducer(base, { type: 'wallpaper', wall: 'plain' }).wall).toBe('plain');
  });
  it('AC26: toggleWobble flips both ways', () => {
    const off = settingsReducer(base, { type: 'toggleWobble' });
    expect(off.wobble).toBe(false);
    expect(settingsReducer(off, { type: 'toggleWobble' }).wobble).toBe(true);
  });
  it('AC22/AC44: choosing the current value returns the same reference', () => {
    expect(settingsReducer(base, { type: 'theme', theme: 'dark' })).toBe(base);
    expect(settingsReducer(base, { type: 'wallpaper', wall: 'nebula' })).toBe(base);
  });
  it('AC27: invalid payloads are ignored and return the same reference', () => {
    const bad = [
      { type: 'theme', theme: 'purple' },
      { type: 'wallpaper', wall: 'sunset' },
      { type: 'theme' },
      { type: 'wallpaper' },
      { type: 'nope' },
    ] as unknown as Parameters<typeof settingsReducer>[1][];
    for (const a of bad) expect(settingsReducer(base, a)).toBe(base);
  });
  it('AC24: does not mutate its input', () => {
    const frozen = Object.freeze({ ...base });
    expect(() => settingsReducer(frozen, { type: 'toggleTheme' })).not.toThrow();
    expect(frozen).toEqual(base);
  });
});

describe('persistDiff', () => {
  it('AC44: equal settings give an empty list', () => {
    expect(persistDiff(base, base)).toEqual([]);
    expect(persistDiff(base, { ...base })).toEqual([]);
  });
  it('AC24: only the changed theme is written', () => {
    expect(persistDiff(base, { ...base, theme: 'light' })).toEqual([['tanzi-os:theme', 'light']]);
  });
  it('AC25: only the changed wallpaper is written', () => {
    expect(persistDiff(base, { ...base, wall: 'grid' })).toEqual([['tanzi-os:wallpaper', 'grid']]);
  });
  it('AC26: wobble is written as the strings "true"/"false"', () => {
    expect(persistDiff(base, { ...base, wobble: false })).toEqual([['tanzi-os:wobble', 'false']]);
    expect(persistDiff({ ...base, wobble: false }, base)).toEqual([['tanzi-os:wobble', 'true']]);
  });
  it('AC27: several changes come out in theme, wallpaper, wobble order, all prefixed', () => {
    const out = persistDiff(base, { theme: 'light', wall: 'plain', wobble: false });
    expect(out).toEqual([
      ['tanzi-os:theme', 'light'],
      ['tanzi-os:wallpaper', 'plain'],
      ['tanzi-os:wobble', 'false'],
    ]);
    for (const [k] of out) expect(k.startsWith('tanzi-os:')).toBe(true);
  });
});
