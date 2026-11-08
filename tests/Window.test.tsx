import { StrictMode } from 'react';
import { act, createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Window from '../src/Window';
import { CHROME_LABELS, WIN_TITLES } from '../src/data';
import { WIN_META } from '../src/logic/windows';
import type { Win, WinId } from '../src/types';
import windowCss from '../src/Window.css?raw';

const SPRING = 'transform .45s var(--ease-spring), opacity .25s ease-out';
const GENIE = 'transform .45s var(--ease-minimize), opacity .4s ease-in';

type Props = Parameters<typeof Window>[0];
const spies = () => ({
  onFocus: vi.fn(),
  onMinimize: vi.fn(),
  onClose: vi.fn(),
  onMove: vi.fn(),
});

function props(over: Partial<Props> = {}, win: Partial<Win> = {}) {
  const id: WinId = over.id ?? 'hello';
  const s = spies();
  const p: Props = {
    id,
    win: { x: 200, y: 100, open: true, min: false, ...win },
    z: 14,
    top: true,
    vw: 1280,
    vh: 720,
    wobble: true,
    flyIn: false,
    ...s,
    ...over,
  };
  return { p, s };
}

const region = (id: WinId) => document.querySelector<HTMLElement>(`[data-win="${id}"]`)!;
const titlebar = (id: WinId = 'hello') => region(id).querySelector<HTMLElement>('.win-titlebar')!;
const px = (v: string) => Number.parseFloat(v);
const isIdentity = (v: string) => v === '' || v === 'none';

function stubReduced(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((q: string) => ({
      matches: reduced && q.includes('prefers-reduced-motion'),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    })),
  );
}

const down = (el: Element, x: number, y: number, extra: Record<string, unknown> = {}) =>
  fireEvent.pointerDown(el, { pointerId: 1, button: 0, clientX: x, clientY: y, ...extra });
const move = (el: Element, x: number, y: number) =>
  fireEvent.pointerMove(el, { pointerId: 1, clientX: x, clientY: y });
// jsdom reports movementX as 0, so set it the way a browser would.
const moveWith = (el: Element, x: number, y: number, movementX: number) => {
  const ev = createEvent.pointerMove(el, { pointerId: 1, clientX: x, clientY: y });
  Object.defineProperty(ev, 'movementX', { value: movementX });
  fireEvent(el, ev);
};
const up = (el: Element, x = 0, y = 0) =>
  fireEvent.pointerUp(el, { pointerId: 1, clientX: x, clientY: y });

