import { VIZ_COPY } from '../data';
import './Viz.css';

export default function Viz() {
  return (
    <div className="viz-body">
      <p className="viz-text">{VIZ_COPY.body}</p>
    </div>
  );
}
