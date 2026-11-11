import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Terminal from '../../src/windows/Terminal';
import css from '../../src/windows/Terminal.css?raw';
import { stripComments } from '../helpers/cssTokens';
import { EMAIL, EXP, NAME, PROJECTS, ROLE, TERMINAL_LABELS, VERSION } from '../../src/data';
import { WIN_META } from '../../src/logic/windows';

const clean = stripComments(css);
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Declarations of the rule with exactly this selector. */
function decls(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  let found = false;
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (norm(m[1]) !== selector) continue;
    found = true;
    for (const d of m[2].split(';')) {
      const k = d.indexOf(':');
      if (k > 0) out[d.slice(0, k).trim()] = norm(d.slice(k + 1));
    }
  }
  if (!found) throw new Error(`no rule for ${selector}`);
  return out;
}

const PROMPT_TEXT = 'tanzi ~ %';
const setup = () => {
  const dispatch = vi.fn();
  const user = userEvent.setup();
  const utils = render(<Terminal dispatch={dispatch} />);
  const input = screen.getByRole('textbox', { name: TERMINAL_LABELS.input });
  const log = screen.getByRole('log', { name: TERMINAL_LABELS.log });
  const run = async (cmd: string) => {
    await user.type(input, cmd.length ? `${cmd}{Enter}` : '{Enter}');
  };
  const texts = () => Array.from(log.children).map((c) => c.textContent);
  return { dispatch, user, input, log, run, texts, ...utils };
};

describe('T07 Terminal: rendering', () => {
  it('T07 AC35: opens with the banner alone and an empty input', () => {
    const { texts, input } = setup();
    expect(texts()).toEqual([`tanzi.os v${VERSION} — type "help" to look around`]);
    expect(input).toHaveValue('');
  });

  it('T07 AC36: the input row shows the prompt, and the input has an accessible label', () => {
    const { input, log } = setup();
    expect(screen.getByText(PROMPT_TEXT)).toBeInTheDocument();
    expect(input).toHaveAccessibleName('Terminal command');
    expect(input).toHaveAttribute('spellcheck', 'false');
    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(input).toHaveAttribute('autocapitalize', 'off');
    expect(log).toHaveAccessibleName('Terminal output');
  });

  it('T07 AC36: the log does not contain the input or the prompt row', () => {
    const { input, log } = setup();
    expect(log.contains(input)).toBe(false);
    expect(within(log).queryByRole('textbox')).toBeNull();
    expect(log.textContent).not.toContain(PROMPT_TEXT);
  });

  it('T07 AC35: the input sits inside the scroller that holds the log (no extra tab stop)', () => {
    const { input, log, container } = setup();
    const body = container.firstElementChild as HTMLElement;
    expect(body.contains(log)).toBe(true);
    expect(body.contains(input)).toBe(true);
    expect(body.getAttribute('tabindex')).toBeNull();
    expect(log.getAttribute('tabindex')).toBeNull();
  });

  it('T07 AC46: the terminal does not take focus on mount', () => {
    const { input } = setup();
    expect(input).not.toHaveFocus();
    expect(document.body).toHaveFocus();
  });

  it('T07 AC37: the banner is dim, the echo is cmd, output is out, help is acc, usage is dim', async () => {
    const { log, run } = setup();
    const toneOf = (el: Element) => Array.from(el.classList).filter((c) => c.startsWith('term-'));
    expect(toneOf(log.children[0])).toContain('term-dim');
    await run('whoami');
    expect(toneOf(log.children[1])).toContain('term-cmd');
    expect(toneOf(log.children[2])).toContain('term-out');
    await run('help');
    expect(toneOf(log.children[4])).toContain('term-acc');
    await run('theme');
    expect(toneOf(log.lastElementChild!)).toContain('term-dim');
  });
});

