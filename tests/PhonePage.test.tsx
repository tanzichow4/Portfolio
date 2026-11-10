import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import PhonePage from '../src/PhonePage';
import src from '../src/PhonePage.tsx?raw';
import {
  ABOUT_COPY,
  EXP,
  EXPERIENCE_LABELS,
  FACTS,
  LINKS,
  NAME,
  PHONE_HEADINGS,
  PROJECTS,
  ROLE,
} from '../src/data';

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.classList.remove('phone-view');
});

const follows = (a: Node, b: Node) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

const section = (name: string) => screen.getByRole('region', { name });

describe('T13 PhonePage content (AC10)', () => {
  it('T13 AC10: name and role come first, then the four sections in order', () => {
    const { container } = render(<PhonePage />);
    const h1 = screen.getByRole('heading', { level: 1 });
    const role = screen.getByText(ROLE);
    const heads = [
      PHONE_HEADINGS.about,
      EXPERIENCE_LABELS.tablist,
      PHONE_HEADINGS.projects,
      PHONE_HEADINGS.links,
    ].map((n) => screen.getByRole('heading', { level: 2, name: n }));
    const chain = [h1, role, ...heads];
    for (let i = 0; i < chain.length - 1; i++) {
      expect(follows(chain[i], chain[i + 1]), `item ${i}`).toBe(true);
    }
    expect(container.textContent).toContain(NAME);
  });

  it('T13 AC10: every ABOUT_COPY paragraph is shown and em segments are emphasized', () => {
    render(<PhonePage />);
    const about = section(PHONE_HEADINGS.about);
    for (const para of ABOUT_COPY) {
      const text = para.map((s) => s.text).join('');
      const p = within(about)
        .getAllByText((_, el) => el?.tagName === 'P' && el.textContent === text)
        .at(0);
      expect(p, text).toBeTruthy();
    }
    const expected = ABOUT_COPY.flat().filter((s) => s.em);
    const ems = about.querySelectorAll('em');
    expect(ems.length).toBe(expected.length);
    expect(expected.length).toBeGreaterThan(0);
    expected.forEach((s, i) => expect(ems[i].textContent).toBe(s.text));
  });

  it('T13 AC10: every FACTS label is inside About, after the paragraphs', () => {
    render(<PhonePage />);
    const about = section(PHONE_HEADINGS.about);
    const lastPara = about.querySelectorAll('p');
    for (const f of FACTS) {
      const el = within(about).getByText(f.label);
      expect(follows(lastPara[lastPara.length - 1], el)).toBe(true);
    }
  });

  it('T13 AC10: every EXP entry is shown in array order with org, when, desc and each tag, and there are no tabs', () => {
    render(<PhonePage />);
    const exp = section(EXPERIENCE_LABELS.tablist);
    expect(within(exp).queryByRole('tab')).toBeNull();
    expect(within(exp).queryByRole('tablist')).toBeNull();
    const items = within(exp).getAllByRole('listitem');
    expect(items.length).toBe(EXP.length);
    EXP.forEach((e, i) => {
      const li = items[i];
      expect(within(li).getByRole('heading', { level: 3 }).textContent).toBe(e.role);
      expect(li.textContent).toContain(`${EXPERIENCE_LABELS.at} ${e.org}`);
      expect(li.textContent).toContain(e.when);
      expect(li.textContent).toContain(e.desc);
      for (const t of e.tags) expect(within(li).getByText(t), t).toBeVisible();
    });
  });

  it('T13 AC10: every PROJECTS entry is shown in order with name link, desc and each tag', () => {
    render(<PhonePage />);
    const proj = section(PHONE_HEADINGS.projects);
    const items = within(proj).getAllByRole('listitem');
    expect(items.length).toBe(PROJECTS.length);
    PROJECTS.forEach((p, i) => {
      const li = items[i];
      const h3 = within(li).getByRole('heading', { level: 3 });
      const a = within(h3).getByRole('link', { name: p.name });
      expect(a.getAttribute('href')).toBe(p.href);
      expect(li.textContent).toContain(p.desc);
      for (const t of p.tags) expect(within(li).getByText(t), t).toBeVisible();
    });
  });

  it('T13 AC10: Links lists every LINKS label and nothing else', () => {
    render(<PhonePage />);
    const links = section(PHONE_HEADINGS.links);
    const anchors = within(links).getAllByRole('link');
    expect(anchors.map((a) => a.textContent)).toEqual(LINKS.map((l) => l.label));
    LINKS.forEach((l, i) => expect(anchors[i].getAttribute('href')).toBe(l.href));
  });

  it('T13 AC10: tags in a row are separated by whitespace in textContent', () => {
    render(<PhonePage />);
    const exp = section(EXPERIENCE_LABELS.tablist);
    const first = within(exp).getAllByRole('listitem')[0];
    const joined = EXP[0].tags.join(' ');
    expect(first.textContent).toContain(joined);
  });
});

