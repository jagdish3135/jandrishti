import { useMemo, useState } from 'react';
import { ComplaintsMap, PIN_COLORS, pinKind, type PinKind } from '../components/Maps';
import { category, DEPARTMENTS, WARDS } from '../lib/catalog';
import { DAY, isOpen, urgency } from '../lib/sla';
import { useNow, useStore } from '../lib/store';
import type { DeptId } from '../lib/types';

const KIND_LABEL: Record<PinKind, string> = {
  ok: 'On track',
  soon: 'Due soon',
  escalated: 'Escalated',
  overdue: 'Overdue at top',
  resolved: 'Awaiting citizen',
  closed: 'Closed',
};

export default function PublicMap() {
  const { db } = useStore();
  const now = useNow(10_000);
  const [dept, setDept] = useState<DeptId | 'all'>('all');
  const [show, setShow] = useState<'open' | 'all'>('open');

  const visible = useMemo(
    () =>
      db.complaints.filter(
        (c) => (dept === 'all' || category(c.categoryId)?.dept === dept) && (show === 'all' || isOpen(c) || c.status === 'resolved'),
      ),
    [db.complaints, dept, show],
  );

  const wardRows = useMemo(
    () =>
      WARDS.map((w) => {
        const list = db.complaints.filter((c) => c.wardId === w.id && (dept === 'all' || category(c.categoryId)?.dept === dept));
        const fixed = list.filter((c) => c.resolvedAt);
        return {
          w,
          open: list.filter(isOpen).length,
          late: list.filter((c) => isOpen(c) && (urgency(c, now) === 'overdue' || c.events.some((e) => e.kind === 'escalated'))).length,
          fixed: fixed.length,
          days: fixed.length ? fixed.reduce((s, c) => s + (c.resolvedAt! - c.createdAt) / DAY, 0) / fixed.length : null,
        };
      }).sort((a, b) => b.late - a.late || b.open - a.open),
    [db.complaints, dept, now],
  );

  const counts = useMemo(() => {
    const m: Partial<Record<PinKind, number>> = {};
    for (const c of visible) m[pinKind(c, now)] = (m[pinKind(c, now)] ?? 0) + 1;
    return m;
  }, [visible, now]);

  return (
    <div className="wrap">
      <div className="page-head">
        <span className="kicker">Open data</span>
        <h1>Public map</h1>
        <p>Every complaint in the city, coloured by where it stands. Personal details are never shown.</p>
      </div>

      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="filters" role="group" aria-label="Department">
          <button type="button" aria-pressed={dept === 'all'} onClick={() => setDept('all')}>
            All departments
          </button>
          {DEPARTMENTS.map((d) => (
            <button key={d.id} type="button" aria-pressed={dept === d.id} onClick={() => setDept(d.id)}>
              {d.short}
            </button>
          ))}
        </div>
        <div className="filters" role="group" aria-label="Which complaints">
          <button type="button" aria-pressed={show === 'open'} onClick={() => setShow('open')}>
            Active
          </button>
          <button type="button" aria-pressed={show === 'all'} onClick={() => setShow('all')}>
            Include closed
          </button>
        </div>
      </div>

      <div className="map-page">
        <div className="stack" style={{ gap: 10 }}>
          <ComplaintsMap complaints={visible} now={now} />
          <div className="legend" aria-label="Legend">
            {(Object.keys(PIN_COLORS) as PinKind[])
              .filter((k) => show === 'all' || k !== 'closed')
              .map((k) => (
                <span key={k}>
                  <i style={{ background: PIN_COLORS[k] }} />
                  {KIND_LABEL[k]} ({counts[k] ?? 0})
                </span>
              ))}
          </div>
        </div>
        <aside className="panel">
          <div className="panel-title">
            <h2>By ward</h2>
          </div>
          <table className="data">
            <thead>
              <tr>
                <th>Ward</th>
                <th className="num">Open</th>
                <th className="num">Late</th>
                <th className="num">Fixed</th>
                <th className="num">Avg days</th>
              </tr>
            </thead>
            <tbody>
              {wardRows.map((r) => (
                <tr key={r.w.id}>
                  <td>{r.w.name}</td>
                  <td className="num">{r.open}</td>
                  <td className="num" style={{ color: r.late ? 'var(--bad)' : undefined, fontWeight: r.late ? 700 : 400 }}>
                    {r.late}
                  </td>
                  <td className="num">{r.fixed}</td>
                  <td className="num">{r.days ? r.days.toFixed(1) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hint" style={{ marginBottom: 0 }}>
            Late = open and past at least one deadline.
          </p>
        </aside>
      </div>
    </div>
  );
}
