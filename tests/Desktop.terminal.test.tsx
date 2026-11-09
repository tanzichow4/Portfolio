import { describe, expect, it, vi } from 'vitest';
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

describe('T07 Desktop and Terminal', () => {
  it('T07 AC5: typing in the terminal does not re-render MenuBar or Dock, and moves no window', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
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
    await user.type(
      screen.getByRole('textbox', { name: 'Terminal command' }),
      'theme light{Enter}',
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('T07 AC3: closing and reopening the terminal resets its output and input', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
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
    const input = () => screen.getByRole('textbox', { name: 'Terminal command', hidden: true });
    await user.type(input(), 'whoami{Enter}');
    await user.type(input(), 'unsent');
    await user.click(screen.getByRole('button', { name: 'Minimize terminal' }));
    await user.click(screen.getByRole('button', { name: 'terminal' }));
    expect(input()).toHaveValue('unsent');
    expect(screen.getByRole('log').children).toHaveLength(3);
  });
});
