import { describe, expect, it } from 'vitest';
import { chromePose, genieOffset, isDragButton, type PoseInput } from '../../src/logic/motion';

const SPRING = 'transform .45s var(--ease-spring), opacity .25s ease-out';
const GENIE = 'transform .45s var(--ease-minimize), opacity .4s ease-in';

const base: PoseInput = Object.freeze({
  min: false,
  dragging: false,
  tilt: 0,
  wobble: true,
  reduced: false,
  x: 77,
  y: 72,
  width: 560,
  vw: 1280,
  vh: 720,
});
const pose = (o: Partial<PoseInput> = {}) => chromePose(Object.freeze({ ...base, ...o }));

describe('genieOffset', () => {
  it('AC18: hello at 1280x720 targets the bottom center of the viewport', () => {
    expect(genieOffset(77, 72, 560, 1280, 720)).toEqual({ dx: 283, dy: 608 });
  });

  it('AC18: a window centred horizontally has dx 0, and a window at the dock line has dy 0', () => {
    expect(genieOffset(500, 680, 280, 1280, 720)).toEqual({ dx: 0, dy: 0 });
  });

  it('AC18: windows right of centre get a negative dx, below the dock line a negative dy', () => {
    const o = genieOffset(1000, 700, 200, 1280, 720);
    expect(o.dx).toBe(640 - 1100);
    expect(o.dy).toBe(-20);
  });

  it('AC18: scales with the viewport (1920x1080)', () => {
    expect(genieOffset(77, 72, 560, 1920, 1080)).toEqual({ dx: 960 - 357, dy: 1080 - 40 - 72 });
  });
});

describe('chromePose table', () => {
  it('AC18: minimized, not reduced, is the genie pose', () => {
    expect(pose({ min: true })).toEqual({
      transform: 'translate(283px, 608px) scale(0.06)',
      opacity: 0,
      transition: GENIE,
    });
  });

  it('AC22: minimized, reduced, is opacity only', () => {
    expect(pose({ min: true, reduced: true })).toEqual({
      transform: 'none',
      opacity: 0,
      transition: 'opacity .4s ease-in',
    });
  });

  it('AC16: dragging with wobble applies rotate and lift scale, no transition', () => {
    expect(pose({ dragging: true, tilt: 3.5 })).toEqual({
      transform: 'rotate(3.5deg) scale(1.015)',
      opacity: 1,
      transition: 'none',
    });
  });

  it('AC16: tilt sign follows direction', () => {
    expect(pose({ dragging: true, tilt: -4 }).transform).toBe('rotate(-4deg) scale(1.015)');
    expect(pose({ dragging: true, tilt: 4 }).transform).toBe('rotate(4deg) scale(1.015)');
  });

  it('AC16: tilt is clamped to +/-7', () => {
    expect(pose({ dragging: true, tilt: 50 }).transform).toBe('rotate(7deg) scale(1.015)');
    expect(pose({ dragging: true, tilt: -50 }).transform).toBe('rotate(-7deg) scale(1.015)');
    expect(pose({ dragging: true, tilt: 7 }).transform).toBe('rotate(7deg) scale(1.015)');
  });

  it('AC16: non-finite tilt (NaN, Infinity) and -0 become 0', () => {
    expect(pose({ dragging: true, tilt: NaN }).transform).toBe('rotate(0deg) scale(1.015)');
    expect(pose({ dragging: true, tilt: Infinity }).transform).toBe('rotate(0deg) scale(1.015)');
    expect(pose({ dragging: true, tilt: -Infinity }).transform).toBe('rotate(0deg) scale(1.015)');
    expect(pose({ dragging: true, tilt: -0 }).transform).toBe('rotate(0deg) scale(1.015)');
  });

  it('AC16: wobble false while dragging gives no rotation but keeps the lift', () => {
    expect(pose({ dragging: true, tilt: 5, wobble: false }).transform).toBe(
      'rotate(0deg) scale(1.015)',
    );
  });

  it('AC22: dragging, reduced, has no rotation or scale', () => {
    expect(pose({ dragging: true, tilt: 5, reduced: true })).toEqual({
      transform: 'none',
      opacity: 1,
      transition: 'none',
    });
  });

  it('AC16: at rest the transform is identity with the spring transition', () => {
    expect(pose()).toEqual({ transform: 'none', opacity: 1, transition: SPRING });
  });

  it('AC22: at rest, reduced, only opacity transitions', () => {
    expect(pose({ reduced: true })).toEqual({
      transform: 'none',
      opacity: 1,
      transition: 'opacity .25s ease-out',
    });
  });

  it('AC18: minimized wins over dragging', () => {
    expect(pose({ min: true, dragging: true, tilt: 5 })).toEqual(pose({ min: true }));
    expect(pose({ min: true, dragging: true, reduced: true })).toEqual(
      pose({ min: true, reduced: true }),
    );
  });

  it('AC26: does not mutate its (frozen) input and is deterministic', () => {
    const input = Object.freeze({ ...base, dragging: true, tilt: 2 });
    expect(chromePose(input)).toEqual(chromePose(input));
  });

  it('AC18: restoring from min (min false) returns to the spring identity pose', () => {
    const p = pose({ min: false });
    expect(p.transform).toBe('none');
    expect(p.opacity).toBe(1);
  });
});

describe('isDragButton', () => {
  it('AC11: only the primary button (0) starts a drag', () => {
    expect(isDragButton(0)).toBe(true);
    expect(isDragButton(1)).toBe(false);
    expect(isDragButton(2)).toBe(false);
    expect(isDragButton(-1)).toBe(false);
    expect(isDragButton(NaN)).toBe(false);
  });
});
