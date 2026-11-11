import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Experience from '../../src/windows/Experience';
import css from '../../src/windows/Experience.css?raw';
import { stripComments } from '../helpers/cssTokens';
import { topRule, reducedRule } from '../helpers/cssScope';
import { EXP, EXPERIENCE_LABELS } from '../../src/data';
import { WIN_META } from '../../src/logic/windows';
import src from '../../src/windows/Experience.tsx?raw';

const clean = stripComments(css);
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Declarations of the top-level rule with exactly this selector. */
function decls(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  let found = false;
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
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

const tabs = () => screen.getAllByRole('tab');
const panel = () => screen.getByRole('tabpanel');
const selectedIndex = () => tabs().findIndex((t) => t.getAttribute('aria-selected') === 'true');

describe('T07 Experience body: structure and ARIA', () => {
  it('T07 AC1: renders a non-empty body', () => {
    const { container } = render(<Experience />);
    expect(container.textContent?.trim().length).toBeGreaterThan(0);
  });

  it('T07 AC27: one tab per EXP entry, in order, labelled with org; the first is selected', () => {
    render(<Experience />);
    expect(tabs().map((t) => t.textContent)).toEqual(EXP.map((x) => x.org));
    expect(selectedIndex()).toBe(0);
    expect(tabs()).toHaveLength(EXP.length);
  });

  it('T07 AC28: a vertical tablist with the accessible name from EXPERIENCE_LABELS', () => {
    render(<Experience />);
    const list = screen.getByRole('tablist', { name: EXPERIENCE_LABELS.tablist });
    expect(list).toHaveAttribute('aria-orientation', 'vertical');
    for (const t of tabs()) expect(list.contains(t)).toBe(true);
  });

  it('T07 AC28: each tab has aria-selected true or false, exactly one true', () => {
    render(<Experience />);
    for (const t of tabs()) expect(['true', 'false']).toContain(t.getAttribute('aria-selected'));
    expect(tabs().filter((t) => t.getAttribute('aria-selected') === 'true')).toHaveLength(1);
  });

  it('T07 AC28: tabs are native buttons with type="button"', () => {
    render(<Experience />);
    for (const t of tabs()) {
      expect(t.tagName).toBe('BUTTON');
      expect(t).toHaveAttribute('type', 'button');
    }
  });

  it('T07 AC28: the tabpanel is focusable and labelled by the selected tab', () => {
    render(<Experience />);
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    expect(panel()).toHaveAttribute('tabindex', '0');
    expect(panel()).toHaveAccessibleName(EXP[0].org);
    expect(tabs()[0]).toHaveAttribute('aria-controls', panel().id);
    expect(panel().id).not.toBe('');
  });

  it('T07 AC28: only the selected tab is a tab stop (roving tabindex)', () => {
    render(<Experience />);
    tabs().forEach((t, i) => expect(t).toHaveAttribute('tabindex', i === 0 ? '0' : '-1'));
  });

  it('T07 AC28: Tab order is the selected tab, then the panel', async () => {
    const user = userEvent.setup();
    render(<Experience />);
    await user.tab();
    expect(document.activeElement).toBe(tabs()[0]);
    await user.tab();
    expect(document.activeElement).toBe(panel());
  });
});

describe('T07 Experience body: keyboard', () => {
  it('T07 AC28: ArrowDown moves selection and focus to the next tab; roving tabindex follows', async () => {
    const user = userEvent.setup();
    render(<Experience />);
    tabs()[0].focus();
    await user.keyboard('{ArrowDown}');
    expect(selectedIndex()).toBe(1);
    expect(document.activeElement).toBe(tabs()[1]);
    tabs().forEach((t, i) => expect(t).toHaveAttribute('tabindex', i === 1 ? '0' : '-1'));
    expect(panel()).toHaveAccessibleName(EXP[1].org);
  });

  it('T07 AC28: ArrowUp moves to the previous tab', async () => {
    const user = userEvent.setup();
    render(<Experience />);
    tabs()[0].focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}');
    expect(selectedIndex()).toBe(1);
    expect(document.activeElement).toBe(tabs()[1]);
  });

  it('T07 AC28: ArrowUp on the first tab wraps to the last', async () => {
    const user = userEvent.setup();
    render(<Experience />);
    tabs()[0].focus();
    await user.keyboard('{ArrowUp}');
    expect(selectedIndex()).toBe(EXP.length - 1);
    expect(document.activeElement).toBe(tabs()[EXP.length - 1]);
  });

  it('T07 AC28: ArrowDown on the last tab wraps to the first', async () => {
    const user = userEvent.setup();
    render(<Experience />);
    tabs()[0].focus();
    await user.keyboard('{End}{ArrowDown}');
    expect(selectedIndex()).toBe(0);
    expect(document.activeElement).toBe(tabs()[0]);
  });

  it('T07 AC28: End goes to the last tab and Home to the first, focus following', async () => {
    const user = userEvent.setup();
    render(<Experience />);
    tabs()[0].focus();
    await user.keyboard('{End}');
    expect(selectedIndex()).toBe(EXP.length - 1);
    expect(document.activeElement).toBe(tabs()[EXP.length - 1]);
    expect(panel()).toHaveAccessibleName(EXP[EXP.length - 1].org);
    await user.keyboard('{Home}');
    expect(selectedIndex()).toBe(0);
    expect(document.activeElement).toBe(tabs()[0]);
  });

  it('T07 AC28: a full ArrowDown cycle visits every entry in order and returns to the start', async () => {
    const user = userEvent.setup();
    render(<Experience />);
    tabs()[0].focus();
    for (let i = 1; i <= EXP.length; i++) {
      await user.keyboard('{ArrowDown}');
      expect(selectedIndex()).toBe(i % EXP.length);
      expect(document.activeElement).toBe(tabs()[i % EXP.length]);
    }
  });

  it('T07 AC28: ArrowLeft and ArrowRight do not change the selection', async () => {
    const user = userEvent.setup();
    render(<Experience />);
    tabs()[0].focus();
    await user.keyboard('{ArrowRight}{ArrowLeft}');
    expect(selectedIndex()).toBe(0);
    expect(document.activeElement).toBe(tabs()[0]);
  });

  it('T07 AC28: Home and End do not scroll the page (default prevented)', () => {
    render(<Experience />);
    tabs()[0].focus();
    const ev = new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true });
    tabs()[0].dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });
});

