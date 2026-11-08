import { describe, expect, it } from 'vitest';
import css from '../src/theme.css?raw';
import { parseBlock, resolveTheme } from './helpers/cssTokens';

const ramp = (prefix: string, values: string[]) =>
  Object.fromEntries(values.map((v, i) => [`--color-${prefix}-${(i + 1) * 100}`, v]));

const DARK: Record<string, string> = {
  '--color-bg': '#161826',
  '--color-surface': '#232532',
  '--color-text': '#e9e9ed',
  '--color-accent': '#9184d9',
  '--color-divider': 'color-mix(in srgb, #e9e9ed 16%, transparent)',
  '--color-section': '#262a60',
  '--color-section-glow': '#353b80',
  ...ramp('neutral', [
    '#f3f5fe',
    '#e4e7f5',
    '#cfd3e5',
    '#b2b6ca',
    '#9397ab',
    '#75798c',
    '#595d6c',
    '#3f424d',
    '#292b31',
  ]),
  ...ramp('accent', [
    '#f5f4ff',
    '#e7e5fe',
    '#d2cefd',
    '#b5abfc',
    '#968ae0',
    '#796cbf',
    '#5d5294',
    '#423a6a',
    '#2b2741',
  ]),
  '--shadow-sm': '0 0 0 1px #3f424d',
  '--shadow-md': '0 0 0 1px #595d6c, 0 6px 18px rgba(0, 0, 0, 0.55)',
  '--shadow-lg': '0 0 0 1px #9397ab, 0 16px 40px rgba(0, 0, 0, 0.65)',
};

const LIGHT: Record<string, string> = {
  '--color-bg': '#e4e7f5',
  '--color-surface': '#f3f5fe',
  '--color-text': '#292b31',
  '--color-accent': '#6558ad',
  '--color-divider': 'color-mix(in srgb, #292b31 16%, transparent)',
  '--color-section': '#d2cefd',
  '--color-section-glow': '#e7e5fe',
  ...ramp('neutral', [
    '#292b31',
    '#3f424d',
    '#595d6c',
    '#5c6073',
    '#626679',
    '#b2b6ca',
    '#cfd3e5',
    '#e4e7f5',
    '#f3f5fe',
  ]),
  ...ramp('accent', [
    '#2b2741',
    '#423a6a',
    '#5d5294',
    '#6558ad',
    '#968ae0',
    '#b5abfc',
    '#d2cefd',
    '#e7e5fe',
    '#f5f4ff',
  ]),
  ...ramp('accent-2', [
    '#2b293a',
    '#423e5d',
    '#5c5783',
    '#7972a9',
    '#9690c9',
    '#b5afe8',
    '#d2cefd',
    '#e7e5fe',
    '#f5f4ff',
  ]),
  '--shadow-sm': '0 0 0 1px #cfd3e5',
  '--shadow-md': '0 0 0 1px #b2b6ca, 0 6px 18px rgba(40, 44, 80, 0.14)',
  '--shadow-lg': '0 0 0 1px #9397ab, 0 16px 40px rgba(40, 44, 80, 0.2)',
};

const norm = (s: string | undefined) => (s ?? '<missing>').replace(/\s+/g, ' ').trim();
const red = (h: string) => parseInt(h.slice(1, 3), 16);

describe('theme tokens', () => {
  it('reads a non-empty theme.css', () => {
    expect(css.length).toBeGreaterThan(500);
  });

  describe('AC1: dark tokens match the spec', () => {
    const dark = resolveTheme(css, 'dark');
    it.each(Object.entries(DARK))('AC1: dark %s', (name, expected) => {
      expect(norm(dark[name]), name).toBe(expected);
    });
  });

  describe('AC2: light tokens match the spec with decision 11', () => {
    const light = resolveTheme(css, 'light');
    it.each(Object.entries(LIGHT))('AC2/AC3: light %s', (name, expected) => {
      expect(norm(light[name]), name).toBe(expected);
    });

    it('AC2: light accent-400 equals the light accent (A3)', () => {
      expect(light['--color-accent-400']).toBe(light['--color-accent']);
    });
  });

  describe('AC3: light accent-2 ramp is reversed', () => {
    it('AC3: accent-2-100 is darker than accent-2-800 in light, so tag-accent-2 is dark on light', () => {
      const light = resolveTheme(css, 'light');
      expect(red(light['--color-accent-2-100'])).toBeLessThan(red(light['--color-accent-2-800']));
    });
    it('AC3: dark accent-2 ramp keeps the light-to-dark order', () => {
      const dark = resolveTheme(css, 'dark');
      expect(red(dark['--color-accent-2-100'])).toBeGreaterThan(red(dark['--color-accent-2-800']));
    });
  });

  describe('AC5: wallpapers and easings', () => {
    const root = parseBlock(css, ':root');
    const lightOnly = parseBlock(css, "[data-theme='light']");

    it('AC5: easing tokens match the spec', () => {
      expect(root['--ease-spring']).toBe('cubic-bezier(0.34, 1.56, 0.64, 1)');
      expect(root['--ease-bouncy']).toBe('cubic-bezier(0.34, 1.8, 0.64, 1)');
      expect(root['--ease-minimize']).toBe('cubic-bezier(0.55, 0, 0.25, 1)');
    });

    it('AC5: --wall-nebula matches the spec', () => {
      expect(norm(root['--wall-nebula'])).toBe(
        'radial-gradient(900px 600px at 15% 100%, var(--color-section), transparent 70%), ' +
          'radial-gradient(800px 560px at 100% 0%, var(--color-accent-900), transparent 70%), ' +
          'var(--color-bg)',
      );
    });

    it('AC5: --wall-grid matches the spec', () => {
      expect(norm(root['--wall-grid'])).toBe(
        'radial-gradient(circle at 1px 1px, var(--color-neutral-800) 1px, transparent 0) 0 0 / 22px 22px, var(--color-bg)',
      );
    });

    it('AC5: --wall-plain is the bg token', () => {
      expect(root['--wall-plain']).toBe('var(--color-bg)');
    });

    it.each(['--wall-nebula', '--wall-grid', '--wall-plain'])(
      'AC5: %s uses tokens only (follows the theme) and is not redefined for light',
      (name) => {
        expect(root[name]).toContain('var(--color-');
        expect(root[name]).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
        expect(lightOnly[name]).toBeUndefined();
      },
    );
  });

  describe('AC9: mono font', () => {
    it('AC9: --font-mono is exactly ui-monospace, Menlo, monospace', () => {
      expect(parseBlock(css, ':root')['--font-mono']).toBe('ui-monospace, Menlo, monospace');
    });
  });
});
