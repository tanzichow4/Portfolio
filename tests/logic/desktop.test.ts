import { describe, expect, it } from 'vitest';
import { desktopReducer, initialDesktop, type DesktopAction } from '../../src/logic/desktop';
import { INITIAL_ORDER, initialWindows, layout } from '../../src/logic/layout';
import { clampPosition } from '../../src/logic/drag';
import { dockClickAction } from '../../src/logic/dock';
import { topMost, zIndexFor } from '../../src/logic/zorder';
import { WIN_IDS, WIN_META } from '../../src/logic/windows';
import type { State, WinId } from '../../src/types';

const deepFreeze = <T>(o: T): T => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as object)) deepFreeze(v);
  }
  return o;
};

const fresh = (vw = 1280, vh = 720): State => deepFreeze(initialDesktop(vw, vh));
const run = (s: State, a: DesktopAction): State => desktopReducer(deepFreeze(s), a);
const DOCK5: WinId[] = ['hello', 'about', 'exp', 'proj', 'term'];

describe('desktop reducer: state shape', () => {
  it('AC1: state has exactly wins, order, vw, vh and windows have only x, y, open, min', () => {
    const s = fresh();
    expect(Object.keys(s).sort()).toEqual(['order', 'vh', 'vw', 'wins']);
    for (const id of WIN_IDS)
      expect(Object.keys(s.wins[id]).sort()).toEqual(['min', 'open', 'x', 'y']);
  });

  it('AC1: removed fields are rejected by the type checker', () => {
    const s = fresh();
    // @ts-expect-error menu is not part of State
    expect(s.menu).toBeUndefined();
    // @ts-expect-error theme is not part of State
    expect(s.theme).toBeUndefined();
    // @ts-expect-error verb is not part of State
    expect(s.verb).toBeUndefined();
    // @ts-expect-error lines is not part of State
    expect(s.lines).toBeUndefined();
    // @ts-expect-error booting is not part of State
    expect(s.booting).toBeUndefined();
  });
});

describe('desktop reducer: initial state', () => {
  it('AC2: equals initialWindows plus the viewport', () => {
    for (const [vw, vh] of [
      [1280, 720],
      [1920, 1080],
      [800, 500],
    ]) {
      expect(initialDesktop(vw, vh)).toEqual({ ...initialWindows(vw, vh), vw, vh });
    }
  });

  it('AC2: five dock windows open and visible, site closed, INITIAL_ORDER', () => {
    const s = fresh();
    for (const id of DOCK5) expect(s.wins[id]).toMatchObject({ open: true, min: false });
    expect(s.wins.site).toMatchObject({ open: false, min: false });
    expect(s.order).toEqual(INITIAL_ORDER);
  });
});

describe('desktop reducer: open', () => {
  it('AC4: opens a closed window, raises it and keeps its position', () => {
    const s = fresh();
    const r = run(s, { type: 'open', id: 'site' });
    expect(r.wins.site).toEqual({ ...s.wins.site, open: true, min: false });
    expect(r.order[r.order.length - 1]).toBe('site');
    expect(zIndexFor('site', r.order)).toBe(800);
  });

  it('AC4: opening a closed window that was closed keeps the moved position', () => {
    let s = run(fresh(), { type: 'move', id: 'hello', x: 300, y: 200 });
    s = run(s, { type: 'close', id: 'hello' });
    const r = run(s, { type: 'open', id: 'hello' });
    expect(r.wins.hello).toEqual({ x: 300, y: 200, open: true, min: false });
    expect(r.order[r.order.length - 1]).toBe('hello');
  });

  it('AC4: un-minimizes and raises a minimized window', () => {
    let s = run(fresh(), { type: 'minimize', id: 'proj' });
    s = run(s, { type: 'open', id: 'proj' });
    expect(s.wins.proj.min).toBe(false);
    expect(s.order[s.order.length - 1]).toBe('proj');
  });

  it('AC4: a visible window is only raised', () => {
    const s = fresh();
    const r = run(s, { type: 'open', id: 'proj' });
    expect(r.wins).toEqual(s.wins);
    expect(r.order[r.order.length - 1]).toBe('proj');
    expect(r.order.filter((i) => i !== 'proj')).toEqual(INITIAL_ORDER.filter((i) => i !== 'proj'));
  });

  it('AC4: opening the visible top-most window returns the same state', () => {
    const s = fresh();
    expect(run(s, { type: 'open', id: 'hello' })).toBe(s);
  });
});