describe('T07 Experience body: selection and panel', () => {
  it('T07 AC27: clicking a tab selects it and moves the panel', async () => {
    const user = userEvent.setup();
    render(<Experience />);
    await user.click(tabs()[2]);
    expect(selectedIndex()).toBe(2);
    expect(panel()).toHaveAccessibleName(EXP[2].org);
    tabs().forEach((t, i) => expect(t).toHaveAttribute('tabindex', i === 2 ? '0' : '-1'));
  });

  it('T07 AC30: the panel shows role heading, "@ org", date, description and tags of the first entry', () => {
    render(<Experience />);
    const e = EXP[0];
    const p = within(panel());
    expect(p.getByRole('heading', { name: e.role })).toBeInTheDocument();
    expect(panel().textContent).toContain(`${EXPERIENCE_LABELS.at} ${e.org}`);
    expect(panel().textContent).toContain(e.when);
    // DELIBERATE REQUIREMENT CHANGE (T17 AC5): desc replaced by the stats list
    for (const s of e.stats) expect(panel().textContent).toContain(s);
    for (const t of e.tags) expect(panel().textContent).toContain(t);
  });

  it('T07 AC30: for every entry the panel shows that entry only', async () => {
    const user = userEvent.setup();
    render(<Experience />);
    for (const [i, e] of EXP.entries()) {
      await user.click(tabs()[i]);
      const text = panel().textContent ?? '';
      expect(within(panel()).getAllByRole('heading')).toHaveLength(1);
      expect(within(panel()).getByRole('heading')).toHaveTextContent(e.role);
      // DELIBERATE REQUIREMENT CHANGE (T17 AC5): desc replaced by the stats list
      for (const s of e.stats) expect(text).toContain(s);
      expect(text).toContain(e.when);
      EXP.forEach((o, j) => {
        if (j === i) return;
        // DELIBERATE REQUIREMENT CHANGE (T17 AC5): desc replaced by the stats list
        for (const s of o.stats) expect(text).not.toContain(s);
        expect(text).not.toContain(o.when);
      });
    }
  });

  it('T07 AC30: one .tag.tag-accent per technology, in order, and no other tag class', async () => {
    const user = userEvent.setup();
    render(<Experience />);
    for (const [i, e] of EXP.entries()) {
      await user.click(tabs()[i]);
      const tags = Array.from(panel().querySelectorAll('.tag'));
      expect(tags.map((t) => t.textContent)).toEqual(e.tags);
      for (const t of tags) {
        expect(t.classList.contains('tag-accent')).toBe(true);
        expect(t.classList.contains('tag-neutral')).toBe(false);
      }
    }
  });

  it('T07 AC2: panel copy comes from EXP (changes with the entry, not hard-coded)', async () => {
    const user = userEvent.setup();
    render(<Experience />);
    const before = panel().textContent;
    await user.click(tabs()[EXP.length - 1]);
    expect(panel().textContent).not.toBe(before);
  });
});

