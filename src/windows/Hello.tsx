import './Hello.css';
import { useState } from 'react';
import type { Dispatch } from 'react';
import { CursorClick, FolderOpen, HandWaving } from '@phosphor-icons/react';
import { EMAIL, HELLO_COPY, NAME, VERBS } from '../data';
import { wrapIndex } from '../logic/menu';
import type { AppAction } from '../logic/system';

function Line({ text }: { text: string }) {
  return (
    <span className="hello-line" aria-hidden="true">
      {Array.from(text).map((c, i) => (
        <span key={i} className="hello-letter">
          <span className="hello-letter-face">{c}</span>
        </span>
      ))}
    </span>
  );
}

export default function Hello({ dispatch }: { dispatch: Dispatch<AppAction> }) {
  const [verbIdx, setVerbIdx] = useState(0);
  const [first, ...rest] = NAME.split(' ');

  return (
    <div className="hello-body">
      <div className="hello-greeting">
        <span className="hello-hand" aria-hidden="true">
          <HandWaving size={22} focusable="false" />
        </span>
        {HELLO_COPY.greeting}
      </div>
      <h1 className="hello-name" aria-label={NAME}>
        <Line text={first} />
        <Line text={`${rest.join(' ')}.`} />
      </h1>
      <div className="hello-row">
        {HELLO_COPY.verbPrefix}
        <button
          type="button"
          className="hello-verb"
          onClick={() => setVerbIdx((i) => wrapIndex(i, 1, VERBS.length))}
        >
          {VERBS[verbIdx]}
        </button>
        {HELLO_COPY.verbSuffix}
      </div>
      <div className="hello-hint">
        <CursorClick size={14} aria-hidden="true" focusable="false" />
        {HELLO_COPY.hint}
      </div>
      <div className="hello-actions">
        <button
          type="button"
          className="hello-cta"
          onClick={() => dispatch({ type: 'open', id: 'proj' })}
        >
          <span className="btn btn-primary hello-cta-face">
            <FolderOpen size={16} aria-hidden="true" focusable="false" />
            {HELLO_COPY.primary}
          </span>
        </button>
        <a className="hello-cta" href={`mailto:${EMAIL}`}>
          <span className="btn btn-secondary hello-cta-face">{HELLO_COPY.secondary}</span>
        </a>
      </div>
    </div>
  );
}
