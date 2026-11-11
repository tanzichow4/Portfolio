import { describe, expect, it } from 'vitest';
import type { WinId } from '../../src/types';
import { INITIAL_ORDER, initialWindows, layout, tidyWindows } from '../../src/logic/layout';
import { DOCK_IDS, WIN_IDS, WIN_META } from '../../src/logic/windows';
import { zIndexFor } from '../../src/logic/zorder';

const SIZES: [number, number][] = [
  [1280, 720],
  [1366, 768],
  [1440, 900],
  [1536, 864],
  [1920, 1080],
];

describe('layout', () => {
  it('AC1: returns finite integers (never -0) for all ids across [0, 4000]', () => {
    const values = [0, 1, 15, 100, 500, 799.5, 1000, 1280, 1280.5, 1919.9, 3000, 4000];
    for (const vw of values) {
      for (const vh of values) {
        const l = layout(vw, vh);
        expect(Object.keys(l).sort()).toEqual([...WIN_IDS].sort());
        for (const id of WIN_IDS) {
          for (const v of [l[id].x, l[id].y]) {
            expect(Number.isFinite(v)).toBe(true);
            expect(Number.isInteger(v)).toBe(true);
            expect(Object.is(v, -0)).toBe(false);
          }
        }
      }
    }
  });

  it('AC2: x is within the clamp range for every non-site id', () => {
    for (let vw = 0; vw <= 4000; vw += 97) {
      for (const vh of [0, 720, 1080]) {
        const l = layout(vw, vh);
        for (const id of WIN_IDS) {
          if (id === 'site') continue;
          const max = vw - WIN_META[id].width - 16;
          if (vw - WIN_META[id].width - 32 >= 0) {
            expect(l[id].x).toBeGreaterThanOrEqual(16);
            expect(l[id].x).toBeLessThanOrEqual(max);
          } else {
            expect(l[id].x).toBe(16);
          }
        }
      }
    }
  });

  it('AC3: every window sits below the menubar and above the dock at supported sizes', () => {
    for (const [vw, vh] of SIZES) {
      const l = layout(vw, vh);
      for (const id of WIN_IDS) {
        expect(l[id].y).toBeGreaterThanOrEqual(36);
        expect(l[id].y + WIN_META[id].height).toBeLessThanOrEqual(vh - 76);
      }
    }
  });

  it('AC4: x and y follow the spec formulas at 1440x900 and 1920x1080', () => {
    const formulaX = (id: WinId, vw: number) =>
      ({
        hello: 0.06 * vw,
        about: 0.5 * vw,
        exp: 0.05 * vw,
        proj: 0.42 * vw,
        term: vw - 470,
        // DELIBERATE REQUIREMENT CHANGE (T16 AC14): viz is a new dock window with its own formula.
        viz: vw - 320,
        site: 0,
      })[id];
    const formulaY = (id: WinId, vh: number) =>
      ({
        hello: 72,
        about: 64,
        exp: Math.max(380, 0.52 * vh),
        proj: Math.max(300, 0.38 * vh),
        term: Math.max(330, vh - 380),
        // DELIBERATE REQUIREMENT CHANGE (T16 AC14): viz is a new dock window with its own formula.
        viz: Math.max(140, 0.22 * vh),
        site: 0,
      })[id];
    for (const [vw, vh] of [
      [1440, 900],
      [1920, 1080],
    ]) {
      const l = layout(vw, vh);
      for (const id of DOCK_IDS) {
        const w = WIN_META[id].width;
        const xr = Math.round(formulaX(id, vw));
        const expectedX = vw - w - 32 >= 0 ? Math.max(16, Math.min(xr, vw - w - 16)) : 16;
        expect(l[id].x, `${id} x @${vw}`).toBe(expectedX);

        const yr = Math.round(formulaY(id, vh));
        const maxY = vh - 76 - WIN_META[id].height;
        expect(l[id].y, `${id} y @${vw}`).toBe(yr <= maxY ? yr : maxY);
      }
    }
  });

  it('AC5: site is centered and clamped below the menubar', () => {
    for (const [vw, vh] of SIZES) {
      const l = layout(vw, vh);
      expect(l.site.x).toBe(Math.round(vw / 2 - 170));
      expect(l.site.y).toBe(Math.max(36, Math.round(vh / 2 - 180)));
    }
    expect(layout(1280, 100).site.y).toBe(36);
    expect(layout(1280, 0).site.y).toBe(36);
  });

  it('AC6: INITIAL_ORDER is back to front without site', () => {
    // DELIBERATE REQUIREMENT CHANGE (T16 AC15): viz goes at the back of the stack.
    expect([...INITIAL_ORDER]).toEqual(['viz', 'proj', 'exp', 'term', 'about', 'hello']);
    expect(INITIAL_ORDER).not.toContain('site');
  });

  it('AC7: initialWindows uses layout positions and open flags', () => {
    const { wins, order } = initialWindows(1440, 900);
    const l = layout(1440, 900);
    for (const id of WIN_IDS) {
      expect(wins[id].x).toBe(l[id].x);
      expect(wins[id].y).toBe(l[id].y);
      expect(wins[id].min).toBe(false);
      // DELIBERATE REQUIREMENT CHANGE (T15 AC25): only hello starts open (T15 AC1); was every window except site.
      expect(wins[id].open).toBe(id === 'hello');
    }
    expect(order).toEqual([...INITIAL_ORDER]);
  });

  it('AC7: order is a fresh copy so mutating it leaves INITIAL_ORDER intact', () => {
    const before = [...INITIAL_ORDER];
    const { order } = initialWindows(1280, 720);
    expect(order).not.toBe(INITIAL_ORDER);
    order.push('site');
    order.reverse();
    expect([...INITIAL_ORDER]).toEqual(before);
    expect(initialWindows(1280, 720).order).toEqual(before);
  });

  it('AC8: equal inputs give deep-equal outputs', () => {
    expect(layout(1366, 768)).toEqual(layout(1366, 768));
    expect(initialWindows(1366, 768)).toEqual(initialWindows(1366, 768));
  });
});

