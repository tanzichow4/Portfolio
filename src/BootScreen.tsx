import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { BOOT_COPY, SITE_COPY } from './data';
import { BOOT_TICK_MS, bootStep } from './logic/system';
import './BootScreen.css';

export default function BootScreen({ onDone }: { onDone: () => void }) {
  const [pct, setPct] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    // Local running total so a StrictMode remount starts cleanly at 0.
    let total = 0;
    const id = setInterval(() => {
      const step = bootStep(total, Math.random());
      total = step.pct;
      if (step.done) {
        clearInterval(id);
        onDone();
      } else {
        setPct(step.pct);
      }
    }, BOOT_TICK_MS);
    return () => clearInterval(id);
  }, [onDone]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') e.preventDefault();
  };

  return (
    <div
      ref={ref}
      className="boot"
      role="dialog"
      aria-modal="true"
      aria-label={BOOT_COPY.dialog}
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <div className="boot-mark" aria-hidden="true">
        {SITE_COPY.mark}
      </div>
      <div
        className="boot-track"
        role="progressbar"
        aria-label={BOOT_COPY.progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
      >
        <div className="boot-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
