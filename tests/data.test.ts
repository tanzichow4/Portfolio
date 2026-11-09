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
