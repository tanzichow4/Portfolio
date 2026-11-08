import { describe, expect, it } from 'vitest';
import { DOCK_IDS, WIN_IDS, WIN_META } from '../../src/logic/windows';

describe('window metadata', () => {
  it('AC2: WIN_IDS lists the six ids in spec order', () => {
    expect([...WIN_IDS]).toEqual(['hello', 'about', 'exp', 'proj', 'term', 'site']);
  });

  it('AC2: widths match the spec', () => {
    expect(WIN_META.hello.width).toBe(560);
    expect(WIN_META.about.width).toBe(420);
    expect(WIN_META.exp.width).toBe(520);
    expect(WIN_META.proj.width).toBe(520);
    expect(WIN_META.term.width).toBe(440);
    expect(WIN_META.site.width).toBe(340);
  });

  it('AC3: every id has a positive integer height that fits a 720px viewport', () => {
    for (const id of WIN_IDS) {
      const h = WIN_META[id].height;
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThan(0);
      expect(h).toBeLessThanOrEqual(720 - 76 - 36);
    }
  });

  it('AC2: DOCK_IDS is every id except site', () => {
    expect([...DOCK_IDS].sort()).toEqual(['about', 'exp', 'hello', 'proj', 'term']);
    expect(DOCK_IDS).not.toContain('site');
  });

  it('AC2: the dock flag agrees with DOCK_IDS', () => {
    for (const id of WIN_IDS) {
      expect(WIN_META[id].dock).toBe(id !== 'site');
      expect(DOCK_IDS.includes(id)).toBe(id !== 'site');
    }
  });
});
