import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Plant } from '@phosphor-icons/react';
import { WIN_META } from '../../src/logic/windows';

vi.mock('../../src/data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/data')>();
  const rich = {
    name: 'Rich One',
    icon: Plant,
    href: '#',
    desc: 'First rich desc.',
    tags: ['A', 'B'],
    featured: true,
    details: 'Rich details text.',
    highlights: ['First point', 'Second point', 'Third point'],
    links: [
      { label: 'Repo link', href: 'https://example.com/repo' },
      { label: 'Local link', href: '#' },
    ],
  };
  const plain = Array.from({ length: 8 }, (_, i) => ({
    name: `Extra ${i + 1}`,
    icon: Plant,
    href: '#',
    desc: `Extra desc ${i + 1}.`,
    tags: ['T1', 'T2'],
  }));
  return { ...actual, PROJECTS: [rich, ...plain] };
});

import Projects from '../../src/windows/Projects';

describe('T18 mocked projects data', () => {
  it('T18 AC19: with 9 projects there are 9 li and 9 tile buttons, all inside the scroller', () => {
    const { container } = render(<Projects />);
    const body = container.querySelector('.proj-body')!;
    expect(body.querySelectorAll('li')).toHaveLength(9);
    expect(body.querySelectorAll('button')).toHaveLength(9);
    expect(container.querySelectorAll('button')).toHaveLength(9);
  });

  it('T18 AC19: WIN_META.proj stays 520x385 whatever the number of projects', () => {
    expect(WIN_META.proj).toEqual({ width: 520, height: 385, dock: true });
  });

  it('T18 AC12: the detail view shows details, highlights in order, tags and links with attrs', async () => {
    const user = userEvent.setup();
    const { container } = render(<Projects />);
    await user.click(screen.getByRole('button', { name: 'Rich One' }));
    const d = container.querySelector('.proj-detail')!;
    const dom = (a: Element, b: Element) =>
      !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

    const h2 = within(d as HTMLElement).getByRole('heading', { level: 2 });
    const star = within(d as HTMLElement).getByRole('img', { name: 'Featured' });
    const desc = screen.getByText('First rich desc.');
    const details = screen.getByText('Rich details text.');
    const hl = d.querySelectorAll('ul')[0];
    const tag = d.querySelector('.tag')!;
    const links = d.querySelectorAll('ul')[1];
    expect(d.querySelectorAll('ul')).toHaveLength(2);
    expect(dom(d.querySelector('button')!, h2)).toBe(true);
    expect(dom(h2, star)).toBe(true);
    expect(dom(star, desc)).toBe(true);
    expect(dom(desc, details)).toBe(true);
    expect(dom(details, hl)).toBe(true);
    expect(dom(hl, tag)).toBe(true);
    expect(dom(tag, links)).toBe(true);

    expect(Array.from(hl.querySelectorAll('li')).map((l) => l.textContent)).toEqual([
      'First point',
      'Second point',
      'Third point',
    ]);
    expect(d.querySelectorAll('h3')).toHaveLength(2);
    expect(d.querySelectorAll('.tag')).toHaveLength(2);

    const anchors = within(links as HTMLElement).getAllByRole('link');
    expect(anchors.map((a) => a.textContent)).toEqual(['Repo link', 'Local link']);
    expect(anchors[0]).toHaveAttribute('href', 'https://example.com/repo');
    expect(anchors[0]).toHaveAttribute('target', '_blank');
    expect(anchors[0]).toHaveAttribute('rel', 'noopener noreferrer');
    expect(anchors[1]).toHaveAttribute('href', '#');
    expect(anchors[1]).not.toHaveAttribute('target');
    expect(anchors[1]).not.toHaveAttribute('rel');
  });

  it('T18 AC16: the detail tab stops are the back button then each link', async () => {
    const user = userEvent.setup();
    const { container } = render(<Projects />);
    await user.click(screen.getByRole('button', { name: 'Rich One' }));
    const stops = Array.from(container.querySelectorAll('a[href], button')).map((e) =>
      e.textContent?.trim(),
    );
    expect(stops).toEqual(['Back to projects', 'Repo link', 'Local link']);
  });

  it('T18 AC12: a project with only required fields shows no optional sections', async () => {
    const user = userEvent.setup();
    const { container } = render(<Projects />);
    await user.click(screen.getByRole('button', { name: 'Extra 3' }));
    expect(container.querySelector('h3')).toBeNull();
    expect(container.querySelector('ul')).toBeNull();
    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelectorAll('svg[role="img"]')).toHaveLength(0);
    expect(screen.getByText('Extra desc 3.')).toBeInTheDocument();
    expect(container.querySelectorAll('.tag')).toHaveLength(2);
  });

  it('T18 AC14: going back to a tile far down the list focuses that tile', async () => {
    const user = userEvent.setup();
    render(
      <div data-win="proj">
        <Projects />
      </div>,
    );
    await user.click(screen.getByRole('button', { name: 'Extra 8' }));
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Extra 8' })).toHaveFocus();
  });

  it('T18 AC20: the scroller itself is not a tab stop', () => {
    const { container } = render(<Projects />);
    expect(container.querySelector('.proj-body')).not.toHaveAttribute('tabindex');
  });
});
