import { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { Avatar, ComplaintCard, Empty, Stars } from '../components/bits';
import { category, department, officer, OFFICERS, WARDS } from '../lib/catalog';
import { fmtDate } from '../lib/format';
import { photoSrc } from '../lib/photos';
import { officerStats } from '../lib/scoring';
import { isOpen } from '../lib/sla';
import { useNow, useStore } from '../lib/store';
import NotFound from './NotFound';

function Dial({ score, grade }: { score: number; grade: string }) {
  const r = 70;
  const len = 2 * Math.PI * r;
  return (
    <div className="dial" role="img" aria-label={`Score ${score} out of 100, grade ${grade}`}>
      <svg viewBox="0 0 168 168">
        <circle cx="84" cy="84" r={r} fill="none" stroke="var(--tint)" strokeWidth="16" />
        <circle cx="84" cy="84" r={r} fill="none" stroke="var(--blue-2)" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${(score / 100) * len} ${len}`} />
      </svg>
      <div className="dial-num">
        <b>{score}</b>
        <span>out of 100 · grade {grade}</span>
      </div>
    </div>
  );
}

export default function OfficerProfile() {
  const { id } = useParams();
  const { db } = useStore();
  const now = useNow(5000);
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
  const area = o.beat ? WARDS.filter((w) => w.beat === o.beat).map((w) => w.name).join(', ') : o.dept ? 'All six wards' : 'Whole city';
  const ratings = work.filter((c) => c.rating);

  return (
    <div className="wrap">
      <div className="page-head">
        <Link to="/officers" className="kicker" style={{ textDecoration: 'none' }}>
          ← All officers
        </Link>
        <div className="row" style={{ gap: 28, marginTop: 18, alignItems: 'center' }}>
          <Avatar name={o.name} lg />
          <div style={{ flex: '1 1 260px' }}>
            <h1 style={{ marginTop: 0 }}>{o.name}</h1>
            <p style={{ marginTop: 8 }}>
              {o.designation} · {o.dept ? department(o.dept)?.name : 'All departments'} · {area} · in post since {o.since}
            </p>
          </div>
          <Dial score={s.score} grade={s.grade} />
        </div>
      </div>

      <div className="kv" style={{ marginBottom: 28 }}>
        <div>
          <b>{s.resolved}</b>
          <span>Complaints fixed</span>
        </div>
        <div>
          <b>{s.resolved ? Math.round((s.onTime / s.resolved) * 100) : 0}%</b>
          <span>Fixed before the deadline</span>
        </div>
        <div>
          <b>{s.avgDays ? s.avgDays.toFixed(1) : '—'}</b>
          <span>Average days to fix</span>
        </div>
        <div>
          <b style={{ color: s.escalations ? 'var(--bad)' : undefined }}>{s.escalations}</b>
          <span>Missed deadlines</span>
        </div>
        <div>
          <b style={{ color: s.proofFails ? 'var(--bad)' : undefined }}>{s.proofFails}</b>
          <span>Proof photos rejected</span>
        </div>
        <div>
          <b>{s.ratingAvg ? s.ratingAvg.toFixed(1) : '—'}</b>
          <span>Avg citizen rating ({s.ratings})</span>
        </div>
      </div>

      <div className="grid-2">
        <div className="stack">
          <section>
            <div className="panel-title">
              <h2>Recent work</h2>
              <span className="hint">Verified proof photos</span>
            </div>
            {work.length ? (
              <div className="photos" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                {work.slice(0, 9).map((c) => (
                  <Link key={c.id} to={`/complaints/${c.id}`} className="photo" style={{ textDecoration: 'none' }}>
                    <img src={photoSrc(c.proof!.photo)} alt={`Proof photo for ${c.id}`} loading="lazy" />
                    <figcaption>{category(c.categoryId)?.name}</figcaption>
                    <span className="hint mono" style={{ display: 'block', marginTop: 4 }}>
                      {c.id} · {fmtDate(c.resolvedAt!)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty title="No resolved cases yet" />
            )}
          </section>

          <section>
            <div className="panel-title">
              <h2>Open now</h2>
              <span className="hint">{open.length}</span>
            </div>
            {open.length ? (
              <div className="clist">
                {open.map((c) => (
                  <ComplaintCard key={c.id} c={c} now={now} />
                ))}
              </div>
            ) : (
              <Empty title="Nothing open" />
            )}
          </section>
        </div>

        <aside className="stack">
          <section className="panel">
            <div className="panel-title">
              <h3>Chain</h3>
            </div>
            {senior ? (
              <Link to={`/officers/${senior.id}`} className="row" style={{ textDecoration: 'none' }}>
                <span className="label">Reports to</span>
                <strong>{senior.name}</strong>
              </Link>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                Top of every escalation chain.
              </p>
            )}
            {team.length > 0 && (
              <div className="stack" style={{ gap: 6, marginTop: 14 }}>
                <span className="label">Team</span>
                {team.map((t) => (
                  <Link key={t.id} to={`/officers/${t.id}`}>
                    {t.name}
                    <span className="hint"> · {t.designation}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-title">
              <h3>Citizen ratings</h3>
            </div>
            {ratings.length ? (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
                {ratings.slice(0, 6).map((c) => (
                  <li key={c.id}>
                    <Stars n={c.rating!.stars} /> <Link to={`/complaints/${c.id}`} className="mono hint">{c.id}</Link>
                    {c.rating!.note && <div className="muted">“{c.rating!.note}”</div>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                No ratings yet. Only the citizen who filed a complaint can rate how it was resolved.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
