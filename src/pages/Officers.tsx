import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Avatar } from '../components/bits';
import { DEPARTMENTS, OFFICERS } from '../lib/catalog';
import { officerStats } from '../lib/scoring';
import { useStore } from '../lib/store';
import type { DeptId } from '../lib/types';

export default function Officers() {
  const { db } = useStore();
  const [dept, setDept] = useState<DeptId | 'all'>('all');

  const ranked = useMemo(
    () =>
      OFFICERS.filter((o) => dept === 'all' || o.dept === dept)
        .map((o) => ({ o, s: officerStats(o.id, db.complaints) }))
        .sort((a, b) => b.s.score - a.s.score || b.s.resolved - a.s.resolved),
    [db.complaints, dept],
  );

  return (
    <div className="wrap">
      <div className="page-head">
        <span className="kicker">Public record</span>
        <h1>Officer scores</h1>
        <p>
          Scores come from the work itself: fixed before the deadline (40%), proof photos that passed (20%), citizen ratings of
          resolved cases (25%), and staying free of escalations and reopened cases (15%).
        </p>
      </div>

      <div className="filters" role="group" aria-label="Department" style={{ marginBottom: 18 }}>
        <button type="button" aria-pressed={dept === 'all'} onClick={() => setDept('all')}>
          All
        </button>
        {DEPARTMENTS.map((d) => (
          <button key={d.id} type="button" aria-pressed={dept === d.id} onClick={() => setDept(d.id)}>
            {d.short}
          </button>
        ))}
      </div>

      <div className="clist">
        {ranked.map(({ o, s }, i) => (
          <Link key={o.id} to={`/officers/${o.id}`} className={`ofc-row${i < 3 ? ' top' : ''}`}>
            <span className="ofc-rank">{i + 1}</span>
            <Avatar name={o.name} />
            <span style={{ minWidth: 0 }}>
              <span className="ofc-name">{o.name}</span>
              <span className="ofc-sub" style={{ display: 'block' }}>
                {o.designation}
              </span>
              <span className="ofc-sub" style={{ display: 'block' }}>
                {s.resolved} fixed · {s.onTime} on time · {s.escalations} escalations · {s.ratingAvg ? `★ ${s.ratingAvg.toFixed(1)}` : 'no ratings'}
              </span>
            </span>
            <span className="ofc-score">
              {s.score}
              <span className={`grade ${s.grade}`}>{s.grade}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
