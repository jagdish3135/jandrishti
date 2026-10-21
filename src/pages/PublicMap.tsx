import { useMemo, useState } from 'react';
import { ComplaintsMap, PIN_COLORS, pinKind, type PinKind } from '../components/Maps';
import { category, DEPARTMENTS, WARDS } from '../lib/catalog';
import { useT, type Key } from '../lib/i18n';
import { DAY, isOpen, urgency } from '../lib/sla';
import { useNow, useStore } from '../lib/store';
import type { DeptId } from '../lib/types';

const KIND_LABEL: Record<PinKind, Key> = {
  ok: 'map.ok',
  soon: 'map.soon',
  escalated: 'map.escalated',
  overdue: 'map.overdue',
  resolved: 'map.resolved',
  closed: 'map.closed',
};

export default function PublicMap() {
  const { db } = useStore();
  const { t, deptShort, wardName } = useT();
  const now = useNow(30_000);
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
        <span className="kicker">{t('map.kicker')}</span>
        <h1>{t('map.title')}</h1>
        <p>{t('map.help')}</p>
      </div>

      <div className="row" style={{ justifyContent: 'space-between', marginBottom: '0.9rem' }}>
        <div className="filters" role="group" aria-label={t('of.dept')}>
          <button type="button" aria-pressed={dept === 'all'} onClick={() => setDept('all')}>
            {t('map.allDepts')}
          </button>
          {DEPARTMENTS.map((d) => (
            <button key={d.id} type="button" aria-pressed={dept === d.id} onClick={() => setDept(d.id)}>
              {deptShort(d.id)}
            </button>
          ))}
        </div>
        <div className="filters" role="group" aria-label={t('map.which')}>
          <button type="button" aria-pressed={show === 'open'} onClick={() => setShow('open')}>
            {t('map.active')}
          </button>
          <button type="button" aria-pressed={show === 'all'} onClick={() => setShow('all')}>
            {t('map.all')}
          </button>
        </div>
      </div>

      <div className="map-page">
        <div className="stack" style={{ gap: '0.6rem' }}>
          <ComplaintsMap complaints={visible} now={now} />
          <div className="legend" aria-label={t('map.legend')}>
            {(Object.keys(PIN_COLORS) as PinKind[])
              .filter((k) => show === 'all' || k !== 'closed')
              .map((k) => (
                <span key={k}>
                  <i style={{ background: PIN_COLORS[k] }} />
                  {t(KIND_LABEL[k])} ({counts[k] ?? 0})
                </span>
              ))}
          </div>
        </div>
        <aside className="panel">
          <div className="panel-title">
            <h2>{t('map.byWard')}</h2>
          </div>
          <table className="data">
            <thead>
              <tr>
                <th>{t('map.ward')}</th>
                <th className="num">{t('map.open')}</th>
                <th className="num">{t('map.late')}</th>
                <th className="num">{t('map.fixed')}</th>
                <th className="num">{t('map.days')}</th>
              </tr>
            </thead>
            <tbody>
              {wardRows.map((r) => (
                <tr key={r.w.id}>
                  <td>{wardName(r.w.id)}</td>
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
            {t('map.lateHelp')}
          </p>
        </aside>
      </div>
    </div>
  );
}
