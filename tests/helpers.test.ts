import { describe, expect, it } from 'vitest';
import { contrastRatio, hexToRgb } from './helpers/contrast';
import { parseBlock, resolveTheme, stripComments } from './helpers/cssTokens';

describe('contrast helper (AC4/AC17 infrastructure)', () => {
  it('AC4: white on black is 21:1', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });

  it('AC4: a color on itself is 1:1', () => {
    expect(contrastRatio('#6558ad', '#6558ad')).toBeCloseTo(1, 10);
  });

  it('AC4: #6558ad on #f3f5fe is about 5.4', () => {
    expect(Math.abs(contrastRatio('#6558ad', '#f3f5fe') - 5.4)).toBeLessThanOrEqual(0.05);
  });

  it('AC4: accepts uppercase hex', () => {
    expect(hexToRgb('#FFAA00')).toEqual([255, 170, 0]);
  });

  it.each([
    'rgb(0,0,0)',
    '#fff',
    '#12345',
    '#1234567',
    'red',
    '',
    'color-mix(in srgb, #000 16%, transparent)',
    '#gggggg',
  ])('AC4: non-hex input %j throws', (bad) => {
    expect(() => contrastRatio(bad, '#ffffff')).toThrow();
    expect(() => contrastRatio('#ffffff', bad)).toThrow();
  });
});

describe('css token helper (AC4/AC17 infrastructure)', () => {
  it('AC4: strips block comments, including multi-line and ones hiding declarations', () => {
    const css = ':root { /* a\n b */ --a: 1; /* --b: 2; */ }';
    expect(stripComments(css)).not.toContain('/*');
    expect(parseBlock(css, ':root')).toEqual({ '--a': '1' });
  });

  it('AC4: merges multiple :root blocks, later one wins', () => {
    const css = ':root { --a: 1; --b: 2; }\n.x { --z: 9; }\n:root { --b: 3; --c: 4; }';
    expect(parseBlock(css, ':root')).toEqual({ '--a': '1', '--b': '3', '--c': '4' });
  });

  it('AC4: collapses whitespace in multi-line values', () => {
    const css = ':root {\n  --w:\n    linear-gradient(\n      red,\n      blue\n    );\n}';
    expect(parseBlock(css, ':root')['--w']).toBe('linear-gradient( red, blue )');
  });

  it('AC4: light overrides win over :root, other tokens are inherited', () => {
    const css =
      ":root { --bg: #000000; --keep: #111111; }\n[data-theme='light'] { --bg: #ffffff; }";
    expect(resolveTheme(css, 'light')).toEqual({ '--bg': '#ffffff', '--keep': '#111111' });
    expect(resolveTheme(css, 'dark')).toEqual({ '--bg': '#000000', '--keep': '#111111' });
  });

  it('AC4: returns an empty map when the selector is absent', () => {
    expect(parseBlock('.x { --a: 1; }', ':root')).toEqual({});
    expect(resolveTheme('', 'light')).toEqual({});
  });

  it('AC4: does not treat nested at-rule blocks as :root', () => {
    const css = '@media (min-width: 1px) { :root { --a: 1; } }\n:root { --b: 2; }';
    expect(parseBlock(css, ':root')['--b']).toBe('2');
  });
});
