import { describe, expect, it } from 'vitest';
import {
  type History,
  emptyHistory,
  historyDown,
  historyUp,
  pushHistory,
} from '../../src/logic/history';

const freeze = (h: History): History => {
  Object.freeze(h.entries);
  return Object.freeze(h);
};

const pushAll = (cmds: string[]): History => {
  let h = emptyHistory();
  for (const c of cmds) h = freeze(pushHistory(h, c));
  return h;
};

describe('pushHistory', () => {
  it('AC33: starts empty and not navigating', () => {
    const h = emptyHistory();
    expect([...h.entries]).toEqual([]);
    expect(h.index).toBeNull();
  });

  it('AC33: appends the trimmed command', () => {
    const h = pushHistory(freeze(emptyHistory()), '  help  ');
    expect([...h.entries]).toEqual(['help']);
  });

  it('AC33: ignores blank and whitespace-only input', () => {
    const base = pushAll(['a']);
    for (const blank of ['', ' ', '\t\n  ']) {
      expect([...pushHistory(base, blank).entries]).toEqual(['a']);
    }
  });

  it('AC33: keeps consecutive duplicates', () => {
    expect([...pushAll(['ls', 'ls', 'ls']).entries]).toEqual(['ls', 'ls', 'ls']);
  });

  it('AC33: records clear like any other command', () => {
    expect([...pushAll(['help', 'clear']).entries]).toEqual(['help', 'clear']);
  });

  it('AC33: resets navigation so the next Up starts at the newest', () => {
    let h = pushAll(['a', 'b', 'c']);
    h = freeze(historyUp(h, 'x').history);
    h = freeze(historyUp(h, 'x').history);
    expect(h.index).not.toBeNull();
    h = freeze(pushHistory(h, 'd'));
    expect(h.index).toBeNull();
    expect(historyUp(h, '').value).toBe('d');
  });

  it('AC33: navigation resets even when the pushed input is blank', () => {
    let h = pushAll(['a', 'b']);
    h = freeze(historyUp(h, 'x').history);
    h = pushHistory(h, '   ');
    expect(historyUp(h, '').value).toBe('b');
  });
});

describe('historyUp', () => {
  it('AC34: empty history returns the input and an unchanged history', () => {
    const h = freeze(emptyHistory());
    const r = historyUp(h, 'typing');
    expect(r.value).toBe('typing');
    expect(r.history).toEqual(h);
  });

  it('AC34: first press returns the newest entry', () => {
    const r = historyUp(pushAll(['a', 'b', 'c']), 'draft');
    expect(r.value).toBe('c');
  });

  it('AC34: further presses go older and stop at the oldest', () => {
    let h = pushAll(['a', 'b', 'c']);
    const seen: string[] = [];
    for (let i = 0; i < 6; i++) {
      const r = historyUp(h, 'draft');
      h = freeze(r.history);
      seen.push(r.value);
    }
    expect(seen).toEqual(['c', 'b', 'a', 'a', 'a', 'a']);
  });

  it('AC34: a single entry stays put on repeated Up', () => {
    let h = pushAll(['only']);
    for (let i = 0; i < 3; i++) {
      const r = historyUp(h, 'd');
      h = freeze(r.history);
      expect(r.value).toBe('only');
    }
  });
});

describe('historyDown', () => {
  it('AC35: outside navigation returns the input and an unchanged history', () => {
    const h = pushAll(['a', 'b']);
    const r = historyDown(h, 'typing');
    expect(r.value).toBe('typing');
    expect(r.history).toEqual(h);
    const e = historyDown(freeze(emptyHistory()), 'z');
    expect(e.value).toBe('z');
  });

  it('AC35: moves one entry newer', () => {
    let h = pushAll(['a', 'b', 'c']);
    for (let i = 0; i < 3; i++) h = freeze(historyUp(h, 'x').history);
    const r = historyDown(h, 'a');
    expect(r.value).toBe('b');
  });

  it('AC35: past the newest entry returns the draft and leaves navigation', () => {
    let h = pushAll(['a', 'b']);
    h = freeze(historyUp(h, 'my draft').history);
    const r = historyDown(h, 'b');
    expect(r.value).toBe('my draft');
    expect(r.history.index).toBeNull();
    const again = historyDown(freeze(r.history), 'my draft');
    expect(again.value).toBe('my draft');
  });

  it('AC35: an empty draft is restored as an empty string', () => {
    let h = pushAll(['a']);
    h = freeze(historyUp(h, '').history);
    expect(historyDown(h, 'a').value).toBe('');
  });
});

describe('history sequence', () => {
  it('AC36: push a, b, c; type x; Up x4 then Down x4 gives c b a a b c x x', () => {
    let h = pushAll(['a', 'b', 'c']);
    let input = 'x';
    const out: string[] = [];
    for (let i = 0; i < 4; i++) {
      const r = historyUp(h, input);
      h = freeze(r.history);
      input = r.value;
      out.push(r.value);
    }
    for (let i = 0; i < 4; i++) {
      const r = historyDown(h, input);
      h = freeze(r.history);
      input = r.value;
      out.push(r.value);
    }
    expect(out).toEqual(['c', 'b', 'a', 'a', 'b', 'c', 'x', 'x']);
  });

  it('AC36: functions do not mutate a deep-frozen history', () => {
    const h = pushAll(['a', 'b']);
    const snapshot = JSON.stringify(h);
    expect(() => {
      pushHistory(h, 'c');
      pushHistory(h, '');
      historyUp(h, 'x');
      historyDown(h, 'x');
      const up = historyUp(h, 'x');
      historyDown(freeze(up.history), 'b');
    }).not.toThrow();
    expect(JSON.stringify(h)).toBe(snapshot);
  });
});
