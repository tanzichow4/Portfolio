import './About.css';
import { ABOUT_COPY, FACTS } from '../data';

export default function About() {
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
