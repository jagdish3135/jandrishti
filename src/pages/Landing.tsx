import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Avatar, StatusPill } from '../components/bits';
import { assignee, category, chainFrom, OFFICERS } from '../lib/catalog';
import { photoSrc } from '../lib/photos';
import { officerStats } from '../lib/scoring';
import { DAY, escalationCount, isOpen } from '../lib/sla';
import { useNow, useStore } from '../lib/store';

/** Hero board: a looping, scripted story of one complaint climbing the chain. */
function EscalationBoard() {
  const chain = useMemo(() => chainFrom(assignee('pothole', 'kothrud').id), []);
  const [tick, setTick] = useState(10);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setInterval(() => setTick((x) => (x + 1) % 40), 420);
    return () => window.clearInterval(t);
  }, []);
  const step = Math.floor(tick / 10); // 0..2: who owns it, 3: fixed
  const secs = 9 - (tick % 10);
  const owner = Math.min(step, 2);
  const fixed = step === 3;
  const late = !fixed && secs <= 2;
  return (
    <div className="board reveal d3" aria-label="Example: a pothole complaint moving up the officer chain as deadlines are missed">
      <div className="board-head">
        <span>ESCALATION BOARD · SAMPLE</span>
        <span className="live-dot">LIVE</span>
      </div>
      <div className="board-ticket">
        <img src={photoSrc('seed:pothole:hero:0')} alt="" />
        <div>
          <span>JD-26-00001 · KOTHRUD</span>
          <b>Pothole, Karve Road</b>
          <span>+6 neighbours support this</span>
        </div>
      </div>
      <div className={`board-clock${late ? ' late' : ''}`} aria-hidden="true">
        {fixed ? 'FIXED ✓' : `0${secs}d 0${(secs * 7) % 10}h ${String((secs * 13) % 60).padStart(2, '0')}m`}
      </div>
      <ol className="ladder">
        {chain.map((o, i) => (
          <li key={o.id} className={i < owner ? 'missed' : i === owner ? 'now' : ''}>
            <span className="lvl">L{o.level}</span>
            <span>
              {o.name}
              <br />
              <small>{o.designation}</small>
            </span>
            <small>{i < owner ? 'missed' : i === owner ? (fixed ? 'fixed it' : 'owns it') : ''}</small>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Landing() {
  const { db, session } = useStore();
  const now = useNow(5000);
  const list = db.complaints;

  const stats = useMemo(() => {
    const open = list.filter(isOpen);
    const resolvedEvents = list.flatMap((c) => c.events.filter((e) => e.kind === 'resolved').map((e) => ({ e, c })));
    const onTime = resolvedEvents.filter((x) => x.e.onTime).length;
    const days = resolvedEvents.reduce((s, x) => s + (x.e.at - x.c.createdAt) / DAY, 0);
    return {
      open: open.length,
      escalated: open.filter((c) => escalationCount(c) > 0).length,
      onTimePct: resolvedEvents.length ? Math.round((onTime / resolvedEvents.length) * 100) : 0,
      avgDays: resolvedEvents.length ? days / resolvedEvents.length : 0,
      rejected: list.reduce((s, c) => s + c.events.filter((e) => e.kind === 'proof_rejected').length, 0),
    };
  }, [list]);

  const ranked = useMemo(
    () =>
      OFFICERS.filter((o) => o.level < 4)
        .map((o) => ({ o, s: officerStats(o.id, list) }))
        .filter((x) => x.s.resolved + x.s.escalations > 0)
        .sort((a, b) => b.s.score - a.s.score),
    [list],
  );

  const sample = useMemo(() => list.find((c) => c.status === 'closed' && c.proof && c.rating && c.rating.stars >= 4), [list]);
  const recent = useMemo(() => [...list].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4), [list]);

  return (
    <>
      <section className="hero">
        <div className="hero-bg-word" aria-hidden="true" lang="hi">
          जनदृष्टि
        </div>
        <div className="wrap hero-grid">
          <div>
            <span className="kicker reveal">Central complaint desk · Roads · Water · Drainage · Lighting · Waste</span>
            <h1 className="reveal d1">
              Every complaint gets a <mark>name</mark>, a <mark>deadline</mark> and a boss.
            </h1>
            <p className="hero-lede reveal d2">
              File any civic problem in one place. You see which officer owns it and the date it must be fixed by. Miss
              that date and it moves up to their senior automatically. It only closes with a live, on-site photo that
              hasn't been used before.
            </p>
            <div className="hero-ctas reveal d3">
              {session?.role === 'officer' ? (
                <Link className="btn btn-primary" to="/desk">
                  Open my desk →
                </Link>
              ) : (
                <Link className="btn btn-primary" to="/file">
                  File a complaint →
                </Link>
              )}
              <Link className="btn" to="/map">
                See the public map
              </Link>
              <Link className="btn btn-ghost" to="/officers">
                Officer scores
              </Link>
            </div>
          </div>
          <EscalationBoard />
        </div>
      </section>

      <section className="wrap" aria-label="City numbers">
        <div className="stats">
          <div className="stat">
            <b>{stats.open}</b>
            <span>Open complaints</span>
          </div>
          <div className={`stat${stats.escalated ? ' alert' : ''}`}>
            <b>{stats.escalated}</b>
            <span>Escalated after a missed deadline</span>
          </div>
          <div className="stat">
            <b>{stats.onTimePct}%</b>
            <span>Fixed before the deadline</span>
          </div>
          <div className="stat">
            <b>{stats.avgDays.toFixed(1)}</b>
            <span>Average days to fix</span>
          </div>
          <div className="stat">
            <b>{stats.rejected}</b>
            <span>Proof photos rejected</span>
          </div>
        </div>
      </section>

      <section className="section wrap">
        <div className="section-head">
          <div>
            <span className="kicker">How it works</span>
            <h2>Four rules. No exceptions.</h2>
          </div>
          <p>The same rules apply to every department, so citizens always know what happens next.</p>
        </div>
        <div className="signs">
          <div className="sign">
            <div className="sign-num">01</div>
            <h3>File once</h3>
            <p>Pick the problem, drop a pin, add a photo. If a neighbour already reported it, you add your support instead.</p>
          </div>
          <div className="sign">
            <div className="sign-num">02</div>
            <h3>Named owner</h3>
            <p>It goes straight to the ward's officer for that department, with a fixed deadline for that type of problem.</p>
          </div>
          <div className="sign">
            <div className="sign-num">03</div>
            <h3>Auto-escalate</h3>
            <p>Miss the deadline and it climbs to the senior officer, then theirs, up to the Commissioner. It counts on their record.</p>
          </div>
          <div className="sign">
            <div className="sign-num">04</div>
            <h3>Proof, not promises</h3>
            <p>Closing needs a live camera photo, taken on site, after filing, that matches no earlier proof photo.</p>
          </div>
        </div>
      </section>

      {sample && (
        <section className="section wrap" style={{ paddingTop: 0 }}>
          <div className="grid-2">
            <div className="panel strong">
              <div className="panel-title">
                <h2>Before / after</h2>
                <Link className="mono" to={`/complaints/${sample.id}`}>
                  {sample.id} →
                </Link>
              </div>
              <div className="photos">
                <figure className="photo">
                  <img src={photoSrc(sample.photo)} alt={`Citizen's photo: ${category(sample.categoryId)?.name}`} />
                  <figcaption>Citizen</figcaption>
                </figure>
                <figure className="photo">
                  <img src={photoSrc(sample.proof!.photo)} alt="Officer's proof photo after the fix" />
                  <figcaption>Proof</figcaption>
                </figure>
              </div>
            </div>
            <div>
              <span className="kicker">Proof check</span>
              <h2 style={{ fontSize: 'clamp(36px,5vw,60px)', margin: '8px 0 16px' }}>Old photos don't close cases.</h2>
              <p className="muted">
                Every proof photo gets a fingerprint. If an officer re-sends last month's photo, a cropped copy, or the
                citizen's own picture, it is caught and logged on their record.
              </p>
              <ul className="checks" style={{ marginTop: 18 }}>
                {sample.proof!.checks.map((c) => (
                  <li key={c.id}>
                    <span className="mark pass" aria-hidden="true">
                      ✓
                    </span>
                    <span>
                      <b>{{ live: 'Live capture', location: 'On site', time: 'After filing', reuse: 'Never used before' }[c.id]}</b>
                      <span className="muted">{c.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section className="section wrap" style={{ paddingTop: 0 }}>
        <div className="grid-2">
          <div>
            <div className="section-head" style={{ marginBottom: 16 }}>
              <div>
                <span className="kicker">On record</span>
                <h2>Officers</h2>
              </div>
              <Link className="btn btn-sm" to="/officers">
                Full leaderboard
              </Link>
            </div>
            <div className="clist">
              {ranked.slice(0, 3).map(({ o, s }, i) => (
                <Link key={o.id} to={`/officers/${o.id}`} className="ofc-row top">
                  <span className="ofc-rank">{i + 1}</span>
                  <Avatar name={o.name} />
                  <span>
                    <span className="ofc-name">{o.name}</span>
                    <span className="ofc-sub" style={{ display: 'block' }}>
                      {o.designation}
                    </span>
                  </span>
                  <span className="ofc-score">
                    {s.score}
                    <span className={`grade ${s.grade}`}>{s.grade}</span>
                  </span>
                </Link>
              ))}
              {ranked.length > 3 && (
                <>
                  <span className="kicker" style={{ marginTop: 8 }}>
                    Needs attention
                  </span>
                  {ranked.slice(-1).map(({ o, s }) => (
                    <Link key={o.id} to={`/officers/${o.id}`} className="ofc-row">
                      <span className="ofc-rank">{ranked.length}</span>
                      <Avatar name={o.name} />
                      <span>
                        <span className="ofc-name">{o.name}</span>
                        <span className="ofc-sub" style={{ display: 'block' }}>
                          {s.escalations} escalations · {s.late} late
                        </span>
                      </span>
                      <span className="ofc-score">
                        {s.score}
                        <span className={`grade ${s.grade}`}>{s.grade}</span>
                      </span>
                    </Link>
                  ))}
                </>
              )}
            </div>
          </div>
          <div>
            <div className="section-head" style={{ marginBottom: 16 }}>
              <div>
                <span className="kicker">Latest</span>
                <h2>Filed recently</h2>
              </div>
            </div>
            <div className="clist">
              {recent.map((c) => (
                <Link key={c.id} to={`/complaints/${c.id}`} className="ccard" style={{ gridTemplateColumns: '56px 1fr' }}>
                  <img className="ccard-thumb" style={{ width: 56, height: 56 }} src={photoSrc(c.photo)} alt="" loading="lazy" />
                  <div>
                    <div className="ccard-top">
                      <span className="mono muted">{c.id}</span>
                      <StatusPill c={c} now={now} />
                    </div>
                    <div className="ccard-title" style={{ fontSize: 18 }}>
                      {category(c.categoryId)?.name}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
