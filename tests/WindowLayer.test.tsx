import { StrictMode, useEffect, useReducer, type Dispatch } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WindowLayer from '../src/WindowLayer';
import { desktopReducer, initialDesktop, type DesktopAction } from '../src/logic/desktop';
import { WIN_META } from '../src/logic/windows';
import type { WinId } from '../src/types';

const DOCK5: WinId[] = ['hello', 'about', 'exp', 'proj', 'term'];

interface Probe {
  dispatch: Dispatch<DesktopAction> | null;
  actions: DesktopAction[];
  attach(d: Dispatch<DesktopAction>): void;
}

function Harness({ probe, flyIn = false }: { probe: Probe; flyIn?: boolean }) {
  const [state, dispatch] = useReducer(desktopReducer, undefined, () => initialDesktop(1280, 720));
  const { attach } = probe;
  useEffect(() => {
    attach(dispatch);
  }, [attach]);
  const spy: Dispatch<DesktopAction> = (a) => {
    probe.actions.push(a);
    dispatch(a);
  };
  return <WindowLayer state={state} dispatch={spy} flyIn={flyIn} wobble={true} />;
}

const newProbe = (): Probe => {
  const probe: Probe = {
    dispatch: null,
    actions: [],
    attach(d) {
      probe.dispatch = (a) => {
        probe.actions.push(a);
        d(a);
      };
    },
  };
  return probe;
};
const region = (id: WinId) => document.querySelector<HTMLElement>(`[data-win="${id}"]`);
const px = (v: string) => Number.parseFloat(v);
const z = (id: WinId) => Number(region(id)!.style.zIndex);
const isIdentity = (v: string) => v === '' || v === 'none';
const send = (probe: Probe, a: DesktopAction) => act(() => probe.dispatch!(a));
const bar = (id: WinId) => region(id)!.querySelector<HTMLElement>('.win-titlebar')!;

