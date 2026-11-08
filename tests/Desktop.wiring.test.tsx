import { StrictMode } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Desktop from '../src/Desktop';
import { WIN_TITLES } from '../src/data';
import { layout } from '../src/logic/layout';
import { clampPosition } from '../src/logic/drag';
import { WIN_META } from '../src/logic/windows';
import { zIndexFor } from '../src/logic/zorder';
import { INITIAL_ORDER } from '../src/logic/layout';
import type { WinId } from '../src/types';

const DOCK5: WinId[] = ['hello', 'about', 'exp', 'proj', 'term'];
const original = { w: window.innerWidth, h: window.innerHeight };

const setSize = (w: number, h: number) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: w });
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: h });
};
const box = (id: string) => document.querySelector<HTMLElement>(`[data-win="${id}"]`);
const px = (v: string) => Number.parseFloat(v);

beforeEach(() => setSize(original.w, original.h));
afterEach(() => {
  setSize(original.w, original.h);
  vi.restoreAllMocks();
});

describe('Desktop wiring', () => {
  it('AC20/AC23: renders the five dock windows at layout positions and no site window', () => {
    render(<Desktop />);
    const pos = layout(window.innerWidth, window.innerHeight);
    expect(document.querySelectorAll('[data-win]')).toHaveLength(5);
    for (const id of DOCK5) {
      const el = box(id)!;
      expect(el, id).not.toBeNull();
      expect(px(el.style.left)).toBe(pos[id].x);
      expect(px(el.style.top)).toBe(pos[id].y);
      expect(px(el.style.width)).toBe(WIN_META[id].width);
      expect(el.style.position).toBe('absolute');
    }
    expect(box('site')).toBeNull();
  });

  it('AC20: z-index comes from zIndexFor of the initial order', () => {
    render(<Desktop />);
    for (const id of DOCK5) {
      expect(box(id)!.style.zIndex).toBe(String(zIndexFor(id, INITIAL_ORDER)));
    }
  });

  it('AC20: each window is a labelled region named by its title from data.ts', () => {
    render(<Desktop />);
    const expected: Record<string, string> = {
      hello: 'hello.txt',
      about: 'about.md',
      exp: 'experience.log',
      proj: 'projects',
      term: 'terminal',
      site: 'About this site',
    };
    expect(WIN_TITLES).toEqual(expected);
    for (const id of DOCK5) {
      const region = screen.getByRole('region', { name: expected[id] });
      expect(region).toBe(box(id));
    }
    expect(screen.queryByRole('region', { name: 'About this site' })).toBeNull();
  });

  // DELIBERATE REQUIREMENT CHANGE (00-requirements Assumption 14): T04 adds the window
  // chrome, so the T03 criterion "placeholders hold only their title, no buttons" is
  // superseded by this stricter test (title, labelled region, exactly two labelled buttons).
  it('AC22 -> T04 AC5-AC7 (deliberate requirement change, supersedes the T03 no-buttons criterion): each window shows its title, a labelled region and exactly its labelled minimize and close buttons', () => {
    render(<Desktop />);
    // DELIBERATE REQUIREMENT CHANGE (T05 AC40): the menubar adds exactly one native button (the
    // theme toggle). The window count stays 10 and every other button on the page is pinned.
    const winButtons = Array.from(document.querySelectorAll<HTMLElement>('[data-win]')).flatMap(
      (w) => within(w).getAllByRole('button'),
    );
    expect(winButtons).toHaveLength(10);
    const outside = screen.getAllByRole('button').filter((b) => !b.closest('[data-win]'));
    expect(outside.map((b) => b.getAttribute('aria-label'))).toEqual(['Switch to light mode']);
    for (const id of DOCK5) {
      const title = WIN_TITLES[id];
      const el = screen.getByRole('region', { name: title });
      expect(el).toBe(box(id));
      expect(el.querySelector('.win-title')?.textContent).toBe(title);
      expect(el.getAttribute('data-min')).toBe('false');
      expect(el).toBeVisible();
      expect(el).not.toHaveAttribute('inert');
      const buttons = within(el).getAllByRole('button');
      expect(buttons.map((b) => b.getAttribute('aria-label') ?? b.textContent)).toEqual([
        `Minimize ${title}`,
        `Close ${title}`,
      ]);
      for (const b of buttons) expect(b).toHaveAttribute('type', 'button');
      expect(within(el).getByRole('button', { name: `Minimize ${title}` })).toBeInTheDocument();
      expect(within(el).getByRole('button', { name: `Close ${title}` })).toBeInTheDocument();
    }
  });

  it('AC19: root is fixed, full-viewport, overflow hidden, user-select none, nebula wallpaper', () => {
    const { container } = render(<Desktop />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.position).toBe('fixed');
    expect(root.style.overflow).toBe('hidden');
    expect(root.style.userSelect).toBe('none');
    expect(root.style.background || root.style.backgroundImage).toContain('--wall-nebula');
    expect(root.style.inset || `${root.style.top}${root.style.left}`).toBeTruthy();
  });

  it('AC23: after a smaller resize the positions are re-clamped', () => {
    render(<Desktop />);
    const before = Object.fromEntries(
      DOCK5.map((id) => [id, { x: px(box(id)!.style.left), y: px(box(id)!.style.top) }]),
    );
    setSize(600, 400);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    for (const id of DOCK5) {
      const want = clampPosition(before[id], WIN_META[id].width, 600, 400);
      expect(px(box(id)!.style.left), `${id} x`).toBe(want.x);
      expect(px(box(id)!.style.top), `${id} y`).toBe(want.y);
    }
    // At least one window actually moved, so the test can fail.
    expect(
      DOCK5.some(
        (id) => px(box(id)!.style.left) !== before[id].x || px(box(id)!.style.top) !== before[id].y,
      ),
    ).toBe(true);
  });

  it('AC23: growing the viewport back does not move windows', () => {
    render(<Desktop />);
    setSize(600, 400);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    const small = DOCK5.map((id) => [box(id)!.style.left, box(id)!.style.top]);
    setSize(1920, 1080);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(DOCK5.map((id) => [box(id)!.style.left, box(id)!.style.top])).toEqual(small);
  });

  it('AC17: initial state is read lazily from the window size at mount', () => {
    setSize(1920, 1080);
    render(<Desktop />);
    expect(px(box('term')!.style.left)).toBe(1450);
    expect(px(box('term')!.style.top)).toBe(694);
  });
});

describe('Desktop resize listener', () => {
  const count = (spy: { mock: { calls: unknown[][] } }) =>
    spy.mock.calls.filter((c) => c[0] === 'resize').length;

  it('AC18: exactly one resize listener under StrictMode, none after unmount, no console noise', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { unmount } = render(
      <StrictMode>
        <Desktop />
      </StrictMode>,
    );
    expect(count(add) - count(remove)).toBe(1);
    unmount();
    expect(count(add) - count(remove)).toBe(0);
    expect(err).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('AC18: a resize after unmount changes nothing and logs nothing', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(<Desktop />);
    unmount();
    setSize(600, 400);
    expect(() => window.dispatchEvent(new Event('resize'))).not.toThrow();
    expect(err).not.toHaveBeenCalled();
  });

  it('AC18: the listener dispatches the new inner size (mount-time size change is caught)', () => {
    render(<Desktop />);
    setSize(900, 600);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    const want = clampPosition(layout(original.w, original.h).term, WIN_META.term.width, 900, 600);
    expect(px(box('term')!.style.left)).toBe(want.x);
  });
});