describe('T15 start and tidy window sets', () => {
  const sizes: [number, number][] = [...SIZES, [800, 500]];

  it('T15 AC1: only hello starts open, nothing starts minimized, at every size', () => {
    for (const [vw, vh] of sizes) {
      const { wins } = initialWindows(vw, vh);
      for (const id of WIN_IDS) {
        expect(wins[id].open, `${id} ${vw}x${vh}`).toBe(id === 'hello');
        expect(wins[id].min, `${id} ${vw}x${vh}`).toBe(false);
      }
    }
  });

  it('T15 AC2: closed windows still sit at their layout positions', () => {
    for (const [vw, vh] of sizes) {
      const { wins } = initialWindows(vw, vh);
      const l = layout(vw, vh);
      for (const id of WIN_IDS) expect(wins[id]).toMatchObject({ x: l[id].x, y: l[id].y });
    }
  });

  it('T15 AC3: order equals INITIAL_ORDER as a fresh copy for start and tidy', () => {
    for (const build of [initialWindows, tidyWindows]) {
      const { order } = build(1280, 720);
      expect(order).toEqual([...INITIAL_ORDER]);
      expect(order).not.toBe(INITIAL_ORDER);
    }
  });

  it('T15 AC10: tidyWindows opens exactly the dock windows, none minimized, at layout positions', () => {
    for (const [vw, vh] of sizes) {
      const { wins } = tidyWindows(vw, vh);
      const l = layout(vw, vh);
      for (const id of WIN_IDS) {
        expect(wins[id].open, id).toBe(DOCK_IDS.includes(id));
        expect(wins[id].min, id).toBe(false);
        expect(wins[id]).toMatchObject({ x: l[id].x, y: l[id].y });
      }
    }
  });
});

describe('T16 viz layout', () => {
  const OLD: WinId[] = ['hello', 'about', 'exp', 'proj', 'term', 'site'];
  // Literal positions taken before viz was added.
  const BEFORE: Record<string, Record<string, { x: number; y: number }>> = {
    '1280x720': {
      hello: { x: 77, y: 72 },
      about: { x: 640, y: 64 },
      exp: { x: 64, y: 354 },
      proj: { x: 538, y: 259 },
      term: { x: 810, y: 340 },
      site: { x: 470, y: 180 },
    },
    '1366x768': {
      hello: { x: 82, y: 72 },
      about: { x: 683, y: 64 },
      exp: { x: 68, y: 399 },
      proj: { x: 574, y: 300 },
      term: { x: 896, y: 388 },
      site: { x: 513, y: 204 },
    },
    '1440x900': {
      hello: { x: 86, y: 72 },
      about: { x: 720, y: 64 },
      exp: { x: 72, y: 468 },
      proj: { x: 605, y: 342 },
      term: { x: 970, y: 520 },
      site: { x: 550, y: 270 },
    },
    '1536x864': {
      hello: { x: 92, y: 72 },
      about: { x: 768, y: 64 },
      exp: { x: 77, y: 449 },
      proj: { x: 645, y: 328 },
      term: { x: 1066, y: 484 },
      site: { x: 598, y: 252 },
    },
    '1920x1080': {
      hello: { x: 115, y: 72 },
      about: { x: 960, y: 64 },
      exp: { x: 96, y: 562 },
      proj: { x: 806, y: 410 },
      term: { x: 1450, y: 700 },
      site: { x: 790, y: 360 },
    },
  };

  it('T16 AC14: viz is fully on screen at every supported size', () => {
    for (const [vw, vh] of SIZES) {
      const p = layout(vw, vh).viz;
      const { width, height } = WIN_META.viz;
      expect(p.x, `x @${vw}`).toBeGreaterThanOrEqual(16);
      expect(p.x + width, `right @${vw}`).toBeLessThanOrEqual(vw - 16);
      expect(p.y, `y @${vw}`).toBeGreaterThanOrEqual(36);
      expect(p.y + height, `bottom @${vw}`).toBeLessThanOrEqual(vh - 76);
    }
  });

  it('T16 AC14: viz sits at the top right at the two formula sizes', () => {
    expect(layout(1440, 900).viz).toEqual({ x: 1120, y: 198 });
    expect(layout(1920, 1080).viz).toEqual({ x: 1600, y: 238 });
  });

  it('T16 AC14: the other windows keep their positions at every supported size', () => {
    for (const [vw, vh] of SIZES) {
      const l = layout(vw, vh);
      for (const id of OLD) expect(l[id], `${id} @${vw}x${vh}`).toEqual(BEFORE[`${vw}x${vh}`]![id]);
    }
  });

  it('T16 AC15: INITIAL_ORDER has viz at the back and no site, six unique ids', () => {
    expect(INITIAL_ORDER[0]).toBe('viz');
    expect(INITIAL_ORDER).not.toContain('site');
    expect(new Set(INITIAL_ORDER).size).toBe(6);
  });

  it('T16 AC17: tidyWindows opens all six dock windows with distinct z-indexes', () => {
    const { wins, order } = tidyWindows(1280, 720);
    for (const id of DOCK_IDS) expect(wins[id].open, id).toBe(true);
    expect(wins.viz).toMatchObject({ open: true, min: false });
    const zs = DOCK_IDS.map((id) => zIndexFor(id, order));
    expect(new Set(zs).size).toBe(6);
  });
});
