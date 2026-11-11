import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ChartPieSlice } from '@phosphor-icons/react';
import Viz from '../../src/windows/Viz';
import css from '../../src/windows/Viz.css?raw';
import { VIZ_COPY, WIN_BAR_TITLES, WIN_ICONS, WIN_TITLES } from '../../src/data';
import { stripComments } from '../helpers/cssTokens';

describe('T16 Viz body', () => {
  it('T16 AC12: the visible text is exactly "Coming soon", from data.ts', () => {
    const { container } = render(<Viz />);
    expect(VIZ_COPY.body).toBe('Coming soon');
    expect(container.textContent).toBe(VIZ_COPY.body);
  });

  it('T16 AC12: it has no focusable elements', () => {
    const { container } = render(<Viz />);
    expect(
      container.querySelectorAll('a, button, input, select, textarea, [tabindex]'),
    ).toHaveLength(0);
  });

  it('T16 AC12: any svg icon is aria-hidden', () => {
    const { container } = render(<Viz />);
    for (const s of container.querySelectorAll('svg'))
      expect(s.getAttribute('aria-hidden')).toBe('true');
  });

  it('T16 AC12: Viz.css uses theme tokens only, with no hex, rgb or hsl colors', () => {
    const clean = stripComments(css);
    expect(clean).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(clean).not.toMatch(/\b(rgb|rgba|hsl|hsla)\s*\(/i);
  });

  it('T16 AC12: it takes no props and renders the same every time', () => {
    const a = render(<Viz />).container.innerHTML;
    const b = render(<Viz />).container.innerHTML;
    expect(a).toBe(b);
  });
});

describe('T16 viz title and icon', () => {
  it('T16 AC11: the title is "dataviz" and there is no titlebar override', () => {
    expect(WIN_TITLES.viz).toBe('dataviz');
    expect(WIN_BAR_TITLES.viz).toBeUndefined();
  });

  it('T16 AC11: the icon is ChartPieSlice and no other window uses it', () => {
    expect(WIN_ICONS.viz).toBe(ChartPieSlice);
    const others = Object.entries(WIN_ICONS).filter(([id]) => id !== 'viz');
    for (const [id, icon] of others) expect(icon, id).not.toBe(WIN_ICONS.viz);
  });
});