describe('desktop reducer: close', () => {
  it('AC5: closes, keeps position and order', () => {
    const s = fresh();
    const r = run(s, { type: 'close', id: 'about' });
    expect(r.wins.about).toEqual({ ...s.wins.about, open: false, min: false });
    expect(r.order).toEqual(s.order);
  });

  it('AC5: closing a minimized window clears min', () => {
    let s = run(fresh(), { type: 'minimize', id: 'about' });
    s = run(s, { type: 'close', id: 'about' });
    expect(s.wins.about).toMatchObject({ open: false, min: false });
  });

  it('AC5: closing a closed window returns the same reference', () => {
    const s = fresh();
    expect(run(s, { type: 'close', id: 'site' })).toBe(s);
  });
});

describe('desktop reducer: minimize', () => {
  it('AC6: minimizes an open visible window', () => {
    const s = fresh();
    const r = run(s, { type: 'minimize', id: 'term' });
    expect(r.wins.term).toEqual({ ...s.wins.term, min: true });
    expect(r.order).toEqual(s.order);
  });

  it('AC6: closed or minimized window returns the same reference', () => {
    const s = fresh();
    expect(run(s, { type: 'minimize', id: 'site' })).toBe(s);
    const m = run(s, { type: 'minimize', id: 'term' });
    expect(run(m, { type: 'minimize', id: 'term' })).toBe(m);
  });
});

describe('desktop reducer: restore', () => {
  it('AC7: restores a minimized window and raises it', () => {
    const m = run(fresh(), { type: 'minimize', id: 'exp' });
    const r = run(m, { type: 'restore', id: 'exp' });
    expect(r.wins.exp.min).toBe(false);
    expect(r.order[r.order.length - 1]).toBe('exp');
  });

  it('AC7: closed or visible window returns the same reference', () => {
    const s = fresh();
    expect(run(s, { type: 'restore', id: 'site' })).toBe(s);
    expect(run(s, { type: 'restore', id: 'hello' })).toBe(s);
  });
});

describe('desktop reducer: focus', () => {
  it('AC8: raises an open visible window, others keep relative order', () => {
    const s = fresh();
    const r = run(s, { type: 'focus', id: 'proj' });
    expect(r.order).toEqual(['exp', 'term', 'about', 'hello', 'proj']);
    expect(r.wins).toEqual(s.wins);
  });

  it('AC8: already last, closed or minimized returns the same reference', () => {
    const s = fresh();
    expect(run(s, { type: 'focus', id: 'hello' })).toBe(s);
    expect(run(s, { type: 'focus', id: 'site' })).toBe(s);
    const m = run(s, { type: 'minimize', id: 'proj' });
    expect(run(m, { type: 'focus', id: 'proj' })).toBe(m);
  });
});

