import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { category, initials, officer } from '../lib/catalog';
import { useT } from '../lib/i18n';
import { photoSrc } from '../lib/photos';
import { escalationCount, urgency } from '../lib/sla';
import type { Complaint, DeptId } from '../lib/types';
import { Icon } from './icons';

export function Logo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="var(--blue-2)" />
      <path d="M8 32c6.5-10 14.7-15 24-15s17.5 5 24 15c-6.5 10-14.7 15-24 15S14.5 42 8 32z" fill="var(--surface)" />
      <circle cx="32" cy="32" r="10" fill="var(--blue-2)" />
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
  parks: 'parks',
  health: 'health',
  encroachment: 'encroachment',
};

export function Avatar({ name, lg }: { name: string; lg?: boolean }) {
  return (
    <span className={`avatar${lg ? ' lg' : ''}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function StatusPill({ c, now }: { c: Complaint; now: number }) {
  const { t } = useT();
  const u = urgency(c, now);
  if (u === 'done')
    return c.status === 'resolved' ? (
      <span className="pill soon">
        <Icon name="check" /> {t('st.waiting')}
      </span>
    ) : (
      <span className="pill done">
        <Icon name="check" /> {t('st.closed')}
      </span>
    );
  if (u === 'overdue')
    return (
      <span className="pill overdue">
        <Icon name="alert" /> {t('st.late')}
      </span>
    );
  const esc = escalationCount(c);
  if (esc > 0)
    return (
      <span className="pill esc">
        <Icon name="arrowUp" /> {esc > 1 ? t('st.movedN', { n: esc }) : t('st.moved')}
      </span>
    );
  if (u === 'soon')
    return (
      <span className="pill soon">
        <Icon name="clock" /> {t('st.dueSoon')}
      </span>
    );
  return (
    <span className="pill ok">
      <Icon name="clock" /> {t(c.status === 'in_progress' ? 'st.inProgress' : c.status === 'reopened' ? 'st.reopened' : 'st.withOfficer')}
    </span>
  );
}

/** The deadline, in plain words. No ticking seconds. */
export function SlaPlate({ c, now }: { c: Complaint; now: number }) {
  const { t, span, fmtLong, designation } = useT();
  const u = urgency(c, now);
  if (u === 'done') {
    const took = (c.resolvedAt ?? now) - c.createdAt;
    const esc = escalationCount(c);
    return (
      <div className="sla done" role="status">
        <span className="sla-label">
          <Icon name="check" /> {t(c.status === 'closed' ? 'sla.fixedClosed' : 'sla.marked')}
        </span>
        <span className="sla-time">{t('sla.fixedIn', { span: span(took) })}</span>
        <span className="sla-sub">
          {esc === 0 ? t('sla.beforeDeadline') : t('sla.afterMissed', { n: esc })} {c.status === 'resolved' && t('sla.askConfirm')}
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
        <Icon name={u === 'overdue' ? 'alert' : 'calendar'} /> {t(u === 'overdue' ? 'sla.passed' : 'sla.mustBy')}
      </span>
      <span className="sla-time">{fmtLong(c.deadline)}</span>
      <span className="sla-left">{u === 'overdue' ? t('sla.lateBy', { span: span(-left) }) : t('sla.left', { span: span(left) })}</span>
      <span className="sla-sub">
        {senior ? t('sla.nextSenior', { name: senior.name, designation: designation(senior) }) : t(u === 'overdue' ? 'sla.topOverdue' : 'sla.top')}
      </span>
    </div>
  );
}

/** Where the complaint is, like a parcel tracker. */
export function Tracker({ c }: { c: Complaint }) {
  const { t, fmtDate } = useT();
  const at = (k: string) => c.events.find((e) => e.kind === k)?.at;
  const started = c.status === 'in_progress' || c.status === 'resolved' || c.status === 'closed' || !!at('started');
  const fixed = c.status === 'resolved' || c.status === 'closed';
  const steps: [string, boolean, number | undefined][] = [
    [t('tr.filed'), true, c.createdAt],
    [t('tr.assigned'), true, at('assigned')],
    [t('tr.started'), started, at('started')],
    [t('tr.fixed'), fixed, fixed ? c.resolvedAt : undefined],
    [t('tr.confirmed'), c.status === 'closed', c.status === 'closed' ? at('confirmed') : undefined],
  ];
  const current = steps.findIndex(([, done]) => !done);
  return (
    <ol className="tracker" aria-label={t('tr.label')}>
      {steps.map(([label, done, when], i) => (
        <li key={i} className={done ? 'done' : i === current ? 'current' : ''} aria-current={i === current ? 'step' : undefined}>
          <span className="dot" aria-hidden="true">
            {done ? <Icon name="check" size={20} /> : i + 1}
          </span>
          <span>
            {label}
            <small>{done && when ? fmtDate(when) : i === current ? t('tr.next') : ' '}</small>
            <span className="sr-only">{done ? ` ${t('tr.doneSr')}` : i === current ? ` ${t('tr.nextSr')}` : ''}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function ComplaintCard({ c, now }: { c: Complaint; now: number }) {
  const { t, span, complaintTitle, wardName } = useT();
  const u = urgency(c, now);
  const owner = officer(c.officerId);
  const cat = category(c.categoryId);
  return (
    <Link to={`/complaints/${c.id}`} className={`ccard ${u}`}>
      {c.photo || c.proof ? (
        <img className="ccard-thumb" src={photoSrc(c.photo) ?? photoSrc(c.proof?.photo)} alt="" loading="lazy" />
      ) : (
        <span className="ccard-thumb ccard-ico" aria-hidden="true">
          <Icon name={cat ? DEPT_ICON[cat.dept] : 'file'} size={30} />
        </span>
      )}
      <div>
        <div className="ccard-top">
          <StatusPill c={c} now={now} />
          {c.supporters.length > 0 && (
            <span className="chip">
              <Icon name="users" size={16} /> {t('card.people', { n: c.supporters.length + 1 })}
            </span>
          )}
        </div>
        <div className="ccard-title">{complaintTitle(c)}</div>
        <div className="ccard-meta">
          <span className="mono">{c.id}</span>
          <span>
            <Icon name="pin" size={16} />
            {wardName(c.wardId)}
            {c.landmark ? `, ${c.landmark}` : ''}
          </span>
          <span>
            <Icon name="user" size={16} />
            {owner?.name}
          </span>
          {u !== 'done' && (
            <span className={`ccard-clock ${u}`}>
              <Icon name="clock" size={16} />
              {u === 'overdue' ? t('sla.lateBy', { span: span(now - c.deadline) }) : t('sla.left', { span: span(c.deadline - now) })}
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
  const { t } = useT();
  return (
    <span className="star-read" aria-label={t('stars.label', { n })}>
      {'★'.repeat(n)}
      <span style={{ opacity: 0.3 }}>{'★'.repeat(5 - n)}</span>
    </span>
  );
}