beforeEach(() => stubReduced(false));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Window structure', () => {
  it('AC1: renders a region named by the title with data-win and data-min', () => {
    const { p } = props();
    render(<Window {...p} />);
    const r = screen.getByRole('region', { name: 'hello.txt' });
    expect(r).toBe(region('hello'));
    expect(r.getAttribute('data-win')).toBe('hello');
    expect(r.getAttribute('data-min')).toBe('false');
  });

  it('AC1: every window id is named by its WIN_TITLES entry', () => {
    for (const id of Object.keys(WIN_TITLES) as WinId[]) {
      const { p } = props({ id });
      const { unmount } = render(<Window {...p} />);
      expect(screen.getByRole('region', { name: WIN_TITLES[id] })).toBeInTheDocument();
      unmount();
    }
  });

  it('AC2: root geometry, surface, radius, overflow, transform-origin and z-index', () => {
    const { p } = props();
    render(<Window {...p} />);
    const s = region('hello').style;
    expect(s.position).toBe('absolute');
    expect(px(s.left)).toBe(200);
    expect(px(s.top)).toBe(100);
    expect(px(s.width)).toBe(WIN_META.hello.width);
    expect(s.zIndex).toBe('14');
    expect(s.background).toContain('--color-surface');
    expect(s.borderRadius).toContain('--radius-lg');
    expect(s.overflow).toBe('hidden');
    expect(s.transformOrigin).toBe('top center');
  });

  it('AC7: keeps at least the nominal WIN_META height', () => {
    const { p } = props({ id: 'about' });
    render(<Window {...p} />);
    expect(px(region('about').style.minHeight)).toBe(WIN_META.about.height);
  });

  it('AC3: the top window has the large shadow and others the medium one', () => {
    const { p } = props({ top: true });
    const { rerender } = render(<Window {...p} />);
    expect(region('hello').style.boxShadow).toContain('--shadow-lg');
    rerender(<Window {...p} top={false} />);
    expect(region('hello').style.boxShadow).toContain('--shadow-md');
  });

  it('AC4: titlebar holds an aria-hidden icon and the title text', () => {
    const { p } = props();
    render(<Window {...p} />);
    const bar = titlebar();
    const icon = bar.querySelector('svg')!;
    expect(icon).not.toBeNull();
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(bar.querySelector('.win-title')?.textContent).toBe('hello.txt');
  });

  it('AC6: dock windows have Minimize and Close buttons, native, typed and classed', () => {
    const { p } = props();
    render(<Window {...p} />);
    const r = within(region('hello'));
    const min = r.getByRole('button', { name: 'Minimize hello.txt' });
    const close = r.getByRole('button', { name: 'Close hello.txt' });
    expect(r.getAllByRole('button')).toHaveLength(2);
    expect(`${CHROME_LABELS.minimize} ${WIN_TITLES.hello}`).toBe('Minimize hello.txt');
    for (const b of [min, close]) {
      expect(b.tagName).toBe('BUTTON');
      expect(b).toHaveAttribute('type', 'button');
      expect(b).toHaveClass('btn', 'btn-icon', 'win-btn');
    }
  });

  it('AC5: buttons appear in DOM order minimize then close', () => {
    const { p } = props({ id: 'term' });
    render(<Window {...p} />);
    const names = within(region('term'))
      .getAllByRole('button')
      .map((b) => b.getAttribute('aria-label') ?? b.textContent);
    expect(names).toEqual(['Minimize terminal', 'Close terminal']);
  });

  it('AC5: the site window has only a close button', () => {
    const { p } = props({ id: 'site' });
    render(<Window {...p} />);
    const buttons = within(region('site')).getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAccessibleName('Close About this site');
    expect(screen.queryByRole('button', { name: /Minimize/ })).toBeNull();
  });

  it('AC7: renders children in the content slot below the titlebar', () => {
    const { p } = props();
    render(
      <Window {...p}>
        <p>slot content</p>
      </Window>,
    );
    const text = screen.getByText('slot content');
    expect(region('hello').contains(text)).toBe(true);
    expect(titlebar().contains(text)).toBe(false);
  });

  it('AC7: renders with no children (placeholder body)', () => {
    const { p } = props();
    expect(() => render(<Window {...p} />)).not.toThrow();
  });

  it('AC8: at rest the inline transform is identity and opacity is 1', () => {
    const { p } = props();
    render(<Window {...p} />);
    const s = region('hello').style;
    expect(isIdentity(s.transform)).toBe(true);
    expect(s.opacity === '' || s.opacity === '1').toBe(true);
    expect(s.transition).toBe(SPRING);
  });
});

