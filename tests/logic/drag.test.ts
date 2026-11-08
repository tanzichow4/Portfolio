import { describe, expect, it } from 'vitest';
import { clampPosition, dragPosition, tiltFor } from '../../src/logic/drag';

const W = 500;
const VW = 1280;
const VH = 720;

describe('clampPosition', () => {
  it('AC15: leaves in-range positions unchanged', () => {
    expect(clampPosition({ x: 100, y: 100 }, W, VW, VH)).toEqual({ x: 100, y: 100 });
    expect(clampPosition({ x: 100.5, y: 99.25 }, W, VW, VH)).toEqual({ x: 100.5, y: 99.25 });
  });

  it('AC15: boundary values are inclusive', () => {
    expect(clampPosition({ x: 80 - W, y: 36 }, W, VW, VH)).toEqual({ x: 80 - W, y: 36 });
    expect(clampPosition({ x: VW - 80, y: VH - 60 }, W, VW, VH)).toEqual({
      x: VW - 80,
      y: VH - 60,
    });
  });

  it('AC15: clamps each bound', () => {
    expect(clampPosition({ x: -10000, y: 100 }, W, VW, VH).x).toBe(80 - W);
    expect(clampPosition({ x: 10000, y: 100 }, W, VW, VH).x).toBe(VW - 80);
    expect(clampPosition({ x: 100, y: -10000 }, W, VW, VH).y).toBe(36);
    expect(clampPosition({ x: 100, y: 10000 }, W, VW, VH).y).toBe(VH - 60);
    expect(clampPosition({ x: 100, y: 35.9 }, W, VW, VH).y).toBe(36);
    expect(clampPosition({ x: VW - 79, y: VH - 59 }, W, VW, VH)).toEqual({
      x: VW - 80,
      y: VH - 60,
    });
  });

  it('AC15: y is 36 when the viewport is shorter than 96', () => {
    expect(clampPosition({ x: 100, y: 500 }, W, VW, 95).y).toBe(36);
    expect(clampPosition({ x: 100, y: 0 }, W, VW, 95).y).toBe(36);
    expect(clampPosition({ x: 100, y: 500 }, W, VW, 0).y).toBe(36);
  });

  it('AC15: returns a new object', () => {
    const p = Object.freeze({ x: 100, y: 100 });
    const r = clampPosition(p, W, VW, VH);
    expect(r).not.toBe(p);
  });

  it('AC16: is idempotent over a grid of inputs and viewports', () => {
    const coords = [-5000, -501, -420, -1, 0, 35.5, 36, 500, 1200, 1201, 5000];
    for (const vw of [0, 300, 1280, 3000]) {
      for (const vh of [0, 90, 720, 2000]) {
        for (const width of [340, 560]) {
          for (const x of coords) {
            for (const y of coords) {
              const once = clampPosition({ x, y }, width, vw, vh);
              expect(clampPosition(once, width, vw, vh)).toEqual(once);
            }
          }
        }
      }
    }
  });
});

describe('dragPosition', () => {
  it('AC17: equals clampPosition of origin plus delta', () => {
    const origin = { x: 300, y: 200 };
    const deltas = [
      { dx: 0, dy: 0 },
      { dx: 50, dy: -20 },
      { dx: -5000, dy: -5000 },
      { dx: 5000, dy: 5000 },
      { dx: 12.5, dy: 0.25 },
    ];
    for (const { dx, dy } of deltas) {
      expect(dragPosition(origin, { dx, dy }, W, VW, VH)).toEqual(
        clampPosition({ x: origin.x + dx, y: origin.y + dy }, W, VW, VH),
      );
    }
  });

  it('AC17: no drift, a large delta then returning to zero lands on the origin', () => {
    const origin = { x: 300, y: 200 };
    dragPosition(origin, { dx: 9000, dy: 9000 }, W, VW, VH);
    dragPosition(origin, { dx: -9000, dy: -9000 }, W, VW, VH);
    expect(dragPosition(origin, { dx: 0, dy: 0 }, W, VW, VH)).toEqual(origin);
    expect(dragPosition(origin, { dx: 9000, dy: 0 }, W, VW, VH).x).toBe(VW - 80);
    expect(dragPosition(origin, { dx: 20, dy: 0 }, W, VW, VH).x).toBe(320);
  });

  it('AC17: does not mutate the origin', () => {
    const origin = Object.freeze({ x: 1, y: 2 });
    expect(() => dragPosition(origin, { dx: 1, dy: 1 }, W, VW, VH)).not.toThrow();
    expect(origin).toEqual({ x: 1, y: 2 });
  });
});

describe('tiltFor', () => {
  it('AC18: scales movement by 0.7 when enabled', () => {
    expect(tiltFor(5, true)).toBeCloseTo(3.5, 10);
    expect(tiltFor(-5, true)).toBeCloseTo(-3.5, 10);
  });

  it('AC18: caps at plus and minus 7', () => {
    expect(tiltFor(10, true)).toBeCloseTo(7, 10);
    expect(tiltFor(11, true)).toBe(7);
    expect(tiltFor(1000, true)).toBe(7);
    expect(tiltFor(-11, true)).toBe(-7);
    expect(tiltFor(-1000, true)).toBe(-7);
  });

  it('AC18: is exactly 0 when disabled', () => {
    expect(Object.is(tiltFor(50, false), 0)).toBe(true);
    expect(Object.is(tiltFor(-50, false), 0)).toBe(true);
  });

  it('AC18: never returns -0', () => {
    expect(Object.is(tiltFor(-0, true), 0)).toBe(true);
    expect(Object.is(tiltFor(0, true), 0)).toBe(true);
    expect(Object.is(tiltFor(-0, false), 0)).toBe(true);
  });

  it('AC18: non-finite input gives 0', () => {
    for (const m of [NaN, Infinity, -Infinity]) {
      expect(Object.is(tiltFor(m, true), 0)).toBe(true);
      expect(Object.is(tiltFor(m, false), 0)).toBe(true);
    }
  });
});
