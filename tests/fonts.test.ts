import { describe, expect, it } from 'vitest';
import css from '../src/theme.css?raw';
import html from '../index.html?raw';
import main from '../src/main.tsx?raw';
import { parseBlock, stripComments } from './helpers/cssTokens';

describe('static font checks', () => {
  it('reads non-empty sources', () => {
    expect(css.length).toBeGreaterThan(500);
    expect(html.length).toBeGreaterThan(100);
    expect(main.length).toBeGreaterThan(50);
  });

  it('AC7/AC8: main.tsx imports exactly Inter 400, 500 and 600', () => {
    const imports = [...main.matchAll(/import\s+['"](@fontsource[^'"]*)['"]/g)].map((m) => m[1]);
    expect(imports.sort()).toEqual([
      '@fontsource/inter/400.css',
      '@fontsource/inter/500.css',
      '@fontsource/inter/600.css',
    ]);
  });

  it('AC8: no 700, italic or variable font and no other font package is imported', () => {
    expect(main).not.toMatch(/700|italic|variable/i);
    expect(main).not.toMatch(/@fontsource(?!\/inter\/(400|500|600)\.css)/);
  });

  it('AC6: theme.css has no @import, @font-face or Google font hosts', () => {
    const clean = stripComments(css);
    expect(clean).not.toMatch(/@import/);
    expect(clean).not.toMatch(/@font-face/);
    expect(css).not.toMatch(/googleapis|gstatic/i);
  });

  it('AC6: index.html has no font link and no Google font hosts', () => {
    expect(html).not.toMatch(/googleapis|gstatic/i);
    expect(html).not.toMatch(/<link[^>]+(font|stylesheet|preconnect)/i);
  });

  it('AC6: no third-party http(s) URL in index.html or theme.css', () => {
    expect(stripComments(css)).not.toMatch(/https?:\/\//);
    expect(html.match(/https?:\/\/[^\s"')]+/g) ?? []).toEqual([]);
  });

  it('AC7: --font-body and --font-heading start with Inter', () => {
    const root = parseBlock(css, ':root');
    expect(root['--font-body']).toMatch(/^'Inter'/);
    expect(root['--font-heading']).toMatch(/^'Inter'/);
  });

  it('AC7: body uses the body font token', () => {
    expect(stripComments(css)).toMatch(/body\s*\{[^}]*font-family:\s*var\(--font-body\)/);
  });

  it('AC9: mono font stack is system only', () => {
    expect(parseBlock(css, ':root')['--font-mono']).toBe('ui-monospace, Menlo, monospace');
  });
});
