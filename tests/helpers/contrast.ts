export type Rgb = [number, number, number];

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Parses `#rrggbb` only. Anything else throws so unsupported tokens fail loudly. */
export function hexToRgb(hex: string): Rgb {
  if (typeof hex !== 'string' || !HEX.test(hex.trim())) {
    throw new Error(`Expected a #rrggbb color, got: ${JSON.stringify(hex)}`);
  }
  const h = hex.trim().slice(1);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

/** WCAG 2.x relative luminance of an sRGB color. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio, between 1 and 21. Order of arguments does not matter. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