describe('desktop reducer: dockClick', () => {
  it('AC9: closed window opens', () => {
    const s = fresh();
    expect(dockClickAction('site', s.wins, s.order)).toBe('open');
    expect(run(s, { type: 'dockClick', id: 'site' })).toEqual(run(s, { type: 'open', id: 'site' }));
  });

  it('AC9: minimized window restores', () => {
    const m = run(fresh(), { type: 'minimize', id: 'about' });
    expect(run(m, { type: 'dockClick', id: 'about' })).toEqual(
      run(m, { type: 'restore', id: 'about' }),
    );
    expect(run(m, { type: 'dockClick', id: 'about' }).wins.about.min).toBe(false);
  });

  it('AC9: visible non-top window is focused', () => {
    const s = fresh();
    const r = run(s, { type: 'dockClick', id: 'term' });
    expect(r).toEqual(run(s, { type: 'focus', id: 'term' }));
    expect(topMost(r.order, r.wins)).toBe('term');
  });

  it('AC9: clicking the top-most visible window minimizes it, clicking again restores and raises it', () => {
    const s = fresh();
    expect(topMost(s.order, s.wins)).toBe('hello');
    const m = run(s, { type: 'dockClick', id: 'hello' });
    expect(m.wins.hello.min).toBe(true);
    expect(m).toEqual(run(s, { type: 'minimize', id: 'hello' }));
    const r = run(m, { type: 'dockClick', id: 'hello' });
    expect(r.wins.hello.min).toBe(false);
    expect(r.order[r.order.length - 1]).toBe('hello');
    expect(topMost(r.order, r.wins)).toBe('hello');
  });
});

describe('desktop reducer: move', () => {
  it('AC10: stores the clamped position, other state unchanged', () => {
    const s = fresh();
    const r = run(s, { type: 'move', id: 'hello', x: 400, y: 300 });
    expect(r.wins.hello).toEqual({ ...s.wins.hello, x: 400, y: 300 });
    expect(r.order).toEqual(s.order);
    expect(r.wins.about).toEqual(s.wins.about);
  });

  it('AC10: clamps to the stored viewport at boundaries', () => {
    const s = fresh();
    const far = run(s, { type: 'move', id: 'term', x: 99999, y: 99999 });
    expect(far.wins.term).toMatchObject({ x: 1280 - 80, y: 720 - 60 });
    const near = run(s, { type: 'move', id: 'term', x: -99999, y: -99999 });
    expect(near.wins.term).toMatchObject({ x: 80 - WIN_META.term.width, y: 36 });
    const expected = clampPosition({ x: -5, y: 10 }, WIN_META.hello.width, 1280, 720);
    expect(run(s, { type: 'move', id: 'hello', x: -5, y: 10 }).wins.hello).toMatchObject(expected);
  });

  it('AC10: exact boundary values are accepted unchanged', () => {
    const s = fresh();
    const r = run(s, { type: 'move', id: 'term', x: 1200, y: 660 });
    expect(r.wins.term).toMatchObject({ x: 1200, y: 660 });
  });

  it('AC10: same position returns the same reference', () => {
    const s = fresh();
    const { x, y } = s.wins.hello;
    expect(run(s, { type: 'move', id: 'hello', x, y })).toBe(s);
  });

  it('AC10: a move that clamps to the current position returns the same reference', () => {
    const s = run(fresh(), { type: 'move', id: 'term', x: 1200, y: 660 });
    expect(run(s, { type: 'move', id: 'term', x: 5000, y: 5000 })).toBe(s);
  });

  it('AC10: non-finite coordinates return the same reference', () => {
    const s = fresh();
    for (const [x, y] of [
      [NaN, 10],
      [10, NaN],
      [Infinity, 10],
      [10, -Infinity],
    ]) {
      expect(run(s, { type: 'move', id: 'hello', x, y })).toBe(s);
    }
  });
});

