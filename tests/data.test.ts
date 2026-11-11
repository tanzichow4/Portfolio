import { describe, expect, it } from 'vitest';
import { BOOT_COPY, EXP, FACTS, LINKS, PROJECT_LABELS, PROJECTS, VERBS } from '../src/data';

describe('T18 project data', () => {
  it('T18 AC1: required fields and order of PROJECTS are unchanged', () => {
    expect(PROJECTS.map(({ name, href, desc, tags }) => ({ name, href, desc, tags }))).toEqual([
      {
        name: 'Voice Calendar',
        href: '#',
        desc: 'Speak an event, get it on your calendar. iOS and Gemini.',
        tags: ['Swift', 'Gemini API'],
      },
      {
        name: 'Indoor Garden',
        href: '#',
        desc: 'IoT garden monitoring, live dashboard for 10+ sensors.',
        tags: ['Docker', 'React'],
      },
      {
        name: 'Grocery Prices',
        href: '#',
        desc: 'Forecasts grocery prices 7 days out at 80% accuracy.',
        tags: ['Airflow', 'Spark'],
      },
      {
        name: 'Driver Safety',
        href: '#',
        desc: 'Emotion detection from faces, 80% accuracy on RAF-DB.',
        tags: ['TensorFlow', 'CNN'],
      },
    ]);
    for (const p of PROJECTS) expect(p.icon).toBeTruthy();
  });

  it('T18 AC1: optional fields have the right shapes when present', () => {
    for (const p of PROJECTS) {
      if ('featured' in p) expect(typeof p.featured).toBe('boolean');
      if ('details' in p) expect(typeof p.details).toBe('string');
      if ('highlights' in p) {
        expect(Array.isArray(p.highlights)).toBe(true);
        for (const h of p.highlights ?? []) expect(typeof h).toBe('string');
      }
      if ('links' in p) {
        expect(Array.isArray(p.links)).toBe(true);
        for (const l of p.links ?? []) {
          expect(typeof l.label).toBe('string');
          expect(typeof l.href).toBe('string');
        }
      }
    }
  });

  it('T18 AC2: only Indoor Garden is featured, and its details mention Capstone', () => {
    const featured = PROJECTS.filter((p) => p.featured);
    expect(featured.map((p) => p.name)).toEqual(['Indoor Garden']);
    expect(featured[0].featured).toBe(true);
    expect(featured[0].details).toContain('Capstone');
  });

  it('T18 AC2/AC3: Indoor Garden details only restates known facts', () => {
    const d = PROJECTS.find((p) => p.name === 'Indoor Garden')?.details ?? '';
    for (const w of ['IoT', 'dashboard', '10+', 'Docker', 'React']) expect(d).toContain(w);
  });

  it('T18 AC3: absent fields are omitted, not empty, and no project has links', () => {
    for (const p of PROJECTS) {
      expect('links' in p).toBe(false);
      expect('highlights' in p).toBe(false);
      if (p.name !== 'Indoor Garden') expect('details' in p).toBe(false);
      if ('details' in p) expect(p.details?.trim().length).toBeGreaterThan(0);
    }
  });

  it('T18 AC3: every number in details appears in that project desc', () => {
    for (const p of PROJECTS) {
      for (const m of (p.details ?? '').match(/\d+\+?/g) ?? []) expect(p.desc, m).toContain(m);
    }
  });

  it('T18 AC3: no string value in PROJECTS contains TODO', () => {
    const walk = (v: unknown) => {
      if (typeof v === 'string') expect(v).not.toMatch(/TODO/);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    for (const p of PROJECTS) walk({ ...p, icon: undefined });
  });

  it('T18 AC4: PROJECT_LABELS holds the new copy', () => {
    expect(PROJECT_LABELS).toEqual({
      back: 'Back to projects',
      featured: 'Featured',
      highlights: 'Highlights',
      links: 'Links',
    });
  });
});

describe('data', () => {
  it('has content for every section', () => {
    for (const list of [EXP, FACTS, LINKS, PROJECTS, VERBS]) expect(list.length).toBeGreaterThan(0);
  });

  it('gives every project a name, href and tags', () => {
    for (const p of PROJECTS) {
      expect(p.name).toBeTruthy();
      expect(p.href).toBeTruthy();
      expect(p.tags.length).toBeGreaterThan(0);
    }
  });
});

describe('T08 boot copy', () => {
  it('T08 AC28: BOOT_COPY holds the dialog name, progress name and announcement', () => {
    expect(BOOT_COPY.dialog).toBe('Restarting tanzi.os');
    expect(BOOT_COPY.progress).toBe('Restart progress');
    expect(BOOT_COPY.done).toBe('tanzi.os restarted');
  });
});

describe('T17 experience stats', () => {
  // Frozen copy of the old desc text, used only to prove no new figures were introduced.
  const OLD_DESC = [
    'Led onboarding for a multi-tenant web platform and built a natural-language-to-SQL engine on a local model. Also wrote a security review.',
    'Redesigned a legacy system, cutting runtime from 33 hours to 3. Automated deploy config in Python and raised coverage by 80% with PyTest.',
    'Software engineering degree, with IoT, data and ML projects.',
  ];

  it('T17 AC2: stats are exactly the specified strings in order', () => {
    expect(EXP.map((e) => e.stats)).toEqual([
      [
        'Led onboarding for a multi-tenant web platform',
        'Built a natural-language-to-SQL engine on a local model',
        'Wrote a security review',
      ],
      [
        'Redesigned a legacy system, cutting runtime from 33 hours to 3',
        'Raised coverage by 80% with PyTest',
        'Automated deploy config in Python',
      ],
      ['IoT, data and ML projects'],
    ]);
  });

  it('T17 AC1: no entry has a desc key', () => {
    for (const e of EXP) expect('desc' in e).toBe(false);
  });

  it('T17 AC3: every stat is non-empty, trimmed, has no TODO and no trailing full stop', () => {
    for (const e of EXP) {
      expect(e.stats.length).toBeGreaterThan(0);
      for (const s of e.stats) {
        expect(s.length).toBeGreaterThan(0);
        expect(s).toBe(s.trim());
        expect(s).not.toMatch(/TODO/);
        expect(s.endsWith('.')).toBe(false);
      }
    }
  });

  it('T17 AC3: every figure in stats appears in the old description', () => {
    EXP.forEach((e, i) => {
      for (const s of e.stats) {
        for (const m of s.match(/\d+%?/g) ?? []) expect(OLD_DESC[i], m).toContain(m);
      }
    });
  });

  it('T17 AC3: when, role, org, tags and order are unchanged', () => {
    expect(EXP.map(({ when, role, org, tags }) => ({ when, role, org, tags }))).toEqual([
      {
        when: '2026 — Now',
        role: 'Software Developer',
        org: 'Tartigrade Ltd.',
        tags: ['React', 'Express', 'Keycloak', 'LLMs'],
      },
      {
        when: '2024 — 2026',
        role: 'Software Developer / Tester',
        org: 'General Dynamics Mission Systems',
        tags: ['Python', 'PyTest', 'GitLab CI/CD'],
      },
      {
        when: '2021 — 2026',
        role: 'B.Sc. Software Engineering',
        org: 'University of Calgary',
        tags: ['Software Engineering', 'IoT', 'ML'],
      },
    ]);
  });
});
