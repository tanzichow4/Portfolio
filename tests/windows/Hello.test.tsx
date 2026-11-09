import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Hello from '../../src/windows/Hello';
import css from '../../src/windows/Hello.css?raw';
import { stripComments } from '../helpers/cssTokens';
import { EMAIL, HELLO_COPY, NAME, VERBS } from '../../src/data';
import { WIN_META } from '../../src/logic/windows';

const clean = stripComments(css);
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Declarations of the top-level rule with exactly this selector (outside at-rules). */
function decls(selector: string): Record<string, string> {
  const src = clean.replace(/@media[^{]*\{([^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
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

const setup = () => {
  const dispatch = vi.fn();
  const utils = render(<Hello dispatch={dispatch} />);
  return { dispatch, ...utils };
};
const verbBtn = () => screen.getByRole('button', { name: VERBS[0] });

describe('T07 Hello body: content', () => {
  it('T07 AC1: renders a non-empty body', () => {
    const { container } = setup();
    expect(container.textContent?.trim().length).toBeGreaterThan(0);
  });

  it('T07 AC2: greeting, hint and button labels come from HELLO_COPY', () => {
    const { container } = setup();
    expect(container.textContent).toContain(HELLO_COPY.greeting);
    expect(container.textContent).toContain(HELLO_COPY.hint);
    expect(screen.getByRole('button', { name: HELLO_COPY.primary })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: HELLO_COPY.secondary })).toBeInTheDocument();
    expect(container.textContent).toContain(
      `${HELLO_COPY.verbPrefix}${VERBS[0]}${HELLO_COPY.verbSuffix}`,
    );
  });

  it('T07 AC14: the name is an h1 whose accessible name is exactly NAME', () => {
    setup();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: NAME })).toBeInTheDocument();
  });

  it('T07 AC14: exactly two aria-hidden lines: first word, then the rest followed by a period', () => {
    const { container } = setup();
    const h1 = container.querySelector('h1')!;
    const lines = Array.from(h1.querySelectorAll('.hello-line'));
    expect(lines).toHaveLength(2);
    for (const l of lines) expect(l.getAttribute('aria-hidden')).toBe('true');
    const [first, ...rest] = NAME.split(' ');
    expect(lines[0].textContent).toBe(first);
    expect(lines[1].textContent).toBe(`${rest.join(' ')}.`);
  });

  it('T07 AC14: every letter is its own element, one per character, none exposed to assistive tech', () => {
    const { container } = setup();
    const h1 = container.querySelector('h1')!;
    const letters = Array.from(h1.querySelectorAll('.hello-letter'));
    const [first, ...rest] = NAME.split(' ');
    expect(letters).toHaveLength(
      Array.from(first).length + Array.from(`${rest.join(' ')}.`).length,
    );
    for (const l of letters) {
      expect(l.closest('[aria-hidden="true"]')).not.toBeNull();
      expect(Array.from(l.textContent ?? '')).toHaveLength(1);
    }
  });

  it('T07 AC13: the waving hand is hidden from assistive technology', () => {
    const { container } = setup();
    const hand = container.querySelector('.hello-hand')!;
    expect(hand.getAttribute('aria-hidden')).toBe('true');
    expect(hand.querySelector('svg')).not.toBeNull();
  });

  it('T07 AC18: the hint has an aria-hidden icon', () => {
    const { container } = setup();
    const hint = container.querySelector('.hello-hint')!;
    expect(hint.textContent).toBe(HELLO_COPY.hint);
    const svg = hint.querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('T07 Hello body: verb', () => {
  it('T07 AC16: the verb is a native type=button whose name is the current verb, starting at the first', () => {
    setup();
    const b = verbBtn();
    expect(b.tagName).toBe('BUTTON');
    expect(b).toHaveAttribute('type', 'button');
    expect(b.textContent).toBe(VERBS[0]);
  });

  it('T07 AC17: clicking cycles through VERBS in order and wraps to the first', async () => {
    const user = userEvent.setup();
    setup();
    for (let i = 1; i <= VERBS.length; i++) {
      await user.click(screen.getByRole('button', { name: VERBS[i - 1] }));
      const want = VERBS[i % VERBS.length];
      expect(screen.getByRole('button', { name: want })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: VERBS[0] })).toBeInTheDocument();
  });

  it('T07 AC17: Enter advances the verb and Space advances it, each by exactly one', async () => {
    const user = userEvent.setup();
    setup();
    verbBtn().focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: VERBS[1] })).toBeInTheDocument();
    await user.keyboard(' ');
    const b = screen.getByRole('button', { name: VERBS[2] });
    expect(b).toBeInTheDocument();
    expect(b).toHaveFocus();
  });

  it('T07 AC17: changing the verb dispatches nothing', async () => {
    const user = userEvent.setup();
    const { dispatch } = setup();
    await user.click(verbBtn());
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('T07 AC3: verb state is kept across a rerender and resets on remount', async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    const { rerender, unmount } = render(<Hello dispatch={dispatch} />);
    await user.click(verbBtn());
    rerender(<Hello dispatch={dispatch} />);
    expect(screen.getByRole('button', { name: VERBS[1] })).toBeInTheDocument();
    unmount();
    render(<Hello dispatch={dispatch} />);
    expect(screen.getByRole('button', { name: VERBS[0] })).toBeInTheDocument();
  });
});

describe('T07 Hello body: actions', () => {
  it('T07 AC19: "See what I\'ve built" is a type=button that dispatches exactly one open for proj', async () => {
    const user = userEvent.setup();
    const { dispatch } = setup();
    const b = screen.getByRole('button', { name: HELLO_COPY.primary });
    expect(b.tagName).toBe('BUTTON');
    expect(b).toHaveAttribute('type', 'button');
    expect(dispatch).not.toHaveBeenCalled();
    await user.click(b);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: 'open', id: 'proj' });
  });

  it('T07 AC19: keyboard activation of the primary button also dispatches one open', async () => {
    const user = userEvent.setup();
    const { dispatch } = setup();
    screen.getByRole('button', { name: HELLO_COPY.primary }).focus();
    await user.keyboard('{Enter}');
    expect(dispatch).toHaveBeenCalledTimes(1);
    await user.keyboard(' ');
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'open', id: 'proj' });
  });

  it('T07 AC20: "Say hi" is a mailto link to EMAIL with no target and dispatches nothing', () => {
    const { dispatch } = setup();
    const a = screen.getByRole('link', { name: HELLO_COPY.secondary });
    expect(a.getAttribute('href')).toBe(`mailto:${EMAIL}`);
    expect(a.hasAttribute('target')).toBe(false);
    fireEvent.click(a);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('T07 AC10: tab order is verb, primary button, then Say hi', async () => {
    const user = userEvent.setup();
    setup();
    await user.tab();
    expect(document.activeElement).toBe(verbBtn());
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: HELLO_COPY.primary }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('link', { name: HELLO_COPY.secondary }));
  });

  it('T07 AC2: the email appears only in the mailto href, not as visible text', () => {
    const { container } = setup();
    expect(container.textContent).not.toContain(EMAIL);
  });
});

