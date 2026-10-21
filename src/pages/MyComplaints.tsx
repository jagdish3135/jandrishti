import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ComplaintCard, Empty } from '../components/bits';
import { isOpen } from '../lib/sla';
import { useNow, useStore } from '../lib/store';

type Tab = 'open' | 'confirm' | 'closed' | 'supporting';

export default function MyComplaints() {
  const { db, me } = useStore();
  const now = useNow(1000);
  const [tab, setTab] = useState<Tab>('open');

  const groups = useMemo(() => {
    const mine = db.complaints.filter((c) => c.citizenId === me?.id);
    return {
      open: mine.filter(isOpen).sort((a, b) => a.deadline - b.deadline),
      confirm: mine.filter((c) => c.status === 'resolved'),
      closed: mine.filter((c) => c.status === 'closed').sort((a, b) => b.createdAt - a.createdAt),
      supporting: db.complaints.filter((c) => me && c.supporters.includes(me.id)).sort((a, b) => a.deadline - b.deadline),
    };
  }, [db.complaints, me]);

  const labels: Record<Tab, string> = { open: 'Open', confirm: 'Needs your OK', closed: 'Closed', supporting: 'Supporting' };
  const list = groups[tab];

  return (
    <div className="wrap">
      <div className="page-head row" style={{ justifyContent: 'space-between', alignItems: 'end' }}>
        <div>
          <span className="kicker">Namaste, {me?.name.split(' ')[0]}</span>
          <h1>My complaints</h1>
        </div>
        <Link className="btn btn-primary" to="/file">
          + File a complaint
        </Link>
      </div>

      {groups.confirm.length > 0 && tab !== 'confirm' && (
        <div className="callout" style={{ marginBottom: 20 }}>
          <span className="step-num" aria-hidden="true">
            ✓
          </span>
          <div className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
            <span>
              {groups.confirm.length === 1 ? 'One complaint was' : `${groups.confirm.length} complaints were`} marked fixed. Check the proof photo and confirm.
            </span>
            <button className="btn btn-sm" type="button" onClick={() => setTab('confirm')}>
              Review
            </button>
          </div>
        </div>
      )}

      <div className="tabs" role="tablist">
        {(Object.keys(labels) as Tab[]).map((t) => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)}>
            {labels[t]}
            <span className="count">{groups[t].length}</span>
          </button>
        ))}
      </div>

      {list.length ? (
        <div className="clist" role="tabpanel">
          {list.map((c) => (
            <ComplaintCard key={c.id} c={c} now={now} />
          ))}
        </div>
      ) : (
        <Empty title={tab === 'open' ? 'Nothing open' : tab === 'confirm' ? 'All caught up' : tab === 'closed' ? 'No closed complaints yet' : 'Not supporting any'}>
          {tab === 'open' && (
            <Link className="btn btn-primary" to="/file">
              File a complaint
            </Link>
          )}
          {tab === 'supporting' && <span>When you back a neighbour's complaint instead of filing a duplicate, it shows here.</span>}
        </Empty>
      )}
    </div>
  );
}
