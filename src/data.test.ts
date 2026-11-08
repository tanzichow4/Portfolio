import { describe, expect, it } from 'vitest';
import { EXP, FACTS, LINKS, PROJECTS, VERBS } from './data';

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
