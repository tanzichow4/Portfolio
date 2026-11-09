import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../src/data', async (orig) => {
  const real = await orig<typeof import('../src/data')>();
  return {
    ...real,
    NAME: 'Zed Testperson',
    ROLE: 'Chief Testing Officer',
    LINKS: [{ ...real.LINKS[0], label: 'Changed Label', href: 'https://example.test/x' }],
    PHONE_HEADINGS: { ...real.PHONE_HEADINGS, projects: 'Things I Made' },
    MENU_ITEMS: { ...real.MENU_ITEMS, resume: 'Grab my CV' },
    RESUME_URL: '/cv-elsewhere.pdf',
  };
});

import PhonePage from '../src/PhonePage';

describe('T13 PhonePage follows data.ts (AC11)', () => {
  it('T13 AC11: name and role follow the data', () => {
    render(<PhonePage />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Zed Testperson');
    expect(screen.getByText('Chief Testing Officer')).toBeTruthy();
  });

  it('T13 AC11: a changed link label and href are rendered, and the list shrinks', () => {
    render(<PhonePage />);
    const a = screen.getByRole('link', { name: 'Changed Label' });
    expect(a.getAttribute('href')).toBe('https://example.test/x');
    expect(screen.queryByRole('link', { name: 'LinkedIn' })).toBeNull();
  });

  it('T13 AC11: a changed section heading is rendered', () => {
    render(<PhonePage />);
    expect(screen.getByRole('heading', { level: 2, name: 'Things I Made' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Things I Made' })).toBeTruthy();
  });

  it('T13 AC11: the résumé label and URL follow the data', () => {
    render(<PhonePage />);
    const a = screen.getByRole('link', { name: 'Grab my CV' });
    expect(a.getAttribute('href')).toBe('/cv-elsewhere.pdf');
    expect(a.getAttribute('target')).toBe('_blank');
  });
});
