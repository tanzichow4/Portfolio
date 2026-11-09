import { stripComments } from './cssTokens';

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Source inside every `@media (prefers-reduced-motion: reduce)` block, concatenated. */
function reducedBlocks(clean: string): string {
  let out = '';
  const re = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/g;
  for (let m = re.exec(clean); m; m = re.exec(clean)) {
    let depth = 1;
    let j = m.index + m[0].length;
    const start = j;
    while (depth > 0 && j < clean.length) {
      if (clean[j] === '{') depth++;
      else if (clean[j] === '}') depth--;
      j++;
    }
    out += clean.slice(start, j - 1);
  }
  return out;
}

function parse(src: string, selector: string): Record<string, string> | null {
  const out: Record<string, string> = {};
  let found = false;
  for (const m of src.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sels = m[1].split(',').map(norm);
    if (!sels.includes(selector)) continue;
    found = true;
    for (const d of m[2].split(';')) {
      const k = d.indexOf(':');
      if (k > 0) out[d.slice(0, k).trim()] = norm(d.slice(k + 1));
    }
  }
  return found ? out : null;
}

/** Declarations for a selector (a member of a selector list counts), outside any media block. */
export function topRule(css: string, selector: string): Record<string, string> | null {
  const clean = stripComments(css);
  const reduced = reducedBlocks(clean);
  const top = reduced ? clean.split(reduced).join('') : clean;
  return parse(top.replace(/@media[^{]*\{\s*\}/g, ''), selector);
}

/** Declarations for a selector inside the reduced-motion block(s). */
export function reducedRule(css: string, selector: string): Record<string, string> | null {
  return parse(reducedBlocks(stripComments(css)), selector);
}