describe('T07 Experience body: state lifetime', () => {
  it('T07 AC3: the selected tab survives a rerender', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Experience />);
    await user.click(tabs()[2]);
    rerender(<Experience />);
    expect(selectedIndex()).toBe(2);
    expect(panel()).toHaveAccessibleName(EXP[2].org);
  });

  it('T07 AC3: the selected tab resets to the first on remount (close and reopen)', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Experience />);
    await user.click(tabs()[2]);
    unmount();
    render(<Experience />);
    expect(selectedIndex()).toBe(0);
    expect(panel()).toHaveAccessibleName(EXP[0].org);
  });
});

describe('T07 Experience body: CSS and layout', () => {
  it('T07 AC47: experience window height is 290', () => {
    // DELIBERATE REQUIREMENT CHANGE (T17 AC11): the experience window is now 400 tall
    expect(WIN_META.exp.height).toBe(400);
  });

  it('T07 AC27: the rail is 150px wide with an inset right divider; the panel is at least 250px', () => {
    expect(decls('.exp-rail').width).toBe('150px');
    expect(decls('.exp-rail')['box-shadow']).toBe('inset -1px 0 0 var(--color-divider)');
    expect(decls('.exp-panel')['min-height']).toBe('250px');
  });

  it('T07 AC29: tab geometry, type and active styling', () => {
    const face = decls('.exp-tab-face');
    expect(face.padding).toBe('9px 12px');
    expect(face['border-radius']).toBe('8px');
    expect(face['font-size']).toBe('13px');
    expect(face['font-weight']).toBe('500');
    expect(face.color).toBe('var(--color-neutral-500)');
    const active = decls('.exp-tab-active .exp-tab-face');
    expect(active.color).toBe('var(--color-accent-400)');
    expect(active.background).toMatch(/accent\) 12%/);
    expect(active['box-shadow']).toBe('inset 2px 0 0 var(--color-accent)');
  });

  it('T07 AC30: panel text sizes and uppercase date', () => {
    expect(decls('.exp-role')['font-size']).toBe('17px');
    expect(decls('.exp-role')['font-weight']).toBe('500');
    // DELIBERATE REQUIREMENT CHANGE (T17 AC7, AC8): the org is a pill with its own text token
    expect(decls('.exp-org').color).toBe('var(--color-org-pill-text)');
    const when = decls('.exp-when');
    expect(when['font-size']).toBe('11px');
    expect(when['font-weight']).toBe('600');
    expect(when['letter-spacing']).toBe('0.08em');
    expect(when['text-transform']).toBe('uppercase');
    expect(when.color).toBe('var(--color-neutral-500)');
    // DELIBERATE REQUIREMENT CHANGE (T17 AC4): .exp-desc rule renamed to .exp-stats, same typography
    expect(decls('.exp-stats')['font-size']).toBe('13.5px');
    expect(decls('.exp-stats')['line-height']).toBe('1.6');
    expect(decls('.exp-stats').color).toBe('var(--color-neutral-400)');
  });

  it('T07 AC30: panel text is selectable', () => {
    expect(decls('.exp-panel')['user-select']).toBe('text');
  });

  it('T07 AC10: the focus ring is not removed and sits inside the panel', () => {
    expect(clean).not.toMatch(/all:\s*unset/);
    expect(clean).not.toMatch(/outline:\s*none/);
    expect(decls('.exp-panel')['outline-offset']).toBe('-2px');
  });

  it('T07 AC7: no hard-coded colours', () => {
    expect(clean).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(clean).not.toMatch(/\brgba?\(|\bhsla?\(/);
  });

  it('T07 AC29 at rest: no hover or reduced-motion rules yet (T8 adds them)', () => {
    // Intentionally only checks the at-rest file does not set a transform on the tab face.
    expect(decls('.exp-tab-face').transform).toBeUndefined();
  });
});

describe('T07 Experience tab motion CSS', () => {
  it('T07 AC29: hovering a tab translates its face 4px right on --ease-spring', () => {
    expect(topRule(css, '.exp-tab:hover .exp-tab-face')?.transform).toBe('translateX(4px)');
    expect(topRule(css, '.exp-tab-face')?.transition).toMatch(
      /transform[^,;]*var\(--ease-spring\)/,
    );
  });

  it('T07 AC9: the tab host never transforms, only the face, which ignores the pointer', () => {
    expect(topRule(css, '.exp-tab')?.transform).toBeUndefined();
    expect(topRule(css, '.exp-tab:hover')?.transform).toBeUndefined();
    expect(topRule(css, '.exp-tab-face')?.['pointer-events']).toBe('none');
  });

  it('T07 AC8: reduced motion sets the tab hover transform to none', () => {
    expect(reducedRule(css, '.exp-tab:hover .exp-tab-face')?.transform).toBe('none');
  });
});

describe('T17 Experience stats list (AC1, AC4, AC5)', () => {
  it('T17 AC4: panel DOM order is role h2, org pill, date, stats ul, tags; no .exp-desc or p', () => {
    const { container } = render(<Experience />);
    const p = panel();
    const kids = Array.from(p.children);
    const idx = (sel: string) => kids.findIndex((k) => k.matches(sel));
    expect(idx('h2.exp-role')).toBeGreaterThanOrEqual(0);
    expect(idx('h2.exp-role')).toBeLessThan(idx('.exp-org'));
    expect(idx('.exp-org')).toBeLessThan(idx('.exp-when'));
    expect(idx('.exp-when')).toBeLessThan(idx('ul.exp-stats'));
    expect(idx('ul.exp-stats')).toBeLessThan(idx('.exp-tags'));
    expect(container.querySelector('.exp-desc')).toBeNull();
    expect(p.querySelector('p')).toBeNull();
  });

  it('T17 AC5: per tab the li texts equal stats exactly, in a role=list ul, without other entries stats', async () => {
    const user = userEvent.setup();
    render(<Experience />);
    for (const [i, e] of EXP.entries()) {
      await user.click(tabs()[i]);
      const ul = panel().querySelector('ul.exp-stats') as HTMLElement;
      expect(ul.getAttribute('role')).toBe('list');
      const texts = Array.from(ul.querySelectorAll(':scope > li')).map((l) => l.textContent);
      expect(texts).toEqual(e.stats);
      EXP.forEach((o, j) => {
        if (j !== i) for (const s of o.stats) expect(panel().textContent).not.toContain(s);
      });
    }
  });

  it('T17 AC5: the panel has no svg or img and no focusable element besides itself', () => {
    render(<Experience />);
    const p = panel();
    expect(p.querySelector('svg, img')).toBeNull();
    expect(p.querySelectorAll('a, button, input, select, textarea, [tabindex]').length).toBe(0);
  });

  it('T17 AC5: stats CSS is at least 13px in neutral-400 with an empty-content bullet', () => {
    expect(parseFloat(decls('.exp-stats')['font-size'])).toBeGreaterThanOrEqual(13);
    expect(decls('.exp-stats').color).toBe('var(--color-neutral-400)');
    expect(decls('.exp-stat::before').content).toBe("''");
  });

  it('T17 AC1: Experience.tsx does not read .desc', () => {
    expect(src).not.toMatch(/\.desc\b/);
  });
});

describe('T17 Experience org pill and fixed height (AC7, AC10, AC11, AC14, AC15)', () => {
  it('T17 AC7: the org pill reads "@ <org>" on every tab and is not interactive', async () => {
    const user = userEvent.setup();
    render(<Experience />);
    expect(panel().querySelector('.exp-org')?.textContent).toBe('@ Tartigrade Ltd.');
    for (const [i, e] of EXP.entries()) {
      await user.click(tabs()[i]);
      const pill = panel().querySelector('.exp-org') as HTMLElement;
      expect(pill.textContent).toBe(`@ ${e.org}`);
      expect(pill.hasAttribute('tabindex')).toBe(false);
      expect(pill.hasAttribute('role')).toBe(false);
    }
  });

  it('T17 AC7: the pill CSS uses the pill tokens, rounded corners, padding and shrink-to-fit width', () => {
    const o = decls('.exp-org');
    expect(o.background).toBe('var(--color-org-pill-bg)');
    expect(o.color).toBe('var(--color-org-pill-text)');
    expect(o['border-radius']).toBe('999px');
    expect(o.padding).toMatch(/^\d+px \d+px$/);
    expect(parseInt(o.padding.split(' ')[1], 10)).toBeGreaterThan(0);
    expect(o.width).toBe('fit-content');
  });

  it('T17 AC10: the pill has no hover rule, transition, transform or animation', () => {
    expect(clean).not.toMatch(/\.exp-org\s*:/);
    const o = decls('.exp-org');
    expect(o.transition).toBeUndefined();
    expect(o.transform).toBeUndefined();
    expect(o.animation).toBeUndefined();
  });

  it('T17 AC15: the panel scrolls vertically and never horizontally', () => {
    expect(decls('.exp-panel')['overflow-y']).toBe('auto');
    expect(decls('.exp-panel')['overflow-x']).toBe('hidden');
  });

  it('T17 AC14: the body fills the fixed-height window instead of growing it', () => {
    expect(decls('.exp-body').position).toBe('absolute');
    expect(decls('.exp-body').inset).toBe('0');
    expect(decls('.win-body:has(> .exp-body)').position).toBe('relative');
  });

  it('T17 AC11: the rail is still 150px wide', () => {
    expect(decls('.exp-rail').width).toBe('150px');
  });
});
