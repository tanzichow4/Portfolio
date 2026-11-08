import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import MenuBar from './MenuBar';
import WindowLayer from './WindowLayer';
import { persistDiff } from './logic/settings';
import { appReducer, initialApp } from './logic/system';
import { applyTheme, readSettings, writeSetting } from './storage';

export default function Desktop() {
  const [state, dispatch] = useReducer(appReducer, undefined, () =>
    initialApp(window.innerWidth, window.innerHeight, readSettings()),
  );
  const { settings } = state;

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

  // The single side-effect site for settings: apply the theme, persist what changed.
  const prev = useRef(settings);
  useLayoutEffect(() => {
    applyTheme(settings.theme);
    for (const [key, value] of persistDiff(prev.current, settings)) writeSetting(key, value);
    prev.current = settings;
  }, [settings]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        userSelect: 'none',
        background: `var(--wall-${settings.wall})`,
      }}
    >
      <MenuBar wins={state.desk.wins} settings={settings} dispatch={dispatch} />
      <WindowLayer state={state.desk} dispatch={dispatch} flyIn={ready} wobble={settings.wobble} />
    </div>
  );
}
