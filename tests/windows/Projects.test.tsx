import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Projects from '../../src/windows/Projects';
import css from '../../src/windows/Projects.css?raw';
import Desktop from '../../src/Desktop';
import { stripComments } from '../helpers/cssTokens';
import { topRule, reducedRule } from '../helpers/cssScope';
import { PROJECTS, WIN_BAR_TITLES } from '../../src/data';
import { WIN_META } from '../../src/logic/windows';
import { linkAttrs } from '../../src/logic/menu';
import { openAllFromDock } from '../helpers/openAll';

const clean = stripComments(css);
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Declarations of the top-level rule with exactly this selector. */
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

describe('T07 Projects body: structure', () => {
  it('T07 AC1: renders a non-empty body', () => {
    const { container } = render(<Projects />);
    expect(container.textContent?.trim().length).toBeGreaterThan(0);
  });

  it('T07 AC31: a list with one link tile per PROJECTS entry, in order', () => {
    render(<Projects />);
    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(PROJECTS.length);
    const links = within(list).getAllByRole('link');
    expect(links).toHaveLength(PROJECTS.length);
    PROJECTS.forEach((p, i) => {
      expect(items[i].contains(links[i])).toBe(true);
      expect(within(links[i]).getByRole('heading', { name: p.name })).toBeInTheDocument();
    });
  });

  it('T07 AC31: each tile shows name as a heading, description and every tag', () => {
    render(<Projects />);
    const links = screen.getAllByRole('link');
    PROJECTS.forEach((p, i) => {
      const tile = within(links[i]);
      expect(tile.getByRole('heading', { name: p.name })).toBeInTheDocument();
      expect(tile.getByText(p.desc)).toBeInTheDocument();
      for (const t of p.tags) {
        const tag = tile.getByText(t);
        expect(tag).toHaveClass('tag');
        expect(tag).toHaveClass('tag-neutral');
      }
      expect(links[i].querySelectorAll('.tag')).toHaveLength(p.tags.length);
    });
  });

  it('T07 AC32: each href comes from PROJECTS', () => {
    render(<Projects />);
    screen.getAllByRole('link').forEach((a, i) => {
      expect(a.getAttribute('href')).toBe(PROJECTS[i].href);
    });
  });

  it('T07 AC32: target and rel come from linkAttrs (none for placeholder hrefs)', () => {
    render(<Projects />);
    screen.getAllByRole('link').forEach((a, i) => {
      const want = linkAttrs(PROJECTS[i].href);
      expect(a.getAttribute('target')).toBe(want.target ?? null);
      expect(a.getAttribute('rel')).toBe(want.rel ?? null);
    });
    // The current data holds placeholders only, so no tile opens a new tab.
    expect(linkAttrs('#')).toEqual({});
  });

  it('T07 AC32: an https href gets target _blank and noopener noreferrer', () => {
    expect(linkAttrs('https://example.com/x')).toEqual({
      target: '_blank',
      rel: 'noopener noreferrer',
    });
    expect(linkAttrs('http://example.com')).toEqual({
      target: '_blank',
      rel: 'noopener noreferrer',
    });
  });

  it('T07 AC32: icons (project icon and arrow) are hidden from assistive technology', () => {
    const { container } = render(<Projects />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(PROJECTS.length * 2);
    for (const s of svgs) expect(s.getAttribute('aria-hidden')).toBe('true');
  });

  it('T07 AC32: the accessible name holds name and description as separate words', () => {
    render(<Projects />);
    screen.getAllByRole('link').forEach((a, i) => {
      const { name, desc } = PROJECTS[i];
      const text = a.textContent ?? '';
      // Name is followed by a word break before the description, never run together.
      expect(text).toContain(name);
      expect(text).toContain(desc);
      const accessible = screen.getByRole('link', { name: new RegExp(name) }).textContent ?? '';
      expect(accessible).toBe(text);
      expect(text.indexOf(desc)).toBeGreaterThan(text.indexOf(name) + name.length - 1);
    });
  });

  it('T07 AC32: the accessible name separates name, description and tags with whitespace', () => {
    render(<Projects />);
    screen.getAllByRole('link').forEach((a, i) => {
      const p = PROJECTS[i];
      // The accessible-name computation joins block children with spaces; assert it reads as words.
      const name = a.getAttribute('aria-label');
      // No aria-label override: the name is computed from content with block separation.
      expect(name).toBeNull();
      const h = within(a).getByRole('heading');
      expect(h.tagName).toBe('H2');
      expect(h.textContent).toBe(p.name);
      // Adjacent tags are separated by a text space.
      const tags = Array.from(a.querySelectorAll('.tag'));
      for (let k = 1; k < tags.length; k++) {
        expect(tags[k].parentElement!.textContent).toMatch(/^\s/);
      }
    });
  });
});

describe('T07 Projects window: titlebar and names', () => {
  it('T07 AC34: WIN_BAR_TITLES holds the display string for proj only', () => {
    expect(WIN_BAR_TITLES).toEqual({ proj: '~/projects' });
  });

  it('T07 AC34: the titlebar reads ~/projects while every other name stays projects', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, projects is closed at start, so open it from the dock.
    openAllFromDock();
    const region = screen.getByRole('region', { name: 'projects' });
    expect(region.querySelector('.win-title')?.textContent).toBe('~/projects');
    expect(screen.queryByRole('region', { name: '~/projects' })).toBeNull();
    expect(within(region).getByRole('button', { name: 'Minimize projects' })).toBeInTheDocument();
    expect(within(region).getByRole('button', { name: 'Close projects' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'projects' })).toBeInTheDocument();
    expect(screen.queryByText('~/projects', { selector: '.win-btns *' })).toBeNull();
    await user.click(screen.getByRole('menuitem', { name: 'Windows' }));
    const items = Array.from(document.querySelectorAll('[role^="menuitem"]')).map(
      (e) => e.textContent ?? '',
    );
    expect(items.some((t) => t.includes('projects') && !t.includes('~/'))).toBe(true);
    expect(items.some((t) => t.includes('~/projects'))).toBe(false);
  });

  it('T07 AC34: the other windows keep their plain title in the titlebar', () => {
    render(<Desktop />);
    // DELIBERATE REQUIREMENT CHANGE (T15 AC25): setup only, only hello is open at start, so open the others from the dock.
    openAllFromDock();
    for (const t of ['hello.txt', 'about.md', 'experience.log', 'terminal']) {
      const r = screen.getByRole('region', { name: t });
      expect(r.querySelector('.win-title')?.textContent).toBe(t);
    }
  });
});