describe('T13 PhonePage AC12: nothing from the desktop', () => {
  it('T13 AC12: no button, input, nav, header, menubar, window, status or boot', () => {
    const { container } = render(<PhonePage />);
    for (const sel of [
      'button',
      'input',
      'textarea',
      'select',
      'nav',
      'header',
      '[role="menubar"]',
      '[role="status"]',
      '[role="tablist"]',
      '[data-win]',
      '.boot-status',
      '[aria-label="System menu bar"]',
    ]) {
      expect(container.querySelector(sel), sel).toBeNull();
    }
  });

  it('T13 AC12: the only interactive elements are links', () => {
    const { container } = render(<PhonePage />);
    const interactive = container.querySelectorAll(
      'a, button, input, select, textarea, summary, [tabindex], [contenteditable], [onclick]',
    );
    for (const el of interactive) expect(el.tagName).toBe('A');
    expect(container.querySelectorAll('[tabindex]').length).toBe(0);
  });
});

describe('T13 PhonePage AC18: no theme or storage writes', () => {
  for (const theme of ['dark', 'light']) {
    it(`T13 AC18: ${theme}: setItem is never called and data-theme is unchanged by mount and unmount`, () => {
      document.documentElement.setAttribute('data-theme', theme);
      const setItem = vi.spyOn(Storage.prototype, 'setItem');
      const removeItem = vi.spyOn(Storage.prototype, 'removeItem');
      const { unmount } = render(<PhonePage />);
      expect(document.documentElement.getAttribute('data-theme')).toBe(theme);
      unmount();
      expect(document.documentElement.getAttribute('data-theme')).toBe(theme);
      expect(setItem).not.toHaveBeenCalled();
      expect(removeItem).not.toHaveBeenCalled();
    });
  }

  it('T13 AC18: does not add a data-theme when none was set', () => {
    render(<PhonePage />);
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});

describe('T13 PhonePage AC20: heading structure', () => {
  it('T13 AC20: exactly one h1 with the NAME, and one main', () => {
    render(<PhonePage />);
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s.length).toBe(1);
    expect(h1s[0].textContent).toBe(NAME);
    expect(screen.getAllByRole('main').length).toBe(1);
  });

  it('T13 AC20: four sections each named by their h2', () => {
    const { container } = render(<PhonePage />);
    const sections = container.querySelectorAll('section');
    expect(sections.length).toBe(4);
    const names = [
      PHONE_HEADINGS.about,
      EXPERIENCE_LABELS.tablist,
      PHONE_HEADINGS.projects,
      PHONE_HEADINGS.links,
    ];
    sections.forEach((s, i) => {
      const h2 = s.querySelector('h2');
      expect(h2?.textContent).toBe(names[i]);
      expect(screen.getByRole('region', { name: names[i] })).toBe(s);
    });
  });

  it('T13 AC20: each experience entry and project has an h3 and no level is skipped', () => {
    const { container } = render(<PhonePage />);
    const h3s = container.querySelectorAll('h3');
    expect(h3s.length).toBe(EXP.length + PROJECTS.length);
    const levels = [...container.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) =>
      Number(h.tagName[1]),
    );
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1], `heading ${i}`).toBeLessThanOrEqual(1);
    }
    expect(Math.max(...levels)).toBe(3);
  });
});

