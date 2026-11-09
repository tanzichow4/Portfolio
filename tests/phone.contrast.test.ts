import { describe, expect, it } from 'vitest';
import css from '../src/theme.css?raw';
import { resolveTheme } from './helpers/cssTokens';
import { contrastRatio } from './helpers/contrast';

for (const theme of ['dark', 'light'] as const) {
  describe(`T13 phone page contrast (${theme})`, () => {
    const tokens = resolveTheme(css, theme);
    const get = (n: string) => {
      const v = tokens[`--color-${n}`];
      if (!v) throw new Error(`--color-${n} missing in ${theme}`);
      return v;
    };
    const bg = get('bg');
    const pairs: [string, string][] = [
      ['name, headings, emphasis (text)', 'text'],
      ['role, paragraphs, facts, meta, descriptions (neutral-400)', 'neutral-400'],
      ['links and outline tags (accent)', 'accent'],
    ];
    for (const [label, token] of pairs) {
      it(`T13 AC26: ${theme}: ${label} on bg is at least 4.5:1`, () => {
        const r = contrastRatio(get(token), bg);
        expect(r, `${token} on bg = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
      });
    }
  });
}
