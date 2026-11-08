import { useEffect, useReducer, useState } from 'react';
import WindowLayer from './WindowLayer';
import { desktopReducer, initialDesktop } from './logic/desktop';

export default function Desktop() {
  const [state, dispatch] = useReducer(desktopReducer, undefined, () =>
    initialDesktop(window.innerWidth, window.innerHeight),
  );

  const [ready, setReady] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);

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
      <WindowLayer state={state} dispatch={dispatch} flyIn={ready} wobble={true} />
    </div>
  );
}
