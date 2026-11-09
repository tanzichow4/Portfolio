import { describe, expect, it } from 'vitest';
import css from '../src/theme.css?raw';
import { resolveTheme } from './helpers/cssTokens';
import { contrastRatio } from './helpers/contrast';

for (const theme of ['dark', 'light'] as const) {
  describe(`window body contrast (${theme})`, () => {
    const tokens = resolveTheme(css, theme);
    const get = (n: string) => {
      const v = tokens[`--color-${n}`];
      if (!v) throw new Error(`--color-${n} missing in ${theme}`);
      return v;
    };
    const surface = get('surface');
    const pairs: [string, string][] = [
      ['hello greeting (accent)', 'accent'],
      ['hello hint (neutral-500)', 'neutral-500'],
      ['hello verb (text)', 'text'],
      ['hello "I ... stuff." line (neutral-400)', 'neutral-400'],
      ['"See what I\'ve built" label at rest (accent)', 'accent'],
      ['"Say hi" label at rest (text)', 'text'],
    ];
    for (const [label, token] of pairs) {
      it(`T07 AC12: ${theme}: ${label} on surface is at least 4.5:1`, () => {
        const r = contrastRatio(get(token), surface);
        expect(r, r.toFixed(2)).toBeGreaterThanOrEqual(4.5);
      });
    }
  });
}
