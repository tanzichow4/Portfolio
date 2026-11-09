import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Dispatch, KeyboardEvent, MouseEvent } from 'react';
import { TERMINAL_LABELS } from '../data';
import { emptyHistory, historyDown, historyUp, pushHistory } from '../logic/history';
import { effectToAction } from '../logic/system';
import type { AppAction } from '../logic/system';
import { PROMPT, TERMINAL_BANNER, runCommand } from '../logic/terminal';
import type { HelpChannel } from '../logic/terminal';
import type { Line } from '../types';
import './Terminal.css';

export default function Terminal({
  dispatch,
  helpChannel,
}: {
  dispatch: Dispatch<AppAction>;
  helpChannel?: HelpChannel;
}) {
  const [lines, setLines] = useState<readonly Line[]>(TERMINAL_BANNER);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState(emptyHistory);

  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const caretToEnd = useRef(false);

  // Help menu: print the help output without touching input or history.
  // The channel drains queued requests on subscribe, so StrictMode's
  // second subscribe runs nothing.
  useEffect(() => {
    if (!helpChannel) return;
    return helpChannel.subscribe(() => {
      const { lines: out } = runCommand('help');
      setLines((prev) => [...prev, ...out]);
    });
  }, [helpChannel]);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  useLayoutEffect(() => {
    if (!caretToEnd.current) return;
    caretToEnd.current = false;
    const el = inputRef.current;
    if (el) el.setSelectionRange(el.value.length, el.value.length);
  });

  function onBodyClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target === inputRef.current) return;
    if (window.getSelection()?.isCollapsed === false) return;
    inputRef.current?.focus();
  }

  function recall(e: KeyboardEvent<HTMLInputElement>, up: boolean) {
    e.preventDefault();
    const r = (up ? historyUp : historyDown)(history, input);
    setHistory(r.history);
    if (r.value !== input) {
      caretToEnd.current = true;
      setInput(r.value);
    } else {
      const el = e.currentTarget;
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }

  function submit() {
    const { lines: out, effects } = runCommand(input);
    const cleared = effects.some((e) => e.type === 'clear');
    setLines(cleared ? out : [...lines, ...out]);
    setHistory(pushHistory(history, input));
    setInput('');
    for (const e of effects) {
      const action = effectToAction(e);
      if (action) dispatch(action);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    } else if (e.key === 'ArrowUp') recall(e, true);
    else if (e.key === 'ArrowDown') recall(e, false);
  }

  return (
    <div className="term-body" ref={bodyRef} onClick={onBodyClick}>
      <div role="log" aria-label={TERMINAL_LABELS.log}>
        {lines.map((l, i) => (
          <div key={i} className={`term-line term-${l.tone}`}>
            {l.text}
          </div>
        ))}
      </div>
      <div className="term-row">
        <span className="term-prompt">{PROMPT.trimEnd()}</span>
        <input
          className="term-input"
          ref={inputRef}
          type="text"
          value={input}
          aria-label={TERMINAL_LABELS.input}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>
    </div>
  );
}
