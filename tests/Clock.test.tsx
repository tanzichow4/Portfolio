import { StrictMode } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Clock from '../src/Clock';

// Saturday 8 Nov 2025, 15:42:00 local time.
const sat1542 = () => new Date(2025, 10, 8, 15, 42, 0);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(sat1542());
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Clock', () => {
  it('AC32: the first render already shows the time (no blank frame)', () => {
    render(<Clock />);
    expect(screen.getByText('Sat 3:42 PM')).toBeInTheDocument();
  });

  it('AC32: it is a <time> element with a machine-readable dateTime', () => {
    render(<Clock />);
    const el = screen.getByText('Sat 3:42 PM');
    expect(el.tagName).toBe('TIME');
    expect(el).toHaveAttribute('datetime', '15:42');
  });

  it('AC32: it is not focusable', () => {
    render(<Clock />);
    const el = screen.getByText('Sat 3:42 PM');
    expect(el).not.toHaveAttribute('tabindex');
    expect(el.tabIndex).toBe(-1);
  });

  it('AC30: the text uses only ASCII spaces', () => {
    render(<Clock />);
    expect(screen.getByText('Sat 3:42 PM').textContent).toMatch(/^[\x20-\x7e]+$/);
  });

  it('AC32: advancing 15s past the next minute updates the text and dateTime', () => {
    render(<Clock />);
    act(() => {
      vi.setSystemTime(new Date(2025, 10, 8, 15, 43, 0));
      vi.advanceTimersByTime(15_000);
    });
    const el = screen.getByText('Sat 3:43 PM');
    expect(el).toHaveAttribute('datetime', '15:43');
  });

  it('AC32: it rolls over midnight to the next weekday', () => {
    vi.setSystemTime(new Date(2025, 10, 8, 23, 59, 50));
    render(<Clock />);
    expect(screen.getByText('Sat 11:59 PM')).toBeInTheDocument();
    act(() => {
      vi.setSystemTime(new Date(2025, 10, 9, 0, 0, 5));
      vi.advanceTimersByTime(15_000);
    });
    expect(screen.getByText('Sun 12:00 AM')).toBeInTheDocument();
  });

  it('AC32: the interval is at most 15s', () => {
    const spy = vi.spyOn(globalThis, 'setInterval');
    render(<Clock />);
    expect(spy).toHaveBeenCalled();
    for (const call of spy.mock.calls) expect(Number(call[1])).toBeLessThanOrEqual(15_000);
  });

  it('AC32: a StrictMode mount leaves a net of one live interval and unmount clears it', () => {
    const set = vi.spyOn(globalThis, 'setInterval');
    const clear = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = render(
      <StrictMode>
        <Clock />
      </StrictMode>,
    );
    expect(set.mock.calls.length - clear.mock.calls.length).toBe(1);
    unmount();
    expect(set.mock.calls.length - clear.mock.calls.length).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('AC32: after unmount, advancing time logs nothing', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(<Clock />);
    unmount();
    expect(() => vi.advanceTimersByTime(60_000)).not.toThrow();
    expect(err).not.toHaveBeenCalled();
  });
});
