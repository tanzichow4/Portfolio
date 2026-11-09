import Desktop from './Desktop';
import PhonePage from './PhonePage';
import { useView } from './hooks/useView';

export default function App() {
  const view = useView();
  return view === 'phone' ? <PhonePage /> : <Desktop />;
}
