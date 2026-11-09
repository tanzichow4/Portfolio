import { describe, expect, it } from 'vitest';
import css from '../src/theme.css?raw';
import { resolveTheme } from './helpers/cssTokens';
import { contrastRatio } from './helpers/contrast';

for (const theme of ['dark', 'light'] as const) {
  describe(`boot screen contrast (${theme})`, () => {
    const tokens = resolveTheme(css, theme);
    const get = (n: string) => {
      const v = tokens[`--color-${n}`];
      if (!v) throw new Error(`--color-${n} missing in ${theme}`);
      return v;
    };

    it(`T08 AC27: ${theme}: mark text (accent) on bg is at least 4.5:1`, () => {
      const r = contrastRatio(get('accent'), get('bg'));
      expect(r, r.toFixed(2)).toBeGreaterThanOrEqual(4.5);
    });

    it(`T08 AC27: ${theme}: fill (accent) on track (neutral-800) is at least 3:1`, () => {
      const r = contrastRatio(get('accent'), get('neutral-800'));
      expect(r, r.toFixed(2)).toBeGreaterThanOrEqual(3);
    });
  });
}
