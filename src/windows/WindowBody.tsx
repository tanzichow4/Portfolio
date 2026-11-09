import type { Dispatch } from 'react';
import type { AppAction } from '../logic/system';
import type { HelpChannel } from '../logic/terminal';
import type { WinId } from '../types';
import About from './About';
import AboutSite from './AboutSite';
import Experience from './Experience';
import Hello from './Hello';
import Projects from './Projects';
import Terminal from './Terminal';

export default function WindowBody({
  id,
  dispatch,
  helpChannel,
}: {
  id: WinId;
  dispatch: Dispatch<AppAction>;
  helpChannel?: HelpChannel;
}) {
  switch (id) {
    case 'hello':
      return <Hello dispatch={dispatch} />;
    case 'about':
      return <About />;
    case 'exp':
      return <Experience />;
    case 'proj':
      return <Projects />;
    case 'term':
      return <Terminal dispatch={dispatch} helpChannel={helpChannel} />;
    case 'site':
      return <AboutSite />;
  }
}
