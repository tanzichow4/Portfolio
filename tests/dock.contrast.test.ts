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
  describe(`T06 dock contrast (${theme})`, () => {
    const tokens = resolveTheme(css, theme);
    const get = (n: string) => {
      const v = tokens[`--color-${n}`];
      if (!v) throw new Error(`--color-${n} missing in ${theme}`);
      return v;
    };

    it(`T06 AC28: ${theme}: window icon (accent-400) on bg is at least 3:1`, () => {
      const r = contrastRatio(get('accent-400'), get('bg'));
      expect(r, r.toFixed(2)).toBeGreaterThanOrEqual(3);
    });
    it(`T06 AC28: ${theme}: link icon (neutral-300) on bg is at least 3:1`, () => {
      const r = contrastRatio(get('neutral-300'), get('bg'));
      expect(r, r.toFixed(2)).toBeGreaterThanOrEqual(3);
    });
    it(`T06 AC28: ${theme}: hovered link icon (text) on bg is at least 3:1`, () => {
      const r = contrastRatio(get('text'), get('bg'));
      expect(r, r.toFixed(2)).toBeGreaterThanOrEqual(3);
    });
    for (const base of ['bg', 'section', 'accent-900']) {
      it(`T06 AC28: ${theme}: focus ring (accent) on the dock over ${base} is at least 3:1`, () => {
        const dock = mix(get('surface'), get(base), 78);
        const r = contrastRatio(get('accent'), dock);
        expect(r, `${r.toFixed(2)} on ${dock}`).toBeGreaterThanOrEqual(3);
      });
    }
  });
}
