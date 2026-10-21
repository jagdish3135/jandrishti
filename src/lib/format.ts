import { DAY, HOUR } from './sla';

const dateTime = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const dateOnly = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const clock = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });

export const fmtDateTime = (t: number) => dateTime.format(t);
export const fmtDate = (t: number) => dateOnly.format(t);
export const fmtClock = (t: number) => clock.format(t);

export function parts(ms: number) {
  const a = Math.abs(ms);
  return {
    d: Math.floor(a / DAY),
    h: Math.floor((a % DAY) / HOUR),
    m: Math.floor((a % HOUR) / 60_000),
    s: Math.floor((a % 60_000) / 1000),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "2d 04h" style, for compact lists. */
export function shortSpan(ms: number) {
  const { d, h, m } = parts(ms);
  if (d > 0) return `${d}d ${pad(h)}h`;
  if (h > 0) return `${h}h ${pad(m)}m`;
  return `${m}m`;
}

export function ago(t: number, now: number) {
  const ms = now - t;
  if (ms < 60_000) return 'just now';
  return `${shortSpan(ms)} ago`;
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function maskName(name: string) {
  const [first, ...rest] = name.split(' ');
  return rest.length ? `${first} ${rest.map((r) => r[0] + '.').join(' ')}` : first;
}

const longDate = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export const fmtLong = (t: number) => longDate.format(t);

/** "6 days 23 hours", "5 hours 10 minutes", "12 minutes": plain words, no seconds. */
export function humanSpan(ms: number) {
  const { d, h, m } = parts(ms);
  const w = (n: number, s: string) => `${n} ${s}${n === 1 ? '' : 's'}`;
  if (d > 0) return h ? `${w(d, 'day')} ${w(h, 'hour')}` : w(d, 'day');
  if (h > 0) return m ? `${w(h, 'hour')} ${w(m, 'minute')}` : w(h, 'hour');
  return w(Math.max(1, m), 'minute');
}
