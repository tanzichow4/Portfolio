import { useEffect, useState } from 'react';
import { formatClock, timeAttr } from './logic/clock';

export default function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);
  const h = now.getHours();
  const m = now.getMinutes();
  return (
    <time className="mb-clock" dateTime={timeAttr(h, m)}>
      {formatClock(now.getDay(), h, m)}
    </time>
  );
}
