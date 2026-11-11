import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Projects from '../../src/windows/Projects';
import Desktop from '../../src/Desktop';
import css from '../../src/windows/Projects.css?raw';
import { topRule } from '../helpers/cssScope';
import { PROJECTS, PROJECT_LABELS } from '../../src/data';
import { WIN_META } from '../../src/logic/windows';

type User = ReturnType<typeof userEvent.setup>;

const FEATURED = PROJECTS.filter((p) => p.featured).map((p) => p.name);
const NOT_FEATURED = PROJECTS.filter((p) => !p.featured).map((p) => p.name);
const tile = (name: string) => screen.getByRole('button', { name });
const back = () => screen.getByRole('button', { name: PROJECT_LABELS.back });
/** Escape is scoped to the enclosing window element, so standalone renders need one. */
const renderInWin = () =>
  render(
    <div data-win="proj">
      <Projects />
    </div>,
  );
const stars = (root: ParentNode) => root.querySelectorAll('svg[role="img"]');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('T18 tile semantics', () => {
  it('T18 AC5: every tile is a type=button control, with no anchors in the list', () => {
    const { container } = render(<Projects />);
    expect(container.querySelectorAll('a')).toHaveLength(0);
    const items = container.querySelectorAll('li');
    expect(items).toHaveLength(PROJECTS.length);
    items.forEach((li) => {
      const buttons = li.querySelectorAll('button');
      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toHaveAttribute('type', 'button');
      expect(li.querySelector('h2')?.contains(buttons[0])).toBe(true);
    });
  });

  it('T18 AC5: no heading or block content sits inside a tile button', () => {
    const { container } = render(<Projects />);
    for (const b of container.querySelectorAll('button')) {
      expect(b.querySelector('h1,h2,h3,h4,p,div,ul,li,svg')).toBeNull();
    }
  });

  it('T18 AC6: the tile accessible name is exactly the project name', () => {
    render(<Projects />);
    for (const p of PROJECTS) expect(tile(p.name)).toHaveAccessibleName(p.name);
  });

  it('T18 AC6: the description contains desc, and references the Featured star only for featured projects', () => {
    render(<Projects />);
    for (const p of PROJECTS) {
      expect(tile(p.name)).toHaveAccessibleDescription(expect.stringContaining(p.desc));
      // jsdom does not read aria-label of a referenced svg, so pin the reference itself.
      const refs = (tile(p.name).getAttribute('aria-describedby') ?? '').split(/\s+/);
      const labels = refs.map((id) => document.getElementById(id)?.getAttribute('aria-label'));
      if (p.featured) expect(labels).toContain(PROJECT_LABELS.featured);
      else expect(labels).not.toContain(PROJECT_LABELS.featured);
      for (const id of refs) expect(document.getElementById(id), id).not.toBeNull();
    }
  });

  it('T18 AC6: the external-link arrow is gone and tile icons are decorative', () => {
    const { container } = render(<Projects />);
    expect(container.querySelector('a, [href], [target]')).toBeNull();
    for (const s of container.querySelectorAll('svg:not([role])'))
      expect(s).toHaveAttribute('aria-hidden', 'true');
  });

  it('T18 AC6: clicking the tile face (not the button) opens the detail view', async () => {
    const user = userEvent.setup();
    const { container } = render(<Projects />);
    await user.click(container.querySelector('.proj-face')!);
    expect(back()).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: PROJECTS[0].name })).toBeInTheDocument();
  });

  it('T18 AC6: Enter on the focused tile button opens its detail view', async () => {
    const user = userEvent.setup();
    render(<Projects />);
    tile(PROJECTS[1].name).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { name: PROJECTS[1].name })).toBeInTheDocument();
    expect(back()).toBeInTheDocument();
  });

  it('T18 AC6: Space on the focused tile button opens its detail view', async () => {
    const user = userEvent.setup();
    render(<Projects />);
    tile(PROJECTS[2].name).focus();
    await user.keyboard(' ');
    expect(screen.getByRole('heading', { name: PROJECTS[2].name })).toBeInTheDocument();
    expect(back()).toBeInTheDocument();
  });

  it('T18 AC8: project icons are decorative and non-featured tiles contain no star', () => {
    render(<Projects />);
    for (const n of NOT_FEATURED) {
      const li = tile(n).closest('li')!;
      expect(stars(li)).toHaveLength(0);
      expect(li.querySelectorAll('svg')).toHaveLength(2);
    }
  });

  it('T18 AC9: a featured tile has exactly one non-focusable Featured star', () => {
    render(<Projects />);
    expect(FEATURED).toEqual(['Indoor Garden']);
    for (const n of FEATURED) {
      const li = tile(n).closest('li')!;
      const found = within(li).getAllByRole('img', { name: PROJECT_LABELS.featured });
      expect(found).toHaveLength(1);
      expect(stars(li)).toHaveLength(1);
      expect(found[0]).not.toHaveAttribute('tabindex');
      expect(found[0].getAttribute('fill')).toBe('currentColor');
    }
    expect(screen.getAllByRole('img', { name: 'Featured' })).toHaveLength(FEATURED.length);
  });
});

