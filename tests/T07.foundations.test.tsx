import { useEffect, useReducer } from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WindowLayer from '../src/WindowLayer';
import { desktopReducer, initialDesktop, type DesktopAction } from '../src/logic/desktop';
import type { State, WinId } from '../src/types';
import {
  ABOUT_COPY,
  EXPERIENCE_LABELS,
  HELLO_COPY,
  SITE_COPY,
  TERMINAL_LABELS,
  WIN_BAR_TITLES,
} from '../src/data';

const region = (id: WinId) => document.querySelector<HTMLElement>(`[data-win="${id}"]`);

const api: { dispatch: (a: DesktopAction) => void; state: State | null } = {
  dispatch: () => {},
  state: null,
};

function Harness({ renderBody }: { renderBody?: (id: WinId) => React.ReactNode }) {
  const [state, dispatch] = useReducer(desktopReducer, undefined, () =>
    // // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, start from the explicit all-open (Tidy up) state.
    desktopReducer(initialDesktop(1280, 720), { type: 'tidy' }),
  );
  useEffect(() => {
    api.dispatch = dispatch;
    api.state = state;
  });
  return (
    <WindowLayer
      state={state}
      dispatch={dispatch}
      flyIn={false}
      wobble={true}
      renderBody={renderBody}
    />
  );
}

beforeEach(() => {
  vi.stubGlobal('matchMedia', undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('T07 WindowLayer renderBody', () => {
  it('T07 AC1: renders renderBody output inside each open window region', () => {
    render(<Harness renderBody={(id) => <p data-testid={`body-${id}`}>body {id}</p>} />);
    for (const id of ['hello', 'about', 'exp', 'proj', 'term'] as WinId[]) {
      const el = region(id)!.querySelector(`[data-testid="body-${id}"]`);
      expect(el, id).not.toBeNull();
    }
  });

  it('T07 AC1: renderBody is called with each open id and not with a closed one', () => {
    const seen = new Set<WinId>();
    render(
      <Harness
        renderBody={(id) => {
          seen.add(id);
          return null;
        }}
      />,
    );
    expect([...seen].sort()).toEqual(['about', 'exp', 'hello', 'proj', 'term']);
    expect(document.querySelector('[data-testid="body-site"]')).toBeNull();
  });

  it('T07 AC1: a window opened later gets its own body', () => {
    render(<Harness renderBody={(id) => <p data-testid={`body-${id}`}>x</p>} />);
    act(() => api.dispatch({ type: 'open', id: 'site' }));
    expect(region('site')!.querySelector('[data-testid="body-site"]')).not.toBeNull();
  });

  it('T07 AC1: renders no body content when renderBody is not supplied', () => {
    render(<Harness />);
    for (const id of ['hello', 'about', 'exp', 'proj', 'term'] as WinId[]) {
      expect(region(id), id).not.toBeNull();
      expect(region(id)!.querySelector('[data-testid]')).toBeNull();
    }
  });
});

describe('T07 AC4: no body state in the desktop State', () => {
  it('T07 AC4: State keys are unchanged and hold no terminal, tab or verb field', () => {
    render(<Harness />);
    const keys = Object.keys(api.state!).sort();
    expect(keys).toEqual(Object.keys(initialDesktop(1280, 720)).sort());
    expect(keys.join(' ')).not.toMatch(/term|history|input|tab|verb|line/i);
  });
});

describe('T07 AC2: new copy constants', () => {
  it('T07 AC2: HELLO_COPY literal values', () => {
    expect(HELLO_COPY).toEqual({
      greeting: 'Hi, my name is',
      verbPrefix: 'I',
      verbSuffix: 'stuff.',
      hint: 'psst — click the verb',
      primary: "See what I've built",
      secondary: 'Say hi',
    });
  });

  it('T07 AC2: ABOUT_COPY has paragraphs of non-empty segments and at least one em', () => {
    expect(ABOUT_COPY.length).toBeGreaterThan(0);
    for (const p of ABOUT_COPY) {
      expect(p.length).toBeGreaterThan(0);
      for (const s of p) expect(s.text.length).toBeGreaterThan(0);
    }
    const em = ABOUT_COPY.flat().filter((s) => s.em);
    expect(em.length).toBeGreaterThanOrEqual(1);
    for (const s of em) expect(s.em).toBe(true);
  });

  it('T07 AC2: SITE_COPY literal values', () => {
    expect(SITE_COPY.mark).toBe('TC');
    expect(SITE_COPY.title).toBe('tanzi.os');
    expect(SITE_COPY.versionPrefix).toBe('Version ');
    expect(SITE_COPY.edition).toBe(' · Portfolio edition');
    expect(SITE_COPY.desc).toBe(
      'A tiny desktop that happens to be a portfolio. Drag the windows, poke the dock, try the terminal.',
    );
  });

  it('T07 AC2: label constants and bar titles', () => {
    expect(EXPERIENCE_LABELS).toEqual({ tablist: 'Experience', at: '@' });
    expect(TERMINAL_LABELS).toEqual({ input: 'Terminal command', log: 'Terminal output' });
    expect(WIN_BAR_TITLES).toEqual({ proj: '~/projects' });
  });
});