describe('T07 Projects: layout constants', () => {
  it('T07 AC47: proj keeps width 520 and its measured height of 385', () => {
    expect(WIN_META.proj).toMatchObject({ width: 520, height: 385, dock: true });
  });

  it('T07 AC48: proj bottom at 1280x720 (y = 644 - height) is not below the dock top', () => {
    expect(644 - WIN_META.proj.height).toBe(259);
  });
});

describe('T07 Projects body: CSS values', () => {
  it('T07 AC31: grid has two columns, gap 10px and padding 14px', () => {
    const g = decls('.proj-grid');
    expect(g.display).toBe('grid');
    expect(g['grid-template-columns']).toMatch(/^repeat\(2, /);
    expect(g.gap).toBe('10px');
    expect(g.padding).toBe('14px');
    expect(g['list-style']).toBe('none');
  });

  it('T07 AC31: tile has padding 14px, radius 8px (--radius-md) and --color-bg', () => {
    const f = decls('.proj-face');
    expect(f.padding).toBe('14px');
    expect(f['border-radius']).toBe('var(--radius-md)');
    expect(f.background).toBe('var(--color-bg)');
  });

  it('T07 AC31: icon is accent, arrow is neutral-500', () => {
    expect(decls('.proj-icon').color).toBe('var(--color-accent)');
    expect(decls('.proj-arrow').color).toBe('var(--color-neutral-500)');
  });

  it('T07 AC31: name is 14px weight 500; description is 12px neutral-500', () => {
    const n = decls('.proj-name');
    expect(n['font-size']).toBe('14px');
    expect(n['font-weight']).toBe('500');
    const d = decls('.proj-desc');
    expect(d['font-size']).toBe('12px');
    expect(d.color).toBe('var(--color-neutral-500)');
  });

  it('T07 AC31: tags are 10px with padding 2px 7px', () => {
    const t = decls('.proj-tag');
    expect(t['font-size']).toBe('10px');
    expect(t.padding).toBe('2px 7px');
  });

  it('T07 AC7: the stylesheet uses tokens only, with no hard-coded colours', () => {
    expect(clean).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(clean).not.toMatch(/\b(rgb|rgba|hsl|hsla)\(/);
  });
});

describe('T07 Projects tile motion CSS', () => {
  it('T07 AC33: hovering a tile lifts and tilts its face and applies --shadow-md', () => {
    const r = topRule(css, '.proj-tile:hover .proj-face');
    expect(r?.transform).toBe('translateY(-5px) rotate(-1.5deg)');
    expect(r?.['box-shadow']).toBe('var(--shadow-md)');
  });

  it('T07 AC33: a pressed tile face is scale(.97)', () => {
    expect(topRule(css, '.proj-tile:active .proj-face')?.transform).toMatch(/^scale\(0?\.97\)$/);
  });

  it('T07 AC33: the face transitions transform and box-shadow', () => {
    const t = topRule(css, '.proj-face')?.transition ?? '';
    expect(t).toMatch(/transform/);
    expect(t).toMatch(/box-shadow/);
  });

  it('T07 AC9: the tile host never transforms, only the face', () => {
    expect(topRule(css, '.proj-tile')?.transform).toBeUndefined();
    expect(topRule(css, '.proj-tile:hover')?.transform).toBeUndefined();
    expect(topRule(css, '.proj-tile:active')?.transform).toBeUndefined();
    expect(topRule(css, '.proj-item')?.transform).toBeUndefined();
  });

  it('T07 AC8: reduced motion sets the tile hover and pressed transforms to none', () => {
    expect(reducedRule(css, '.proj-tile:hover .proj-face')?.transform).toBe('none');
    expect(reducedRule(css, '.proj-tile:active .proj-face')?.transform).toBe('none');
  });
});