beforeEach(() => {
  vi.stubGlobal('matchMedia', undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('WindowLayer wiring', () => {
  it('AC1: renders the five open dock windows through the chrome and not site', () => {
    render(<Harness probe={newProbe()} />);
    expect(document.querySelectorAll('[data-win]')).toHaveLength(5);
    for (const id of DOCK5) expect(region(id)!.querySelector('.win-titlebar')).not.toBeNull();
    expect(region('site')).toBeNull();
  });

  it('AC3/AC9: pointerdown on a back window raises it and moves the large shadow', () => {
    render(<Harness probe={newProbe()} />);
    // INITIAL_ORDER puts hello on top, proj at the back.
    expect(region('hello')!.style.boxShadow).toContain('--shadow-lg');
    expect(region('proj')!.style.boxShadow).toContain('--shadow-md');
    const before = z('proj');
    fireEvent.pointerDown(region('proj')!, { button: 0 });
    expect(z('proj')).toBeGreaterThan(before);
    for (const id of DOCK5.filter((i) => i !== 'proj')) expect(z('proj')).toBeGreaterThan(z(id));
    expect(region('proj')!.style.boxShadow).toContain('--shadow-lg');
    expect(region('hello')!.style.boxShadow).toContain('--shadow-md');
  });

  it('AC10: focusing a back window button raises its window', () => {
    render(<Harness probe={newProbe()} />);
    act(() => screen.getByRole('button', { name: 'Minimize projects' }).focus());
    for (const id of DOCK5.filter((i) => i !== 'proj')) expect(z('proj')).toBeGreaterThan(z(id));
  });

  it('AC13/AC14: dragging hello commits exactly one move and leaves others untouched', () => {
    const probe = newProbe();
    render(<Harness probe={probe} />);
    const others = DOCK5.filter((i) => i !== 'hello');
    const snap = () =>
      others.map((id) => [region(id)!.style.left, region(id)!.style.top, region(id)!.style.zIndex]);
    const x0 = px(region('hello')!.style.left);
    const y0 = px(region('hello')!.style.top);
    const before = snap();
    probe.actions.length = 0;

    const b = bar('hello');
    fireEvent.pointerDown(b, { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(b, { pointerId: 1, clientX: 130, clientY: 120 });
    fireEvent.pointerMove(b, { pointerId: 1, clientX: 160, clientY: 140 });
    expect(px(region('hello')!.style.left)).toBe(x0 + 60);
    expect(px(region('hello')!.style.top)).toBe(y0 + 40);
    expect(snap()).toEqual(before);
    expect(probe.actions.filter((a) => a.type === 'move')).toHaveLength(0);

    fireEvent.pointerUp(b, { pointerId: 1, clientX: 160, clientY: 140 });
    fireEvent.lostPointerCapture(b, { pointerId: 1 });
    expect(probe.actions.filter((a) => a.type === 'move')).toEqual([
      { type: 'move', id: 'hello', x: x0 + 60, y: y0 + 40 },
    ]);
    expect(px(region('hello')!.style.left)).toBe(x0 + 60);
    expect(px(region('hello')!.style.top)).toBe(y0 + 40);
    expect(snap()).toEqual(before);
  });

  it('AC13/AC21: close unmounts the window and reopening restores it at the dropped position', () => {
    const probe = newProbe();
    render(<Harness probe={probe} />);
    const b = bar('hello');
    const x0 = px(region('hello')!.style.left);
    const y0 = px(region('hello')!.style.top);
    fireEvent.pointerDown(b, { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(b, { pointerId: 1, clientX: 150, clientY: 130 });
    fireEvent.pointerUp(b, { pointerId: 1 });

    fireEvent.click(screen.getByRole('button', { name: 'Close hello.txt' }));
    expect(region('hello')).toBeNull();
    expect(screen.queryByRole('region', { name: 'hello.txt' })).toBeNull();
    expect(region('about')).not.toBeNull();

    send(probe, { type: 'open', id: 'hello' });
    expect(region('hello')).not.toBeNull();
    expect(px(region('hello')!.style.left)).toBe(x0 + 50);
    expect(px(region('hello')!.style.top)).toBe(y0 + 30);
  });

  it('AC21: closing discards children state (the window remounts fresh)', () => {
    const probe = newProbe();
    render(<Harness probe={probe} />);
    const first = region('term');
    fireEvent.click(screen.getByRole('button', { name: 'Close terminal' }));
    send(probe, { type: 'open', id: 'term' });
    expect(region('term')).not.toBe(first);
  });

  it('AC17/AC19: minimize keeps the window mounted, data-min true, inert and out of the a11y tree', () => {
    render(<Harness probe={newProbe()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Minimize terminal' }));
    const r = region('term')!;
    expect(r).not.toBeNull();
    expect(r.getAttribute('data-min')).toBe('true');
    expect(r).toHaveAttribute('inert');
    expect(screen.queryByRole('region', { name: 'terminal' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Close terminal' })).toBeNull();
    expect(document.querySelectorAll('[data-win]')).toHaveLength(5);
  });

  it('AC17: double-clicking a titlebar minimizes its window', () => {
    render(<Harness probe={newProbe()} />);
    fireEvent.doubleClick(bar('about'));
    expect(region('about')!.getAttribute('data-min')).toBe('true');
    expect(region('hello')!.getAttribute('data-min')).toBe('false');
  });

  it('AC3: minimizing the top window moves the large shadow to the next visible one', () => {
    render(<Harness probe={newProbe()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Minimize hello.txt' }));
    expect(region('about')!.style.boxShadow).toContain('--shadow-lg');
    expect(region('hello')!.style.boxShadow).toContain('--shadow-md');
  });

  it('AC19: restore removes inert and brings the buttons back', () => {
    const probe = newProbe();
    render(<Harness probe={probe} />);
    fireEvent.click(screen.getByRole('button', { name: 'Minimize terminal' }));
    send(probe, { type: 'restore', id: 'term' });
    const r = region('term')!;
    expect(r.getAttribute('data-min')).toBe('false');
    expect(r).not.toHaveAttribute('inert');
    expect(isIdentity(r.style.transform)).toBe(true);
    expect(r.style.opacity).toBe('1');
    const w = within(screen.getByRole('region', { name: 'terminal' }));
    expect(w.getByRole('button', { name: 'Minimize terminal' })).toBeInTheDocument();
    expect(w.getByRole('button', { name: 'Close terminal' })).toBeInTheDocument();
  });

  it('AC5/AC9: opening site shows a close-only window above all others at z 800', () => {
    const probe = newProbe();
    render(<Harness probe={probe} />);
    send(probe, { type: 'open', id: 'site' });
    const site = region('site')!;
    expect(site.style.zIndex).toBe('800');
    const buttons = within(site).getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAccessibleName('Close About this site');
    // focusing site must not change the z of the others beyond the reducer rules
    fireEvent.pointerDown(region('proj')!, { button: 0 });
    expect(site.style.zIndex).toBe('800');
    fireEvent.click(buttons[0]);
    expect(region('site')).toBeNull();
  });

  it('AC17: double-click on the site titlebar does nothing', () => {
    const probe = newProbe();
    render(<Harness probe={probe} />);
    send(probe, { type: 'open', id: 'site' });
    probe.actions.length = 0;
    fireEvent.doubleClick(bar('site'));
    expect(probe.actions.filter((a) => a.type === 'minimize')).toEqual([]);
    expect(region('site')!.getAttribute('data-min')).toBe('false');
  });

  it('AC2: widths come from WIN_META for every window', () => {
    const probe = newProbe();
    render(<Harness probe={probe} />);
    send(probe, { type: 'open', id: 'site' });
    for (const id of [...DOCK5, 'site'] as WinId[]) {
      expect(px(region(id)!.style.width)).toBe(WIN_META[id].width);
    }
  });

  it('AC20: windows opened after mount fly out only when flyIn is on', () => {
    const probe = newProbe();
    render(<Harness probe={probe} flyIn />);
    send(probe, { type: 'close', id: 'hello' });
    send(probe, { type: 'open', id: 'hello' });
    expect(region('hello')!.style.transform).toContain('scale(0.06)');
  });

  it('AC20: with flyIn off a reopened window is in the normal pose immediately', () => {
    const probe = newProbe();
    render(<Harness probe={probe} flyIn={false} />);
    send(probe, { type: 'close', id: 'hello' });
    send(probe, { type: 'open', id: 'hello' });
    expect(isIdentity(region('hello')!.style.transform)).toBe(true);
  });

  it('AC29: a window closed while it is being dragged dispatches no move and logs nothing', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const probe = newProbe();
    render(<Harness probe={probe} />);
    const b = bar('hello');
    fireEvent.pointerDown(b, { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(b, { pointerId: 1, clientX: 150, clientY: 130 });
    send(probe, { type: 'close', id: 'hello' });
    probe.actions.length = 0;
    fireEvent.pointerUp(b, { pointerId: 1 });
    fireEvent.lostPointerCapture(b, { pointerId: 1 });
    expect(probe.actions).toEqual([]);
    expect(err).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('WindowLayer StrictMode', () => {
  it('AC27: mount, drag and unmount leave no net window/document listeners, no pending frames, no console noise', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const live = new Set<number>();
    let n = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      const id = ++n;
      live.add(id);
      queueMicrotask(() => {
        if (live.delete(id)) act(() => cb(0));
      });
      return id;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      live.delete(id);
    });
    const net = (t: EventTarget) => {
      const add = vi.spyOn(t, 'addEventListener');
      const rem = vi.spyOn(t, 'removeEventListener');
      return () => add.mock.calls.length - rem.mock.calls.length;
    };
    const w = net(window);
    const d = net(document);

    const probe = newProbe();
    const { unmount } = render(
      <StrictMode>
        <Harness probe={probe} flyIn />
      </StrictMode>,
    );
    send(probe, { type: 'close', id: 'hello' });
    send(probe, { type: 'open', id: 'hello' });
    const b = bar('hello');
    fireEvent.pointerDown(b, { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(b, { pointerId: 1, clientX: 150, clientY: 130 });
    fireEvent.pointerUp(b, { pointerId: 1 });
    unmount();

    expect(w()).toBe(0);
    expect(d()).toBe(0);
    expect(live.size).toBe(0);
    expect(err).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
