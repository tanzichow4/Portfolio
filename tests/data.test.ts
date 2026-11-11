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
    // DELIBERATE REQUIREMENT CHANGE (resume content): real résumé text now fills the stats and project details.
    // Every project now has résumé-sourced details and highlights; none has a real link yet.
    for (const p of PROJECTS) {
      expect('links' in p).toBe(false);
      expect(p.details?.trim().length).toBeGreaterThan(0);
      expect(p.highlights?.length).toBeGreaterThan(0);
      for (const h of p.highlights ?? []) expect(h).toBe(h.trim());
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
  // Frozen list of the figures that appear in the résumés (experience/), per entry. Used only to
  // prove no figure was invented.
  const RESUME_FIGURES = [['70%', '90%'], ['33', '3', '80%', '5', '20'], []];

  it('T17 AC2: stats are exactly the specified strings in order', () => {
    // DELIBERATE REQUIREMENT CHANGE (resume content): real résumé text now fills the stats and project details.
    expect(EXP.map((e) => e.stats)).toEqual([
      [
        'Led development of the onboarding system for a multi-tenant web platform: React flows, an Express backend, Keycloak sign-in and Google APIs for automation',
        'Built a natural-language-to-SQL engine on a fine-tuned local model, about 70% correct on the first pass',
        'Added a validation and retry framework that lifted reliability to about 90% within three attempts in internal testing',
        'Wrote a formal security review report for a production platform',
        'Prototyped internal forms as an interactive mockup before any backend work',
        'Reviewed capstone project proposals across software, IoT and GIS, and revised IP agreements into a template adopted for future submissions',
      ],
      [
        'Led the architecture redesign of a legacy system, cutting runtime from 33 hours to 3',
        'Raised code coverage by 80% with PyTest',
        'Built Python automation that cut deployment configuration time by 5 minutes per build across 20+ weekly deployments',
        'Configured and maintained GitLab CI/CD pipelines for automated testing and deployment',
      ],
      [
        'IoT, data and ML projects',
        'Capstone: Indoor Garden, an IoT monitoring system with a live dashboard',
      ],
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

  it('T17 AC3: every figure in stats appears in the résumés', () => {
    // DELIBERATE REQUIREMENT CHANGE (resume content): real résumé text now fills the stats and project details.
    EXP.forEach((e, i) => {
      for (const s of e.stats) {
        for (const m of s.match(/\d+%?/g) ?? []) expect(RESUME_FIGURES[i], m).toContain(m);
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
