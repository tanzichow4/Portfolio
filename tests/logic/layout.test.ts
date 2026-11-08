import { describe, expect, it } from 'vitest';
import type { WinId } from '../../src/types';
import { INITIAL_ORDER, initialWindows, layout } from '../../src/logic/layout';
import { DOCK_IDS, WIN_IDS, WIN_META } from '../../src/logic/windows';

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
        site: 0,
      })[id];
    const formulaY = (id: WinId, vh: number) =>
      ({
        hello: 72,
        about: 64,
        exp: Math.max(380, 0.52 * vh),
        proj: Math.max(300, 0.38 * vh),
        term: Math.max(330, vh - 380),
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
    expect([...INITIAL_ORDER]).toEqual(['proj', 'exp', 'term', 'about', 'hello']);
    expect(INITIAL_ORDER).not.toContain('site');
  });

  it('AC7: initialWindows uses layout positions and open flags', () => {
    const { wins, order } = initialWindows(1440, 900);
    const l = layout(1440, 900);
    for (const id of WIN_IDS) {
      expect(wins[id].x).toBe(l[id].x);
      expect(wins[id].y).toBe(l[id].y);
      expect(wins[id].min).toBe(false);
      expect(wins[id].open).toBe(id !== 'site');
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
