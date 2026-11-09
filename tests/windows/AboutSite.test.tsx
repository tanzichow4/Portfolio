import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import AboutSite from '../../src/windows/AboutSite';
import css from '../../src/windows/AboutSite.css?raw';
import { stripComments } from '../helpers/cssTokens';
import { SITE_COPY, VERSION } from '../../src/data';
import { WIN_META, DOCK_IDS } from '../../src/logic/windows';
import { DOCK_CLEARANCE, layout } from '../../src/logic/layout';

const clean = stripComments(css);
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

function block(src: string, start: number): string {
  const open = src.indexOf('{', start);
  let depth = 1;
  let j = open + 1;
  while (depth > 0 && j < src.length) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') depth--;
    j++;
  }
  return src.slice(open + 1, j - 1);
}

function decls(selector: string, scope: 'top' | 'reduce' = 'top'): Record<string, string> {
  let src: string;
  if (scope === 'reduce') {
    const i = clean.search(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    if (i < 0) throw new Error('no reduced-motion block');
    src = block(clean, i);
  } else {
    src = clean.replace(/@media[^{]*\{([^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  }
  const out: Record<string, string> = {};
  let found = false;
  for (const m of src.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (norm(m[1]) !== selector) continue;
    found = true;
    for (const d of m[2].split(';')) {
      const k = d.indexOf(':');
      if (k > 0) out[d.slice(0, k).trim()] = norm(d.slice(k + 1));
    }
  }
  if (!found) throw new Error(`no rule for ${selector}`);
  return out;
}

describe('T07 About this site body: content', () => {
  it('T07 AC1: renders a non-empty body', () => {
    const { container } = render(<AboutSite />);
    expect(container.textContent?.trim().length).toBeGreaterThan(0);
  });

  it('T07 AC25: shows mark, title, version line, description in order with exact text', () => {
    const { container } = render(<AboutSite />);
    expect(container.textContent).toBe(
      `TCtanzi.osVersion ${VERSION} · Portfolio editionA tiny desktop that happens to be a portfolio. Drag the windows, poke the dock, try the terminal.`,
    );
    expect(SITE_COPY.mark).toBe('TC');
    expect(SITE_COPY.title).toBe('tanzi.os');
  });

  it('T07 AC25: the "TC" mark is hidden from assistive technology', () => {
    const { container } = render(<AboutSite />);
    const mark = Array.from(container.querySelectorAll('[aria-hidden="true"]')).find(
      (e) => e.textContent === 'TC',
    );
    expect(mark).toBeDefined();
  });

  it('T07 AC25: the title is a heading reading tanzi.os', () => {
    const { getByRole } = render(<AboutSite />);
    expect(getByRole('heading', { name: 'tanzi.os' })).toBeTruthy();
  });

  it('T07 AC25: version line is "Version " + VERSION + " · Portfolio edition"', () => {
    const { getByText } = render(<AboutSite />);
    expect(getByText(`Version ${VERSION} · Portfolio edition`)).toBeTruthy();
  });

  it('T07 AC26: description follows the version line in a paragraph', () => {
    const { container } = render(<AboutSite />);
    const p = container.querySelector('p')!;
    expect(p.textContent).toBe(SITE_COPY.desc);
    const ver = Array.from(container.querySelectorAll('*')).find((e) =>
      e.textContent?.startsWith('Version '),
    )!;
    expect(ver.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('T07 AC25: mark is not the accessible name source of the heading', () => {
    const { container } = render(<AboutSite />);
    expect(container.querySelectorAll('h1,h2,h3')).toHaveLength(1);
  });
});

describe('T07 About this site body: height and position', () => {
  it('T07 AC47: site WIN_META is 340 x 282 (measured 281.98) and not in the dock', () => {
    expect(WIN_META.site.width).toBe(340);
    expect(WIN_META.site.height).toBe(282);
    expect(DOCK_IDS).not.toContain('site');
  });

  it('T07 AC48: site keeps its existing position formula', () => {
    expect(layout(1280, 720).site).toEqual({ x: 470, y: 180 });
    expect(layout(1920, 1080).site).toEqual({ x: 790, y: 360 });
    // Clamped below the menubar on a very short viewport.
    expect(layout(1280, 200).site.y).toBe(36);
  });

  it('T07 AC48: site rectangle clears the dock at 1280x720 and a larger viewport', () => {
    for (const [vw, vh] of [
      [1280, 720],
      [1920, 1080],
    ]) {
      const p = layout(vw, vh).site;
      expect(p.y + WIN_META.site.height).toBeLessThanOrEqual(vh - DOCK_CLEARANCE);
    }
  });
});

describe('T07 AboutSite.css', () => {
  it('T07 AC25: body padding 26px 24px 24px', () => {
    expect(decls('.site-body').padding).toBe('26px 24px 24px');
  });

  it('T07 AC25: mark is 52px, radius 14px, 1px accent outline, accent 18px weight 600', () => {
    const r = decls('.site-mark');
    expect(r.width).toBe('52px');
    expect(r.height).toBe('52px');
    expect(r['border-radius']).toBe('14px');
    expect(r.border).toBe('1px solid var(--color-accent)');
    expect(r.color).toBe('var(--color-accent)');
    expect(r['font-size']).toBe('18px');
    expect(r['font-weight']).toBe('600');
  });

  it('T07 AC25: title is 18px weight 500', () => {
    const r = decls('.site-title');
    expect(r['font-size']).toBe('18px');
    expect(r['font-weight']).toBe('500');
  });

  it('T07 AC25: version line is 12px neutral-500', () => {
    const r = decls('.site-version');
    expect(r['font-size']).toBe('12px');
    expect(r.color).toBe('var(--color-neutral-500)');
  });

  it('T07 AC26: description is 13px/1.6 neutral-400', () => {
    const r = decls('.site-desc');
    expect(r['font-size']).toBe('13px');
    expect(r['line-height']).toBe('1.6');
    expect(r.color).toBe('var(--color-neutral-400)');
  });

  it('T07 AC26: hovering the mark rotates and scales over .6s on --ease-bouncy', () => {
    expect(decls('.site-mark:hover').transform).toBe('rotate(-14deg) scale(1.1)');
    expect(decls('.site-mark').transition).toMatch(
      /transform\s+(0?\.6s|600ms)\s+var\(--ease-bouncy\)/,
    );
  });

  it('T07 AC54: reduced motion removes the mark hover transform', () => {
    expect(decls('.site-mark:hover', 'reduce').transform).toBe('none');
  });

  it('T07 AC7: no hard-coded colours', () => {
    expect(clean).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(clean).not.toMatch(/\b(rgb|hsl)a?\(/);
  });
});
