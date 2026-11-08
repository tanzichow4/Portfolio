import { describe, expect, it } from 'vitest';
import css from '../src/theme.css?raw';
import { resolveTheme } from './helpers/cssTokens';
import { contrastRatio } from './helpers/contrast';

const THEMES = ['dark', 'light'] as const;
const TEXT_TOKENS = ['text', 'accent', 'neutral-300', 'neutral-400', 'neutral-500', 'accent-400'];
const TAG_PAIRS: [string, string][] = [
  ['accent-100', 'accent-800'],
  ['neutral-100', 'neutral-800'],
  ['accent-2-100', 'accent-2-800'],
];
const MIN = 4.5;

describe('contrast (WCAG 2.x, at least 4.5:1)', () => {
  it('reads a non-empty theme.css', () => {
    expect(css.length).toBeGreaterThan(500);
  });

  for (const theme of THEMES) {
    const tokens = resolveTheme(css, theme);
    const get = (n: string) => {
      const v = tokens[`--color-${n}`];
      if (!v) throw new Error(`--color-${n} not defined in ${theme}`);
      return v;
    };

    for (const bgName of ['surface', 'bg']) {
      for (const fg of TEXT_TOKENS) {
        it(`AC4: ${theme}: ${fg} on ${bgName}`, () => {
          const ratio = contrastRatio(get(fg), get(bgName));
          expect(ratio, `${fg} on ${bgName} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(MIN);
        });
      }
    }

    for (const [fg, bg] of TAG_PAIRS) {
      it(`AC17: ${theme}: tag ${fg} on ${bg}`, () => {
        const ratio = contrastRatio(get(fg), get(bg));
        expect(ratio, `${fg} on ${bg} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(MIN);
      });
    }
  }

  it('AC4: guard, the old light accent #796cbf on bg is below the threshold', () => {
    expect(contrastRatio('#796cbf', '#e4e7f5')).toBeLessThan(MIN);
  });
});
