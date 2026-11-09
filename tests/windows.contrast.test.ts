import { describe, expect, it } from 'vitest';
import css from '../src/theme.css?raw';
import { resolveTheme } from './helpers/cssTokens';
import { contrastRatio } from './helpers/contrast';

type Rgb = [number, number, number];
const toRgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
const toHex = (c: Rgb) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
/** Composites `fg` at `alpha` over the opaque colour `bg`. */
const over = (fg: string, alpha: number, bg: string): string => {
  const f = toRgb(fg);
  const b = toRgb(bg);
  return toHex(f.map((v, i) => v * alpha + b[i] * (1 - alpha)) as Rgb);
};

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

    const tabPairs: [string, string][] = [
      ['experience inactive tab (neutral-500)', 'neutral-500'],
      ['experience date (neutral-500)', 'neutral-500'],
      ['experience description (neutral-400)', 'neutral-400'],
      ['experience role (text)', 'text'],
      ['experience "@ org" (accent)', 'accent'],
    ];
    for (const [label, token] of tabPairs) {
      it(`T07 AC12: ${theme}: ${label} on surface is at least 4.5:1`, () => {
        const r = contrastRatio(get(token), surface);
        expect(r, r.toFixed(2)).toBeGreaterThanOrEqual(4.5);
      });
    }

    const tagPairs: [string, string, string][] = [
      ['tag-accent text (accent-100) on accent-800', 'accent-100', 'accent-800'],
      ['tag-neutral text (neutral-100) on neutral-800', 'neutral-100', 'neutral-800'],
    ];
    for (const [label, fg, bg] of tagPairs) {
      it(`T07 AC12: ${theme}: ${label} is at least 4.5:1`, () => {
        const r = contrastRatio(get(fg), get(bg));
        expect(r, r.toFixed(2)).toBeGreaterThanOrEqual(4.5);
      });
    }

    const composited: [string, string, string, number][] = [
      [
        'experience active tab label (accent-400) on accent 12% over surface',
        'accent-400',
        'accent',
        0.12,
      ],
      [
        'primary label (accent-300) hovered on accent 12% over surface',
        'accent-300',
        'accent',
        0.12,
      ],
      [
        'primary label (accent-300) pressed on accent 22% over surface',
        'accent-300',
        'accent',
        0.22,
      ],
      ['"Say hi" label hovered on text 7% over surface', 'text', 'text', 0.07],
      ['"Say hi" label pressed on text 14% over surface', 'text', 'text', 0.14],
    ];
    for (const [label, fg, tint, alpha] of composited) {
      it(`T07 AC12: ${theme}: ${label} is at least 4.5:1`, () => {
        const bg = over(get(tint), alpha, surface);
        const r = contrastRatio(get(fg), bg);
        expect(r, r.toFixed(2)).toBeGreaterThanOrEqual(4.5);
      });
    }
  });
}
