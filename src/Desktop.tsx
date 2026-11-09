import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import BootScreen from './BootScreen';
import Dock from './Dock';
import { prefersReducedMotion } from './hooks/reducedMotion';
import MenuBar from './MenuBar';
import WindowLayer from './WindowLayer';
import { createHelpChannel } from './logic/terminal';
import WindowBody from './windows/WindowBody';
import { persistDiff } from './logic/settings';
import { appReducer, initialApp, type AppAction } from './logic/system';
import { applyTheme, readSettings, writeSetting } from './storage';

export default function Desktop() {
  const [state, dispatch] = useReducer(appReducer, undefined, () =>
    initialApp(window.innerWidth, window.innerHeight, readSettings()),
  );
  const { settings } = state;
  const [helpChannel] = useState(createHelpChannel);

  // Bumping the epoch remounts every window, which discards all window-local state.
  const [epoch, setEpoch] = useState(0);
  const resetDesktop = useCallback(() => {
    dispatch({ type: 'restart' });
    setEpoch((e) => e + 1);
  }, []);
  // Booting is shell state local to Desktop. The ref is the synchronous re-entry guard.
  const [booting, setBooting] = useState(false);
  const bootingRef = useRef(false);
  const beginBoot = useCallback(() => {
    if (bootingRef.current) return;
    if (prefersReducedMotion()) {
      resetDesktop();
      return;
    }
    bootingRef.current = true;
    setBooting(true);
  }, [resetDesktop]);
  // Stable, so a re-render during a boot does not restart BootScreen's interval.
  const finishBoot = useCallback(() => {
    bootingRef.current = false;
    setBooting(false);
    resetDesktop();
  }, [resetDesktop]);
  const appDispatch = useCallback(
    (action: AppAction) => {
      if (action.type === 'restart') beginBoot();
      else dispatch(action);
    },
    [beginBoot],
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

  // The single side-effect site for settings: apply the theme, persist what changed.
  const prev = useRef(settings);
  useLayoutEffect(() => {
    applyTheme(settings.theme);
    for (const [key, value] of persistDiff(prev.current, settings)) writeSetting(key, value);
    prev.current = settings;
  }, [settings]);

  return (
    <>
      <div
        inert={booting}
        style={{
          position: 'fixed',
          inset: 0,
          overflow: 'hidden',
          userSelect: 'none',
          background: `var(--wall-${settings.wall})`,
        }}
      >
        <MenuBar
          wins={state.desk.wins}
          settings={settings}
          dispatch={appDispatch}
          onTerminalHelp={() => helpChannel.request()}
        />
        <WindowLayer
          key={epoch}
          state={state.desk}
          dispatch={dispatch}
          flyIn={ready}
          wobble={settings.wobble}
          renderBody={(id) => (
            <WindowBody id={id} dispatch={appDispatch} helpChannel={helpChannel} />
          )}
        />
        <Dock wins={state.desk.wins} dispatch={dispatch} />
      </div>
      {booting && <BootScreen onDone={finishBoot} />}
    </>
  );
}
