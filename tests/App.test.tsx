import { StrictMode } from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { setWidth, stubMatchMedia } from './helpers/fakeViewport';

const DESKTOP_SEL =
  '[aria-label="System menu bar"], nav[aria-label="Dock"], [data-win], .boot-status';
const hasPhone = (c: HTMLElement) => c.querySelector('main.phone') !== null;
const hasDesktop = (c: HTMLElement) => c.querySelector(DESKTOP_SEL) !== null;

beforeEach(() => {
  setWidth(1024);
  document.documentElement.classList.remove('phone-view');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setWidth(1024);
});

describe('T13 App view switch, no matchMedia', () => {
  it('T13 AC30: jsdom has no matchMedia, App does not throw and renders the desktop', () => {
    expect(typeof window.matchMedia).toBe('undefined');
    const { container } = render(<App />);
    expect(hasDesktop(container)).toBe(true);
    expect(hasPhone(container)).toBe(false);
  });

  it('T13 AC1: innerWidth 500 without matchMedia renders the phone page', () => {
    setWidth(500);
    const { container } = render(<App />);
    expect(hasPhone(container)).toBe(true);
  });

  it('T13 AC3: phone has no menubar, dock, window, boot status or live region', () => {
    setWidth(500);
    const { container } = render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    expect(hasDesktop(container)).toBe(false);
    expect(container.querySelector('[role="status"], [aria-live]')).toBeNull();
  });

  it('T13 AC1: innerWidth 759 is phone and 760 is desktop without matchMedia', () => {
    setWidth(759);
    const a = render(<App />);
    expect(hasPhone(a.container)).toBe(true);
    a.unmount();
    setWidth(760);
    const b = render(<App />);
    expect(hasPhone(b.container)).toBe(false);
    expect(hasDesktop(b.container)).toBe(true);
  });
});

describe('T13 App view switch, stubbed matchMedia', () => {
  it('T13 AC1: 759 is phone', () => {
    stubMatchMedia(759);
    setWidth(759);
    const { container } = render(<App />);
    expect(hasPhone(container)).toBe(true);
    expect(hasDesktop(container)).toBe(false);
  });

  it('T13 AC1: 760 is desktop', () => {
    stubMatchMedia(760);
    setWidth(760);
    const { container } = render(<App />);
    expect(hasPhone(container)).toBe(false);
    expect(hasDesktop(container)).toBe(true);
  });

  it('T13 AC30: a throwing matchMedia falls back to innerWidth', () => {
    vi.stubGlobal('matchMedia', () => {
      throw new Error('nope');
    });
    setWidth(500);
    const a = render(<App />);
    expect(hasPhone(a.container)).toBe(true);
    a.unmount();
    setWidth(1000);
    const b = render(<App />);
    expect(hasDesktop(b.container)).toBe(true);
  });

  it('T13 AC30: a query without addEventListener does not throw and falls back to innerWidth', () => {
    stubMatchMedia(500, { noAddEventListener: true });
    setWidth(500);
    const a = render(<App />);
    expect(hasPhone(a.container)).toBe(true);
    a.unmount();
    expect(() => {
      setWidth(1000);
      const b = render(<App />);
      b.unmount();
    }).not.toThrow();
  });

  it('T13 AC1: matchMedia takes precedence over innerWidth (no match at innerWidth 760)', () => {
    stubMatchMedia(759.5);
    setWidth(760);
    const { container } = render(<App />);
    expect(hasPhone(container)).toBe(true);
    expect(hasDesktop(container)).toBe(false);
  });

  it('T13 AC1: matchMedia match wins over a small innerWidth', () => {
    stubMatchMedia(800);
    setWidth(500);
    const { container } = render(<App />);
    expect(hasPhone(container)).toBe(false);
    expect(hasDesktop(container)).toBe(true);
  });
});

describe('T13 App crossings', () => {
  it('T13 AC5: crossing swaps views, one present, phone-view follows, no console.error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fake = stubMatchMedia(1000);
    setWidth(1000);
    const { container } = render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    const html = document.documentElement;
    expect(hasDesktop(container)).toBe(true);
    expect(html.classList.contains('phone-view')).toBe(false);

    setWidth(500);
    fake.setWidth(500);
    expect(hasPhone(container)).toBe(true);
    expect(hasDesktop(container)).toBe(false);
    expect(html.classList.contains('phone-view')).toBe(true);

    setWidth(1000);
    fake.setWidth(1000);
    expect(hasPhone(container)).toBe(false);
    expect(hasDesktop(container)).toBe(true);
    expect(html.classList.contains('phone-view')).toBe(false);
    expect(err).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('T13 AC5: a window resize event alone also swaps (no matchMedia)', () => {
    const { container } = render(<App />);
    expect(hasDesktop(container)).toBe(true);
    setWidth(400);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(hasPhone(container)).toBe(true);
    expect(hasDesktop(container)).toBe(false);
  });

  it('T13 AC6: rapid crossings end on the final width with one view', () => {
    const fake = stubMatchMedia(1000);
    setWidth(1000);
    const { container } = render(<App />);
    for (const w of [500, 900, 300, 760, 759, 1200, 400]) {
      setWidth(w);
      fake.setWidth(w);
    }
    expect(hasPhone(container)).toBe(true);
    expect(hasDesktop(container)).toBe(false);
    setWidth(760);
    fake.setWidth(760);
    expect(hasPhone(container)).toBe(false);
    expect(hasDesktop(container)).toBe(true);
  });

  it('T13 AC6: listener adds equal removes after unmount under StrictMode', () => {
    const addW = vi.spyOn(window, 'addEventListener');
    const remW = vi.spyOn(window, 'removeEventListener');
    const fake = stubMatchMedia(1000);
    setWidth(1000);
    const { unmount } = render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    unmount();
    const count = (spy: typeof addW) => spy.mock.calls.filter((c) => c[0] === 'resize').length;
    expect(count(addW)).toBeGreaterThan(0);
    expect(count(remW)).toBe(count(addW));
    expect(fake.adds).toBeGreaterThan(0);
    expect(fake.removes).toBe(fake.adds);
    expect(fake.listeners.size).toBe(0);
  });

  it('T13 AC6: phone-view is removed from html on unmount', () => {
    setWidth(500);
    const { unmount } = render(<App />);
    expect(document.documentElement.classList.contains('phone-view')).toBe(true);
    unmount();
    expect(document.documentElement.classList.contains('phone-view')).toBe(false);
  });
});

describe('T13 App theme across crossings', () => {
  it('T13 AC19: data-theme is unchanged across crossings even with setItem throwing', () => {
    const fake = stubMatchMedia(1000);
    setWidth(1000);
    const { container } = render(<App />);
    expect(hasDesktop(container)).toBe(true);
    const html = document.documentElement;
    html.setAttribute('data-theme', 'light');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    for (const w of [500, 1000, 500, 1000]) {
      setWidth(w);
      fake.setWidth(w);
      expect(html.getAttribute('data-theme')).toBe('light');
    }
  });
});
