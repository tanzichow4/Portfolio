import { StrictMode } from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setWidth, stubMatchMedia } from './helpers/fakeViewport';

const mounts = vi.hoisted(() => ({ desktop: 0, phone: 0 }));

vi.mock('../src/Desktop', async () => {
  const React = await import('react');
  return {
    default: function MockDesktop() {
      React.useEffect(() => {
        mounts.desktop += 1;
      }, []);
      return <div data-testid="desktop" />;
    },
  };
});
vi.mock('../src/PhonePage', async () => {
  const React = await import('react');
  return {
    default: function MockPhone() {
      React.useEffect(() => {
        mounts.phone += 1;
      }, []);
      return <main data-testid="phone" />;
    },
  };
});

import App from '../src/App';

beforeEach(() => {
  mounts.desktop = 0;
  mounts.phone = 0;
  setWidth(1024);
});
afterEach(() => {
  vi.unstubAllGlobals();
  setWidth(1024);
});

const wrap = () => (
  <StrictMode>
    <App />
  </StrictMode>
);

describe('T13 App mount counters', () => {
  it('T13 AC3: a phone-width load never mounts Desktop (matchMedia)', () => {
    stubMatchMedia(500);
    setWidth(500);
    const { queryByTestId } = render(wrap());
    expect(mounts.desktop).toBe(0);
    expect(queryByTestId('desktop')).toBeNull();
    expect(mounts.phone).toBeGreaterThan(0);
  });

  it('T13 AC3: a phone-width load never mounts Desktop (innerWidth only)', () => {
    setWidth(500);
    render(wrap());
    expect(mounts.desktop).toBe(0);
  });

  it('T13 AC4: a desktop-width load never mounts PhonePage', () => {
    stubMatchMedia(1280);
    setWidth(1280);
    render(wrap());
    expect(mounts.phone).toBe(0);
    expect(mounts.desktop).toBeGreaterThan(0);
  });

  it('T13 AC7: a non-crossing change or resize remounts neither view', () => {
    const fake = stubMatchMedia(500);
    setWidth(500);
    const { getByTestId } = render(wrap());
    const node = getByTestId('phone');
    const before = { ...mounts };
    setWidth(414);
    fake.setWidth(414);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(getByTestId('phone')).toBe(node);
    expect(mounts).toEqual(before);
  });

  it('T13 AC7: a non-crossing desktop resize remounts nothing', () => {
    const fake = stubMatchMedia(1280);
    setWidth(1280);
    const { getByTestId } = render(wrap());
    const node = getByTestId('desktop');
    const before = { ...mounts };
    setWidth(1000);
    fake.setWidth(1000);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(getByTestId('desktop')).toBe(node);
    expect(mounts).toEqual(before);
  });

  it('T13 AC5: a crossing leaves exactly one view mounted', () => {
    const fake = stubMatchMedia(1280);
    setWidth(1280);
    const { queryAllByTestId } = render(wrap());
    const count = () => queryAllByTestId('desktop').length + queryAllByTestId('phone').length;
    expect(count()).toBe(1);
    setWidth(500);
    fake.setWidth(500);
    expect(count()).toBe(1);
    expect(queryAllByTestId('phone')).toHaveLength(1);
    setWidth(1280);
    fake.setWidth(1280);
    expect(count()).toBe(1);
    expect(queryAllByTestId('desktop')).toHaveLength(1);
  });
});
