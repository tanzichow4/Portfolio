import { describe, expect, it } from 'vitest';
import { BOOT_COPY, EXP, FACTS, LINKS, PROJECTS, VERBS } from '../src/data';

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