describe('T07 Hello body: height', () => {
  it('T07 AC47: hello keeps its WIN_META height of 420 and y of 72', () => {
    expect(WIN_META.hello.height).toBe(420);
    expect(WIN_META.hello.width).toBe(560);
  });
});

describe('T07 Hello.css (rest state)', () => {
  it('T07 AC13: body padding 34px 38px', () => {
    expect(decls('.hello-body').padding).toBe('34px 38px');
  });

  it('T07 AC13: greeting is 15px accent and the hand is 22px', () => {
    const g = decls('.hello-greeting');
    expect(g['font-size']).toBe('15px');
    expect(g.color).toBe('var(--color-accent)');
    expect(decls('.hello-hand')['font-size']).toBe('22px');
  });

  it('T07 AC14: name is 58px, weight 500, -0.04em, line-height 1.02', () => {
    const r = decls('.hello-name');
    expect(r['font-size']).toBe('58px');
    expect(r['font-weight']).toBe('500');
    expect(r['letter-spacing']).toBe('-0.04em');
    expect(r['line-height']).toBe('1.02');
  });

  it('T07 AC14: each line is a flex host that preserves spaces and each letter is a block host with an inline-block face', () => {
    expect(decls('.hello-line').display).toBe('flex');
    expect(decls('.hello-line')['white-space']).toBe('pre');
    expect(decls('.hello-letter-face').display).toBe('inline-block');
  });

  it('T07 AC16: the sentence line is 30px, weight 500, neutral-400 and never wraps', () => {
    const r = decls('.hello-row');
    expect(r['font-size']).toBe('30px');
    expect(r['font-weight']).toBe('500');
    expect(r.color).toBe('var(--color-neutral-400)');
    expect(r['white-space']).toBe('nowrap');
  });

  it('T07 AC16: the verb is text colour with a 3px accent underline bar', () => {
    expect(decls('.hello-verb').color).toBe('var(--color-text)');
    const bar = decls('.hello-verb::after');
    expect(bar.height).toBe('3px');
    expect(bar.background).toBe('var(--color-accent)');
  });

  it('T07 AC18: the hint is 12px neutral-500', () => {
    const r = decls('.hello-hint');
    expect(r['font-size']).toBe('12px');
    expect(r.color).toBe('var(--color-neutral-500)');
  });

  it('T07 AC21: buttons have gap 12px, margin-top 28px, padding 11px 18px, radius 10px', () => {
    const a = decls('.hello-actions');
    expect(a.gap).toBe('12px');
    expect(a['margin-top']).toBe('28px');
    const f = decls('.hello-cta-face');
    expect(f.padding).toBe('11px 18px');
    expect(f['border-radius']).toBe('10px');
  });

  it('T07 AC21: buttons animate transform and box-shadow over .35s on --ease-spring', () => {
    const t = decls('.hello-cta-face').transition;
    expect(t).toMatch(/transform 0?\.35s var\(--ease-spring\)/);
    expect(t).toMatch(/box-shadow 0?\.35s var\(--ease-spring\)/);
  });

  it('T07 AC7: no hard-coded colours', () => {
    expect(clean).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(clean).not.toMatch(/\b(rgb|hsl)a?\(/);
  });
});
