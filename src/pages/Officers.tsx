import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Avatar } from '../components/bits';
import { DEPARTMENTS, OFFICERS } from '../lib/catalog';
import { useT } from '../lib/i18n';
import { officerStats } from '../lib/scoring';
import { useStore } from '../lib/store';
import type { DeptId } from '../lib/types';

export default function Officers() {
  const { db } = useStore();
  const { t, deptShort, designation } = useT();
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
        <span className="kicker">{t('of.kicker')}</span>
        <h1>{t('of.title')}</h1>
        <p>{t('of.help')}</p>
      </div>

      <div className="filters" role="group" aria-label={t('of.dept')} style={{ marginBottom: '1.1rem' }}>
        <button type="button" aria-pressed={dept === 'all'} onClick={() => setDept('all')}>
          {t('of.all')}
        </button>
        {DEPARTMENTS.map((d) => (
          <button key={d.id} type="button" aria-pressed={dept === d.id} onClick={() => setDept(d.id)}>
            {deptShort(d.id)}
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
                {designation(o)}
              </span>
              <span className="ofc-sub" style={{ display: 'block' }}>
                {t('of.row', { fixed: s.resolved, onTime: s.onTime, missed: s.escalations })} ·{' '}
                {s.ratingAvg ? t('of.rating', { r: s.ratingAvg.toFixed(1) }) : t('of.noRatings')}
              </span>
            </span>
            <span className="ofc-score" aria-label={t('of.scoreLabel', { s: s.score, g: s.grade })}>
              {s.score}
              <span className={`grade ${s.grade}`}>{s.grade}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
