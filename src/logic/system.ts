import type { State } from '../types';
import { desktopReducer, initialDesktop, type DesktopAction } from './desktop';
import { settingsReducer, type Settings, type SettingsAction } from './settings';
import type { TerminalEffect } from './terminal';

export interface App {
  desk: State;
  settings: Settings;
}

export type AppAction = DesktopAction | SettingsAction;

export function initialApp(vw: number, vh: number, settings: Settings): App {
  return { desk: initialDesktop(vw, vh), settings };
}

const SETTINGS_TYPES: readonly string[] = ['theme', 'wallpaper', 'toggleTheme', 'toggleWobble'];

export function appReducer(app: App, action: AppAction): App {
  if (SETTINGS_TYPES.includes(action.type)) {
    const settings = settingsReducer(app.settings, action as SettingsAction);
    return settings === app.settings ? app : { ...app, settings };
  }
  const desk = desktopReducer(app.desk, action as DesktopAction);
  return desk === app.desk ? app : { ...app, desk };
}

export function effectToAction(e: TerminalEffect): AppAction | null {
  switch (e.type) {
    case 'open':
      return { type: 'open', id: e.id };
    case 'theme':
      return { type: 'theme', theme: e.theme };
    case 'wallpaper':
      return { type: 'wallpaper', wall: e.wall };
    case 'tidy':
      return { type: 'tidy' };
    case 'restart':
      return { type: 'restart' };
    case 'clear':
      return null;
    default: {
      const unreachable: never = e;
      void unreachable;
      return null;
    }
  }
}
