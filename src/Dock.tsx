import type { Dispatch } from 'react';
import { DOCK_LABELS, LINKS, WIN_ICONS, WIN_TITLES } from './data';
import type { DesktopAction } from './logic/desktop';
import { DOT_OPACITY, dockWinState } from './logic/dock';
import { linkAttrs } from './logic/menu';
import { DOCK_IDS } from './logic/windows';
import type { State } from './types';
import './Dock.css';

export default function Dock({
  wins,
  dispatch,
}: {
  wins: State['wins'];
  dispatch: Dispatch<DesktopAction>;
}) {
  return (
    <nav className="dock" aria-label={DOCK_LABELS.landmark}>
      {DOCK_IDS.map((id) => {
        const state = dockWinState(wins[id]);
        const Icon = WIN_ICONS[id];
        return (
          <button
            key={id}
            type="button"
            className="dock-item dock-win"
            aria-label={WIN_TITLES[id]}
            title={WIN_TITLES[id]}
            aria-pressed={state === 'open'}
            aria-describedby={`dock-state-${id}`}
            onClick={() => dispatch({ type: 'dockClick', id })}
          >
            <span className="dock-face">
              <Icon size={22} aria-hidden="true" />
            </span>
            <span className="dock-dot" aria-hidden="true" style={{ opacity: DOT_OPACITY[state] }} />
            <span id={`dock-state-${id}`} hidden>
              {DOCK_LABELS.state[state]}
            </span>
          </button>
        );
      })}
      <div className="dock-sep" aria-hidden="true" />
      {LINKS.map((l) => (
        <a
          key={l.label}
          className="dock-item dock-link"
          href={l.href}
          aria-label={l.label}
          title={l.label}
          {...linkAttrs(l.href)}
        >
          <span className="dock-face">
            <l.icon size={22} aria-hidden="true" />
          </span>
        </a>
      ))}
    </nav>
  );
}
