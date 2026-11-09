import type { Dispatch } from 'react';
import type { AppAction } from '../logic/system';

export default function Hello({ dispatch }: { dispatch: Dispatch<AppAction> }) {
  void dispatch;
  return null; // TODO
}
