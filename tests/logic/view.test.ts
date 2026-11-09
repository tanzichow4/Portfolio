import { describe, expect, it } from 'vitest';
import pkg from '../../package.json';
import { DESKTOP_QUERY, resolveView, viewForWidth } from '../../src/logic/layout';
import { PHONE_HEADINGS } from '../../src/data';

describe('T13 view rule', () => {
  it.each([0, 320, 759, 759.5, 759.999])('T13 AC1: width %s is phone', (w) => {
    expect(viewForWidth(w)).toBe('phone');
  });

  it.each([760, 760.5, 1024, 1280])('T13 AC1: width %s is desktop', (w) => {
    expect(viewForWidth(w)).toBe('desktop');
  });

  it('T13 AC1: a matching query wins over the measured width', () => {
    expect(resolveView(true, 0)).toBe('desktop');
    expect(resolveView(false, 5000)).toBe('phone');
  });

  it('T13 AC1: with no query the measured width decides', () => {
    expect(resolveView(null, 759)).toBe('phone');
    expect(resolveView(null, 760)).toBe('desktop');
  });

  it('T13 AC2: DESKTOP_QUERY is (min-width: 760px)', () => {
    expect(DESKTOP_QUERY).toBe('(min-width: 760px)');
  });
});

describe('T13 AC11: phone headings', () => {
  it('T13 AC11: PHONE_HEADINGS literals', () => {
    expect(PHONE_HEADINGS).toEqual({ about: 'About', projects: 'Projects', links: 'Links' });
  });
});

describe('T13 AC2: single breakpoint definition', () => {
  const files = import.meta.glob('/src/**/*.{ts,tsx,css}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  it('T13 AC2: 760 appears in src/logic/layout.ts exactly once and nowhere else', () => {
    const hits: Record<string, number> = {};
    for (const [path, text] of Object.entries(files)) {
      const n = text.match(/\b760\b/g)?.length ?? 0;
      if (n) hits[path] = n;
    }
    expect(hits).toEqual({ '/src/logic/layout.ts': 1 });
  });
});

describe('T13 AC29: no new dependency', () => {
  it('T13 AC29: package.json dependencies are unchanged', () => {
    expect(Object.keys(pkg.dependencies).sort()).toEqual([
      '@fontsource/inter',
      '@phosphor-icons/react',
      'react',
      'react-dom',
    ]);
  });
});
