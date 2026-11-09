import type { Dispatch } from 'react';
import type { AppAction } from '../logic/system';
import type { HelpChannel } from '../logic/terminal';

export default function Terminal({
  dispatch,
  helpChannel,
}: {
  dispatch: Dispatch<AppAction>;
  helpChannel?: HelpChannel;
}) {
  void dispatch;
  void helpChannel;
  return null; // TODO
}
