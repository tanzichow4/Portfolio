import type { Dispatch } from 'react';
import Window from './Window';
import type { DesktopAction } from './logic/desktop';
import { WIN_IDS } from './logic/windows';
import { topMost, zIndexFor } from './logic/zorder';
import type { State } from './types';

export default function WindowLayer({
  state,
  dispatch,
  flyIn,
  wobble,
}: {
  state: State;
  dispatch: Dispatch<DesktopAction>;
  flyIn: boolean;
  wobble: boolean;
}) {
  const top = topMost(state.order, state.wins);
  return (
    <>
      {WIN_IDS.filter((id) => state.wins[id].open).map((id) => (
        <Window
          key={id}
          id={id}
          win={state.wins[id]}
          z={zIndexFor(id, state.order)}
          top={top === id}
          vw={state.vw}
          vh={state.vh}
          wobble={wobble}
          flyIn={flyIn}
          onFocus={() => dispatch({ type: 'focus', id })}
          onMinimize={() => dispatch({ type: 'minimize', id })}
          onClose={() => dispatch({ type: 'close', id })}
          onMove={(x, y) => dispatch({ type: 'move', id, x, y })}
        />
      ))}
    </>
  );
}
