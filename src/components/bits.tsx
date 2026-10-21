import { Link } from 'react-router';
import { category, initials, officer, ward } from '../lib/catalog';
import { fmtDateTime, parts, shortSpan } from '../lib/format';
import { photoSrc } from '../lib/photos';
import { escalationCount, urgency } from '../lib/sla';
import type { Complaint, Status } from '../lib/types';

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="12" fill="var(--plate)" />
      <path d="M6 32c7-11 16-17 26-17s19 6 26 17c-7 11-16 17-26 17S13 43 6 32z" fill="var(--hazard)" />
      <circle cx="32" cy="32" r="11" fill="var(--plate)" />
      <circle cx="32" cy="32" r="4.5" fill="var(--hazard)" />
    </svg>
  );
}

export function Avatar({ name, lg }: { name: string; lg?: boolean }) {
  return (
    <span className={`avatar${lg ? ' lg' : ''}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

const STATUS_TEXT: Record<Status, string> = {
  assigned: 'Assigned',
  in_progress: 'In progress',
  reopened: 'Reopened',
  resolved: 'Awaiting citizen',
  closed: 'Closed',
};

export function StatusPill({ c, now }: { c: Complaint; now: number }) {
  const u = urgency(c, now);
  if (u === 'done') return <span className={`pill ${c.status === 'resolved' ? 'soon' : 'done'}`}>{STATUS_TEXT[c.status]}</span>;
  if (u === 'overdue') return <span className="pill overdue">Overdue</span>;
  const esc = escalationCount(c);
  if (esc > 0) return <span className="pill esc">Escalated ×{esc}</span>;
  return <span className={`pill ${u}`}>{u === 'soon' ? 'Due soon' : STATUS_TEXT[c.status]}</span>;
}

export function SlaPlate({ c, now }: { c: Complaint; now: number }) {
  const u = urgency(c, now);
  if (u === 'done') {
    const took = (c.resolvedAt ?? now) - c.createdAt;
    const esc = escalationCount(c);
    const onTime = esc === 0 && c.events.some((e) => e.kind === 'resolved' && e.onTime);
    return (
      <div className="sla done" role="status">
        <span className="sla-label">{c.status === 'closed' ? 'Closed' : 'Resolved, awaiting confirmation'}</span>
        <span className="sla-time">{shortSpan(took)}</span>
        <span className="sla-sub">
          Time to fix · {onTime ? 'before the deadline' : esc ? `after ${esc} missed deadline${esc > 1 ? 's' : ''}` : 'after the deadline'}
        </span>
      </div>
    );
  }
  const left = c.deadline - now;
  const { d, h, m, s } = parts(left);
  const p = (n: number) => String(n).padStart(2, '0');
  const top = !officer(c.officerId)?.seniorId;
  return (
    <div className={`sla${u === 'overdue' ? ' overdue' : ''}`} role="timer" aria-live="off">
      <span className="sla-label">{u === 'overdue' ? 'Overdue by' : 'Time left'}</span>
      <span className="sla-time">
        {d}
        <small>d</small>
        {p(h)}
        <small>h</small>
        {p(m)}
        <small>m</small>
        {p(s)}
        <small>s</small>
      </span>
      <span className="sla-sub">
        Deadline {fmtDateTime(c.deadline)} ·{' '}
        {u === 'overdue' ? (top ? 'at the top of the chain' : 'escalating now') : top ? 'last level' : `then it goes to ${officer(officer(c.officerId)!.seniorId!)?.name}`}
      </span>
    </div>
  );
}

export function ComplaintCard({ c, now }: { c: Complaint; now: number }) {
  const cat = category(c.categoryId);
  const u = urgency(c, now);
  const owner = officer(c.officerId);
  return (
    <Link to={`/complaints/${c.id}`} className={`ccard${u === 'overdue' ? ' overdue' : ''}`}>
      <img className="ccard-thumb" src={photoSrc(c.photo) ?? photoSrc(c.proof?.photo)} alt="" loading="lazy" />
      <div>
        <div className="ccard-top">
          <span className="mono muted">{c.id}</span>
          <StatusPill c={c} now={now} />
          {c.supporters.length > 0 && <span className="chip">+{c.supporters.length} support</span>}
        </div>
        <div className="ccard-title">{cat?.name}</div>
        <div className="ccard-meta">
          <span>
            {ward(c.wardId)?.name}
            {c.landmark ? ` · ${c.landmark}` : ''}
          </span>
          <span>{owner?.name}</span>
          {u !== 'done' && (
            <span className={`ccard-clock ${u}`}>{u === 'overdue' ? `overdue ${shortSpan(now - c.deadline)}` : `${shortSpan(c.deadline - now)} left`}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <b>{title}</b>
      {children}
    </div>
  );
}

export function Stars({ n }: { n: number }) {
  return (
    <span className="star-read" aria-label={`${n} of 5 stars`}>
      {'★'.repeat(n)}
      <span style={{ opacity: 0.3 }}>{'★'.repeat(5 - n)}</span>
    </span>
  );
}
