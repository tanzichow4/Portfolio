export interface History {
  readonly entries: readonly string[];
  /** null means not navigating. */
  readonly index: number | null;
  readonly draft: string;
}

export function emptyHistory(): History {
  return { entries: [], index: null, draft: '' };
}

export function pushHistory(h: History, cmd: string): History {
  const trimmed = cmd.trim();
  if (trimmed === '') return h.index === null ? h : { ...h, index: null, draft: '' };
  return { entries: [...h.entries, trimmed], index: null, draft: '' };
}

export function historyUp(h: History, input: string): { history: History; value: string } {
  const n = h.entries.length;
  if (n === 0) return { history: h, value: input };
  if (h.index === null) {
    return { history: { ...h, index: n - 1, draft: input }, value: h.entries[n - 1] };
  }
  const index = Math.max(0, h.index - 1);
  if (index === h.index) return { history: h, value: h.entries[index] };
  return { history: { ...h, index }, value: h.entries[index] };
}

export function historyDown(h: History, input: string): { history: History; value: string } {
  if (h.index === null) return { history: h, value: input };
  const index = h.index + 1;
  if (index >= h.entries.length) {
    return { history: { ...h, index: null, draft: '' }, value: h.draft };
  }
  return { history: { ...h, index }, value: h.entries[index] };
}
