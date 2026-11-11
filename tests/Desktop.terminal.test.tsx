import { describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const renders = vi.hoisted(() => ({ dock: 0, menubar: 0 }));

vi.mock('../src/Dock', async (orig) => {
  const mod = await orig<typeof import('../src/Dock')>();
  const Real = mod.default;
  return {
    default: (p: React.ComponentProps<typeof Real>) => {
      renders.dock += 1;
      return <Real {...p} />;
    },
  };
});
vi.mock('../src/MenuBar', async (orig) => {
  const mod = await orig<typeof import('../src/MenuBar')>();
  const Real = mod.default;
  return {
    default: (p: React.ComponentProps<typeof Real>) => {
      renders.menubar += 1;
      return <Real {...p} />;
    },
  };
});

import Desktop from '../src/Desktop';
import { appReducer, initialApp } from '../src/logic/system';
import { openAllFromDock } from './helpers/openAll';

describe('T07 Desktop and Terminal', () => {
  it('T07 AC5: typing in the terminal does not re-render MenuBar or Dock, and moves no window', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, only hello is open at start, so open the other windows from the dock first.
    openAllFromDock();
    const input = screen.getByRole('textbox', { name: 'Terminal command' });
    // Focusing the input raises the window, which legitimately re-renders Desktop. Settle first.
    await user.click(input);
    const before = { ...renders };
    const styles = Array.from(document.querySelectorAll<HTMLElement>('[data-win]')).map(
      (w) => w.getAttribute('style') + String(w.dataset.min),
    );
    await user.keyboard('open projects');
    expect(input).toHaveValue('open projects');
    expect(renders).toEqual(before);
    expect(
      Array.from(document.querySelectorAll<HTMLElement>('[data-win]')).map(
        (w) => w.getAttribute('style') + String(w.dataset.min),
      ),
    ).toEqual(styles);
  });

  it('T07 AC39: Enter on a command does reach Desktop (theme light changes the root theme)', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, only hello is open at start, so open the other windows from the dock first.
    openAllFromDock();
    await user.type(
      screen.getByRole('textbox', { name: 'Terminal command' }),
      'theme light{Enter}',
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('T07 AC3: closing and reopening the terminal resets its output and input', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, only hello is open at start, so open the other windows from the dock first.
    openAllFromDock();
    const input = () => screen.getByRole('textbox', { name: 'Terminal command' });
    await user.type(input(), 'whoami{Enter}');
    await user.type(input(), 'unsent');
    await user.click(screen.getByRole('button', { name: 'Close terminal' }));
    expect(screen.queryByRole('textbox', { name: 'Terminal command' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'terminal' }));
    expect(input()).toHaveValue('');
    expect(screen.getByRole('log').children).toHaveLength(1);
  });

  it('T07 AC3: minimizing and restoring keeps output and unsent input', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, only hello is open at start, so open the other windows from the dock first.
    openAllFromDock();
    const input = () => screen.getByRole('textbox', { name: 'Terminal command', hidden: true });
    await user.type(input(), 'whoami{Enter}');
    await user.type(input(), 'unsent');
    await user.click(screen.getByRole('button', { name: 'Minimize terminal' }));
    await user.click(screen.getByRole('button', { name: 'terminal' }));
    expect(input()).toHaveValue('unsent');
    expect(screen.getByRole('log').children).toHaveLength(3);
  });

  describe('T07 AC45: Help -> Terminal commands (StrictMode)', () => {
    const HELP_BLOCK = 3; // echoed "help" plus two output lines
    const input = () => screen.getByRole('textbox', { name: 'Terminal command', hidden: true });
    const logLines = () =>
      Array.from(screen.getByRole('log', { hidden: true }).children).map((c) => c.textContent);
    const termWin = () => document.querySelector<HTMLElement>('[data-win="term"]');
    const runHelpFromMenu = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole('menuitem', { name: 'Help' }));
      await user.click(screen.getByRole('menuitem', { name: 'Terminal commands' }));
    };
    const setup = () => {
      const user = userEvent.setup();
      render(
        <StrictMode>
          <Desktop />
        </StrictMode>,
      );
      // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, only hello is open at start, so open the other windows from the dock first.
      openAllFromDock();
      return user;
    };

    it('T07 AC45: from open, appends exactly one help block after the banner', async () => {
      const user = setup();
      const before = logLines();
      expect(before).toHaveLength(1);
      await runHelpFromMenu(user);
      const after = logLines();
      expect(after).toHaveLength(1 + HELP_BLOCK);
      expect(after[0]).toBe(before[0]);
      expect(after[1]).toMatch(/help$/);
      expect(after[2]).toContain('whoami');
      expect(after[3]).toContain('theme dark|light');
      expect(termWin()).toHaveAttribute('data-min', 'false');
    });

    it('T07 AC45: from minimized, restores the window and appends one block', async () => {
      const user = setup();
      await user.click(screen.getByRole('button', { name: 'Minimize terminal' }));
      expect(termWin()).toHaveAttribute('data-min', 'true');
      await runHelpFromMenu(user);
      expect(termWin()).toHaveAttribute('data-min', 'false');
      expect(logLines()).toHaveLength(1 + HELP_BLOCK);
      expect(logLines()[1]).toMatch(/help$/);
    });

    it('T07 AC45: from closed, opens the terminal showing the banner then one help block', async () => {
      const user = setup();
      await user.click(screen.getByRole('button', { name: 'Close terminal' }));
      expect(termWin()).toBeNull();
      await runHelpFromMenu(user);
      expect(termWin()).not.toBeNull();
      const lines = logLines();
      expect(lines).toHaveLength(1 + HELP_BLOCK);
      expect(lines[0]).toContain('type "help"');
      expect(lines[1]).toMatch(/help$/);
      expect(lines[2]).toContain('whoami');
    });

    it('T07 AC45: brings the terminal to the front', async () => {
      const user = setup();
      await user.click(screen.getByRole('button', { name: 'Minimize terminal' }));
      await user.click(document.querySelector<HTMLElement>('[data-win="hello"]')!);
      await runHelpFromMenu(user);
      const z = (id: string) =>
        Number(
          document.querySelector<HTMLElement>(`[data-win="${id}"]`)!.style.zIndex ||
            getComputedStyle(document.querySelector<HTMLElement>(`[data-win="${id}"]`)!).zIndex,
        );
      for (const id of ['hello', 'about', 'exp', 'proj', 'site']) {
        const el = document.querySelector(`[data-win="${id}"]`);
        if (el) expect(z('term')).toBeGreaterThan(z(id));
      }
    });

    it('T07 AC45: two activations give two blocks', async () => {
      const user = setup();
      await runHelpFromMenu(user);
      await runHelpFromMenu(user);
      const lines = logLines();
      expect(lines).toHaveLength(1 + 2 * HELP_BLOCK);
      expect(lines[1]).toMatch(/help$/);
      expect(lines[1 + HELP_BLOCK]).toMatch(/help$/);
    });

    it('T07 AC45: keeps unsent input and earlier lines', async () => {
      const user = setup();
      await user.type(input(), 'whoami{Enter}');
      await user.type(input(), 'unsent');
      const earlier = logLines();
      await runHelpFromMenu(user);
      expect(input()).toHaveValue('unsent');
      expect(logLines().slice(0, earlier.length)).toEqual(earlier);
      expect(logLines()).toHaveLength(earlier.length + HELP_BLOCK);
    });

    it('T07 AC45: the help run is not added to Up/Down history', async () => {
      const user = setup();
      await runHelpFromMenu(user);
      await user.click(input());
      await user.keyboard('{ArrowUp}');
      expect(input()).toHaveValue('');
      await user.type(input(), 'whoami{Enter}');
      await runHelpFromMenu(user);
      await user.click(input());
      await user.keyboard('{ArrowUp}');
      expect(input()).toHaveValue('whoami');
      await user.keyboard('{ArrowUp}');
      expect(input()).toHaveValue('whoami');
    });

    it('T07 AC45: opening from the dock does not run help', async () => {
      const user = setup();
      await user.click(screen.getByRole('button', { name: 'Close terminal' }));
      await user.click(screen.getByRole('button', { name: 'terminal' }));
      expect(logLines()).toHaveLength(1);
    });
  });

  it('T07 AC4: desktop state holds only wins, order and viewport, even after terminal actions', () => {
    const keys = ['order', 'vh', 'vw', 'wins'];
    let app = initialApp(1280, 720, { theme: 'dark', wall: 'nebula', wobble: true });
    expect(Object.keys(app.desk).sort()).toEqual(keys);
    app = appReducer(app, { type: 'open', id: 'term' });
    expect(Object.keys(app.desk).sort()).toEqual(keys);
    expect(Object.keys(app.desk.wins.term).sort()).toEqual(['min', 'open', 'x', 'y']);
  });
});