describe('T13 PhonePage AC21: real lists', () => {
  it('T13 AC21: facts, experience, projects and links are lists with the right item counts', () => {
    render(<PhonePage />);
    const counts: [string, number][] = [
      [PHONE_HEADINGS.about, FACTS.length],
      [EXPERIENCE_LABELS.tablist, EXP.length],
      [PHONE_HEADINGS.projects, PROJECTS.length],
      [PHONE_HEADINGS.links, LINKS.length],
    ];
    for (const [name, n] of counts) {
      const list = within(section(name)).getByRole('list');
      expect(within(list).getAllByRole('listitem').length, name).toBe(n);
    }
  });

  it('T13 AC21: every ul keeps list semantics explicitly', () => {
    const { container } = render(<PhonePage />);
    const uls = container.querySelectorAll('ul');
    expect(uls.length).toBe(4);
    uls.forEach((u) => expect(u.getAttribute('role')).toBe('list'));
  });
});

describe('T13 PhonePage AC22: link attributes', () => {
  const allLinks = [...LINKS, ...PROJECTS.map((p) => ({ label: p.name, href: p.href }))];

  it('T13 AC22: http(s) links open in a new tab with noopener noreferrer', () => {
    render(<PhonePage />);
    for (const l of allLinks.filter((x) => /^https?:/.test(x.href))) {
      const a = screen
        .getAllByRole('link', { name: l.label })
        .find((e) => e.getAttribute('href') === l.href)!;
      expect(a.getAttribute('target'), l.label).toBe('_blank');
      expect(a.getAttribute('rel'), l.label).toBe('noopener noreferrer');
    }
  });

  it('T13 AC22: mailto and # links have neither target nor rel', () => {
    render(<PhonePage />);
    const plain = allLinks.filter((x) => /^(mailto:|#)/.test(x.href));
    expect(plain.length).toBeGreaterThan(0);
    for (const l of plain) {
      const a = screen
        .getAllByRole('link', { name: l.label })
        .find((e) => e.getAttribute('href') === l.href)!;
      expect(a.hasAttribute('target'), l.label).toBe(false);
      expect(a.hasAttribute('rel'), l.label).toBe(false);
    }
  });
});

describe('T13 PhonePage AC24: links', () => {
  it('T13 AC24: no svg or img, and every link name equals its visible text', () => {
    const { container } = render(<PhonePage />);
    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    const links = screen.getAllByRole('link');
    expect(links.length).toBe(PROJECTS.length + LINKS.length);
    for (const a of links) {
      const text = (a.textContent ?? '').trim();
      expect(text.length).toBeGreaterThan(0);
      expect(screen.getAllByRole('link', { name: text }).includes(a)).toBe(true);
    }
  });
});

describe('T13 PhonePage: phone-view class', () => {
  const root = document.documentElement;

  it('T13 AC16: phone-view is on <html> once mounted and gone after unmount', () => {
    expect(root.classList.contains('phone-view')).toBe(false);
    const { unmount } = render(<PhonePage />);
    expect(root.classList.contains('phone-view')).toBe(true);
    unmount();
    expect(root.classList.contains('phone-view')).toBe(false);
  });

  it('T13 AC16: under StrictMode the class is present while mounted and removed on unmount', () => {
    const { unmount } = render(
      <StrictMode>
        <PhonePage />
      </StrictMode>,
    );
    expect(root.classList.contains('phone-view')).toBe(true);
    unmount();
    expect(root.classList.contains('phone-view')).toBe(false);
  });

  it('T13 AC16: unmount leaves other classes on <html> alone', () => {
    root.classList.add('keep-me');
    const { unmount } = render(<PhonePage />);
    unmount();
    expect(root.classList.contains('keep-me')).toBe(true);
    root.classList.remove('keep-me');
  });
});

describe('T13 PhonePage AC11/AC24/AC27: source checks', () => {
  it('T13 AC26: muted classes are not used', () => {
    for (const w of ['text-muted', 'card-meta', 'card-body']) expect(src).not.toContain(w);
  });
  it('T13 AC23: no dangerouslySetInnerHTML or tabIndex', () => {
    expect(src).not.toContain('dangerouslySetInnerHTML');
    expect(src).not.toMatch(/tabIndex/i);
  });
  it('T13 AC11: WIN_TITLES is not used for headings', () => {
    expect(src).not.toContain('WIN_TITLES');
  });
  it('T13 AC27: no scripted movement', () => {
    for (const w of [
      'scrollTo',
      'scrollIntoView',
      'requestAnimationFrame',
      'setTimeout',
      'setInterval',
      '.focus(',
    ]) {
      expect(src, w).not.toContain(w);
    }
  });
});
