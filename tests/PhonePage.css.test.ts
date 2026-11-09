import { describe, expect, it } from 'vitest';
import css from '../src/PhonePage.css?raw';
import theme from '../src/theme.css?raw';
import { stripComments } from './helpers/cssTokens';

const clean = stripComments(css);
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
const rules = [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
  selectors: m[1].split(',').map(norm),
  body: m[2],
}));

function decls(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  let found = false;
  for (const r of rules) {
    if (!r.selectors.includes(selector)) continue;
    found = true;
    for (const d of r.body.split(';')) {
      const k = d.indexOf(':');
      if (k > 0) out[d.slice(0, k).trim()] = norm(d.slice(k + 1));
    }
  }
  if (!found) throw new Error(`no rule for ${selector}`);
  return out;
}

describe('T13 PhonePage.css scoping (AC16)', () => {
  it('T13 AC16: the stylesheet has rules (parser sanity)', () => {
    expect(rules.length).toBeGreaterThan(10);
  });

  it('T13 AC16: every html/body/#root selector starts with html.phone-view, every other with .phone', () => {
    for (const r of rules) {
      for (const s of r.selectors) {
        if (/^(html|body|#root)\b/.test(s)) {
          expect(s.startsWith('html.phone-view'), s).toBe(true);
        } else {
          expect(s.startsWith('.phone'), s).toBe(true);
        }
      }
    }
  });

  it('T13 AC16: no bare element or universal selectors', () => {
    for (const r of rules) {
      for (const s of r.selectors)
        expect(s, s).not.toMatch(/^(\*|a|p|ul|li|h[1-6]|main|section|em|span)\b/);
    }
  });

  it('T13 AC16: the scroll opt-out is under html.phone-view', () => {
    expect(decls('html.phone-view body').overflow).toBe('visible');
    expect(decls('html.phone-view').height).toBe('auto');
  });

  it('T13 AC16: theme.css still has body overflow hidden and the 100% height rule', () => {
    const t = stripComments(theme);
    expect(t).toMatch(/body\s*\{[^}]*overflow:\s*hidden/);
    expect(t).toMatch(/html,\s*body,\s*#root\s*\{[^}]*height:\s*100%/);
  });

  it('T13 AC16: no user-select or overflow-x override', () => {
    expect(clean).not.toMatch(/user-select/);
    expect(clean).not.toMatch(/overflow-x/);
  });
});

describe('T13 PhonePage.css colours (AC13)', () => {
  const allowed = new Set(['var(--color-text)', 'var(--color-neutral-400)', 'var(--color-accent)']);

  it('T13 AC13: every colour value is one of the three allowed tokens', () => {
    const colours = [...clean.matchAll(/(?<![-\w])color:\s*([^;}]+)/g)].map((m) => norm(m[1]));
    expect(colours.length).toBeGreaterThan(0);
    for (const c of colours) expect(allowed.has(c), c).toBe(true);
  });

  it('T13 AC13: no hex, rgb(a), hsl, opacity, color-mix or background colour', () => {
    expect(clean).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(clean).not.toMatch(/\b(rgba?|hsla?)\(/);
    expect(clean).not.toMatch(/opacity/);
    expect(clean).not.toMatch(/color-mix/);
    expect(clean).not.toMatch(/background/);
  });

  it('T13 AC13: every var() reference is an existing token', () => {
    for (const m of clean.matchAll(/var\((--[\w-]+)\)/g)) {
      expect(theme, m[1]).toContain(`${m[1]}:`);
    }
  });
});

describe('T13 PhonePage.css motion (AC27)', () => {
  for (const prop of [
    'transition',
    'animation',
    'scroll-behavior',
    '@media',
    'touch-action',
    '@keyframes',
    'transform',
  ]) {
    it(`T13 AC27: no ${prop}`, () => {
      expect(clean).not.toContain(prop);
    });
  }
});

describe('T13 PhonePage.css layout (AC15, AC25)', () => {
  it('T13 AC25: .phone-link is at least 44px high', () => {
    expect(decls('.phone-link')['min-height']).toBe('44px');
  });
  it('T13 AC25: .phone-link is a box that honours min-height', () => {
    expect(decls('.phone-link').display).toMatch(/^(inline-flex|flex|inline-block|block)$/);
  });
  it('T13 AC15: .phone wraps long text and is a capped single column', () => {
    const d = decls('.phone');
    expect(d['overflow-wrap']).toBe('anywhere');
    expect(d['max-width']).toBe('640px');
  });
  it('T13 AC15: tag rows wrap', () => {
    expect(decls('.phone-tags')['flex-wrap']).toBe('wrap');
  });
  it('T13 AC15: links cannot exceed their container', () => {
    expect(decls('.phone-link')['max-width']).toBe('100%');
  });
});
