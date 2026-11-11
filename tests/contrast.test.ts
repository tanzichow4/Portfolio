import { describe, expect, it } from 'vitest';
import css from '../src/theme.css?raw';
import { parseBlock, resolveTheme } from './helpers/cssTokens';
import { contrastRatio } from './helpers/contrast';

const THEMES = ['dark', 'light'] as const;
const TEXT_TOKENS = ['text', 'accent', 'neutral-300', 'neutral-400', 'neutral-500', 'accent-400'];
const TAG_PAIRS: [string, string][] = [
  ['accent-100', 'accent-800'],
  ['neutral-100', 'neutral-800'],
  ['accent-2-100', 'accent-2-800'],
];
const MIN = 4.5;
const ORG_PILL = ['org-pill-text', 'org-pill-bg'] as const;

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

  for (const theme of THEMES) {
    const t = resolveTheme(css, theme);
    it(`T17 AC9: ${theme}: org pill text on bg`, () => {
      const fg = t['--color-org-pill-text'];
      const bg = t['--color-org-pill-bg'];
      expect(fg, 'text token').toBeTruthy();
      expect(bg, 'bg token').toBeTruthy();
      const ratio = contrastRatio(fg, bg);
      expect(ratio, `org pill = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(MIN);
    });

    it(`T17 AC8: ${theme}: org pill tokens are six digit hex`, () => {
      for (const n of ORG_PILL) expect(t[`--color-${n}`], n).toMatch(/^#[0-9a-f]{6}$/i);
    });
  }

  it('T17 AC8: light defines both pill tokens itself and its bg differs from the tag fill', () => {
    const light = parseBlock(css, "[data-theme='light']");
    for (const n of ORG_PILL) expect(light[`--color-${n}`], n).toBeTruthy();
    const resolved = resolveTheme(css, 'light');
    expect(light['--color-org-pill-bg'].toLowerCase()).not.toBe(
      resolved['--color-accent-800'].toLowerCase(),
    );
  });

  for (const theme of THEMES) {
    const t = resolveTheme(css, theme);
    for (const bgName of ['bg', 'surface']) {
      it(`T18 AC10: ${theme}: star (accent) on ${bgName} >= 3`, () => {
        const ratio = contrastRatio(t['--color-accent'], t[`--color-${bgName}`]);
        expect(ratio, `accent on ${bgName} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(3);
      });
    }
    it(`T18 AC21: ${theme}: scroll thumb (neutral-500) on track (surface) >= 3`, () => {
      const ratio = contrastRatio(t['--color-neutral-500'], t['--color-surface']);
      expect(ratio, `thumb on track = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(3);
    });
  }

  it('AC4: guard, the old light accent #796cbf on bg is below the threshold', () => {
    expect(contrastRatio('#796cbf', '#e4e7f5')).toBeLessThan(MIN);
  });
});
