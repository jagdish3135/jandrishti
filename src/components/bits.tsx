import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { category, initials, officer, ward } from '../lib/catalog';
import { fmtDate, fmtLong, humanSpan } from '../lib/format';
import { photoSrc } from '../lib/photos';
import { escalationCount, urgency } from '../lib/sla';
import type { Complaint, DeptId, Status } from '../lib/types';
import { Icon } from './icons';

export function Logo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="var(--blue)" />
      <path d="M8 32c6.5-10 14.7-15 24-15s17.5 5 24 15c-6.5 10-14.7 15-24 15S14.5 42 8 32z" fill="var(--surface)" />
      <circle cx="32" cy="32" r="10" fill="var(--blue)" />
      <circle cx="35.5" cy="28.5" r="3" fill="var(--surface)" />
    </svg>
  );
}

export const DEPT_ICON: Record<DeptId, string> = {
  roads: 'roads',
  water: 'water',
  drainage: 'drainage',
  electrical: 'electrical',
  sanitation: 'sanitation',
};

export function Avatar({ name, lg }: { name: string; lg?: boolean }) {
  return (
    <span className={`avatar${lg ? ' lg' : ''}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

const STATUS_TEXT: Record<Status, string> = {
  assigned: 'With officer',
  in_progress: 'Work in progress',
  reopened: 'Reopened',
  resolved: 'Fixed, waiting for confirmation',
  closed: 'Closed',
};

export function StatusPill({ c, now }: { c: Complaint; now: number }) {
  const u = urgency(c, now);
  if (u === 'done')
    return c.status === 'resolved' ? (
      <span className="pill soon">
        <Icon name="check" /> {STATUS_TEXT.resolved}
      </span>
    ) : (
      <span className="pill done">
        <Icon name="check" /> Closed
      </span>
    );
  if (u === 'overdue')
    return (
      <span className="pill overdue">
        <Icon name="alert" /> Late
      </span>
    );
  const esc = escalationCount(c);
  if (esc > 0)
    return (
      <span className="pill esc">
        <Icon name="arrowUp" /> Moved to senior officer{esc > 1 ? ` (${esc}×)` : ''}
      </span>
    );
  if (u === 'soon')
    return (
      <span className="pill soon">
        <Icon name="clock" /> Due soon
      </span>
    );
  return (
    <span className="pill ok">
      <Icon name="clock" /> {STATUS_TEXT[c.status]}
    </span>
  );
}

/** The deadline, in plain words. No ticking seconds. */
export function SlaPlate({ c, now }: { c: Complaint; now: number }) {
  const u = urgency(c, now);
  if (u === 'done') {
    const took = (c.resolvedAt ?? now) - c.createdAt;
    const esc = escalationCount(c);
    return (
      <div className="sla done" role="status">
        <span className="sla-label">
          <Icon name="check" /> {c.status === 'closed' ? 'Fixed and closed' : 'Marked as fixed'}
        </span>
        <span className="sla-time">Fixed in {humanSpan(took)}</span>
        <span className="sla-sub">
          {esc === 0 ? 'Fixed before the deadline.' : `Fixed after ${esc} missed deadline${esc > 1 ? 's' : ''}.`}
          {c.status === 'resolved' && ' The citizen has been asked to confirm.'}
        </span>
      </div>
    );
  }
  const owner = officer(c.officerId);
  const senior = owner?.seniorId ? officer(owner.seniorId) : undefined;
  const left = c.deadline - now;
  return (
    <div className={`sla${u === 'overdue' ? ' overdue' : u === 'soon' ? ' soon' : ''}`} role="status">
      <span className="sla-label">
        <Icon name={u === 'overdue' ? 'alert' : 'calendar'} /> {u === 'overdue' ? 'Deadline passed' : 'Must be fixed by'}
      </span>
      <span className="sla-time">{fmtLong(c.deadline)}</span>
      <span className="sla-left">{u === 'overdue' ? `Late by ${humanSpan(-left)}` : `${humanSpan(left)} left`}</span>
      <span className="sla-sub">
        {senior
          ? `If it is not fixed by then, it goes to ${senior.name}, ${senior.designation}.`
          : u === 'overdue'
            ? 'It is already with the highest officer, and stays on their record until fixed.'
            : 'This is the highest officer. A missed deadline stays on their record.'}
      </span>
    </div>
  );
}

/** Where the complaint is, like a parcel tracker. */
export function Tracker({ c }: { c: Complaint }) {
  const at = (k: string) => c.events.find((e) => e.kind === k)?.at;
  const started = c.status === 'in_progress' || c.status === 'resolved' || c.status === 'closed' || !!at('started');
  const fixed = c.status === 'resolved' || c.status === 'closed';
  const steps: [string, boolean, number | undefined][] = [
    ['Filed', true, c.createdAt],
    ['Officer assigned', true, at('assigned')],
    ['Work started', started, at('started')],
    ['Fixed', fixed, fixed ? c.resolvedAt : undefined],
    ['Confirmed by citizen', c.status === 'closed', c.status === 'closed' ? at('confirmed') : undefined],
  ];
  const current = steps.findIndex(([, done]) => !done);
  return (
    <ol className="tracker" aria-label="Progress">
      {steps.map(([label, done, t], i) => (
        <li key={label} className={done ? 'done' : i === current ? 'current' : ''} aria-current={i === current ? 'step' : undefined}>
          <span className="dot" aria-hidden="true">
            {done ? <Icon name="check" size={20} /> : i + 1}
          </span>
          <span>
            {label}
            <small>{done && t ? fmtDate(t) : i === current ? 'Next step' : ' '}</small>
            <span className="sr-only">{done ? ' (done)' : i === current ? ' (next)' : ''}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function ComplaintCard({ c, now }: { c: Complaint; now: number }) {
  const cat = category(c.categoryId);
  const u = urgency(c, now);
  const owner = officer(c.officerId);
  return (
    <Link to={`/complaints/${c.id}`} className={`ccard ${u}`}>
      <img className="ccard-thumb" src={photoSrc(c.photo) ?? photoSrc(c.proof?.photo)} alt="" loading="lazy" />
      <div>
        <div className="ccard-top">
          <StatusPill c={c} now={now} />
          {c.supporters.length > 0 && (
            <span className="chip">
              <Icon name="users" size={16} /> {c.supporters.length + 1} people
            </span>
          )}
        </div>
        <div className="ccard-title">{cat?.name}</div>
        <div className="ccard-meta">
          <span className="mono">{c.id}</span>
          <span>
            <Icon name="pin" size={16} />
            {ward(c.wardId)?.name}
            {c.landmark ? `, ${c.landmark}` : ''}
          </span>
          <span>
            <Icon name="user" size={16} />
            {owner?.name}
          </span>
          {u !== 'done' && (
            <span className={`ccard-clock ${u}`}>
              <Icon name="clock" size={16} />
              {u === 'overdue' ? `Late by ${humanSpan(now - c.deadline)}` : `${humanSpan(c.deadline - now)} left`}
            </span>
          )}
        </div>
      </div>
      <Icon name="arrowRight" className="ccard-go" />
    </Link>
  );
}

export function Empty({ title, icon = 'info', children }: { title: string; icon?: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <Icon name={icon} size={36} />
      <b>{title}</b>
      {children}
    </div>
  );
}

export function Stars({ n }: { n: number }) {
  return (
    <span className="star-read" aria-label={`${n} out of 5 stars`}>
      {'★'.repeat(n)}
      <span style={{ opacity: 0.3 }}>{'★'.repeat(5 - n)}</span>
    </span>
  );
}
