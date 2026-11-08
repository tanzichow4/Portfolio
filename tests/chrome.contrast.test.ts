import { describe, expect, it } from 'vitest';
import css from '../src/theme.css?raw';
import { resolveTheme } from './helpers/cssTokens';
import { contrastRatio } from './helpers/contrast';

describe('window chrome contrast', () => {
  for (const theme of ['dark', 'light'] as const) {
    const tokens = resolveTheme(css, theme);
    const get = (n: string) => {
      const v = tokens[`--color-${n}`];
      if (!v) throw new Error(`--color-${n} missing in ${theme}`);
      return v;
    };

    it(`AC24: ${theme}: titlebar text (neutral-400) on bg is at least 4.5:1`, () => {
      const r = contrastRatio(get('neutral-400'), get('bg'));
      expect(r, r.toFixed(2)).toBeGreaterThanOrEqual(4.5);
    });

    it(`AC24: ${theme}: button icons (neutral-400) on bg are at least 3:1`, () => {
      const r = contrastRatio(get('neutral-400'), get('bg'));
      expect(r, r.toFixed(2)).toBeGreaterThanOrEqual(3);
    });

    it(`AC24: ${theme}: accent icon on bg is at least 3:1`, () => {
      const r = contrastRatio(get('accent'), get('bg'));
      expect(r, r.toFixed(2)).toBeGreaterThanOrEqual(3);
    });
  }
});