describe('desktop reducer: minimizeAll / showAll', () => {
  it('AC11: minimizeAll minimizes open windows only', () => {
    const s = fresh();
    const r = run(s, { type: 'minimizeAll' });
    for (const id of DOCK5) expect(r.wins[id].min).toBe(true);
    expect(r.wins.site).toEqual(s.wins.site);
    expect(r.order).toEqual(s.order);
  });

  it('AC11: showAll un-minimizes open windows and leaves closed ones', () => {
    const m = run(fresh(), { type: 'minimizeAll' });
    const r = run(m, { type: 'showAll' });
    for (const id of DOCK5) expect(r.wins[id].min).toBe(false);
    expect(r.wins.site).toEqual({ ...m.wins.site, open: false, min: false });
    expect(r.order).toEqual(m.order);
  });

  it('AC11: no change returns the same reference', () => {
    const s = fresh();
    expect(run(s, { type: 'showAll' })).toBe(s);
    const m = run(s, { type: 'minimizeAll' });
    expect(run(m, { type: 'minimizeAll' })).toBe(m);
  });

  it('AC11: with every window closed both are no-ops', () => {
    let s = fresh();
    for (const id of DOCK5) s = run(s, { type: 'close', id });
    expect(run(s, { type: 'minimizeAll' })).toBe(s);
    expect(run(s, { type: 'showAll' })).toBe(s);
  });
});

describe('desktop reducer: tidy and restart', () => {
  const messy = (): State => {
    let s = fresh(1600, 900);
    s = run(s, { type: 'move', id: 'hello', x: 500, y: 500 });
    s = run(s, { type: 'open', id: 'site' });
    s = run(s, { type: 'close', id: 'term' });
    s = run(s, { type: 'minimize', id: 'about' });
    return run(s, { type: 'focus', id: 'proj' });
  };

  it('AC12: tidy restores layout, flags and order, closing site', () => {
    const r = run(messy(), { type: 'tidy' });
    expect(r).toEqual(initialDesktop(1600, 900));
    const pos = layout(1600, 900);
    for (const id of WIN_IDS) expect(r.wins[id]).toMatchObject(pos[id]);
    expect(r.wins.site.open).toBe(false);
    expect(r.order).toEqual(INITIAL_ORDER);
  });

  it('AC13: restart equals the initial state for the stored viewport', () => {
    const r = run(messy(), { type: 'restart' });
    expect(r).toEqual(initialDesktop(1600, 900));
    expect(r.vw).toBe(1600);
    expect(r.vh).toBe(900);
  });
});

describe('desktop reducer: resize', () => {
  it('AC14: stores the viewport and re-clamps every window including closed and minimized', () => {
    let s = fresh(1920, 1080);
    s = run(s, { type: 'minimize', id: 'term' });
    s = run(s, { type: 'move', id: 'site', x: 1800, y: 1000 });
    const r = run(s, { type: 'resize', vw: 1000, vh: 600 });
    expect(r.vw).toBe(1000);
    expect(r.vh).toBe(600);
    for (const id of WIN_IDS) {
      expect(r.wins[id]).toMatchObject(clampPosition(s.wins[id], WIN_META[id].width, 1000, 600));
      expect(r.wins[id].open).toBe(s.wins[id].open);
      expect(r.wins[id].min).toBe(s.wins[id].min);
    }
    expect(r.wins.site.x).toBe(920);
    expect(r.wins.site.y).toBe(540);
    expect(r.order).toEqual(s.order);
  });

  it('AC14: growing the viewport never moves a window', () => {
    const s = fresh(1280, 720);
    const r = run(s, { type: 'resize', vw: 2560, vh: 1440 });
    for (const id of WIN_IDS)
      expect(r.wins[id]).toMatchObject({ x: s.wins[id].x, y: s.wins[id].y });
    expect(r.vw).toBe(2560);
  });

  it('AC14: same size returns the same reference', () => {
    const s = fresh();
    expect(run(s, { type: 'resize', vw: 1280, vh: 720 })).toBe(s);
  });

  it('AC14: NaN, Infinity and negative sizes return the same reference', () => {
    const s = fresh();
    for (const [vw, vh] of [
      [NaN, 720],
      [1280, NaN],
      [Infinity, 720],
      [1280, -Infinity],
      [-1, 720],
      [1280, -1],
    ]) {
      expect(run(s, { type: 'resize', vw, vh })).toBe(s);
    }
  });

  it('AC14: zero size is finite and non-negative so it is applied without NaN', () => {
    const r = run(fresh(), { type: 'resize', vw: 0, vh: 0 });
    expect(r.vw).toBe(0);
    for (const id of WIN_IDS) {
      expect(Number.isFinite(r.wins[id].x)).toBe(true);
      expect(Number.isFinite(r.wins[id].y)).toBe(true);
    }
  });

  it('AC15: 1920x1080 -> 1280x720 -> 1920x1080 keeps term at 1200,660', () => {
    const s = fresh(1920, 1080);
    // DELIBERATE REQUIREMENT CHANGE (T07 AC52): term height 310 -> 270, so term y at 1920x1080 is 700 (was 694).
    expect(s.wins.term).toMatchObject({ x: 1450, y: 700 });
    const small = run(s, { type: 'resize', vw: 1280, vh: 720 });
    expect(small.wins.term).toMatchObject({ x: 1200, y: 660 });
    expect(small.wins.hello).toMatchObject({ x: 115, y: 72 });
    const big = run(small, { type: 'resize', vw: 1920, vh: 1080 });
    expect(big.wins.term).toMatchObject({ x: 1200, y: 660 });
    expect(big.wins.hello).toMatchObject({ x: 115, y: 72 });
  });
});

