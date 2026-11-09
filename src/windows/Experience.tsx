import { useRef, useState, type KeyboardEvent } from 'react';
import './Experience.css';
import { EXP, EXPERIENCE_LABELS } from '../data';
import { wrapIndex } from '../logic/menu';

export default function Experience() {
  const [selected, setSelected] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const entry = EXP[selected];

  const select = (i: number) => {
    setSelected(i);
    tabRefs.current[i]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let next: number;
    if (e.key === 'ArrowDown') next = wrapIndex(i, 1, EXP.length);
    else if (e.key === 'ArrowUp') next = wrapIndex(i, -1, EXP.length);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = EXP.length - 1;
    else return;
    e.preventDefault();
    select(next);
  };

  return (
    <div className="exp-body">
      <div
        className="exp-rail"
        role="tablist"
        aria-orientation="vertical"
        aria-label={EXPERIENCE_LABELS.tablist}
      >
        {EXP.map((x, i) => (
          <button
            key={x.org}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`exp-tab-${i}`}
            aria-selected={i === selected}
            aria-controls="exp-panel"
            tabIndex={i === selected ? 0 : -1}
            className={`exp-tab${i === selected ? ' exp-tab-active' : ''}`}
            onClick={() => select(i)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            <span className="exp-tab-face">{x.org}</span>
          </button>
        ))}
      </div>
      <div
        className="exp-panel"
        id="exp-panel"
        role="tabpanel"
        tabIndex={0}
        aria-labelledby={`exp-tab-${selected}`}
      >
        <h2 className="exp-role">{entry.role}</h2>
        <div className="exp-org">
          {EXPERIENCE_LABELS.at} {entry.org}
        </div>
        <div className="exp-when">{entry.when}</div>
        <p className="exp-desc">{entry.desc}</p>
        <div className="exp-tags">
          {entry.tags.map((t) => (
            <span key={t} className="tag tag-accent">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
