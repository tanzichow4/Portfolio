import { describe, expect, it } from 'vitest';
import type { Win, WinId } from '../../src/types';
import { dockClickAction } from '../../src/logic/dock';

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
