import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Avatar, ComplaintCard, Empty } from '../components/bits';
import { Icon } from '../components/icons';
import ProofDialog from '../components/ProofDialog';
import { officer, OFFICERS, WARDS } from '../lib/catalog';
import { byPriority } from '../lib/duplicates';
import { useT, type Key } from '../lib/i18n';
import { officerStats } from '../lib/scoring';
import { isOpen, urgency } from '../lib/sla';
import { useNow, useStore } from '../lib/store';
import type { Complaint } from '../lib/types';

type Tab = 'queue' | 'escalated' | 'awaiting' | 'done' | 'team';
const LABELS: Record<Tab, Key> = { queue: 'desk.tabQueue', escalated: 'desk.tabEsc', awaiting: 'desk.tabAwait', done: 'desk.tabDone', team: 'desk.tabTeam' };

export default function OfficerDesk() {
  const { db, session, startWork } = useStore();
  const { t, designation, wardName } = useT();
  const now = useNow(30_000);
  const [tab, setTab] = useState<Tab>('queue');
  const [proofFor, setProofFor] = useState<Complaint | null>(null);
  const me = officer(session?.role === 'officer' ? session.officerId : '')!;
  const stats = officerStats(me.id, db.complaints);
  const team = OFFICERS.filter((o) => o.seniorId === me.id);

  const groups = useMemo(() => {
    const mine = db.complaints.filter((c) => c.officerId === me.id && isOpen(c));
    const order = (a: Complaint, b: Complaint) => {
      const ua = urgency(a, now) === 'overdue' ? 0 : 1;
      const ub = urgency(b, now) === 'overdue' ? 0 : 1;
      return ua - ub || a.deadline - b.deadline || byPriority(a, b);
    };
    return {
      queue: [...mine].sort(order),
      escalated: mine.filter((c) => c.events.some((e) => e.kind === 'escalated' && e.officerId === me.id)).sort(order),
      awaiting: db.complaints.filter((c) => c.status === 'resolved' && c.resolvedBy === me.id),
      done: db.complaints.filter((c) => c.status === 'closed' && c.resolvedBy === me.id).sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0)),
    };
  }, [db.complaints, me.id, now]);

  const dueSoon = groups.queue.filter((c) => urgency(c, now) === 'soon').length;
  const tabs = (Object.keys(LABELS) as Tab[]).filter((k) => k !== 'team' || team.length > 0);
  const area = me.beat
    ? WARDS.filter((w) => w.beat === me.beat)
        .map((w) => wardName(w.id))
        .join(', ')
    : me.dept
      ? t('desk.allWards')
      : t('desk.city');

  return (
    <div className="wrap">
      <div className="page-head">
        <span className="kicker">{t('desk.kicker')}</span>
        <div className="row" style={{ marginTop: '0.75rem', gap: '1rem' }}>
          <Avatar name={me.name} lg />
          <div>
            <h1 style={{ marginTop: 0 }}>{me.name}</h1>
            <p style={{ marginTop: '0.35rem' }}>
              {designation(me)} · {area}
            </p>
          </div>
        </div>
      </div>

      <div className="kv" style={{ marginBottom: '1.4rem' }}>
        <div>
          <b>{groups.queue.length}</b>
          <span>{t('desk.open')}</span>
        </div>
        <div>
          <b style={{ color: dueSoon ? 'var(--warn)' : undefined }}>{dueSoon}</b>
          <span>{t('desk.soon')}</span>
        </div>
        <div>
          <b>{groups.escalated.length}</b>
          <span>{t('desk.escalated')}</span>
        </div>
        <div>
          <b>{stats.score}</b>
          <span>{t('desk.score', { g: stats.grade })}</span>
        </div>
        <div>
          <b>
            {stats.onTime}/{stats.resolved}
          </b>
          <span>{t('desk.onTime')}</span>
        </div>
        <div>
          <b style={{ color: stats.escalations ? 'var(--bad)' : undefined }}>{stats.escalations}</b>
          <span>{t('desk.missed')}</span>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {tabs.map((k) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)}>
            {t(LABELS[k])}
            {k !== 'team' && <span className="count">{groups[k].length}</span>}
          </button>
        ))}
      </div>

      {tab === 'team' ? (
        <div className="clist">
          {team.map((o) => {
            const s = officerStats(o.id, db.complaints);
            return (
              <Link key={o.id} to={`/officers/${o.id}`} className="ofc-row" style={{ gridTemplateColumns: '3rem minmax(0,1fr) auto' }}>
                <Avatar name={o.name} />
                <span style={{ minWidth: 0 }}>
                  <span className="ofc-name">{o.name}</span>
                  <span className="ofc-sub" style={{ display: 'block' }}>
                    {t('desk.teamRow', { designation: designation(o), open: s.open, esc: s.escalations })}
                  </span>
                </span>
                <span className="ofc-score" aria-label={t('of.scoreLabel', { s: s.score, g: s.grade })}>
                  {s.score}
                  <span className={`grade ${s.grade}`}>{s.grade}</span>
                </span>
              </Link>
            );
          })}
        </div>
      ) : groups[tab].length ? (
        <div className="clist" role="tabpanel">
          {groups[tab].map((c) => (
            <div key={c.id} className="stack" style={{ gap: '0.4rem' }}>
              <ComplaintCard c={c} now={now} />
              {tab !== 'done' && tab !== 'awaiting' && (
                <div className="row" style={{ justifyContent: 'flex-end' }}>
                  {c.status !== 'in_progress' && (
                    <button className="btn btn-sm" type="button" onClick={() => startWork(c.id)}>
                      <Icon name="tools" size={20} /> {t('cd.start')}
                    </button>
                  )}
                  <button className="btn btn-sm btn-primary" type="button" onClick={() => setProofFor(c)}>
                    <Icon name="camera" size={20} /> {t('desk.upload')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty title={tab === 'queue' ? t('desk.emptyQueue') : t('desk.empty')}>
          {tab === 'queue' && <span>{t('desk.emptyQueueBody')}</span>}
          {tab === 'escalated' && <span>{t('desk.emptyEscBody')}</span>}
        </Empty>
      )}

      {proofFor && <ProofDialog c={db.complaints.find((x) => x.id === proofFor.id) ?? proofFor} onClose={() => setProofFor(null)} />}
    </div>
  );
}
