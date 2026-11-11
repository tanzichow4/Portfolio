import './About.css';
import type { Dispatch } from 'react';
import { ABOUT_COPY, ABOUT_LABELS, FACTS } from '../data';
import type { AppAction } from '../logic/system';

export default function About({ dispatch }: { dispatch: Dispatch<AppAction> }) {
  return (
    <div className="about-body">
      {ABOUT_COPY.map((para, i) => (
        <p key={i} className="about-para">
          {para.map((seg, j) =>
            seg.em ? (
              <em key={j} className="about-em">
                {seg.text}
              </em>
            ) : (
              <span key={j}>{seg.text}</span>
            ),
          )}
        </p>
      ))}
      <button
        type="button"
        className="btn btn-secondary about-viz"
        onClick={() => dispatch({ type: 'open', id: 'viz' })}
      >
        {ABOUT_LABELS.viz}
      </button>
      <ul className="about-facts">
        {FACTS.map(({ icon: FactIcon, label }) => (
          <li key={label} className="fact">
            <span className="fact-face">
              <FactIcon size={14} aria-hidden="true" focusable="false" />
              {label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
