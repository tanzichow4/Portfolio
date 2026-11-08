import { describe, expect, it } from 'vitest';
import css from '../src/theme.css?raw';
import { resolveTheme } from './helpers/cssTokens';
import { contrastRatio, hexToRgb } from './helpers/contrast';

/** Blends `fg` over `bg` at `pct` percent opacity and returns #rrggbb. */
function mix(fg: string, bg: string, pct: number): string {
  const a = hexToRgb(fg);
  const b = hexToRgb(bg);
  const out = a.map((v, i) => Math.round((v * pct) / 100 + b[i] * (1 - pct / 100)));
  return '#' + out.map((v) => v.toString(16).padStart(2, '0')).join('');
}

for (const theme of ['dark', 'light'] as const) {
  describe(`menubar contrast (${theme})`, () => {
    const tokens = resolveTheme(css, theme);
    const get = (n: string) => {
      const v = tokens[`--color-${n}`];
      if (!v) throw new Error(`--color-${n} missing in ${theme}`);
      return v;
    };
    const ratio = (a: string, b: string) => contrastRatio(a, b);

    const surface = get('surface');
    const hover = mix(get('accent'), surface, 16);
    const pressed = mix(get('accent'), surface, 26);

    it(`AC35: ${theme}: menu text on surface is at least 4.5:1`, () => {
      const r = ratio(get('text'), surface);
      expect(r, r.toFixed(2)).toBeGreaterThanOrEqual(4.5);
    });
    it(`AC35: ${theme}: menu text on accent 16% (hover) is at least 4.5:1`, () => {
      const r = ratio(get('text'), hover);
      expect(r, r.toFixed(2)).toBeGreaterThanOrEqual(4.5);
    });
    it(`AC35: ${theme}: menu text on accent 26% (pressed) is at least 4.5:1`, () => {
      const r = ratio(get('text'), pressed);
      expect(r, r.toFixed(2)).toBeGreaterThanOrEqual(4.5);
    });
    it(`AC35: ${theme}: hint (neutral-500) on surface is at least 4.5:1`, () => {
      const r = ratio(get('neutral-500'), surface);
      expect(r, r.toFixed(2)).toBeGreaterThanOrEqual(4.5);
    });
    it(`AC35: ${theme}: the check mark (accent) on surface is at least 3:1`, () => {
      const r = ratio(get('accent'), surface);
      expect(r, r.toFixed(2)).toBeGreaterThanOrEqual(3);
    });

    for (const base of ['bg', 'section', 'accent-900']) {
      const bar = mix(get('bg'), get(base), 72);
      it(`AC35: ${theme}: neutral-300 labels and clock on the bar over ${base} are at least 4.5:1`, () => {
        const r = ratio(get('neutral-300'), bar);
        expect(r, `${r.toFixed(2)} on ${bar}`).toBeGreaterThanOrEqual(4.5);
      });
      it(`AC35: ${theme}: the accent tanzi.os label on the bar over ${base} is at least 4.5:1`, () => {
        const r = ratio(get('accent'), bar);
        expect(r, `${r.toFixed(2)} on ${bar}`).toBeGreaterThanOrEqual(4.5);
      });
      it(`AC35: ${theme}: link and toggle icons (neutral-400) on the bar over ${base} are at least 3:1`, () => {
        const r = ratio(get('neutral-400'), bar);
        expect(r, `${r.toFixed(2)} on ${bar}`).toBeGreaterThanOrEqual(3);
      });
      it(`AC35: ${theme}: icons on hover (text) on the bar over ${base} are at least 3:1`, () => {
        const r = ratio(get('text'), bar);
        expect(r, `${r.toFixed(2)} on ${bar}`).toBeGreaterThanOrEqual(3);
      });
    }
  });
}

describe('mix helper', () => {
  it('blends at the given opacity', () => {
    expect(mix('#ffffff', '#000000', 50)).toBe('#808080');
    expect(mix('#102030', '#ffffff', 100)).toBe('#102030');
    expect(mix('#102030', '#ffffff', 0)).toBe('#ffffff');
  });
});
