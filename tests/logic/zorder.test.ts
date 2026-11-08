import { describe, expect, it } from 'vitest';
import type { Win, WinId } from '../../src/types';
import { SITE_Z, raise, topMost, zIndexFor } from '../../src/logic/zorder';

const frozen = (a: WinId[]): readonly WinId[] => Object.freeze([...a]);

const mk = (over: Partial<Record<WinId, Partial<Win>>> = {}): Record<WinId, Win> => {
  const ids: WinId[] = ['hello', 'about', 'exp', 'proj', 'term', 'site'];
  const out = {} as Record<WinId, Win>;
  for (const id of ids) out[id] = { x: 0, y: 0, open: true, min: false, ...over[id] };
  return out;
};

describe('raise', () => {
  it('AC9: moves id to the end and keeps the others in order', () => {
    const order = frozen(['proj', 'exp', 'term', 'about', 'hello']);
    const r = raise(order, 'exp');
    expect(r).toEqual(['proj', 'term', 'about', 'hello', 'exp']);
    expect(r).not.toBe(order);
    expect([...order]).toEqual(['proj', 'exp', 'term', 'about', 'hello']);
  });

  it('AC9: moving the first element to the end works', () => {
    expect(raise(frozen(['proj', 'exp', 'hello']), 'proj')).toEqual(['exp', 'hello', 'proj']);
  });

  it('AC9: appends an id that is missing, such as site the first time', () => {
    expect(raise(frozen(['proj', 'hello']), 'site')).toEqual(['proj', 'hello', 'site']);
    expect(raise(frozen([]), 'term')).toEqual(['term']);
  });

  it('AC10: returns the same reference when id is already last', () => {
    const order = frozen(['proj', 'hello']);
    expect(raise(order, 'hello')).toBe(order);
  });
});

describe('topMost', () => {
  it('AC11: returns the last open, non-minimized id', () => {
    expect(topMost(['proj', 'exp', 'hello'], mk())).toBe('hello');
  });

  it('AC11: skips minimized and closed windows', () => {
    const order: WinId[] = ['proj', 'exp', 'term', 'hello'];
    expect(topMost(order, mk({ hello: { min: true }, term: { open: false } }))).toBe('exp');
    expect(topMost(order, mk({ hello: { open: false, min: true } }))).toBe('term');
  });

  it('AC11: returns null when nothing is visible or the order is empty', () => {
    expect(
      topMost(['proj', 'hello'], mk({ proj: { min: true }, hello: { open: false } })),
    ).toBeNull();
    expect(topMost([], mk())).toBeNull();
  });

  it('AC11: ignores ids that are in wins but not in order', () => {
    expect(topMost(['proj'], mk({ proj: { min: true } }))).toBeNull();
    expect(topMost(['proj', 'hello'], mk())).toBe('hello');
  });

  it('AC11: site counts when it is in the order and visible', () => {
    expect(topMost(['proj', 'site'], mk())).toBe('site');
  });
});

describe('zIndexFor', () => {
  const order: WinId[] = ['proj', 'exp', 'term', 'about', 'hello'];

  it('AC12: site is always 800', () => {
    expect(SITE_Z).toBe(800);
    expect(zIndexFor('site', order)).toBe(800);
    expect(zIndexFor('site', [...order, 'site'])).toBe(800);
    expect(zIndexFor('site', [])).toBe(800);
  });

  it('AC12: other ids get index plus 10 and stay below the dock', () => {
    expect(zIndexFor('proj', order)).toBe(10);
    expect(zIndexFor('hello', order)).toBe(14);
    for (const id of order) expect(zIndexFor(id, order)).toBeLessThan(900);
  });

  it('AC12: an id missing from order gets at least 10', () => {
    expect(zIndexFor('hello', [])).toBeGreaterThanOrEqual(10);
    expect(zIndexFor('term', ['proj'])).toBeGreaterThanOrEqual(10);
    expect(zIndexFor('term', ['proj'])).toBeLessThan(900);
  });
});
