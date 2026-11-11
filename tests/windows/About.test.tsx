import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import aboutSrc from '../../src/windows/About.tsx?raw';
import About from '../../src/windows/About';
import css from '../../src/windows/About.css?raw';
import { stripComments } from '../helpers/cssTokens';
import { ABOUT_COPY, ABOUT_LABELS, FACTS } from '../../src/data';
import { WIN_META } from '../../src/logic/windows';
import { DOCK_CLEARANCE, layout } from '../../src/logic/layout';

const clean = stripComments(css);

/** Declarations of the rule(s) whose selector (outside any at-rule) or inside a media block matches. */
function decls(selector: string, scope: 'top' | 'reduce' = 'top'): Record<string, string> {
  let src: string;
  if (scope === 'reduce') {
    const i = clean.search(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    if (i < 0) throw new Error('no reduced-motion block');
    const open = clean.indexOf('{', i);
    let depth = 1;
    let j = open + 1;
    while (depth > 0 && j < clean.length) {
      if (clean[j] === '{') depth++;
      else if (clean[j] === '}') depth--;
      j++;
    }
    src = clean.slice(open + 1, j - 1);
  } else {
    src = clean.replace(/@media[^{]*\{([^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  }
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  const out: Record<string, string> = {};
  let found = false;
  for (const m of src.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (norm(m[1]) !== selector) continue;
    found = true;
    for (const d of m[2].split(';')) {
      const k = d.indexOf(':');
      if (k > 0)
        out[d.slice(0, k).trim()] = d
          .slice(k + 1)
          .replace(/\s+/g, ' ')
          .trim();
    }
  }
  if (!found) throw new Error(`no rule for ${selector}`);
  return out;
}

describe('T07 About body: content', () => {
  it('T07 AC1: renders a non-empty body', () => {
    const { container } = render(<About dispatch={vi.fn()} />);
    expect(container.textContent?.trim().length).toBeGreaterThan(0);
  });

  it('T07 AC2: paragraph text matches ABOUT_COPY in order', () => {
    const { container } = render(<About dispatch={vi.fn()} />);
    const paras = Array.from(container.querySelectorAll('p'));
    expect(paras.map((p) => p.textContent)).toEqual(
      ABOUT_COPY.map((p) => p.map((s) => s.text).join('')),
    );
  });

  it('T07 AC22: emphasized phrases are exactly the em segments, in order', () => {
    const { container } = render(<About dispatch={vi.fn()} />);
    const expected = ABOUT_COPY.flat()
      .filter((s) => s.em)
      .map((s) => s.text);
    expect(expected.length).toBeGreaterThan(0);
    const ems = Array.from(container.querySelectorAll('p em, p strong, p b'));
    expect(ems.map((e) => e.textContent)).toEqual(expected);
  });

  it('T07 AC23: facts render as a list in FACTS order with labels', () => {
    const { container } = render(<About dispatch={vi.fn()} />);
    const list = container.querySelector('ul');
    expect(list).not.toBeNull();
    const items = Array.from(list!.querySelectorAll(':scope > li'));
    expect(items.map((li) => li.textContent?.trim())).toEqual(FACTS.map((f) => f.label));
  });

  it('T07 AC23: each fact has exactly one hidden icon', () => {
    const { container } = render(<About dispatch={vi.fn()} />);
    for (const li of container.querySelectorAll('ul > li')) {
      const svgs = li.querySelectorAll('svg');
      expect(svgs).toHaveLength(1);
      expect(svgs[0].getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('T07 AC22: facts list comes after the paragraphs', () => {
    const { container } = render(<About dispatch={vi.fn()} />);
    const lastP = Array.from(container.querySelectorAll('p')).pop()!;
    const ul = container.querySelector('ul')!;
    expect(lastP.compareDocumentPosition(ul) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('T07 AC2: no hard-coded email or copy beyond data.ts (text equals data text only)', () => {
    const { container } = render(<About dispatch={vi.fn()} />);
    const expected =
      ABOUT_COPY.map((p) => p.map((s) => s.text).join('')).join('') +
      // DELIBERATE REQUIREMENT CHANGE (T16 AC5): the viz button label sits between the paragraphs and the facts.
      ABOUT_LABELS.viz +
      FACTS.map((f) => f.label).join('');
    expect(container.textContent).toBe(expected);
  });
});

describe('T16 About copy', () => {
  it('T16 AC1: first paragraph is exactly the five literal segments', () => {
    expect(ABOUT_COPY[0]).toEqual([
      { text: "I'm a software engineer who enjoys seeing projects built from the ground up and " },
      { text: 'making ideas come to life', em: true },
      { text: ". I'm fascinated by random facts and love " },
      { text: 'visualizing data', em: true },
      { text: '.' },
    ]);
  });

  it('T16 AC1: apostrophes in the first paragraph are straight', () => {
    const text = ABOUT_COPY[0].map((s) => s.text).join('');
    expect(text).not.toMatch(/[‘’]/);
    expect(text).toContain("I'm");
  });

  it('T16 AC1: the old "whole arc" / "last pixel" copy appears nowhere in src/', () => {
    const files = import.meta.glob('/src/**/*.{ts,tsx}', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const entries = Object.entries(files);
    expect(entries.length).toBeGreaterThan(5);
    for (const [path, text] of entries) {
      expect(text, path).not.toContain('last pixel');
      expect(text, path).not.toContain('whole arc');
    }
  });

  it('T16 AC2: "Currently building" paragraph is unchanged, segment for segment', () => {
    expect(ABOUT_COPY[1]).toEqual([
      { text: 'Currently building ' },
      { text: 'web platforms, automation and data tooling', em: true },
      { text: '.' },
    ]);
  });

  it('T16 AC2: ABOUT_COPY has exactly two paragraphs and FACTS labels are unchanged', () => {
    expect(ABOUT_COPY).toHaveLength(2);
    expect(FACTS.map((f) => f.label)).toEqual([
      'Calgary, AB',
      'Python · JavaScript · Swift',
      'Sports enthusiast',
      'Mediocre at chess',
      'Loves to game',
    ]);
  });

  it('T16 AC3: renders both paragraphs with em segments as em.about-em, then the facts list', () => {
    const { container } = render(<About dispatch={vi.fn()} />);
    const paras = Array.from(container.querySelectorAll('p'));
    expect(paras.map((p) => p.textContent)).toEqual([
      "I'm a software engineer who enjoys seeing projects built from the ground up and making ideas come to life. I'm fascinated by random facts and love visualizing data.",
      'Currently building web platforms, automation and data tooling.',
    ]);
    expect(paras.every((p) => p.classList.contains('about-para'))).toBe(true);
    const ems = Array.from(container.querySelectorAll('p em.about-em'));
    expect(ems.map((e) => e.textContent)).toEqual([
      'making ideas come to life',
      'visualizing data',
      'web platforms, automation and data tooling',
    ]);
    expect(container.querySelectorAll('ul.about-facts')).toHaveLength(1);
    const ul = container.querySelector('ul')!;
    expect(paras[1].compareDocumentPosition(ul) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('T07 About body: height', () => {
  it('T07 AC47: about WIN_META height is the measured 331 and y position inputs unchanged', () => {
    // DELIBERATE REQUIREMENT CHANGE (T16 AC9): the viz button adds height, measured 331 -> 396.
    expect(WIN_META.about.height).toBe(396);
    expect(WIN_META.about.width).toBe(420);
  });
});

describe('T07 About.css', () => {
  it('T07 AC22: body padding, font size, line height, colour, selectable', () => {
    const r = decls('.about-body');
    expect(r.padding).toBe('22px 24px 24px');
    expect(r['font-size']).toBe('14px');
    expect(r['line-height']).toBe('1.65');
    expect(r.color).toBe('var(--color-neutral-400)');
    expect(r['user-select']).toBe('text');
    expect(r['-webkit-user-select']).toBe('text');
  });

  it('T07 AC22: emphasized phrases use --color-text', () => {
    expect(decls('.about-em').color).toBe('var(--color-text)');
  });

  it('T07 AC23: pill styling', () => {
    const r = decls('.fact-face');
    expect(r.padding).toBe('6px 11px');
    expect(r['border-radius']).toBe('999px');
    expect(r.background).toBe('var(--color-bg)');
    expect(r['box-shadow']).toBe('var(--shadow-sm)');
    expect(r['font-size']).toBe('12.5px');
    expect(r.color).toBe('var(--color-neutral-300)');
  });

  it('T07 AC23: icon is accent coloured', () => {
    expect(decls('.fact-face svg').color).toBe('var(--color-accent)');
  });

  it('T07 AC24: hover rotates and lifts the pill face on --ease-bouncy', () => {
    expect(decls('.fact:hover .fact-face').transform).toBe('rotate(-4deg) translateY(-3px)');
    expect(decls('.fact-face').transition).toMatch(/transform[^,;]*var\(--ease-bouncy\)/);
  });

  it('T07 AC9: hover is on a stationary host, the face does not capture the pointer', () => {
    // The host (.fact) never transforms; only the inner face does.
    expect(decls('.fact').transform).toBeUndefined();
    expect(decls('.fact-face')['pointer-events']).toBe('none');
  });

  it('T07 AC8: reduced motion removes the hover transform', () => {
    expect(decls('.fact:hover .fact-face', 'reduce').transform).toBe('none');
  });

  it('T07 AC7: no hard-coded colours', () => {
    expect(clean).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(clean).not.toMatch(/\b(rgb|hsl)a?\(/);
  });
});

describe('T16 About viz button', () => {
  const btn = (c: HTMLElement) => c.querySelector('button')!;

  it('T16 AC5: exactly one native type=button named by ABOUT_LABELS.viz', () => {
    expect(ABOUT_LABELS.viz).toBe('See some data viz');
    const { container, getByRole } = render(<About dispatch={vi.fn()} />);
    expect(container.querySelectorAll('button')).toHaveLength(1);
    expect(btn(container).getAttribute('type')).toBe('button');
    expect(btn(container).textContent).toBe('See some data viz');
    expect(getByRole('button', { name: 'See some data viz' })).toBe(btn(container));
  });

  it('T16 AC5: the label is not hard-coded in About.tsx', () => {
    expect(aboutSrc).not.toContain('See some data viz');
    expect(aboutSrc).not.toContain('data viz');
  });

  it('T16 AC6: the button follows the last paragraph and precedes the facts list', () => {
    const { container } = render(<About dispatch={vi.fn()} />);
    const lastP = Array.from(container.querySelectorAll('p')).pop()!;
    const ul = container.querySelector('ul')!;
    const b = btn(container);
    expect(lastP.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(b.compareDocumentPosition(ul) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('T16 AC6: the button is the only focusable element in the body', () => {
    const { container } = render(<About dispatch={vi.fn()} />);
    const focusable = container.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex], [contenteditable]',
    );
    expect(Array.from(focusable)).toEqual([btn(container)]);
  });

  it('T16 AC6: Tab from the start of the body lands on the button', async () => {
    const { container } = render(<About dispatch={vi.fn()} />);
    await userEvent.setup().tab();
    expect(document.activeElement).toBe(btn(container));
  });

  it('T16 AC7: a click dispatches exactly one open viz action', async () => {
    const dispatch = vi.fn();
    const { container } = render(<About dispatch={dispatch} />);
    await userEvent.setup().click(btn(container));
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: 'open', id: 'viz' });
  });

  it('T16 AC7: Enter dispatches exactly one open viz action', async () => {
    const dispatch = vi.fn();
    const { container } = render(<About dispatch={dispatch} />);
    btn(container).focus();
    await userEvent.setup().keyboard('{Enter}');
    expect(dispatch.mock.calls).toEqual([[{ type: 'open', id: 'viz' }]]);
  });

  it('T16 AC7: Space dispatches exactly one open viz action', async () => {
    const dispatch = vi.fn();
    const { container } = render(<About dispatch={dispatch} />);
    btn(container).focus();
    await userEvent.setup().keyboard(' ');
    expect(dispatch.mock.calls).toEqual([[{ type: 'open', id: 'viz' }]]);
  });

  it('T16 AC7: rendering and focusing alone dispatch nothing', () => {
    const dispatch = vi.fn();
    const { container } = render(<About dispatch={dispatch} />);
    btn(container).focus();
    fireEvent.pointerDown(btn(container));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('T16 AC8: uses the shared secondary button classes, no icon', () => {
    const { container } = render(<About dispatch={vi.fn()} />);
    const b = btn(container);
    expect(b.classList.contains('btn')).toBe(true);
    expect(b.classList.contains('btn-secondary')).toBe(true);
    expect(b.querySelector('svg')).toBeNull();
  });

  it('T16 AC8: About.css adds no colours or motion for the button', () => {
    expect(clean).not.toMatch(/#[0-9a-fA-F]{3,8}b/);
    expect(clean).not.toMatch(/b(rgb|hsl)a?\(/);
    expect(clean).not.toMatch(/\.about-viz[^{]*\{[^}]*(transform|transition|animation)/);
  });

  it('T16 AC9: about stays at (640, 64) and ends above the dock clearance at 1280x720', () => {
    const p = layout(1280, 720).about;
    expect(p).toEqual({ x: 640, y: 64 });
    expect(p.y + WIN_META.about.height).toBeLessThanOrEqual(720 - DOCK_CLEARANCE);
    expect(WIN_META.about.width).toBe(420);
  });
});