describe('T18 detail view', () => {
  it('T18 AC11: opening a tile replaces the list with the detail view', async () => {
    const user = userEvent.setup();
    const { container } = render(<Projects />);
    await user.click(tile('Voice Calendar'));
    expect(container.querySelector('ul.proj-grid')).toBeNull();
    expect(screen.queryByRole('list', { name: /./ })).toBeNull();
    for (const p of PROJECTS) {
      if (p.name === 'Voice Calendar') continue;
      expect(screen.queryByRole('button', { name: p.name })).toBeNull();
    }
    expect(screen.getByRole('heading', { level: 2, name: 'Voice Calendar' })).toBeInTheDocument();
  });

  it('T18 AC12: required fields show in DOM order: back, icon, name, desc, tags', async () => {
    const user = userEvent.setup();
    const { container } = render(<Projects />);
    const p = PROJECTS[0];
    await user.click(tile(p.name));
    const order = ['button', 'svg', 'h2', 'p', '.tag'].map((sel) => container.querySelector(sel)!);
    for (let i = 1; i < order.length; i++) {
      expect(
        order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING,
        `element ${i} follows element ${i - 1}`,
      ).toBeTruthy();
    }
    expect(container.querySelector('h2')!.textContent).toBe(p.name);
    expect(screen.getByText(p.desc)).toBeInTheDocument();
    expect(container.querySelectorAll('.tag')).toHaveLength(p.tags.length);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('T18 AC12: missing details, highlights and links render nothing (no h3, ul, link, TODO)', async () => {
    const user = userEvent.setup();
    const { container } = render(<Projects />);
    for (const p of PROJECTS.filter((x) => !x.details && !x.highlights && !x.links)) {
      await user.click(tile(p.name));
      expect(container.querySelector('h3')).toBeNull();
      expect(container.querySelector('ul')).toBeNull();
      expect(container.querySelector('a')).toBeNull();
      expect(container.textContent).not.toContain('TODO');
      expect(container.querySelectorAll('p')).toHaveLength(1);
      expect(stars(container)).toHaveLength(0);
      await user.click(back());
    }
  });

  it('T18 AC12: Indoor Garden shows its details paragraph, with no other optional sections', async () => {
    const user = userEvent.setup();
    const { container } = render(<Projects />);
    const p = PROJECTS.find((x) => x.name === 'Indoor Garden')!;
    await user.click(tile(p.name));
    expect(screen.getByText(p.details!)).toBeInTheDocument();
    expect(p.details).toContain('Capstone');
    // DELIBERATE REQUIREMENT CHANGE (resume content): Indoor Garden now has highlights from the
    // résumé, so the Highlights section renders; there is still no Links section.
    expect(container.querySelector('h3')?.textContent).toBe(PROJECT_LABELS.highlights);
    expect(Array.from(container.querySelectorAll('ul li')).map((li) => li.textContent)).toEqual(
      p.highlights,
    );
    expect(screen.queryByText(PROJECT_LABELS.links)).toBeNull();
  });

  it('T18 AC9: the detail view of a featured project has one Featured star, others none', async () => {
    const user = userEvent.setup();
    const { container } = render(<Projects />);
    for (const p of PROJECTS) {
      await user.click(tile(p.name));
      const found = container.querySelectorAll('svg[role="img"]');
      expect(found).toHaveLength(p.featured ? 1 : 0);
      if (p.featured) {
        expect(screen.getByRole('img', { name: 'Featured' })).not.toHaveAttribute('tabindex');
      }
      await user.click(back());
    }
  });

  it('T18 AC13: the back button is a native button with a visible text label from data', async () => {
    const user = userEvent.setup();
    render(<Projects />);
    await user.click(tile('Voice Calendar'));
    const b = back();
    expect(b.tagName).toBe('BUTTON');
    expect(b).toHaveAttribute('type', 'button');
    expect(b.textContent?.trim()).toBe(PROJECT_LABELS.back);
    for (const s of b.querySelectorAll('svg')) expect(s).toHaveAttribute('aria-hidden', 'true');
  });

  it('T18 AC13: back works by click, Enter and Space', async () => {
    const user = userEvent.setup();
    render(<Projects />);
    for (const act of [
      () => user.click(back()),
      () => user.keyboard('{Enter}'),
      () => user.keyboard(' '),
    ]) {
      await user.click(tile('Grocery Prices'));
      expect(back()).toHaveFocus();
      await act();
      expect(screen.queryByRole('button', { name: PROJECT_LABELS.back })).toBeNull();
      expect(screen.getAllByRole('listitem')).toHaveLength(PROJECTS.length);
    }
  });

  it('T18 AC14: opening by click moves focus to the back button', async () => {
    const user = userEvent.setup();
    render(<Projects />);
    await user.click(tile('Indoor Garden'));
    expect(back()).toHaveFocus();
  });

  it('T18 AC14: opening by keyboard moves focus to the back button', async () => {
    const user = userEvent.setup();
    render(<Projects />);
    tile('Driver Safety').focus();
    await user.keyboard('{Enter}');
    expect(back()).toHaveFocus();
  });

  it('T18 AC14: going back returns focus to the same tile', async () => {
    const user = userEvent.setup();
    render(<Projects />);
    for (const p of PROJECTS) {
      await user.click(tile(p.name));
      await user.click(back());
      expect(tile(p.name)).toHaveFocus();
    }
  });

  it('T18 AC14: nothing is focused on first render', () => {
    render(<Projects />);
    expect(document.body).toHaveFocus();
  });

  it('T18 AC15: Escape from the back button returns to the list with the tile focused', async () => {
    const user = userEvent.setup();
    renderInWin();
    await user.click(tile('Grocery Prices'));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('button', { name: PROJECT_LABELS.back })).toBeNull();
    expect(tile('Grocery Prices')).toHaveFocus();
  });

  it('T18 AC15: Escape with the list shown changes nothing', async () => {
    const user = userEvent.setup();
    render(<Projects />);
    tile('Voice Calendar').focus();
    await user.keyboard('{Escape}');
    expect(screen.getAllByRole('listitem')).toHaveLength(PROJECTS.length);
    expect(tile('Voice Calendar')).toHaveFocus();
  });

  it('T18 AC15: Escape with focus outside the projects window is ignored in the detail view', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <div>
        <div data-win="proj">
          <Projects />
        </div>
        <button type="button">outside</button>
      </div>,
    );
    await user.click(tile('Voice Calendar'));
    screen.getByRole('button', { name: 'outside' }).focus();
    await user.keyboard('{Escape}');
    expect(back()).toBeInTheDocument();
    fireEvent.keyDown(container, { key: 'Escape' });
    expect(back()).toBeInTheDocument();
    // Focus back inside: Escape works.
    back().focus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('button', { name: PROJECT_LABELS.back })).toBeNull();
  });

  it('T18 AC15: other keys do not leave the detail view', async () => {
    const user = userEvent.setup();
    render(<Projects />);
    await user.click(tile('Voice Calendar'));
    await user.keyboard('{Backspace}a');
    expect(back()).toBeInTheDocument();
  });

  it('T18 AC16: the focusable elements in the detail view are only the back button', async () => {
    const user = userEvent.setup();
    const { container } = render(<Projects />);
    await user.click(tile('Voice Calendar'));
    const focusables = container.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    expect(Array.from(focusables)).toEqual([back()]);
  });

  it('T18 AC18: the selection resets when the component unmounts and remounts', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Projects />);
    await user.click(tile('Voice Calendar'));
    unmount();
    render(<Projects />);
    expect(screen.getAllByRole('listitem')).toHaveLength(PROJECTS.length);
  });

  it('T18 AC18: opening, going back and switching projects log no console errors or warnings', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const user = userEvent.setup();
    renderInWin();
    for (const p of PROJECTS) {
      await user.click(tile(p.name));
      await user.keyboard('{Escape}');
    }
    expect(err).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('T18 detail view inside the Desktop', () => {
  const proj = () => document.querySelector<HTMLElement>('[data-win="proj"]');
  const dockProj = () =>
    within(screen.getByRole('navigation', { name: 'Dock' })).getByRole('button', {
      name: 'projects',
    });

  async function openProjects(user: User) {
    await user.click(dockProj());
    expect(proj()).not.toBeNull();
  }

  it('T18 AC11: the window keeps its size, region name and titlebar text in the detail view', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await openProjects(user);
    const w = proj()!;
    const before = [w.style.width, w.style.minHeight, w.style.left, w.style.top, w.style.zIndex];
    expect(w.style.width).toBe('520px');
    expect(w.style.minHeight).toBe('385px');
    await user.click(within(w).getByRole('button', { name: 'Voice Calendar' }));
    const after = proj()!;
    expect(after).toBe(w);
    expect([w.style.width, w.style.minHeight, w.style.left, w.style.top, w.style.zIndex]).toEqual(
      before,
    );
    expect(screen.getByRole('region', { name: 'projects' })).toBe(w);
    expect(w.querySelector('.win-title')?.textContent).toBe('~/projects');
    expect(within(w).getByRole('button', { name: 'Minimize projects' })).toBeInTheDocument();
    expect(within(w).getByRole('button', { name: 'Close projects' })).toBeInTheDocument();
  });

  it('T18 AC15: Escape from the Close button in the detail view goes back and keeps the window open', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await openProjects(user);
    await user.click(within(proj()!).getByRole('button', { name: 'Voice Calendar' }));
    within(proj()!).getByRole('button', { name: 'Close projects' }).focus();
    await user.keyboard('{Escape}');
    expect(proj()).not.toBeNull();
    expect(proj()!.dataset.min).toBe('false');
    expect(within(proj()!).getByRole('button', { name: 'Voice Calendar' })).toBeInTheDocument();
  });

  it('T18 AC15: Escape in the list view neither closes nor minimizes the window', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await openProjects(user);
    within(proj()!).getByRole('button', { name: 'Voice Calendar' }).focus();
    await user.keyboard('{Escape}');
    expect(proj()).not.toBeNull();
    expect(proj()!.dataset.min).toBe('false');
    within(proj()!).getByRole('button', { name: 'Close projects' }).focus();
    await user.keyboard('{Escape}');
    expect(proj()).not.toBeNull();
    expect(proj()!.dataset.min).toBe('false');
  });

  it('T18 AC15: Escape in another window leaves the detail view shown', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await openProjects(user);
    await user.click(within(proj()!).getByRole('button', { name: 'Voice Calendar' }));
    const hello = document.querySelector<HTMLElement>('[data-win="hello"]')!;
    within(hello).getByRole('button', { name: 'Close hello.txt' }).focus();
    await user.keyboard('{Escape}');
    expect(within(proj()!).getByRole('button', { name: PROJECT_LABELS.back })).toBeInTheDocument();
  });

  it('T18 AC15: Escape inside an open menubar menu only closes the menu', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await openProjects(user);
    await user.click(within(proj()!).getByRole('button', { name: 'Voice Calendar' }));
    await user.click(screen.getByRole('menuitem', { name: 'Windows' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(within(proj()!).getByRole('button', { name: PROJECT_LABELS.back })).toBeInTheDocument();
  });

  it('T18 AC16: tab stops in the detail view are Minimize, Close, then the back button', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await openProjects(user);
    await user.click(within(proj()!).getByRole('button', { name: 'Voice Calendar' }));
    const stops = Array.from(
      proj()!.querySelectorAll<HTMLElement>(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ).map((e) => e.getAttribute('aria-label') ?? e.textContent?.trim());
    expect(stops).toEqual(['Minimize projects', 'Close projects', PROJECT_LABELS.back]);
  });

  it('T18 AC18: closing the window and reopening it shows the list', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await openProjects(user);
    await user.click(within(proj()!).getByRole('button', { name: 'Indoor Garden' }));
    await user.click(within(proj()!).getByRole('button', { name: 'Close projects' }));
    expect(proj()).toBeNull();
    await openProjects(user);
    expect(within(proj()!).getAllByRole('listitem')).toHaveLength(PROJECTS.length);
    expect(within(proj()!).queryByRole('button', { name: PROJECT_LABELS.back })).toBeNull();
  });

  it('T18 AC18: minimizing and restoring keeps the detail view', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await openProjects(user);
    await user.click(within(proj()!).getByRole('button', { name: 'Indoor Garden' }));
    await user.click(within(proj()!).getByRole('button', { name: 'Minimize projects' }));
    expect(proj()!.dataset.min).toBe('true');
    expect(proj()).toHaveAttribute('inert');
    await user.click(dockProj());
    expect(proj()!.dataset.min).toBe('false');
    expect(within(proj()!).getByRole('button', { name: PROJECT_LABELS.back })).toBeInTheDocument();
    expect(within(proj()!).getByRole('heading', { name: 'Indoor Garden' })).toBeInTheDocument();
  });

  it('T18 AC18: Restart shows the list when projects is reopened', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((q: string) => ({
        matches: q.includes('prefers-reduced-motion'),
        media: q,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
      })),
    );
    try {
      const user = userEvent.setup();
      render(<Desktop />);
      await openProjects(user);
      await user.click(within(proj()!).getByRole('button', { name: 'Indoor Garden' }));
      await user.click(screen.getByRole('menuitem', { name: 'tanzi.os' }));
      const item = Array.from(
        screen.getByRole('menu').querySelectorAll<HTMLElement>('[role^="menuitem"]'),
      ).find((e) => e.textContent === 'Restart…')!;
      await user.click(item);
      await waitFor(() => expect(proj()).toBeNull());
      await waitFor(() => expect(dockProj()).toBeInTheDocument());
      await openProjects(user);
      expect(within(proj()!).getAllByRole('listitem')).toHaveLength(PROJECTS.length);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('T18 scroll and layout CSS', () => {
  it('T18 AC19: the projects body is an absolutely positioned vertical scroller', () => {
    const r = topRule(css, '.proj-body');
    expect(r?.position).toBe('absolute');
    expect(r?.inset).toBe('0');
    expect(r?.['overflow-y']).toBe('auto');
    expect(r?.['overflow-x']).toBe('hidden');
  });

  it('T18 AC19: the window body is the positioning context for the projects body', () => {
    expect(topRule(css, '.win-body:has(> .proj-body)')?.position).toBe('relative');
  });

  it('T18 AC19: the 2x2 grid, gap and padding are unchanged', () => {
    const g = topRule(css, '.proj-grid');
    expect(g?.gap).toBe('10px');
    expect(g?.padding).toBe('14px');
    expect(g?.['grid-template-columns']).toMatch(/^repeat\(2, /);
  });

  it('T18 AC19: WIN_META.proj stays 520x385', () => {
    expect(WIN_META.proj).toEqual({ width: 520, height: 385, dock: true });
  });

  it('T18 AC21: the scroll bar uses thin width and theme tokens for thumb and track', () => {
    const r = topRule(css, '.proj-body');
    expect(r?.['scrollbar-width']).toBe('thin');
    expect(r?.['scrollbar-color']).toBe('var(--color-neutral-500) var(--color-surface)');
    expect(r?.transition).toBeUndefined();
  });

  it('T18 AC9: the star colour is the accent token and the scroll rule has no animation', () => {
    expect(topRule(css, '.proj-star')?.color).toBe('var(--color-accent)');
    for (const sel of ['.proj-star', '.proj-detail', '.proj-back', '.proj-open', '.proj-body']) {
      const r = topRule(css, sel);
      expect(r?.transition, sel).toBeUndefined();
      expect(r?.animation, sel).toBeUndefined();
    }
  });

  it('T18 AC7: the tile focus ring is drawn on the face from the accent token', () => {
    const r = topRule(css, '.proj-tile:has(.proj-open:focus-visible) .proj-face');
    expect(r?.['box-shadow']).toBe('0 0 0 2px var(--color-accent)');
  });
});
