import { useEffect, useReducer } from 'react';
import { WIN_TITLES } from './data';
import { desktopReducer, initialDesktop } from './logic/desktop';
import { WIN_IDS, WIN_META } from './logic/windows';
import { zIndexFor } from './logic/zorder';

export default function Desktop() {
  const [state, dispatch] = useReducer(desktopReducer, undefined, () =>
    initialDesktop(window.innerWidth, window.innerHeight),
  );

  useEffect(() => {
    const onResize = () =>
      dispatch({ type: 'resize', vw: window.innerWidth, vh: window.innerHeight });
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        userSelect: 'none',
        background: 'var(--wall-nebula)',
      }}
    >
      {WIN_IDS.filter((id) => state.wins[id].open).map((id) => {
        const w = state.wins[id];
        return (
          <section
            key={id}
            aria-label={WIN_TITLES[id]}
            data-win={id}
            data-min={String(w.min)}
            hidden={w.min}
            style={{
              position: 'absolute',
              left: w.x,
              top: w.y,
              width: WIN_META[id].width,
              minHeight: WIN_META[id].height,
              zIndex: zIndexFor(id, state.order),
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            {WIN_TITLES[id]}
          </section>
        );
      })}
    </div>
  );
}
