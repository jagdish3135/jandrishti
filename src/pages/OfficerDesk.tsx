import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Avatar, ComplaintCard, Empty } from '../components/bits';
import ProofDialog from '../components/ProofDialog';
import { officer, OFFICERS, WARDS } from '../lib/catalog';
import { byPriority } from '../lib/duplicates';
import { officerStats } from '../lib/scoring';
import { isOpen, urgency } from '../lib/sla';
import { useNow, useStore } from '../lib/store';
import type { Complaint } from '../lib/types';

type Tab = 'queue' | 'escalated' | 'awaiting' | 'done' | 'team';

export default function OfficerDesk() {
  const { db, session, startWork } = useStore();
  const now = useNow(1000);
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
    // `now` changes every second; re-sorting each tick is cheap at this size.
  }, [db.complaints, me.id, now]);

  const dueSoon = groups.queue.filter((c) => urgency(c, now) === 'soon').length;
  const labels: Record<Tab, string> = {
    queue: 'My queue',
    escalated: 'Escalated to me',
    awaiting: 'Awaiting citizen',
    done: 'Closed',
    team: 'My team',
  };
  const tabs = (Object.keys(labels) as Tab[]).filter((t) => t !== 'team' || team.length > 0);
  const area = me.beat ? WARDS.filter((w) => w.beat === me.beat).map((w) => w.name).join(', ') : me.dept ? 'All wards' : 'Whole city, all departments';

  return (
    <div className="wrap">
      <div className="page-head">
        <span className="kicker">Officer desk</span>
        <div className="row" style={{ marginTop: 12, gap: 16 }}>
          <Avatar name={me.name} lg />
          <div>
            <h1 style={{ marginTop: 0 }}>{me.name}</h1>
            <p style={{ marginTop: 6 }}>
              {me.designation} · {area}
            </p>
          </div>
        </div>
      </div>

      <div className="kv" style={{ marginBottom: 24 }}>
        <div>
          <b>{groups.queue.length}</b>
          <span>Open with me</span>
        </div>
        <div>
          <b style={{ color: dueSoon ? 'var(--warn)' : undefined }}>{dueSoon}</b>
          <span>Due within a day</span>
        </div>
        <div>
          <b>{groups.escalated.length}</b>
          <span>Escalated to me</span>
        </div>
        <div>
          <b>{stats.score}</b>
          <span>My score · grade {stats.grade}</span>
        </div>
        <div>
          <b>
            {stats.onTime}/{stats.resolved}
          </b>
          <span>Fixed on time</span>
        </div>
        <div>
          <b style={{ color: stats.escalations ? 'var(--bad)' : undefined }}>{stats.escalations}</b>
          <span>Deadlines I missed</span>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)}>
            {labels[t]}
            {t !== 'team' && <span className="count">{groups[t].length}</span>}
          </button>
        ))}
      </div>

      {tab === 'team' ? (
        <div className="clist">
          {team.map((o) => {
            const s = officerStats(o.id, db.complaints);
            return (
              <Link key={o.id} to={`/officers/${o.id}`} className="ofc-row" style={{ gridTemplateColumns: '44px minmax(0,1fr) auto' }}>
                <Avatar name={o.name} />
                <span>
                  <span className="ofc-name">{o.name}</span>
                  <span className="ofc-sub" style={{ display: 'block' }}>
                    {o.designation} · {s.open} open · {s.escalations} missed deadlines
                  </span>
                </span>
                <span className="ofc-score">
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
            <div key={c.id} className="stack" style={{ gap: 6 }}>
              <ComplaintCard c={c} now={now} />
              {tab !== 'done' && tab !== 'awaiting' && (
                <div className="row" style={{ justifyContent: 'flex-end' }}>
                  {c.status !== 'in_progress' && (
                    <button className="btn btn-sm" type="button" onClick={() => startWork(c.id)}>
                      Start work
                    </button>
                  )}
                  <button className="btn btn-sm btn-primary" type="button" onClick={() => setProofFor(c)}>
                    Upload proof
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty title={tab === 'queue' ? 'Queue clear' : 'Nothing here'}>
          {tab === 'queue' && <span>No open complaints are assigned to you. New ones appear here with their deadline.</span>}
          {tab === 'escalated' && <span>Complaints your team missed come here. None right now.</span>}
        </Empty>
      )}

      {proofFor && <ProofDialog c={db.complaints.find((x) => x.id === proofFor.id) ?? proofFor} onClose={() => setProofFor(null)} />}
    </div>
  );
}
