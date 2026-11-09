import { StrictMode } from 'react';
import { act, fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import css from '../src/BootScreen.css?raw';
import BootScreen from '../src/BootScreen';
import { BOOT_COPY, SITE_COPY } from '../src/data';

const tick = (n = 1) => {
  for (let i = 0; i < n; i++)
    act(() => {
      vi.advanceTimersByTime(90);
    });
};
const fillEl = (c: HTMLElement) => c.querySelector('.boot-fill') as HTMLElement;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('T08 BootScreen markup and semantics', () => {
  it('T08 AC22: is a modal dialog named from BOOT_COPY', () => {
    render(<BootScreen onDone={() => {}} />);
    const d = screen.getByRole('dialog', { name: BOOT_COPY.dialog });
    expect(d.getAttribute('aria-modal')).toBe('true');
    expect(BOOT_COPY.dialog.toLowerCase()).toContain('restart');
  });

  it('T08 AC22: takes focus on mount, is only programmatically focusable', () => {
    render(<BootScreen onDone={() => {}} />);
    const d = screen.getByRole('dialog');
    expect(document.activeElement).toBe(d);
    expect(d.getAttribute('tabindex')).toBe('-1');
  });

  it('T08 AC22: focus lands on mount under StrictMode too', () => {
    render(
      <StrictMode>
        <BootScreen onDone={() => {}} />
      </StrictMode>,
    );
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
  });

  it('T08 AC6 AC28: mark shows SITE_COPY.mark and is hidden from assistive technology', () => {
    const { container } = render(<BootScreen onDone={() => {}} />);
    const mark = container.querySelector('.boot-mark') as HTMLElement;
    expect(mark.textContent).toBe(SITE_COPY.mark);
    expect(mark.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByText(SITE_COPY.mark)).not.toBeNull();
  });

  it('T08 AC6: mark comes before the progress bar in the column', () => {
    const { container } = render(<BootScreen onDone={() => {}} />);
    const kids = Array.from(container.querySelector('.boot')!.children).map((e) => e.className);
    expect(kids).toEqual(['boot-mark', 'boot-track']);
  });

  it('T08 AC8: shows no other text than the mark', () => {
    const { container } = render(<BootScreen onDone={() => {}} />);
    expect(container.textContent).toBe(SITE_COPY.mark);
  });

  it('T08 AC23: progressbar has a name from BOOT_COPY, 0..100 bounds, and is not focusable', () => {
    render(<BootScreen onDone={() => {}} />);
    const bar = screen.getByRole('progressbar', { name: BOOT_COPY.progress });
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
    expect(bar.hasAttribute('tabindex')).toBe(false);
  });

  it('T08 AC9 AC23: starts at 0 with fill width 0', () => {
    const { container } = render(<BootScreen onDone={() => {}} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
    expect(parseFloat(fillEl(container).style.width)).toBe(0);
  });

  it('T08 AC7: fill is a child of the track', () => {
    const { container } = render(<BootScreen onDone={() => {}} />);
    expect(fillEl(container).parentElement).toBe(container.querySelector('.boot-track'));
  });
});

describe('T08 BootScreen progress', () => {
  it('T08 AC9 AC23: each 90ms tick adds 7 + r*14, aria-valuenow is the rounded integer, width the exact value', () => {
    const rs = [0, 0.5, 0.25];
    let i = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => rs[i++]);
    const { container } = render(<BootScreen onDone={() => {}} />);
    const bar = screen.getByRole('progressbar');
    tick();
    expect(parseFloat(fillEl(container).style.width)).toBeCloseTo(7, 5);
    expect(bar.getAttribute('aria-valuenow')).toBe('7');
    tick();
    expect(parseFloat(fillEl(container).style.width)).toBeCloseTo(7 + 14, 5);
    expect(bar.getAttribute('aria-valuenow')).toBe('21');
    tick();
    const w = parseFloat(fillEl(container).style.width);
    expect(w).toBeCloseTo(21 + 7 + 3.5, 5);
    expect(bar.getAttribute('aria-valuenow')).toBe(String(Math.round(w)));
    expect(Number.isInteger(Number(bar.getAttribute('aria-valuenow')))).toBe(true);
  });

  it('T08 AC9: does not tick before 90ms', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { container } = render(<BootScreen onDone={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(89);
    });
    expect(parseFloat(fillEl(container).style.width)).toBe(0);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(parseFloat(fillEl(container).style.width)).toBe(7);
  });

  it('T08 AC9: displayed progress only increases and never exceeds 100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const { container } = render(<BootScreen onDone={() => {}} />);
    let prev = 0;
    for (let i = 0; i < 20; i++) {
      tick();
      const w = parseFloat(fillEl(container).style.width);
      expect(w).toBeGreaterThanOrEqual(prev);
      expect(w).toBeLessThanOrEqual(100);
      prev = w;
    }
  });

  it('T08 AC10: with r=0, onDone is not called on tick 14 and is called exactly once on tick 15', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const onDone = vi.fn();
    render(<BootScreen onDone={onDone} />);
    tick(14);
    expect(onDone).not.toHaveBeenCalled();
    tick();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('T08 AC10: with r just below 1, onDone fires on tick 5 and not tick 4', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    const onDone = vi.fn();
    render(<BootScreen onDone={onDone} />);
    tick(4);
    expect(onDone).not.toHaveBeenCalled();
    tick();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('T08 AC10 AC12: no further ticks, setState or onDone after completion', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    const onDone = vi.fn();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(<BootScreen onDone={onDone} />);
    tick(5);
    const w = fillEl(container).style.width;
    const now = screen.getByRole('progressbar').getAttribute('aria-valuenow');
    tick(30);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(fillEl(container).style.width).toBe(w);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(now);
    expect(vi.getTimerCount()).toBe(0);
    expect(err).not.toHaveBeenCalled();
  });

  it('T08 AC10: the completing tick does not render 100 as a final step beyond the cap', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    const { container } = render(<BootScreen onDone={() => {}} />);
    tick(5);
    expect(parseFloat(fillEl(container).style.width)).toBeLessThanOrEqual(100);
  });

  it('T08 AC12: re-rendering with the same onDone does not restart the boot', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const onDone = vi.fn();
    const { rerender } = render(<BootScreen onDone={onDone} />);
    tick(10);
    rerender(<BootScreen onDone={onDone} />);
    tick(4);
    expect(onDone).not.toHaveBeenCalled();
    tick();
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('T08 BootScreen timers', () => {
  it('T08 AC12: a single 90ms interval is active', () => {
    const set = vi.spyOn(globalThis, 'setInterval');
    render(<BootScreen onDone={() => {}} />);
    expect(set).toHaveBeenCalledTimes(1);
    expect(set.mock.calls[0][1]).toBe(90);
  });

  it('T08 AC12: under StrictMode exactly one interval stays active at 90ms and onDone fires once', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const set = vi.spyOn(globalThis, 'setInterval');
    const clear = vi.spyOn(globalThis, 'clearInterval');
    const onDone = vi.fn();
    render(
      <StrictMode>
        <BootScreen onDone={onDone} />
      </StrictMode>,
    );
    const ids = set.mock.results.map((r) => r.value);
    const cleared = clear.mock.calls.map((c) => c[0]);
    const active = ids.filter((id) => !cleared.includes(id));
    expect(active).toHaveLength(1);
    for (const c of set.mock.calls) expect(c[1]).toBe(90);
    tick(14);
    expect(onDone).not.toHaveBeenCalled();
    tick();
    expect(onDone).toHaveBeenCalledTimes(1);
    tick(20);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('T08 AC12: unmounting mid-boot clears the interval, stops progress and completion, and logs nothing', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onDone = vi.fn();
    const { unmount } = render(<BootScreen onDone={onDone} />);
    tick(3);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    tick(30);
    expect(onDone).not.toHaveBeenCalled();
    expect(err).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('T08 AC12: a fresh mount starts again at 0 (a second boot)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const first = render(<BootScreen onDone={() => {}} />);
    tick(5);
    first.unmount();
    const { container } = render(<BootScreen onDone={() => {}} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
    expect(parseFloat(fillEl(container).style.width)).toBe(0);
  });
});

describe('T08 BootScreen keyboard', () => {
  it('T08 AC24: Tab is default-prevented', () => {
    render(<BootScreen onDone={() => {}} />);
    const notPrevented = fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' });
    expect(notPrevented).toBe(false);
  });

  it.each([['Escape'], ['Enter'], [' '], ['a']])(
    'T08 AC24: %j is not default-prevented and does not end the boot early',
    (key) => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const onDone = vi.fn();
      render(<BootScreen onDone={onDone} />);
      const notPrevented = fireEvent.keyDown(screen.getByRole('dialog'), { key });
      expect(notPrevented).toBe(true);
      fireEvent.click(screen.getByRole('dialog'));
      expect(onDone).not.toHaveBeenCalled();
      tick(14);
      expect(onDone).not.toHaveBeenCalled();
    },
  );

  it('T08 AC24: Tab leaves the dialog focused', () => {
    render(<BootScreen onDone={() => {}} />);
    const d = screen.getByRole('dialog');
    fireEvent.keyDown(d, { key: 'Tab' });
    expect(document.activeElement).toBe(d);
  });
});

describe('T08 BootScreen.css', () => {
  const rule = (sel: string): string => {
    const esc = sel.replace(/[.:()-]/g, '\\$&');
    const m = new RegExp(`(?:^|\\})\\s*${esc}\\s*\\{([^}]*)\\}`, 'm').exec(css);
    if (!m) throw new Error(`rule ${sel} not found`);
    return m[1].replace(/\s+/g, ' ');
  };
  const has = (body: string, decl: string) => expect(body).toContain(decl);

  it('T08 AC5: .boot is fixed, full viewport, above everything, opaque --color-bg', () => {
    const b = rule('.boot');
    has(b, 'position: fixed;');
    has(b, 'inset: 0;');
    has(b, 'background: var(--color-bg);');
    const z = /z-index:\s*(\d+)/.exec(b);
    expect(Number(z?.[1])).toBeGreaterThan(1000);
  });

  it('T08 AC6: .boot is a centred flex column with a 22px gap', () => {
    const b = rule('.boot');
    has(b, 'display: flex;');
    has(b, 'flex-direction: column;');
    has(b, 'align-items: center;');
    has(b, 'justify-content: center;');
    has(b, 'gap: 22px;');
  });

  it('T08 AC6: .boot-mark is 64x64, radius 16, 1px accent border, accent 22px/600 text, centred', () => {
    const b = rule('.boot-mark');
    has(b, 'width: 64px;');
    has(b, 'height: 64px;');
    has(b, 'border-radius: 16px;');
    has(b, 'border: 1px solid var(--color-accent);');
    has(b, 'color: var(--color-accent);');
    has(b, 'font-size: 22px;');
    has(b, 'font-weight: 600;');
    has(b, 'place-items: center;');
  });

  it('T08 AC7: .boot-track is 200x3, radius 2, neutral-800 and clips', () => {
    const b = rule('.boot-track');
    has(b, 'width: 200px;');
    has(b, 'height: 3px;');
    has(b, 'border-radius: 2px;');
    has(b, 'background: var(--color-neutral-800);');
    has(b, 'overflow: hidden;');
  });

  it('T08 AC7: .boot-fill is accent and transitions width .12s linear', () => {
    const b = rule('.boot-fill');
    has(b, 'background: var(--color-accent);');
    const t = /transition:\s*([^;]+);/.exec(b);
    expect(t).not.toBeNull();
    const m = /^width\s+(\d*\.?\d+)(ms|s)\s+linear$/.exec(t![1].trim());
    expect(m).not.toBeNull();
    const secs = m![2] === 'ms' ? Number(m![1]) / 1000 : Number(m![1]);
    expect(secs).toBeCloseTo(0.12, 6);
  });

  it('T08 AC8: no hard-coded colours', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/rgba?\(|hsla?\(/);
    for (const m of css.matchAll(
      /(?:^|[\s;{])(?:background|color|border|border-color):\s*([^;]+);/g,
    )) {
      const v = m[1];
      if (/^(1px solid )?var\(--/.test(v) || /^(none|0)$/.test(v)) continue;
      throw new Error(`non-token colour value: ${v}`);
    }
  });

  it('T08 AC8: no fade, transition or animation on .boot, and no animation anywhere', () => {
    expect(rule('.boot')).not.toMatch(/transition|animation|opacity/);
    expect(css).not.toMatch(/animation|@keyframes/);
    expect(css.match(/transition/g)).toHaveLength(1);
  });

  it('T08 AC22: outline: none appears only under .boot:focus-visible', () => {
    has(rule('.boot:focus-visible'), 'outline: none;');
    expect(css.match(/outline/g)).toHaveLength(1);
  });

  it('T08 AC24: .boot disables text selection', () => {
    has(rule('.boot'), 'user-select: none;');
  });
});
