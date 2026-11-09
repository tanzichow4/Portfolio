import { useLayoutEffect } from 'react';
import './PhonePage.css';
import {
  ABOUT_COPY,
  EXP,
  EXPERIENCE_LABELS,
  FACTS,
  LINKS,
  MENU_ITEMS,
  NAME,
  PHONE_HEADINGS,
  PROJECTS,
  RESUME_URL,
  ROLE,
} from './data';
import { linkAttrs } from './logic/menu';

function Tags({ tags }: { tags: string[] }) {
  return (
    <div className="phone-tags">
      {tags.map((t, i) => (
        <span key={i}>
          {i > 0 && ' '}
          <span className="tag tag-outline">{t}</span>
        </span>
      ))}
    </div>
  );
}

export default function PhonePage() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add('phone-view');
    return () => root.classList.remove('phone-view');
  }, []);

  return (
    <main className="phone">
      <div className="phone-intro">
        <h1 className="phone-name">{NAME}</h1>
        <p className="phone-role">{ROLE}</p>
      </div>

      <section className="phone-section" aria-labelledby="phone-about">
        <h2 className="phone-h2" id="phone-about">
          {PHONE_HEADINGS.about}
        </h2>
        {ABOUT_COPY.map((para, i) => (
          <p key={i} className="phone-para">
            {para.map((seg, j) =>
              seg.em ? (
                <em key={j} className="phone-em">
                  {seg.text}
                </em>
              ) : (
                <span key={j}>{seg.text}</span>
              ),
            )}
          </p>
        ))}
        <ul className="phone-facts" role="list">
          {FACTS.map((f, i) => (
            <li key={i}>{f.label}</li>
          ))}
        </ul>
      </section>

      <section className="phone-section" aria-labelledby="phone-experience">
        <h2 className="phone-h2" id="phone-experience">
          {EXPERIENCE_LABELS.tablist}
        </h2>
        <ul className="phone-list" role="list">
          {EXP.map((e, i) => (
            <li key={i}>
              <h3 className="phone-h3">{e.role}</h3>
              <p className="phone-meta">
                {EXPERIENCE_LABELS.at} {e.org}
              </p>
              <p className="phone-meta">{e.when}</p>
              <p className="phone-desc">{e.desc}</p>
              <Tags tags={e.tags} />
            </li>
          ))}
        </ul>
      </section>

      <section className="phone-section" aria-labelledby="phone-projects">
        <h2 className="phone-h2" id="phone-projects">
          {PHONE_HEADINGS.projects}
        </h2>
        <ul className="phone-list" role="list">
          {PROJECTS.map((p, i) => (
            <li key={i}>
              <h3 className="phone-h3">
                <a className="phone-link" href={p.href} {...linkAttrs(p.href)}>
                  {p.name}
                </a>
              </h3>
              <p className="phone-desc">{p.desc}</p>
              <Tags tags={p.tags} />
            </li>
          ))}
        </ul>
      </section>

      <section className="phone-section" aria-labelledby="phone-links">
        <h2 className="phone-h2" id="phone-links">
          {PHONE_HEADINGS.links}
        </h2>
        <ul className="phone-links" role="list">
          {LINKS.map((l, i) => (
            <li key={i}>
              <a className="phone-link" href={l.href} {...linkAttrs(l.href)}>
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <a className="phone-link" href={RESUME_URL} target="_blank" rel="noopener noreferrer">
              {MENU_ITEMS.resume}
            </a>
          </li>
        </ul>
      </section>
    </main>
  );
}
