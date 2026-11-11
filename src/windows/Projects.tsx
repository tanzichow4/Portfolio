import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, CaretRight, Star } from '@phosphor-icons/react';
import './Projects.css';
import { PROJECTS, PROJECT_LABELS } from '../data';
import type { Project } from '../data';
import { linkAttrs } from '../logic/menu';

function Tags({ tags }: { tags: string[] }) {
  return (
    <div className="proj-tags">
      {tags.map((t, i) => (
        <span key={t}>
          {i > 0 && ' '}
          <span className="tag tag-neutral proj-tag">{t}</span>
        </span>
      ))}
    </div>
  );
}

function FeaturedStar({ id }: { id?: string }) {
  return (
    <Star
      id={id}
      className="proj-star"
      size={16}
      weight="fill"
      role="img"
      aria-label={PROJECT_LABELS.featured}
    />
  );
}

function Tile({
  p,
  onOpen,
  buttonRef,
}: {
  p: Project;
  onOpen: () => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}) {
  const uid = useId();
  const descId = `${uid}-desc`;
  const starId = `${uid}-star`;
  return (
    <li className="proj-item">
      <div className="proj-tile" onClick={onOpen}>
        <div className="proj-face">
          <div className="proj-top">
            <p.icon className="proj-icon" size={22} aria-hidden="true" />
            {p.featured && <FeaturedStar id={starId} />}
            <CaretRight className="proj-arrow" size={13} aria-hidden="true" />
          </div>
          <h2 className="proj-name">
            <button
              type="button"
              className="proj-open"
              ref={buttonRef}
              aria-describedby={p.featured ? `${descId} ${starId}` : descId}
            >
              {p.name}
            </button>
          </h2>
          <p className="proj-desc" id={descId}>
            {p.desc}
          </p>
          <Tags tags={p.tags} />
        </div>
      </div>
    </li>
  );
}

export default function Projects() {
  const [selected, setSelected] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const tileRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const returnTo = useRef<string | null>(null);

  const project = PROJECTS.find((p) => p.name === selected) ?? null;
  const open = project ? project.name : null;

  useEffect(() => {
    if (open !== null) {
      backRef.current?.focus();
    } else if (returnTo.current !== null) {
      tileRefs.current[returnTo.current]?.focus();
      returnTo.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const win = rootRef.current?.closest('[data-win]');
      if (win && e.target instanceof Node && win.contains(e.target)) {
        returnTo.current = open;
        setSelected(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const goBack = () => {
    returnTo.current = open;
    setSelected(null);
  };

  return (
    <div className="proj-body" ref={rootRef}>
      {project ? (
        <div className="proj-detail">
          <button type="button" className="btn btn-ghost proj-back" ref={backRef} onClick={goBack}>
            <ArrowLeft size={14} aria-hidden="true" /> {PROJECT_LABELS.back}
          </button>
          <div className="proj-detail-head">
            <project.icon className="proj-icon" size={22} aria-hidden="true" />
            <h2 className="proj-detail-name">{project.name}</h2>
            {project.featured && <FeaturedStar />}
          </div>
          <p className="proj-detail-desc">{project.desc}</p>
          {project.details && <p className="proj-details">{project.details}</p>}
          {project.highlights && project.highlights.length > 0 && (
            <>
              <h3 className="proj-section">{PROJECT_LABELS.highlights}</h3>
              <ul className="proj-list">
                {project.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </>
          )}
          <Tags tags={project.tags} />
          {project.links && project.links.length > 0 && (
            <>
              <h3 className="proj-section">{PROJECT_LABELS.links}</h3>
              <ul className="proj-list">
                {project.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} {...linkAttrs(l.href)}>
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : (
        <ul className="proj-grid">
          {PROJECTS.map((p) => (
            <Tile
              key={p.name}
              p={p}
              onOpen={() => setSelected(p.name)}
              buttonRef={(el) => {
                tileRefs.current[p.name] = el;
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