describe('T07 Terminal: running commands', () => {
  it('T07 AC39: Enter runs the command, echoes it with the prompt, and clears the input', async () => {
    const { texts, input, run } = setup();
    await run('whoami');
    expect(texts()).toEqual([
      expect.stringContaining('type "help"'),
      `${PROMPT_TEXT} whoami`,
      `${NAME} — ${ROLE}. builds stuff.`,
    ]);
    expect(input).toHaveValue('');
  });

  it('T07 AC39: nothing runs until Enter is pressed', async () => {
    const { texts, input, user, dispatch } = setup();
    await user.type(input, 'theme light');
    expect(texts()).toHaveLength(1);
    expect(input).toHaveValue('theme light');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('T07 AC40: an empty Enter prints only the prompt line, with no effects', async () => {
    const { texts, dispatch, run } = setup();
    await run('');
    expect(texts().slice(1)).toEqual([`${PROMPT_TEXT} `]);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('T07 AC40: a whitespace-only Enter prints only the prompt line', async () => {
    const { texts, run } = setup();
    await run('   ');
    expect(texts().slice(1)).toEqual([`${PROMPT_TEXT} `]);
  });

  it('T07 AC40: help lists the commands', async () => {
    const { texts, run } = setup();
    await run('help');
    expect(texts().slice(1)).toEqual([
      `${PROMPT_TEXT} help`,
      'whoami · ls · open <file> · experience · projects · contact',
      'theme dark|light · wallpaper nebula|grid|plain · tidy · restart · clear',
    ]);
  });

  it('T07 AC40: ls lists the files', async () => {
    const { texts, run } = setup();
    await run('ls');
    expect(texts()[2]).toBe('hello.txt   about.md   experience.log   projects/');
  });

  it('T07 AC40: experience prints one aligned row per EXP entry', async () => {
    const { texts, run } = setup();
    await run('experience');
    const rows = texts().slice(2);
    expect(rows).toHaveLength(EXP.length);
    EXP.forEach((e, i) => expect(rows[i]).toBe(`${e.when.padEnd(12)}${e.role} @ ${e.org}`));
  });

  it('T07 AC40: projects prints one aligned row per PROJECTS entry', async () => {
    const { texts, run } = setup();
    await run('projects');
    const rows = texts().slice(2);
    expect(rows).toHaveLength(PROJECTS.length);
    PROJECTS.forEach((p, i) => expect(rows[i]).toBe(`${p.name.padEnd(12)}${p.desc}`));
  });

  it('T07 AC40: contact prints the email from data.ts', async () => {
    const { texts, run } = setup();
    await run('contact');
    expect(texts()[2]).toBe(`${EMAIL} · linkedin`);
  });

  it('T07 AC40: an unknown command prints command not found', async () => {
    const { texts, dispatch, run } = setup();
    await run('frobnicate');
    expect(texts()[2]).toBe('command not found: frobnicate — try "help"');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('T07 AC40: lines preserve spacing (padEnd columns survive in the text)', async () => {
    const { texts, run } = setup();
    await run('ls');
    expect(texts()[2]).toContain('hello.txt   about.md');
  });

  it('T07 AC40: bad arguments print the usage messages and dispatch nothing', async () => {
    const { texts, dispatch, run } = setup();
    await run('open');
    await run('open nope');
    await run('theme');
    await run('theme blue');
    await run('wallpaper');
    await run('wallpaper nope');
    const t = texts();
    expect(t).toContain('usage: open <hello|about|experience|projects>');
    expect(t).toContain('open: no such file: nope');
    expect(t.filter((x) => x === 'usage: theme dark|light')).toHaveLength(2);
    expect(t.filter((x) => x === 'usage: wallpaper nebula|grid|plain')).toHaveLength(2);
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe('T07 Terminal: effects', () => {
  it('T07 AC39: open <file> dispatches exactly one open for that window', async () => {
    const { dispatch, run, texts } = setup();
    await run('open projects');
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: 'open', id: 'proj' });
    expect(texts()).toContain('opening projects…');
  });

  it.each([
    ['open hello.txt', 'hello'],
    ['open about', 'about'],
    ['open experience.log', 'exp'],
    ['open projects/', 'proj'],
  ])('T07 AC40: %s opens window %s once', async (cmd, id) => {
    const { dispatch, run } = setup();
    await run(cmd);
    expect(dispatch.mock.calls).toEqual([[{ type: 'open', id }]]);
  });

  it.each(['dark', 'light'])('T07 AC39: theme %s dispatches one theme action', async (theme) => {
    const { dispatch, run, texts } = setup();
    await run(`theme ${theme}`);
    expect(dispatch.mock.calls).toEqual([[{ type: 'theme', theme }]]);
    expect(texts()).toContain(`theme → ${theme}`);
  });

  it.each(['nebula', 'grid', 'plain'])(
    'T07 AC39: wallpaper %s dispatches one wallpaper action',
    async (wall) => {
      const { dispatch, run } = setup();
      await run(`wallpaper ${wall}`);
      expect(dispatch.mock.calls).toEqual([[{ type: 'wallpaper', wall }]]);
    },
  );

  it('T07 AC40: tidy dispatches one tidy action', async () => {
    const { dispatch, run, texts } = setup();
    await run('tidy');
    expect(dispatch.mock.calls).toEqual([[{ type: 'tidy' }]]);
    expect(texts()).toContain('windows tidied.');
  });

  it('T07 AC39: restart dispatches one restart action', async () => {
    const { dispatch, run } = setup();
    await run('restart');
    expect(dispatch.mock.calls).toEqual([[{ type: 'restart' }]]);
  });

  it('T07 AC39: commands with no effect (help, whoami, sudo, rm) dispatch nothing', async () => {
    const { dispatch, run } = setup();
    for (const c of ['help', 'whoami', 'ls', 'sudo hire-tanzi', 'rm -rf /']) await run(c);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('T07 AC39: each effect is applied once per Enter, even under StrictMode', async () => {
    const dispatch = vi.fn();
    const user = userEvent.setup();
    const { StrictMode } = await import('react');
    render(
      <StrictMode>
        <Terminal dispatch={dispatch} />
      </StrictMode>,
    );
    await user.type(screen.getByRole('textbox'), 'theme light{Enter}');
    await user.type(screen.getByRole('textbox'), 'tidy{Enter}');
    expect(dispatch.mock.calls).toEqual([[{ type: 'theme', theme: 'light' }], [{ type: 'tidy' }]]);
  });

  it('T07 AC39: the same command run twice dispatches twice', async () => {
    const { dispatch, run } = setup();
    await run('tidy');
    await run('tidy');
    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  it('T07 AC5: typing dispatches no action until Enter', async () => {
    const { dispatch, user, input } = setup();
    await user.type(input, 'open projects');
    await user.keyboard('{Backspace}{Backspace}');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('T07 AC39: Enter during IME composition does not run the command', () => {
    const { input, dispatch, texts } = setup();
    // jsdom lacks composition helpers, so fire the raw event with isComposing set.
    const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true });
    (input as HTMLInputElement).value = 'tidy';
    input.dispatchEvent(ev);
    expect(dispatch).not.toHaveBeenCalled();
    expect(texts()).toHaveLength(1);
  });
});

describe('T07 Terminal: clear', () => {
  it('T07 AC40: clear removes every line including the banner and the echo', async () => {
    const { log, run, input } = setup();
    await run('whoami');
    await run('clear');
    expect(log.children).toHaveLength(0);
    expect(log.textContent).toBe('');
    expect(input).toHaveValue('');
  });

  it('T07 AC40: clear dispatches nothing', async () => {
    const { dispatch, run } = setup();
    await run('clear');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('T07 AC40: after clear the input row remains and later commands print from an empty log', async () => {
    const { texts, run, input } = setup();
    await run('clear');
    expect(input).toBeInTheDocument();
    expect(screen.getByText(PROMPT_TEXT)).toBeInTheDocument();
    await run('ls');
    expect(texts()).toEqual([
      `${PROMPT_TEXT} ls`,
      'hello.txt   about.md   experience.log   projects/',
    ]);
  });
});

describe('T07 Terminal: focus', () => {
  it('T07 AC41: focus stays in the input after ordinary commands, effects and bad input', async () => {
    const { input, user, run } = setup();
    await user.click(input);
    for (const c of ['help', 'theme light', 'open about', 'tidy', 'nope', 'clear', '']) {
      await run(c);
      expect(input).toHaveFocus();
    }
  });
});

describe('T07 Terminal: plain text (AC38)', () => {
  it('T07 AC38: entered markup appears literally and creates no elements', async () => {
    const { log, run } = setup();
    await run('<b>x</b>');
    expect(log.textContent).toContain('<b>x</b>');
    expect(log.querySelector('b')).toBeNull();
    await run('<img src=x onerror=alert(1)>');
    expect(log.querySelector('img')).toBeNull();
    expect(log.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('T07 AC38: unknown-command output with markup stays literal', async () => {
    const { log, run } = setup();
    await run('<i>y</i>');
    expect(log.querySelector('i')).toBeNull();
    expect(log.textContent).toContain('command not found: <i>y</i>');
  });

  it('T07 AC38: no source file in src/windows uses dangerouslySetInnerHTML', () => {
    const sources = import.meta.glob('/src/windows/*.tsx', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    expect(Object.keys(sources).length).toBeGreaterThan(0);
    for (const [f, src] of Object.entries(sources)) {
      expect(src, f).not.toContain('dangerouslySetInnerHTML');
    }
  });

  it('T07 AC38: a long command with no spaces is echoed in full', async () => {
    const { log, run } = setup();
    const long = 'x'.repeat(300);
    await run(long);
    expect(log.textContent).toContain(`${PROMPT_TEXT} ${long}`);
  });
});

describe('T07 Terminal: state', () => {
  it('T07 AC3: a fresh mount after unmount returns to the banner with empty input', async () => {
    const dispatch = vi.fn();
    const user = userEvent.setup();
    const first = render(<Terminal dispatch={dispatch} />);
    await user.type(screen.getByRole('textbox'), 'whoami{Enter}');
    await user.type(screen.getByRole('textbox'), 'half typed');
    first.unmount();
    render(<Terminal dispatch={dispatch} />);
    const log = screen.getByRole('log');
    expect(log.children).toHaveLength(1);
    expect(log.textContent).toContain('type "help"');
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('T07 AC3: unsent text survives a re-render of the same instance', async () => {
    const dispatch = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<Terminal dispatch={dispatch} />);
    await user.type(screen.getByRole('textbox'), 'half');
    rerender(<Terminal dispatch={dispatch} />);
    expect(screen.getByRole('textbox')).toHaveValue('half');
  });

  it('T07 AC47: WIN_META.term.height is 270 (40 titlebar + 230 body)', () => {
    expect(WIN_META.term.height).toBe(270);
  });
});

describe('T07 Terminal: CSS', () => {
  it('T07 AC35: the body is 230px tall, scrolls vertically only, padding 14px 16px, 13px/1.6 mono', () => {
    const d = decls('.term-body');
    expect(d['height']).toBe('230px');
    expect(d['overflow-y']).toBe('auto');
    expect(d['overflow-x']).toBe('hidden');
    expect(d['padding']).toBe('14px 16px');
    expect(d['font']).toBe('13px/1.6 var(--font-mono)');
  });

  it('T07 AC35: the body box-sizing keeps the total at 230px', () => {
    expect(decls('.term-body')['box-sizing']).toBe('border-box');
  });

  it('T07 AC22/AC44: terminal output is selectable', () => {
    const d = decls('.term-body');
    expect(d['user-select']).toBe('text');
    expect(d['-webkit-user-select']).toBe('text');
  });

  it('T07 AC37: tone colours use the specified tokens', () => {
    expect(decls('.term-cmd')['color']).toBe('var(--color-text)');
    expect(decls('.term-out')['color']).toBe('var(--color-neutral-300)');
    expect(decls('.term-dim')['color']).toBe('var(--color-neutral-500)');
    expect(decls('.term-acc')['color']).toBe('var(--color-accent-400)');
  });

  it('T07 AC37/AC38: lines are pre-wrap and wrap anywhere', () => {
    const d = decls('.term-line');
    expect(d['white-space']).toBe('pre-wrap');
    expect(d['overflow-wrap']).toBe('anywhere');
  });

  it('T07 AC36: the prompt is accent and the input is unstyled with an accent caret', () => {
    expect(decls('.term-prompt')['color']).toBe('var(--color-accent)');
    const d = decls('.term-input');
    expect(d['border']).toBe('0');
    expect(d['background']).toBe('transparent');
    expect(d['color']).toBe('var(--color-text)');
    expect(d['caret-color']).toBe('var(--color-accent)');
    expect(d['font']).toBe('inherit');
  });

  it('T07 AC7/AC10: tokens only, and the focus ring is never removed', () => {
    expect(clean).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(clean).not.toMatch(/rgba?\(/);
    expect(clean).not.toMatch(/all:\s*unset/);
    expect(clean).not.toMatch(/outline:\s*(none|0)\b/);
    expect(clean).not.toMatch(/outline-style:\s*none/);
  });
});

describe('T07 Terminal: history, click focus, auto-scroll (T10)', () => {
  const caretAtEnd = (el: HTMLElement) => {
    if (!(el instanceof HTMLInputElement)) throw new Error('not an input');
    expect(el.selectionStart).toBe(el.value.length);
    expect(el.selectionEnd).toBe(el.value.length);
  };

  it('T07 AC43: Up recalls older commands, Down recalls newer, then restores the draft', async () => {
    const { user, input, run } = setup();
    await run('whoami');
    await run('help');
    await run('theme dark');
    await user.type(input, 'dra');
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveValue('theme dark');
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveValue('help');
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveValue('whoami');
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveValue('help');
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveValue('theme dark');
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveValue('dra');
  });

  it('T07 AC43: Up stops at the oldest entry and keeps showing it', async () => {
    const { user, input, run } = setup();
    await run('whoami');
    await run('help');
    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}');
    expect(input).toHaveValue('whoami');
    caretAtEnd(input);
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveValue('help');
  });

  it('T07 AC43: Up with no history and Down when not navigating leave the text alone', async () => {
    const { user, input } = setup();
    await user.type(input, 'abc');
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveValue('abc');
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveValue('abc');
    caretAtEnd(input);
  });

  it('T07 AC43: an empty draft is restored as empty after Down past the newest', async () => {
    const { user, input, run } = setup();
    await run('help');
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveValue('help');
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveValue('');
  });

  it('T07 AC43: recalling does not run the command or dispatch', async () => {
    const { user, run, dispatch, texts } = setup();
    await run('help');
    const before = texts().length;
    await user.keyboard('{ArrowUp}{ArrowDown}');
    expect(texts()).toHaveLength(before);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('T07 AC43: the caret ends at the end of the recalled text', async () => {
    const { user, input, run } = setup();
    await run('theme dark');
    await run('whoami');
    await user.keyboard('{ArrowUp}');
    caretAtEnd(input);
    await user.keyboard('{ArrowUp}');
    caretAtEnd(input);
    await user.keyboard('{ArrowDown}');
    caretAtEnd(input);
    await user.keyboard('{ArrowDown}');
    caretAtEnd(input);
  });

  it('T07 AC43: the caret moves to the end even when the value does not change', async () => {
    const { user, input, run } = setup();
    await run('whoami');
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveValue('whoami');
    // Up at the only (oldest) entry: value unchanged.
    (input as HTMLInputElement).setSelectionRange(2, 2);
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveValue('whoami');
    caretAtEnd(input);
    // Down when not navigating: value unchanged.
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveValue('');
    await user.type(input, 'xyz');
    (input as HTMLInputElement).setSelectionRange(1, 1);
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveValue('xyz');
    caretAtEnd(input);
  });

  it('T07 AC43: Up and Down call preventDefault, Tab does not', () => {
    const { input } = setup();
    for (const key of ['ArrowUp', 'ArrowDown']) {
      const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      input.dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(true);
    }
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    input.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(false);
  });

  it('T07 AC43: Tab does not complete the text and moves focus out', async () => {
    const { user, input } = setup();
    await user.type(input, 'he');
    await user.tab();
    expect(input).toHaveValue('he');
    expect(input).not.toHaveFocus();
  });

  it('T07 AC40/AC43: clear keeps Up/Down history, including clear itself', async () => {
    const { user, input, run, texts } = setup();
    await run('whoami');
    await run('help');
    await run('clear');
    expect(texts()).toEqual([]);
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveValue('clear');
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveValue('help');
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveValue('whoami');
  });

  it('T07 AC43: after running a recalled command, navigation starts again from the newest', async () => {
    const { user, input, run } = setup();
    await run('whoami');
    await run('help');
    await user.keyboard('{ArrowUp}{ArrowUp}{Enter}');
    expect(input).toHaveValue('');
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveValue('whoami');
  });

  it('T07 AC44: a plain click on the body, log or prompt focuses the input', async () => {
    const { user, input, container, log } = setup();
    const body = container.firstElementChild as HTMLElement;
    await user.click(body);
    expect(input).toHaveFocus();
    input.blur();
    await user.click(log.firstElementChild as HTMLElement);
    expect(input).toHaveFocus();
    input.blur();
    await user.click(screen.getByText(PROMPT_TEXT));
    expect(input).toHaveFocus();
  });

  it('T07 AC44: a click with a non-collapsed selection does not move focus to the input', async () => {
    const { user, input, container } = setup();
    const spy = vi
      .spyOn(window, 'getSelection')
      .mockReturnValue({ isCollapsed: false } as unknown as Selection);
    try {
      await user.click(container.firstElementChild as HTMLElement);
      expect(input).not.toHaveFocus();
    } finally {
      spy.mockRestore();
    }
  });

  it('T07 AC44: a click with a collapsed selection still focuses the input', async () => {
    const { user, input, container } = setup();
    const spy = vi
      .spyOn(window, 'getSelection')
      .mockReturnValue({ isCollapsed: true } as unknown as Selection);
    try {
      await user.click(container.firstElementChild as HTMLElement);
      expect(input).toHaveFocus();
    } finally {
      spy.mockRestore();
    }
  });

  it('T07 AC44: clicking inside the input keeps it focused with its text intact', async () => {
    const { user, input } = setup();
    await user.type(input, 'abc');
    await user.click(input);
    expect(input).toHaveFocus();
    expect(input).toHaveValue('abc');
  });

  describe('auto-scroll (AC42)', () => {
    function instrument(body: HTMLElement, height: number) {
      let top = 0;
      Object.defineProperty(body, 'scrollHeight', { configurable: true, get: () => height });
      Object.defineProperty(body, 'scrollTop', {
        configurable: true,
        get: () => top,
        set: (v: number) => {
          top = v;
        },
      });
      return { top: () => top, reset: () => (top = 0) };
    }

    it('T07 AC42: running a command scrolls the body to the bottom', async () => {
      const { run, container } = setup();
      const body = container.firstElementChild as HTMLElement;
      const s = instrument(body, 1234);
      expect(s.top()).toBe(0);
      await run('help');
      expect(s.top()).toBe(1234);
    });

    it('T07 AC42: every new output scrolls again to the new bottom', async () => {
      const { run, container } = setup();
      const body = container.firstElementChild as HTMLElement;
      const s = instrument(body, 500);
      await run('whoami');
      expect(s.top()).toBe(500);
      s.reset();
      await run('help');
      expect(s.top()).toBe(500);
    });

    it('T07 AC42: typing and history recall alone do not scroll the body', async () => {
      const { user, run, container } = setup();
      await run('help');
      const body = container.firstElementChild as HTMLElement;
      const s = instrument(body, 900);
      await user.type(screen.getByRole('textbox'), 'abc');
      await user.keyboard('{ArrowUp}');
      expect(s.top()).toBe(0);
    });

    it('T07 AC42: clear also leaves the body scrolled to its (new) bottom', async () => {
      const { run, container } = setup();
      const body = container.firstElementChild as HTMLElement;
      const s = instrument(body, 77);
      await run('clear');
      expect(s.top()).toBe(77);
    });
  });
});
