import { describe, expect, it } from 'vitest';
import css from '../src/Dock.css?raw';
import theme from '../src/theme.css?raw';
import { stripComments } from './helpers/cssTokens';

const clean = stripComments(css);

/** Declarations of the single top-level rule whose selector matches exactly. */
function rule(selector: string): Record<string, string> {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  const out: Record<string, string> = {};
  let found = false;
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (norm(m[1]) !== selector) continue;
    found = true;
    for (const d of m[2].split(';')) {
      const i = d.indexOf(':');
      if (i > 0)
        out[d.slice(0, i).trim()] = d
          .slice(i + 1)
          .replace(/\s+/g, ' ')
          .trim();
    }
  }
  if (!found) throw new Error(`no rule for ${selector}`);
  return out;
}

describe('T06 Dock.css at-rest styles', () => {
  it('T06 AC1: .dock is fixed, centred with auto margins, 14px from the bottom', () => {
    const r = rule('.dock');
    expect(r.position).toBe('fixed');
    expect(r.bottom).toBe('14px');
    expect(r.left).toBe('0');
    expect(r.right).toBe('0');
    expect(r['width']).toBe('fit-content');
    expect(r['margin-inline']).toBe('auto');
    expect(r.display).toBe('flex');
  });

  it('T06 AC1: .dock has padding 8px, radius 18px, gap 6px, blur 12px, shadow-md, z-index 900', () => {
    const r = rule('.dock');
    expect(r.padding).toBe('8px');
    expect(r['border-radius']).toBe('18px');
    expect(r.gap).toBe('6px');
    expect(r['backdrop-filter']).toBe('blur(12px)');
    expect(r['box-shadow']).toBe('var(--shadow-md)');
    expect(r['z-index']).toBe('900');
    expect(r.background).toBe('color-mix(in srgb, var(--color-surface) 78%, transparent)');
  });

  it('T06 AC1: .dock does not use a transform or overflow (no blur, no clipped ring)', () => {
    const r = rule('.dock');
    expect(r).not.toHaveProperty('transform');
    expect(r).not.toHaveProperty('translate');
    expect(Object.keys(r).filter((k) => k.startsWith('overflow'))).toEqual([]);
    expect(clean).not.toMatch(/overflow/);
  });

  it('T06 AC2: the dock is 62px tall (8 + 46 + 8) so its top is 76px above the bottom', () => {
    const dock = rule('.dock');
    const item = rule('.dock-item');
    expect(dock.bottom).toBe('14px');
    expect(dock.padding).toBe('8px');
    expect(item.height).toBe('46px');
    expect(dock).not.toHaveProperty('height');
    expect(14 + 8 + 46 + 8).toBe(76);
  });

  it('T06 AC4: the host is 46x46, radius 12px, pointer cursor, never transformed', () => {
    const r = rule('.dock-item');
    expect(r.width).toBe('46px');
    expect(r.height).toBe('46px');
    expect(r['border-radius']).toBe('12px');
    expect(r.cursor).toBe('pointer');
    expect(r).not.toHaveProperty('transform');
  });

  it('T06 AC4: the face carries the --color-bg background and 12px radius', () => {
    const r = rule('.dock-face');
    expect(r.background).toBe('var(--color-bg)');
    expect(r['border-radius']).toBe('12px');
  });

  it('T06 AC4: window icons use --color-accent-400', () => {
    expect(rule('.dock-win .dock-face').color).toBe('var(--color-accent-400)');
  });

  it('T06 AC5: link icons use --color-neutral-300 at rest', () => {
    expect(rule('.dock-link .dock-face').color).toBe('var(--color-neutral-300)');
  });

  it('T06 AC5: the face fills the 46x46 host so the face is 46x46', () => {
    const r = rule('.dock-face');
    expect(r.position).toBe('absolute');
    expect(r.inset).toBe('0');
    expect(rule('.dock-item').position).toBe('relative');
  });

  it('T06 AC6: divider is 1px x 34px, --color-divider, margin 0 4px 6px', () => {
    const r = rule('.dock-sep');
    expect(r.width).toBe('1px');
    expect(r.height).toBe('34px');
    expect(r.background).toBe('var(--color-divider)');
    expect(r.margin).toBe('0 4px 6px');
  });

  it('T06 AC7: dot is 4px, --color-accent, centred, 0.2s opacity transition', () => {
    const r = rule('.dock-dot');
    expect(r.width).toBe('4px');
    expect(r.height).toBe('4px');
    expect(r.background).toBe('var(--color-accent)');
    expect(r.left).toBe('50%');
    expect(r['margin-left']).toBe('-2px');
    expect(r.transition).toMatch(/^opacity (0?\.2s|200ms)\b/);
  });

  it('T06 AC7: dot sits within the 8px dock padding (its lowest edge is at most 8px below the button)', () => {
    const r = rule('.dock-dot');
    const bottom = parseFloat(r.bottom);
    expect(bottom).toBeLessThan(0);
    expect(-bottom).toBeLessThanOrEqual(8);
    expect(-bottom).toBeGreaterThanOrEqual(4);
    expect(r.position).toBe('absolute');
  });

  it('T06 AC8: no hard-coded colours (hex, rgb, hsl, named) anywhere in Dock.css', () => {
    expect(clean).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(clean).not.toMatch(/\b(rgb|rgba|hsl|hsla)\(/i);
    const colourProps =
      clean.match(/(?:^|[;{\s])(?:color|background(?:-color)?)\s*:\s*[^;}]+/g) ?? [];
    for (const decl of colourProps) {
      const value = decl.split(':')[1].trim();
      expect(value, decl).toMatch(/var\(--|transparent|inherit|currentColor/);
    }
  });

  it('T06 AC8: every var(--x) used is defined in theme.css', () => {
    const used = new Set([...clean.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]));
    expect(used.size).toBeGreaterThan(0);
    for (const v of used) expect(theme, v).toContain(`${v}:`);
  });

  it('T06 AC27: no outline suppression and no all: unset', () => {
    expect(clean).not.toMatch(/outline\s*:\s*(none|0)\b/);
    expect(clean).not.toMatch(/outline-style\s*:\s*none/);
    expect(clean).not.toMatch(/all\s*:\s*unset/);
  });

  it('T06 AC27: the global :focus-visible ring exists in theme.css', () => {
    expect(theme).toMatch(/:focus-visible[^{]*\{[^}]*outline:\s*2px solid var\(--color-accent\)/);
  });
});
