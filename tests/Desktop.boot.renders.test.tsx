import { StrictMode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const renders = vi.hoisted(() => ({ dock: 0, menubar: 0, layer: 0, win: 0, body: 0 }));

vi.mock('../src/Dock', async (orig) => {
  const Real = (await orig<typeof import('../src/Dock')>()).default;
  return {
    default: (p: React.ComponentProps<typeof Real>) => {
      renders.dock += 1;
      return <Real {...p} />;
    },
  };
});
vi.mock('../src/MenuBar', async (orig) => {
  const Real = (await orig<typeof import('../src/MenuBar')>()).default;
  return {
    default: (p: React.ComponentProps<typeof Real>) => {
      renders.menubar += 1;
      return <Real {...p} />;
    },
  };
});
vi.mock('../src/WindowLayer', async (orig) => {
  const Real = (await orig<typeof import('../src/WindowLayer')>()).default;
  return {
    default: (p: React.ComponentProps<typeof Real>) => {
      renders.layer += 1;
      return <Real {...p} />;
    },
  };
});
vi.mock('../src/Window', async (orig) => {
  const Real = (await orig<typeof import('../src/Window')>()).default;
  return {
    default: (p: React.ComponentProps<typeof Real>) => {
      renders.win += 1;
      return <Real {...p} />;
    },
  };
});
vi.mock('../src/windows/WindowBody', async (orig) => {
  const Real = (await orig<typeof import('../src/windows/WindowBody')>()).default;
  return {
    default: (p: React.ComponentProps<typeof Real>) => {
      renders.body += 1;
      return <Real {...p} />;
    },
  };
});

import Desktop from '../src/Desktop';
import { initialApp } from '../src/logic/system';
import { openAllFromDock } from './helpers/openAll';

const input = () => screen.getByRole('textbox', { name: 'Terminal command', hidden: true });
const tick = (n = 1) =>
  act(() => {
    vi.advanceTimersByTime(90 * n);
  });

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    'matchMedia',
    vi.fn((q: string) => ({
      matches: false,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    })),
  );
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(0);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('T08 progress ticks do not re-render the desktop (AC14)', () => {
  for (const strict of [false, true]) {
    it(`T08 AC14: ticks 1-14 of a boot re-render no Desktop child${strict ? ' (StrictMode)' : ''}`, async () => {
      const ui = strict ? (
        <StrictMode>
          <Desktop />
        </StrictMode>
      ) : (
        <Desktop />
      );
      render(ui);
      // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, only hello is open at start, so open the other windows from the dock first.
      openAllFromDock();
      // Let the ready frame settle, then start the boot.
      act(() => {
        vi.advanceTimersByTime(50);
      });
      await act(async () => {
        fireEvent.change(input(), { target: { value: 'restart' } });
        fireEvent.keyDown(input(), { key: 'Enter' });
      });
      expect(document.querySelector('[role="dialog"]')).not.toBeNull();
      const before = { ...renders };
      const values: string[] = [];
      for (let i = 0; i < 14; i++) {
        tick(1);
        values.push(
          document.querySelector('[role="progressbar"]')!.getAttribute('aria-valuenow') ?? '',
        );
      }
      // The bar did move, so the ticks were real, yet nothing behind it rendered.
      expect(values[13]).toBe('98');
      expect(renders).toEqual(before);
      expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    });
  }

  it('T08 AC14: State has no boot or progress field', () => {
    const app = initialApp(1280, 720, {
      theme: 'dark',
      wall: 'nebula',
      wobble: true,
    } as Parameters<typeof initialApp>[2]);
    const keys = JSON.stringify(Object.keys(app)) + JSON.stringify(Object.keys(app.desk));
    expect(keys).not.toMatch(/boot|progress|pct|percent/i);
  });
});
