import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Dock from '../src/Dock';
import { DOCK_LABELS, LINKS, WIN_TITLES } from '../src/data';
import { initialDesktop } from '../src/logic/desktop';
import { DOCK_IDS } from '../src/logic/windows';
import type { State, WinId } from '../src/types';

type Wins = State['wins'];

function winsWith(id: WinId, patch: Partial<Wins[WinId]>): Wins {
  const wins = initialDesktop(1280, 720).wins;
  return { ...wins, [id]: { ...wins[id], ...patch } };
}

function setup(wins: Wins = initialDesktop(1280, 720).wins) {
  const dispatch = vi.fn();
  const utils = render(<Dock wins={wins} dispatch={dispatch} />);
  return { dispatch, nav: screen.getByRole('navigation', { name: 'Dock' }), ...utils };
}

const STATES = [
  ['open', { open: true, min: false }, true, 'Open', '1'],
  ['minimized', { open: true, min: true }, false, 'Minimized', '0.4'],
  ['closed', { open: false, min: false }, false, 'Closed', '0'],
  ['closed and minimized', { open: false, min: true }, false, 'Closed', '0'],
] as const;

describe('T06 Dock component', () => {
  it('T06 AC24: is a navigation landmark named from DOCK_LABELS', () => {
    const { nav } = setup();
    expect(nav.tagName).toBe('NAV');
    expect(DOCK_LABELS.landmark).toBe('Dock');
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
  });

  it('T06 AC3: has five window buttons in DOCK_IDS order then three links in LINKS order', () => {
    const { nav } = setup();
    const buttons = within(nav).getAllByRole('button');
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(
      DOCK_IDS.map((id) => WIN_TITLES[id]),
    );
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      'hello.txt',
      'about.md',
      'experience.log',
      'projects',
      'terminal',
    ]);
    const links = within(nav).getAllByRole('link');
    expect(links.map((l) => l.getAttribute('aria-label'))).toEqual(LINKS.map((l) => l.label));
    expect(links.map((l) => l.getAttribute('aria-label'))).toEqual(['GitHub', 'LinkedIn', 'Email']);
  });

  it('T06 AC3: visual order is buttons, one divider, links; no About this site button', () => {
    const { nav } = setup();
    const kids = Array.from(nav.children);
    const kinds = kids.map((k) => (k.tagName === 'BUTTON' ? 'b' : k.tagName === 'A' ? 'a' : 'd'));
    expect(kinds.join('')).toBe('bbbbbdaaa');
    expect(within(nav).queryByRole('button', { name: /about this site/i })).toBeNull();
    expect(within(nav).getAllByRole('button')).toHaveLength(5);
  });

  it('T06 AC6: divider is aria-hidden and not focusable', () => {
    const { nav } = setup();
    const sep = nav.querySelector('.dock-sep') as HTMLElement;
    expect(sep).not.toBeNull();
    expect(sep.getAttribute('aria-hidden')).toBe('true');
    expect(sep.hasAttribute('tabindex')).toBe(false);
    expect(sep.querySelector('button, a, [tabindex]')).toBeNull();
  });

  it('T06 AC20: window buttons are native type=button elements', () => {
    const { nav } = setup();
    for (const b of within(nav).getAllByRole('button')) {
      expect(b.tagName).toBe('BUTTON');
      expect(b.getAttribute('type')).toBe('button');
    }
  });

  it.each(STATES)(
    'T06 AC20/AC21/AC7: %s window has pressed, description and dot opacity to match',
    (_n, patch, pressed, word, opacity) => {
      for (const id of DOCK_IDS) {
        const { nav, unmount } = setup(winsWith(id, patch));
        const btn = within(nav).getByRole('button', { name: WIN_TITLES[id] });
        expect(btn).toHaveAttribute('aria-pressed', String(pressed));
        expect(btn).toHaveAccessibleDescription(word);
        expect(btn.getAttribute('aria-label')).toBe(WIN_TITLES[id]);
        const dot = btn.querySelector('.dock-dot') as HTMLElement;
        expect(dot.style.opacity).toBe(opacity);
        // other buttons are untouched (default state is open)
        for (const other of DOCK_IDS.filter((o) => o !== id)) {
          const ob = within(nav).getByRole('button', { name: WIN_TITLES[other] });
          expect(ob).toHaveAccessibleDescription('Open');
        }
        unmount();
      }
    },
  );

  it('T06 AC21: state words come from DOCK_LABELS', () => {
    expect(DOCK_LABELS.state).toEqual({ open: 'Open', minimized: 'Minimized', closed: 'Closed' });
  });

  it('T06 AC20: label stays the same in every state', () => {
    for (const [, patch] of STATES) {
      const { nav, unmount } = setup(winsWith('proj', patch));
      expect(within(nav).getByRole('button', { name: 'projects' })).toBeInTheDocument();
      unmount();
    }
  });

  it('T06 AC23: every control has a title equal to its label', () => {
    const { nav } = setup();
    for (const c of [...within(nav).getAllByRole('button'), ...within(nav).getAllByRole('link')]) {
      expect(c.getAttribute('title')).toBeTruthy();
      expect(c.getAttribute('title')).toBe(c.getAttribute('aria-label'));
    }
  });

  it('T06 AC23: every icon is aria-hidden', () => {
    const { nav } = setup();
    const svgs = nav.querySelectorAll('svg');
    expect(svgs).toHaveLength(8);
    for (const s of svgs) expect(s.getAttribute('aria-hidden')).toBe('true');
  });

  it('T06 AC7: dots are aria-hidden, one per window button, none on links', () => {
    const { nav } = setup();
    const dots = nav.querySelectorAll('.dock-dot');
    expect(dots).toHaveLength(5);
    for (const d of dots) {
      expect(d.getAttribute('aria-hidden')).toBe('true');
      expect(d.closest('button')).not.toBeNull();
    }
    for (const a of within(nav).getAllByRole('link')) {
      expect(a.querySelector('.dock-dot')).toBeNull();
    }
  });

  it('T06 AC10: each click dispatches exactly one dockClick with the exact action', () => {
    const { dispatch, nav } = setup();
    for (const id of DOCK_IDS) {
      dispatch.mockClear();
      fireEvent.click(within(nav).getByRole('button', { name: WIN_TITLES[id] }));
      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalledWith({ type: 'dockClick', id });
    }
  });

  it('T06 AC10: dispatches dockClick regardless of window state (no own click logic)', () => {
    for (const [, patch] of STATES) {
      const { dispatch, nav, unmount } = setup(winsWith('term', patch));
      fireEvent.click(within(nav).getByRole('button', { name: 'terminal' }));
      expect(dispatch.mock.calls).toEqual([[{ type: 'dockClick', id: 'term' }]]);
      unmount();
    }
  });

  it('T06 AC10/AC16: clicking a link dispatches nothing', () => {
    const { dispatch, nav } = setup();
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener('click', stop);
    try {
      for (const a of within(nav).getAllByRole('link')) fireEvent.click(a);
    } finally {
      document.removeEventListener('click', stop);
    }
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('T06 AC22/AC16: links are native anchors with href from LINKS', () => {
    const { nav } = setup();
    const links = within(nav).getAllByRole('link');
    expect(links).toHaveLength(3);
    links.forEach((a, i) => {
      expect(a.tagName).toBe('A');
      expect(a.getAttribute('href')).toBe(LINKS[i].href);
      expect(a.getAttribute('aria-label')).toBe(LINKS[i].label);
    });
  });

  it('T06 AC16: GitHub and LinkedIn open in a new tab with noopener noreferrer', () => {
    const { nav } = setup();
    for (const name of ['GitHub', 'LinkedIn']) {
      const a = within(nav).getByRole('link', { name });
      expect(a).toHaveAttribute('target', '_blank');
      expect(a).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('T06 AC16: Email is a mailto link with no target', () => {
    const { nav } = setup();
    const a = within(nav).getByRole('link', { name: 'Email' });
    expect(a.getAttribute('href')).toMatch(/^mailto:.+@.+/);
    expect(a.hasAttribute('target')).toBe(false);
  });
});
