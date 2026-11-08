import { describe, expect, it } from 'vitest';

const sources = import.meta.glob('/src/logic/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const EXPECTED = ['desktop', 'dock', 'drag', 'history', 'layout', 'terminal', 'windows', 'zorder'];

// Drop comments so words inside them are not flagged.
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');

const importSpecs = (src: string): { spec: string; typeOnly: boolean }[] => {
  const out: { spec: string; typeOnly: boolean }[] = [];
  const re = /(?:import|export)\s+(type\s+)?[^;'"]*?from\s*['"]([^'"]+)['"]/g;
  for (const m of src.matchAll(re)) out.push({ spec: m[2], typeOnly: Boolean(m[1]) });
  const bare = /import\s*['"]([^'"]+)['"]/g;
  for (const m of src.matchAll(bare)) out.push({ spec: m[1], typeOnly: false });
  const dyn = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const m of src.matchAll(dyn)) out.push({ spec: m[1], typeOnly: false });
  return out;
};

describe('logic module purity', () => {
  it('AC37: all seven logic modules are present', () => {
    const names = Object.keys(sources)
      .map((p) => p.replace(/^.*\//, '').replace(/\.ts$/, ''))
      .sort();
    expect(names).toEqual(EXPECTED);
  });

  const forbiddenImports = [/^react($|\/)/, /^react-dom($|\/)/, /^@phosphor-icons\//];
  const forbiddenWords = [
    'window',
    'document',
    'localStorage',
    'sessionStorage',
    'Math\\.random',
    'setTimeout',
    'setInterval',
    'requestAnimationFrame',
    'Date',
  ];

  for (const [path, raw] of Object.entries(sources)) {
    const name = path.replace(/^.*\//, '');
    const src = stripComments(raw);

    it(`AC38: ${name} imports no React or Phosphor and only allowed modules`, () => {
      for (const { spec, typeOnly } of importSpecs(src)) {
        for (const bad of forbiddenImports) expect(spec).not.toMatch(bad);
        if (typeOnly) continue;
        const allowed = /^\.\/[\w-]+$/.test(spec) || spec === '../data' || spec === '../types';
        expect(allowed, `${name} imports "${spec}"`).toBe(true);
      }
    });

    it(`AC38: ${name} uses no DOM, storage, timer, random or Date APIs`, () => {
      for (const w of forbiddenWords) {
        expect(src, `${name} mentions ${w}`).not.toMatch(new RegExp(`\\b${w}\\b`));
      }
    });
  }
});
