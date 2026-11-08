import { describe, expect, it } from 'vitest';
import { WEEKDAYS, formatClock, timeAttr } from '../../src/logic/clock';

const FORMAT = /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) (1[0-2]|[1-9]):[0-5]\d (AM|PM)$/;

describe('formatClock', () => {
  it('AC30: Saturday 15:42 gives "Sat 3:42 PM"', () => {
    expect(formatClock(6, 15, 42)).toBe('Sat 3:42 PM');
  });
  it('AC30: Monday 00:05 gives "Mon 12:05 AM"', () => {
    expect(formatClock(1, 0, 5)).toBe('Mon 12:05 AM');
  });
  it('AC30: Friday 12:00 gives "Fri 12:00 PM"', () => {
    expect(formatClock(5, 12, 0)).toBe('Fri 12:00 PM');
  });
  it('AC30: Sunday 09:07 gives "Sun 9:07 AM"', () => {
    expect(formatClock(0, 9, 7)).toBe('Sun 9:07 AM');
  });

  it('AC31: midnight is 12:00 AM', () => {
    expect(formatClock(3, 0, 0)).toBe('Wed 12:00 AM');
  });
  it('AC31: noon is 12:00 PM', () => {
    expect(formatClock(3, 12, 0)).toBe('Wed 12:00 PM');
  });
  it('AC31: 23:59 is 11:59 PM', () => {
    expect(formatClock(2, 23, 59)).toBe('Tue 11:59 PM');
  });
  it('AC31: 11:59 is 11:59 AM and 13:00 is 1:00 PM (boundaries around noon)', () => {
    expect(formatClock(2, 11, 59)).toBe('Tue 11:59 AM');
    expect(formatClock(2, 13, 0)).toBe('Tue 1:00 PM');
  });
  it('AC31: every weekday 0-6 maps to Sun-Sat', () => {
    const want = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    expect([...WEEKDAYS]).toEqual(want);
    want.forEach((d, i) => expect(formatClock(i, 10, 30)).toBe(`${d} 10:30 AM`));
  });
  it('AC30: minutes are always two digits and the hour has no leading zero', () => {
    expect(formatClock(0, 1, 5)).toBe('Sun 1:05 AM');
    expect(formatClock(0, 10, 9)).toBe('Sun 10:09 AM');
  });

  it('AC30/AC39: all 24x60 times for every weekday match the format and use ASCII spaces only', () => {
    for (let d = 0; d < 7; d++)
      for (let h = 0; h < 24; h++)
        for (let m = 0; m < 60; m++) {
          const s = formatClock(d, h, m);
          expect(s).toMatch(FORMAT);
          expect(s).toMatch(/^[\x20-\x7e]+$/);
        }
  });

  it('AC31: bad input never throws and still gives a well formed string', () => {
    const bad = [NaN, Infinity, -Infinity, -1, 99, 1e9, 2.7];
    for (const a of bad)
      for (const b of bad)
        for (const c of bad) {
          expect(() => formatClock(a, b, c)).not.toThrow();
          expect(formatClock(a, b, c)).toMatch(FORMAT);
        }
  });
});

describe('timeAttr', () => {
  it('AC32: gives a zero-padded 24 hour HH:MM value', () => {
    expect(timeAttr(9, 7)).toBe('09:07');
    expect(timeAttr(15, 42)).toBe('15:42');
    expect(timeAttr(0, 0)).toBe('00:00');
    expect(timeAttr(23, 59)).toBe('23:59');
  });
});
