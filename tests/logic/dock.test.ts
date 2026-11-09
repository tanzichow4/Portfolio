import { describe, expect, it } from 'vitest';
import type { Win, WinId } from '../../src/types';
import { DOT_OPACITY, dockClickAction, dockWinState } from '../../src/logic/dock';
import { DOCK_LABELS } from '../../src/data';

const mk = (over: Partial<Record<WinId, Partial<Win>>> = {}): Record<WinId, Win> => {
  const ids: WinId[] = ['hello', 'about', 'exp', 'proj', 'term', 'site'];
  const out = {} as Record<WinId, Win>;
  for (const id of ids) out[id] = { x: 0, y: 0, open: true, min: false, ...over[id] };
  return out;
};

const ORDER: WinId[] = ['proj', 'exp', 'term', 'about', 'hello'];

describe('dockClickAction', () => {
  const cases: {
    name: string;
    id: WinId;
    wins: Record<WinId, Win>;
    order: WinId[];
    expected: string;
  }[] = [
    {
      name: 'closed window opens',
      id: 'exp',
      wins: mk({ exp: { open: false } }),
      order: ORDER,
      expected: 'open',
    },
    {
      name: 'closed and flagged minimized still opens',
      id: 'exp',
      wins: mk({ exp: { open: false, min: true } }),
      order: ORDER,
      expected: 'open',
    },
    {
      name: 'open and minimized restores',
      id: 'exp',
      wins: mk({ exp: { min: true } }),
      order: ORDER,
      expected: 'restore',
    },
    {
      name: 'visible but not top-most focuses',
      id: 'proj',
      wins: mk(),
      order: ORDER,
      expected: 'focus',
    },
    {
      name: 'visible and top-most minimizes',
      id: 'hello',
      wins: mk(),
      order: ORDER,
      expected: 'minimize',
    },
    {
      name: 'only visible window minimizes',
      id: 'proj',
      wins: mk({
        hello: { min: true },
        about: { open: false },
        exp: { min: true },
        term: { open: false },
      }),
      order: ORDER,
      expected: 'minimize',
    },
    {
      name: 'minimized window last in order restores',
      id: 'hello',
      wins: mk({ hello: { min: true } }),
      order: ORDER,
      expected: 'restore',
    },
    {
      name: 'visible window under a minimized last one minimizes',
      id: 'about',
      wins: mk({ hello: { min: true } }),
      order: ORDER,
      expected: 'minimize',
    },
    {
      name: 'dock window under open top-most site focuses',
      id: 'hello',
      wins: mk(),
      order: [...ORDER, 'site'],
      expected: 'focus',
    },
    {
      name: 'site open and top-most minimizes itself',
      id: 'site',
      wins: mk(),
      order: [...ORDER, 'site'],
      expected: 'minimize',
    },
  ];

  for (const c of cases) {
    it(`AC13/AC14: ${c.name}`, () => {
      expect(dockClickAction(c.id, c.wins, c.order)).toBe(c.expected);
    });
  }
});

describe('T06 dock window state', () => {
  const w = (open: boolean, min: boolean): Win => ({ x: 0, y: 0, open, min });

  it('T06 AC7: open and not minimized is "open" with dot opacity 1', () => {
    const s = dockWinState(w(true, false));
    expect(s).toBe('open');
    expect(DOT_OPACITY[s]).toBe(1);
  });

  it('T06 AC7: open and minimized is "minimized" with dot opacity 0.4', () => {
    const s = dockWinState(w(true, true));
    expect(s).toBe('minimized');
    expect(DOT_OPACITY[s]).toBe(0.4);
  });

  it('T06 AC7: closed is "closed" with dot opacity 0', () => {
    const s = dockWinState(w(false, false));
    expect(s).toBe('closed');
    expect(DOT_OPACITY[s]).toBe(0);
  });

  it('T06 AC7: closed wins over a stale min flag', () => {
    expect(dockWinState(w(false, true))).toBe('closed');
  });

  it('T06 AC7: DOT_OPACITY has exactly the three exact values', () => {
    expect(DOT_OPACITY).toEqual({ open: 1, minimized: 0.4, closed: 0 });
  });

  it('T06 AC21/AC24: DOCK_LABELS holds the landmark name and the three state words', () => {
    expect(DOCK_LABELS.landmark).toBe('Dock');
    expect(DOCK_LABELS.state).toEqual({
      open: 'Open',
      minimized: 'Minimized',
      closed: 'Closed',
    });
  });
});