describe('Window static CSS', () => {
  const rule = (sel: string) => {
    const m = windowCss.match(new RegExp(`${sel.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`));
    return m?.[1] ?? '';
  };

  it('AC4/AC12/AC24: titlebar rule uses tokens, grab cursor, touch-action none and no text selection', () => {
    const r = rule('.win-titlebar');
    expect(r).toMatch(/padding:\s*8px 8px 8px 16px/);
    expect(r).toMatch(/font-size:\s*12px/);
    expect(r).toContain('var(--color-neutral-400)');
    expect(r).toContain('var(--color-bg)');
    expect(r).toMatch(/cursor:\s*grab/);
    expect(r).toMatch(/touch-action:\s*none/);
    expect(r).toMatch(/user-select:\s*none/);
  });

  it('AC6: chrome buttons are 24px and use neutral-400', () => {
    const css = windowCss.replace(/\s+/g, ' ');
    expect(css).toMatch(/\.win-btn[^{]*\{[^}]*(width|min-width):\s*24px/);
    expect(css).toMatch(/\.win-btn[^{]*\{[^}]*(height|min-height):\s*24px/);
    expect(css).toMatch(/\.win-btn[^{]*\{[^}]*var\(--color-neutral-400\)/);
  });

  it('AC24: no hard-coded hex colours, so no new colour tokens', () => {
    expect(windowCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('AC4: the icon uses the accent colour', () => {
    expect(rule('.win-icon')).toContain('var(--color-accent)');
  });
});

describe('Window focus', () => {
  it('AC9: pointerdown on body, titlebar and a button each call onFocus', () => {
    const { p, s } = props();
    render(
      <Window {...p}>
        <p>body</p>
      </Window>,
    );
    fireEvent.pointerDown(screen.getByText('body'), { button: 0 });
    expect(s.onFocus).toHaveBeenCalledTimes(1);
    down(titlebar(), 10, 10);
    expect(s.onFocus).toHaveBeenCalledTimes(2);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Close hello.txt' }), { button: 0 });
    expect(s.onFocus).toHaveBeenCalledTimes(3);
  });

  it('AC10: focusing a button inside the window calls onFocus', () => {
    const { p, s } = props();
    render(<Window {...p} />);
    act(() => screen.getByRole('button', { name: 'Minimize hello.txt' }).focus());
    expect(s.onFocus).toHaveBeenCalled();
  });
});

describe('Window dragging', () => {
  it('AC11: dragging the titlebar moves the window by the pointer delta', () => {
    const { p, s } = props();
    render(<Window {...p} />);
    const bar = titlebar();
    down(bar, 300, 150);
    move(bar, 340, 190);
    expect(px(region('hello').style.left)).toBe(240);
    expect(px(region('hello').style.top)).toBe(140);
    expect(s.onMove).not.toHaveBeenCalled();
    up(bar, 340, 190);
    expect(s.onMove).toHaveBeenCalledTimes(1);
    expect(s.onMove).toHaveBeenCalledWith(240, 140);
  });

  it('AC11: the drag is clamped (far right/down and far left/up)', () => {
    const { p, s } = props();
    render(<Window {...p} />);
    const bar = titlebar();
    down(bar, 300, 150);
    move(bar, 300 + 5000, 150 + 5000);
    expect(px(region('hello').style.left)).toBe(1280 - 80);
    expect(px(region('hello').style.top)).toBe(720 - 60);
    move(bar, 300 - 5000, 150 - 5000);
    expect(px(region('hello').style.left)).toBe(80 - WIN_META.hello.width);
    expect(px(region('hello').style.top)).toBe(36);
    up(bar);
    expect(s.onMove).toHaveBeenCalledWith(80 - WIN_META.hello.width, 36);
  });

  it('AC11: extreme coordinates never leave the clamp range', () => {
    const { p } = props();
    render(<Window {...p} />);
    const bar = titlebar();
    down(bar, 0, 0);
    move(bar, 1e12, -1e12);
    expect(px(region('hello').style.left)).toBe(1200);
    expect(px(region('hello').style.top)).toBe(36);
  });

  it('AC11: a non-primary button does not start a drag', () => {
    const { p, s } = props();
    render(<Window {...p} />);
    const bar = titlebar();
    down(bar, 300, 150, { button: 2 });
    move(bar, 400, 250);
    up(bar);
    expect(px(region('hello').style.left)).toBe(200);
    expect(s.onMove).not.toHaveBeenCalled();
    down(bar, 300, 150, { button: 1 });
    move(bar, 400, 250);
    up(bar);
    expect(px(region('hello').style.left)).toBe(200);
    expect(s.onMove).not.toHaveBeenCalled();
  });

  it('AC11: pressing a titlebar button never starts a drag', () => {
    const { p, s } = props();
    render(<Window {...p} />);
    const btn = screen.getByRole('button', { name: 'Close hello.txt' });
    down(btn, 300, 150);
    move(btn, 400, 250);
    move(titlebar(), 400, 250);
    up(btn);
    expect(px(region('hello').style.left)).toBe(200);
    expect(px(region('hello').style.top)).toBe(100);
    expect(s.onMove).not.toHaveBeenCalled();
  });

  it('AC11: pressing the body never starts a drag', () => {
    const { p, s } = props();
    render(
      <Window {...p}>
        <p>body</p>
      </Window>,
    );
    const body = screen.getByText('body');
    down(body, 300, 150);
    move(body, 400, 250);
    move(titlebar(), 400, 250);
    up(body);
    expect(px(region('hello').style.left)).toBe(200);
    expect(s.onMove).not.toHaveBeenCalled();
  });

  it('AC14: press and release without movement dispatches nothing', () => {
    const { p, s } = props();
    render(<Window {...p} />);
    const bar = titlebar();
    down(bar, 300, 150);
    up(bar, 300, 150);
    expect(s.onMove).not.toHaveBeenCalled();
  });

  it('AC14: moving away and back to the origin dispatches nothing', () => {
    const { p, s } = props();
    render(<Window {...p} />);
    const bar = titlebar();
    down(bar, 300, 150);
    move(bar, 350, 200);
    move(bar, 300, 150);
    up(bar);
    expect(s.onMove).not.toHaveBeenCalled();
  });

  it('AC14/AC13: many moves yield exactly one onMove, on release', () => {
    const { p, s } = props();
    render(<Window {...p} />);
    const bar = titlebar();
    down(bar, 300, 150);
    for (let i = 1; i <= 20; i++) move(bar, 300 + i, 150 + i);
    expect(s.onMove).not.toHaveBeenCalled();
    up(bar);
    expect(s.onMove).toHaveBeenCalledTimes(1);
    expect(s.onMove).toHaveBeenCalledWith(220, 120);
  });

  it('AC13: pointercancel ends the drag and commits', () => {
    const { p, s } = props();
    render(<Window {...p} />);
    const bar = titlebar();
    down(bar, 300, 150);
    move(bar, 320, 150);
    fireEvent.pointerCancel(bar, { pointerId: 1 });
    expect(s.onMove).toHaveBeenCalledTimes(1);
    expect(s.onMove).toHaveBeenCalledWith(220, 100);
  });

  it('AC13: lostpointercapture alone ends the drag', () => {
    const { p, s } = props();
    render(<Window {...p} />);
    const bar = titlebar();
    down(bar, 300, 150);
    move(bar, 320, 150);
    fireEvent.lostPointerCapture(bar, { pointerId: 1 });
    expect(s.onMove).toHaveBeenCalledTimes(1);
  });

  it('AC14/AC29: pointerup followed by lostpointercapture dispatches one move', () => {
    const { p, s } = props();
    render(<Window {...p} />);
    const bar = titlebar();
    down(bar, 300, 150);
    move(bar, 320, 150);
    up(bar);
    fireEvent.lostPointerCapture(bar, { pointerId: 1 });
    fireEvent.pointerCancel(bar, { pointerId: 1 });
    expect(s.onMove).toHaveBeenCalledTimes(1);
  });

  it('AC13: after release further pointermoves do not move the window', () => {
    const { p } = props();
    const { rerender } = render(<Window {...p} />);
    const bar = titlebar();
    down(bar, 300, 150);
    move(bar, 320, 150);
    up(bar);
    rerender(<Window {...p} win={{ ...p.win, x: 220 }} />);
    move(bar, 600, 600);
    expect(px(region('hello').style.left)).toBe(220);
    expect(px(region('hello').style.top)).toBe(100);
  });

  it('AC11: moves from a different pointer id are ignored', () => {
    const { p, s } = props();
    render(<Window {...p} />);
    const bar = titlebar();
    down(bar, 300, 150);
    fireEvent.pointerMove(bar, { pointerId: 2, clientX: 500, clientY: 500 });
    expect(px(region('hello').style.left)).toBe(200);
    fireEvent.pointerUp(bar, { pointerId: 2 });
    expect(s.onMove).not.toHaveBeenCalled();
  });

  it('AC11: a second drag after the first starts from the new position', () => {
    const { p, s } = props();
    const { rerender } = render(<Window {...p} />);
    const bar = titlebar();
    down(bar, 300, 150);
    move(bar, 320, 150);
    up(bar);
    rerender(<Window {...p} win={{ ...p.win, x: 220 }} />);
    down(bar, 400, 300);
    move(bar, 410, 300);
    up(bar);
    expect(s.onMove).toHaveBeenLastCalledWith(230, 100);
  });

  it('AC12: pointer capture failure does not break the drag', () => {
    const { p, s } = props();
    render(<Window {...p} />);
    const bar = titlebar();
    bar.setPointerCapture = () => {
      throw new Error('InvalidStateError');
    };
    expect(() => down(bar, 300, 150)).not.toThrow();
    move(bar, 320, 150);
    up(bar);
    expect(s.onMove).toHaveBeenCalledWith(220, 100);
  });

  it('AC12: pointer capture is requested for the pointer on the titlebar', () => {
    const { p } = props();
    render(<Window {...p} />);
    const bar = titlebar();
    const cap = vi.fn();
    bar.setPointerCapture = cap;
    down(bar, 300, 150);
    expect(cap).toHaveBeenCalledWith(1);
  });

  it('AC12: a drag adds no mouse, window or document listeners', () => {
    const { p } = props();
    render(<Window {...p} />);
    const names: string[] = [];
    const orig = EventTarget.prototype.addEventListener;
    vi.spyOn(EventTarget.prototype, 'addEventListener').mockImplementation(function (
      this: EventTarget,
      type: string,
      ...rest: unknown[]
    ) {
      names.push(type);
      return (orig as (...a: unknown[]) => void).call(this, type, ...rest);
    } as typeof orig);
    const bar = titlebar();
    down(bar, 300, 150);
    move(bar, 320, 150);
    up(bar);
    expect(names).toEqual([]);
  });

  it('AC25: mouse events alone do not drag (pointer events only)', () => {
    const { p, s } = props();
    render(<Window {...p} />);
    const bar = titlebar();
    fireEvent.mouseDown(bar, { clientX: 300, clientY: 150 });
    fireEvent.mouseMove(bar, { clientX: 400, clientY: 250 });
    fireEvent.mouseUp(bar);
    expect(px(region('hello').style.left)).toBe(200);
    expect(s.onMove).not.toHaveBeenCalled();
  });
});

describe('Window wobble', () => {
  const rotation = () => {
    const m = region('hello').style.transform.match(/rotate\((-?[\d.]+)deg\)/);
    return m ? Number(m[1]) : null;
  };

  it('AC16: dragging right tilts positively with lift scale, left negatively', () => {
    const { p } = props();
    render(<Window {...p} />);
    const bar = titlebar();
    down(bar, 300, 150);
    moveWith(bar, 310, 150, 10);
    expect(region('hello').style.transform).toContain('scale(1.015)');
    expect(rotation()).toBe(7);
    moveWith(bar, 305, 150, -5);
    expect(rotation()).toBe(-3.5);
    moveWith(bar, 290, 150, -50);
    expect(rotation()).toBe(-7);
  });

  it('AC16: the tilt never exceeds 7 degrees', () => {
    const { p } = props();
    render(<Window {...p} />);
    const bar = titlebar();
    down(bar, 300, 150);
    moveWith(bar, 900, 150, 600);
    expect(Math.abs(rotation() ?? 0)).toBeLessThanOrEqual(7);
    moveWith(bar, -900, 150, -1500);
    expect(Math.abs(rotation() ?? 0)).toBeLessThanOrEqual(7);
  });

  it('AC16: on release the pose returns to identity with the spring transition', () => {
    const { p } = props();
    render(<Window {...p} />);
    const bar = titlebar();
    down(bar, 300, 150);
    move(bar, 320, 150);
    up(bar);
    const s = region('hello').style;
    expect(isIdentity(s.transform)).toBe(true);
    expect(s.transition).toBe(SPRING);
  });

  it('AC16: wobble false gives no rotation while dragging', () => {
    const { p } = props({ wobble: false });
    render(<Window {...p} />);
    const bar = titlebar();
    down(bar, 300, 150);
    moveWith(bar, 330, 150, 30);
    expect(rotation()).toBe(0);
  });

  it('AC22: reduced motion gives no rotation or scale while dragging, but still drags', () => {
    stubReduced(true);
    const { p, s } = props();
    render(<Window {...p} />);
    const bar = titlebar();
    down(bar, 300, 150);
    moveWith(bar, 330, 150, 30);
    expect(isIdentity(region('hello').style.transform)).toBe(true);
    expect(px(region('hello').style.left)).toBe(230);
    up(bar);
    expect(s.onMove).toHaveBeenCalledWith(230, 100);
  });

  it('AC22: reduced motion is read at interaction time (changing it mid-session applies)', () => {
    const { p } = props();
    render(<Window {...p} />);
    stubReduced(true);
    const bar = titlebar();
    down(bar, 300, 150);
    move(bar, 330, 150);
    expect(isIdentity(region('hello').style.transform)).toBe(true);
  });
});

describe('Window minimize and close', () => {
  it('AC17: the minimize button calls onMinimize only', () => {
    const { p, s } = props();
    render(<Window {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Minimize hello.txt' }));
    expect(s.onMinimize).toHaveBeenCalledTimes(1);
    expect(s.onClose).not.toHaveBeenCalled();
  });

  it('AC21: the close button calls onClose only', () => {
    const { p, s } = props();
    render(<Window {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close hello.txt' }));
    expect(s.onClose).toHaveBeenCalledTimes(1);
    expect(s.onMinimize).not.toHaveBeenCalled();
  });

  it('AC21: the site close button calls onClose', () => {
    const { p, s } = props({ id: 'site' });
    render(<Window {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close About this site' }));
    expect(s.onClose).toHaveBeenCalledTimes(1);
  });

  it('AC17: double-clicking the titlebar minimizes a dock window', () => {
    const { p, s } = props();
    render(<Window {...p} />);
    fireEvent.doubleClick(titlebar());
    expect(s.onMinimize).toHaveBeenCalledTimes(1);
  });

  it('AC17: double-clicking the title text also minimizes', () => {
    const { p, s } = props();
    render(<Window {...p} />);
    fireEvent.doubleClick(titlebar().querySelector('.win-title')!);
    expect(s.onMinimize).toHaveBeenCalledTimes(1);
  });

  it('AC17: double-click on the site titlebar does nothing', () => {
    const { p, s } = props({ id: 'site' });
    render(<Window {...p} />);
    fireEvent.doubleClick(titlebar('site'));
    expect(s.onMinimize).not.toHaveBeenCalled();
    expect(s.onClose).not.toHaveBeenCalled();
  });

  it('AC17: double-click on a titlebar button does not minimize', () => {
    const { p, s } = props();
    render(<Window {...p} />);
    fireEvent.doubleClick(screen.getByRole('button', { name: 'Close hello.txt' }));
    expect(s.onMinimize).not.toHaveBeenCalled();
    fireEvent.doubleClick(screen.getByRole('button', { name: 'Minimize hello.txt' }));
    expect(s.onMinimize).not.toHaveBeenCalled();
  });

  it('AC17: double-click on the body does not minimize', () => {
    const { p, s } = props();
    render(
      <Window {...p}>
        <p>body</p>
      </Window>,
    );
    fireEvent.doubleClick(screen.getByText('body'));
    expect(s.onMinimize).not.toHaveBeenCalled();
  });

  it('AC17: a minimized window stays mounted with data-min true', () => {
    const { p } = props({}, { min: true });
    render(<Window {...p} />);
    expect(region('hello')).toBeInTheDocument();
    expect(region('hello').getAttribute('data-min')).toBe('true');
  });

  it('AC18: minimized pose is the genie transform, opacity 0, with the genie transition', () => {
    const { p } = props({}, { min: true });
    render(<Window {...p} />);
    const s = region('hello').style;
    // x 200, y 100, width 560 at 1280x720: dx 640 - 480 = 160, dy 720 - 40 - 100 = 580
    expect(s.transform).toBe('translate(160px, 580px) scale(0.06)');
    expect(s.opacity).toBe('0');
    expect(s.transition).toBe(GENIE);
  });

  it('AC18: restoring returns to identity, opacity 1 and the spring transition', () => {
    const { p } = props({}, { min: true });
    const { rerender } = render(<Window {...p} />);
    rerender(<Window {...p} win={{ ...p.win, min: false }} />);
    const s = region('hello').style;
    expect(isIdentity(s.transform)).toBe(true);
    expect(s.opacity).toBe('1');
    expect(s.transition).toBe(SPRING);
  });

  it('AC19: minimized windows are inert, aria-hidden, pointer-events none and out of the a11y tree', () => {
    const { p } = props({}, { min: true });
    render(<Window {...p} />);
    const r = region('hello');
    expect(r).toHaveAttribute('inert');
    expect(r.getAttribute('aria-hidden')).toBe('true');
    expect(r.style.pointerEvents).toBe('none');
    expect(screen.queryByRole('region', { name: 'hello.txt' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Close hello.txt' })).toBeNull();
  });

  it('AC19: restoring removes inert and aria-hidden', () => {
    const { p } = props({}, { min: true });
    const { rerender } = render(<Window {...p} />);
    rerender(<Window {...p} win={{ ...p.win, min: false }} />);
    const r = region('hello');
    expect(r).not.toHaveAttribute('inert');
    expect(r).not.toHaveAttribute('aria-hidden');
    expect(r.style.pointerEvents).not.toBe('none');
    expect(screen.getByRole('button', { name: 'Minimize hello.txt' })).toBeInTheDocument();
  });

  it('AC19: a visible window has no inert attribute', () => {
    const { p } = props();
    render(<Window {...p} />);
    expect(region('hello')).not.toHaveAttribute('inert');
  });

  it('AC22: reduced motion minimize is opacity only and still inert', () => {
    stubReduced(true);
    const { p } = props({}, { min: true });
    render(<Window {...p} />);
    const s = region('hello').style;
    expect(isIdentity(s.transform)).toBe(true);
    expect(s.opacity).toBe('0');
    expect(region('hello')).toHaveAttribute('inert');
  });
});

describe('Window fly-out on open', () => {
  let cbs: Map<number, FrameRequestCallback>;
  let next: number;
  beforeEach(() => {
    cbs = new Map();
    next = 1;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cbs.set(next, cb);
      return next++;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      cbs.delete(id);
    });
  });
  const runFrame = () => {
    const pending = [...cbs.values()];
    cbs.clear();
    act(() => pending.forEach((cb) => cb(0)));
  };

  it('AC20: with flyIn the first render is the minimized pose, then normal after two frames', () => {
    const { p } = props({ flyIn: true });
    render(<Window {...p} />);
    expect(region('hello').style.transform).toBe('translate(160px, 580px) scale(0.06)');
    expect(region('hello').style.opacity).toBe('0');
    runFrame();
    runFrame();
    expect(isIdentity(region('hello').style.transform)).toBe(true);
    expect(region('hello').style.opacity).toBe('1');
  });

  it('AC20: the entering pose does not make the window inert', () => {
    const { p } = props({ flyIn: true });
    render(<Window {...p} />);
    expect(region('hello')).not.toHaveAttribute('inert');
    expect(region('hello').getAttribute('data-min')).toBe('false');
  });

  it('AC20: without flyIn there is no genie pose and no frame is requested', () => {
    const { p } = props({ flyIn: false });
    render(<Window {...p} />);
    expect(isIdentity(region('hello').style.transform)).toBe(true);
    expect(cbs.size).toBe(0);
  });

  it('AC22: flyIn under reduced motion has no fly-out transform', () => {
    stubReduced(true);
    const { p } = props({ flyIn: true });
    render(<Window {...p} />);
    expect(isIdentity(region('hello').style.transform)).toBe(true);
  });

  it('AC20: does not use setTimeout to leave the entering pose', () => {
    const st = vi.spyOn(window, 'setTimeout');
    const { p } = props({ flyIn: true });
    render(<Window {...p} />);
    runFrame();
    runFrame();
    expect(st).not.toHaveBeenCalled();
  });

  it('AC27: unmounting while entering cancels every pending frame', () => {
    const { p } = props({ flyIn: true });
    const { unmount } = render(<Window {...p} />);
    unmount();
    expect(cbs.size).toBe(0);
  });

  it('AC27: under StrictMode the window reaches the normal pose and leaves no frames', () => {
    const { p } = props({ flyIn: true });
    const { unmount } = render(
      <StrictMode>
        <Window {...p} />
      </StrictMode>,
    );
    runFrame();
    runFrame();
    runFrame();
    expect(isIdentity(region('hello').style.transform)).toBe(true);
    expect(cbs.size).toBe(0);
    unmount();
    expect(cbs.size).toBe(0);
  });
});

describe('Window unmount safety', () => {
  it('AC29: unmounting mid-drag then releasing dispatches nothing and logs nothing', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { p, s } = props();
    const { unmount } = render(<Window {...p} />);
    const bar = titlebar();
    down(bar, 300, 150);
    move(bar, 340, 150);
    unmount();
    up(bar);
    fireEvent.lostPointerCapture(bar, { pointerId: 1 });
    expect(s.onMove).not.toHaveBeenCalled();
    expect(err).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('AC27: mount, drag and unmount under StrictMode leave no window/document listeners or console noise', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const net = (target: EventTarget) => {
      const add = vi.spyOn(target, 'addEventListener');
      const rem = vi.spyOn(target, 'removeEventListener');
      return () => add.mock.calls.length - rem.mock.calls.length;
    };
    const w = net(window);
    const d = net(document);
    const { p } = props();
    const { unmount } = render(
      <StrictMode>
        <Window {...p} />
      </StrictMode>,
    );
    const bar = titlebar();
    down(bar, 300, 150);
    move(bar, 340, 150);
    up(bar);
    unmount();
    expect(w()).toBe(0);
    expect(d()).toBe(0);
    expect(err).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
