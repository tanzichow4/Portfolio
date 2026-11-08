export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const int = (n: number): number => (Number.isFinite(n) ? Math.trunc(n) : 0);
const mod = (n: number, m: number): number => ((int(n) % m) + m) % m;
const clampMinutes = (m: number): number => Math.min(59, Math.max(0, int(m)));

/** Formats a weekday (0 = Sunday), hour (0-23) and minute as "Sat 3:42 PM". */
export function formatClock(weekday: number, hours: number, minutes: number): string {
  const day = WEEKDAYS[mod(weekday, 7)];
  const h24 = mod(hours, 24);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const suffix = h24 < 12 ? 'AM' : 'PM';
  return day + ' ' + h12 + ':' + String(clampMinutes(minutes)).padStart(2, '0') + ' ' + suffix;
}

/** A valid machine-readable time value such as "15:42". */
export function timeAttr(hours: number, minutes: number): string {
  return (
    String(mod(hours, 24)).padStart(2, '0') + ':' + String(clampMinutes(minutes)).padStart(2, '0')
  );
}
