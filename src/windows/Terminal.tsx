import { useState } from 'react';
import type { Dispatch, KeyboardEvent } from 'react';
import { TERMINAL_LABELS } from '../data';
import { emptyHistory, pushHistory } from '../logic/history';
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
  // helpChannel is wired up in T11.
  void helpChannel;
  const [lines, setLines] = useState<readonly Line[]>(TERMINAL_BANNER);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState(emptyHistory);

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
    }
  }

  return (
    <div className="term-body">
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
