export type Tokens = Record<string, string>;

export function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Returns the bodies of every top-level block whose selector matches exactly. */
function blockBodies(css: string, selector: string): string[] {
  const clean = stripComments(css);
  const bodies: string[] = [];
  const norm = (s: string) => s.replace(/\s+/g, '').replace(/"/g, "'");
  let i = 0;
  while (i < clean.length) {
    const open = clean.indexOf('{', i);
    if (open === -1) break;
    const start = clean.lastIndexOf('}', open) + 1;
    const sel = clean.slice(start, open);
    let depth = 1;
    let j = open + 1;
    while (j < clean.length && depth > 0) {
      if (clean[j] === '{') depth++;
      else if (clean[j] === '}') depth--;
      j++;
    }
    if (norm(sel) === norm(selector)) bodies.push(clean.slice(open + 1, j - 1));
    i = j;
  }
  return bodies;
}

/** Merges custom properties from every block matching `selector` (later wins). */
export function parseBlock(css: string, selector: string): Tokens {
  const out: Tokens = {};
  for (const body of blockBodies(css, selector)) {
    const re = /(--[\w-]+)\s*:\s*([^;]+);/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body))) out[m[1]] = m[2].replace(/\s+/g, ' ').trim();
  }
  return out;
}

/** Dark is `:root`; light is `:root` with the `[data-theme='light']` overrides on top. */
export function resolveTheme(css: string, theme: 'dark' | 'light'): Tokens {
  const root = parseBlock(css, ':root');
  if (theme === 'dark') return root;
  return { ...root, ...parseBlock(css, "[data-theme='light']") };
}