describe('desktop reducer: invalid ids', () => {
  const bad = ['constructor', '__proto__', 'toString', 'nope', ''] as unknown as WinId[];
  const types = ['open', 'close', 'minimize', 'restore', 'focus', 'dockClick'] as const;

  it('AC26: every id-carrying action with an invalid id returns the same state', () => {
    const s = fresh();
    for (const id of bad) {
      for (const type of types) expect(run(s, { type, id })).toBe(s);
      expect(run(s, { type: 'move', id, x: 10, y: 100 })).toBe(s);
    }
    expect(Object.keys(s.wins).sort()).toEqual([...WIN_IDS].sort());
    expect(s.order).toEqual(INITIAL_ORDER);
  });

  it('AC26: a null or undefined id does not throw', () => {
    const s = fresh();
    for (const id of [null, undefined] as unknown as WinId[]) {
      expect(run(s, { type: 'open', id })).toBe(s);
    }
  });
});

describe('desktop reducer: invariants', () => {
  it('AC16: order has no duplicates, only valid ids, and top-most is never closed or minimized', () => {
    const actions: DesktopAction[] = [];
    const ids = WIN_IDS;
    const simple = ['open', 'close', 'minimize', 'restore', 'focus', 'dockClick'] as const;
    const globals = ['minimizeAll', 'showAll', 'tidy', 'restart'] as const;
    const sizes = [
      [1280, 720],
      [1920, 1080],
      [900, 600],
      [1280, 720],
    ];
    // Deterministic pseudo-sequence without Math.random.
    for (let i = 0; i < 200; i++) {
      const k = i % 7;
      if (k < 4)
        actions.push({
          type: simple[(i * 5 + k) % simple.length],
          id: ids[(i * 3 + k) % ids.length],
        });
      else if (k === 4) actions.push({ type: globals[i % globals.length] });
      else if (k === 5) {
        actions.push({
          type: 'move',
          id: ids[i % ids.length],
          x: ((i * 97) % 2000) - 300,
          y: ((i * 53) % 1200) - 50,
        });
      } else {
        const [vw, vh] = sizes[i % sizes.length];
        actions.push({ type: 'resize', vw, vh });
      }
    }
    let s = fresh();
    for (const [i, a] of actions.entries()) {
      s = run(s, a);
      expect(new Set(s.order).size, `dup after step ${i}`).toBe(s.order.length);
      for (const id of s.order) expect(WIN_IDS).toContain(id);
      const top = topMost(s.order, s.wins);
      if (top !== null) {
        expect(s.wins[top].open).toBe(true);
        expect(s.wins[top].min).toBe(false);
      }
      for (const id of WIN_IDS) {
        expect(Number.isFinite(s.wins[id].x)).toBe(true);
        expect(Number.isFinite(s.wins[id].y)).toBe(true);
      }
    }
  });
});
