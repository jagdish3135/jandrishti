import { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { Avatar, ComplaintCard, Empty, Stars } from '../components/bits';
import { officer, OFFICERS, WARDS } from '../lib/catalog';
import { useT } from '../lib/i18n';
import { photoSrc } from '../lib/photos';
import { officerStats } from '../lib/scoring';
import { isOpen } from '../lib/sla';
import { useNow, useStore } from '../lib/store';
import NotFound from './NotFound';

function Dial({ score, grade }: { score: number; grade: string }) {
  const { t } = useT();
  const r = 70;
  const len = 2 * Math.PI * r;
  return (
    <div className="dial" role="img" aria-label={t('op.dialLabel', { s: score, g: grade })}>
      <svg viewBox="0 0 168 168">
        <circle cx="84" cy="84" r={r} fill="none" stroke="var(--tint)" strokeWidth="16" />
        <circle cx="84" cy="84" r={r} fill="none" stroke="var(--blue-2)" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${(score / 100) * len} ${len}`} />
      </svg>
      <div className="dial-num">
        <b>{score}</b>
        <span>{t('op.dial', { g: grade })}</span>
      </div>
    </div>
  );
}

export default function OfficerProfile() {
  const { id } = useParams();
  const { db } = useStore();
  const { t, dept, designation, wardName, complaintTitle, fmtDate } = useT();
  const now = useNow(30_000);
  const o = officer(id ?? '');
  const s = useMemo(() => (o ? officerStats(o.id, db.complaints) : null), [o, db.complaints]);
  const work = useMemo(
    () => (o ? db.complaints.filter((c) => c.resolvedBy === o.id && c.proof).sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0)) : []),
    [o, db.complaints],
  );
  const open = useMemo(() => (o ? db.complaints.filter((c) => c.officerId === o.id && isOpen(c)).sort((a, b) => a.deadline - b.deadline) : []), [o, db.complaints]);
  if (!o || !s) return <NotFound what="officer" />;

  const senior = o.seniorId ? officer(o.seniorId) : undefined;
  const team = OFFICERS.filter((x) => x.seniorId === o.id);
  const area = o.beat
    ? WARDS.filter((w) => w.beat === o.beat)
        .map((w) => wardName(w.id))
        .join(', ')
    : o.dept
      ? t('op.allWards')
      : t('op.city');
  const ratings = work.filter((c) => c.rating);

  return (
    <div className="wrap">
      <div className="page-head">
        <Link to="/officers" className="kicker" style={{ textDecoration: 'none' }}>
          {t('op.back')}
        </Link>
        <div className="row" style={{ gap: '1.5rem', marginTop: '1rem', alignItems: 'center' }}>
          <Avatar name={o.name} lg />
          <div style={{ flex: '1 1 16rem' }}>
            <h1 style={{ marginTop: 0 }}>{o.name}</h1>
            <p style={{ marginTop: '0.4rem' }}>
              {designation(o)} · {o.dept ? dept(o.dept) : t('op.allDepts')} · {area} · {t('op.inPost', { y: o.since })}
            </p>
          </div>
          <Dial score={s.score} grade={s.grade} />
        </div>
      </div>

      <div className="kv" style={{ marginBottom: '1.6rem' }}>
        <div>
          <b>{s.resolved}</b>
          <span>{t('op.fixed')}</span>
        </div>
        <div>
          <b>{s.resolved ? Math.round((s.onTime / s.resolved) * 100) : 0}%</b>
          <span>{t('op.onTimePct')}</span>
        </div>
        <div>
          <b>{s.avgDays ? s.avgDays.toFixed(1) : '—'}</b>
          <span>{t('op.avgDays')}</span>
        </div>
        <div>
          <b style={{ color: s.escalations ? 'var(--bad)' : undefined }}>{s.escalations}</b>
          <span>{t('op.missed')}</span>
        </div>
        <div>
          <b style={{ color: s.proofFails ? 'var(--bad)' : undefined }}>{s.proofFails}</b>
          <span>{t('op.rejected')}</span>
        </div>
        <div>
          <b>{s.ratingAvg ? s.ratingAvg.toFixed(1) : '—'}</b>
          <span>{t('op.rating', { n: s.ratings })}</span>
        </div>
      </div>

      <div className="grid-2">
        <div className="stack">
          <section>
            <div className="panel-title">
              <h2>{t('op.recent')}</h2>
              <span className="hint">{t('op.verified')}</span>
            </div>
            {work.length ? (
              <div className="photos" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(10rem, 1fr))' }}>
                {work.slice(0, 9).map((c) => (
                  <Link key={c.id} to={`/complaints/${c.id}`} className="photo" style={{ textDecoration: 'none' }}>
                    <img src={photoSrc(c.proof!.photo)} alt={t('op.proofOf', { id: c.id })} loading="lazy" />
                    <figcaption>{complaintTitle(c)}</figcaption>
                    <span className="hint mono" style={{ display: 'block', marginTop: '0.2rem' }}>
                      {c.id} · {fmtDate(c.resolvedAt!)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty title={t('op.noneResolved')} />
            )}
          </section>

          <section>
            <div className="panel-title">
              <h2>{t('op.openNow')}</h2>
              <span className="hint">{open.length}</span>
            </div>
            {open.length ? (
              <div className="clist">
                {open.map((c) => (
                  <ComplaintCard key={c.id} c={c} now={now} />
                ))}
              </div>
            ) : (
              <Empty title={t('op.nothingOpen')} />
            )}
          </section>
        </div>

        <aside className="stack">
          <section className="panel">
            <div className="panel-title">
              <h3>{t('op.chain')}</h3>
            </div>
            {senior ? (
              <Link to={`/officers/${senior.id}`} className="row" style={{ textDecoration: 'none' }}>
                <span className="label">{t('op.reportsTo')}</span>
                <strong>{senior.name}</strong>
              </Link>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                {t('op.top')}
              </p>
            )}
            {team.length > 0 && (
              <div className="stack" style={{ gap: '0.4rem', marginTop: '0.9rem' }}>
                <span className="label">{t('op.team')}</span>
                {team.map((m) => (
                  <Link key={m.id} to={`/officers/${m.id}`}>
                    {m.name}
                    <span className="hint"> · {designation(m)}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-title">
              <h3>{t('op.ratings')}</h3>
            </div>
            {ratings.length ? (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.75rem' }}>
                {ratings.slice(0, 6).map((c) => (
                  <li key={c.id}>
                    <Stars n={c.rating!.stars} />{' '}
                    <Link to={`/complaints/${c.id}`} className="mono hint">
                      {c.id}
                    </Link>
                    {c.rating!.note && <div className="muted">“{c.rating!.note}”</div>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                {t('op.noRatings')}
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
