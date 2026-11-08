import { describe, expect, it } from 'vitest';
import html from '../index.html?raw';

const KEY = 'tanzi-os:theme';

function extractScript(): string {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  const inline = scripts.filter((m) => !/\bsrc=|type=["']module["']/.test(m[1]));
  expect(inline.length, 'one inline classic script').toBe(1);
  return inline[0][2];
}

interface Opts {
  stored?: string | null;
  osLight?: boolean;
  getItemThrows?: boolean;
  matchMediaThrows?: boolean;
}

function run(opts: Opts) {
  const keys: string[] = [];
  const doc = { documentElement: { dataset: {} as Record<string, string> } };
  const localStorage = {
    getItem(k: string) {
      keys.push(k);
      if (opts.getItemThrows) throw new Error('denied');
      return opts.stored ?? null;
    },
  };
  const matchMedia = (q: string) => {
    if (opts.matchMediaThrows) throw new Error('nope');
    return { matches: q.includes('light') ? !!opts.osLight : !opts.osLight };
  };
  new Function('localStorage', 'matchMedia', 'document', extractScript())(
    localStorage,
    matchMedia,
    doc,
  );
  return { theme: doc.documentElement.dataset.theme, keys };
}

describe('theme init script', () => {
  it('AC10: no stored value follows OS light', () => {
    expect(run({ osLight: true }).theme).toBe('light');
  });
  it('AC10: no stored value follows OS dark', () => {
    expect(run({ osLight: false }).theme).toBe('dark');
  });
  it('AC11: stored dark wins over OS light', () => {
    expect(run({ stored: 'dark', osLight: true }).theme).toBe('dark');
  });
  it('AC11: stored light wins over OS dark', () => {
    expect(run({ stored: 'light', osLight: false }).theme).toBe('light');
  });
  it.each(['blue', '', 'Dark', 'LIGHT', ' light', '<img src=x onerror=alert(1)>'])(
    'AC12: invalid stored value %j is ignored (OS light)',
    (stored) => {
      expect(run({ stored, osLight: true }).theme).toBe('light');
    },
  );
  it.each(['blue', '', '<img src=x onerror=alert(1)>'])(
    'AC12: invalid stored value %j is ignored (OS dark)',
    (stored) => {
      expect(run({ stored, osLight: false }).theme).toBe('dark');
    },
  );
  it('AC13: getItem throwing gives dark and does not throw', () => {
    expect(() => run({ getItemThrows: true, osLight: true })).not.toThrow();
    expect(run({ getItemThrows: true, osLight: true }).theme).toBe('dark');
  });
  it('AC13: matchMedia throwing gives dark and does not throw', () => {
    expect(() => run({ matchMediaThrows: true })).not.toThrow();
    expect(run({ matchMediaThrows: true }).theme).toBe('dark');
  });
  it('AC15: the only storage key used is tanzi-os:theme, read only', () => {
    expect(run({}).keys).toEqual([KEY]);
    const literals = [...extractScript().matchAll(/['"]([^'"]*:[^'"]*)['"]/g)].map((m) => m[1]);
    expect(literals.filter((l) => l.startsWith('tanzi-os'))).toEqual([KEY]);
    expect(extractScript()).not.toMatch(/setItem|removeItem|sessionStorage/);
  });
  it('AC15: <html> has no hard-coded data-theme', () => {
    const tag = html.match(/<html\b[^>]*>/i)?.[0] ?? '';
    expect(tag).toMatch(/^<html/i);
    expect(tag).not.toMatch(/data-theme/i);
  });
  it('AC10: the script runs before the module script tag', () => {
    const inline = html.indexOf(extractScript());
    const mod = html.search(/<script[^>]*type=["']module["']/i);
    expect(inline).toBeGreaterThan(-1);
    expect(mod).toBeGreaterThan(-1);
    expect(inline).toBeLessThan(mod);
  });
});
