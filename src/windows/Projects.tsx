import { ArrowUpRight } from '@phosphor-icons/react';
import './Projects.css';
import { PROJECTS } from '../data';
import { linkAttrs } from '../logic/menu';

export default function Projects() {
  return (
    <ul className="proj-grid">
      {PROJECTS.map((p) => (
        <li key={p.name} className="proj-item">
          <a className="proj-tile" href={p.href} {...linkAttrs(p.href)}>
            <div className="proj-face">
              <div className="proj-top">
                <p.icon className="proj-icon" size={22} aria-hidden="true" />
                <ArrowUpRight className="proj-arrow" size={13} aria-hidden="true" />
              </div>
              <h2 className="proj-name">{p.name}</h2>
              <p className="proj-desc">{p.desc}</p>
              <div className="proj-tags">
                {p.tags.map((t, i) => (
                  <span key={t}>
                    {i > 0 && ' '}
                    <span className="tag tag-neutral proj-tag">{t}</span>
                  </span>
                ))}
              </div>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
