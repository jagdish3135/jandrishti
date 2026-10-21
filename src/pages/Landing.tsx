import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Avatar, ComplaintCard, DEPT_ICON } from '../components/bits';
import { Icon } from '../components/icons';
import { assignee, CATEGORIES, category, chainFrom, DEPARTMENTS, OFFICERS } from '../lib/catalog';
import { photoSrc } from '../lib/photos';
import { officerStats } from '../lib/scoring';
import { DAY, escalationCount, isOpen } from '../lib/sla';
import { useNow, useStore } from '../lib/store';

/** Accepts "JD-26-00001", "jd 26 00001", "26-1" or just "1". */
function normaliseId(input: string) {
  const s = input.trim().toUpperCase().replace(/\s+/g, '-');
  const m = s.match(/^(?:JD-?)?(?:(\d{2})-?)?(\d{1,5})$/);
  if (!m) return s;
  return `JD-${m[1] ?? '26'}-${m[2].padStart(5, '0')}`;
}

function TrackCard() {
  const { db, session } = useStore();
  const navigate = useNavigate();
  const [id, setId] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!id.trim()) return setErr('Type your complaint number first.');
    const want = normaliseId(id);
    if (db.complaints.some((c) => c.id === want)) navigate(`/complaints/${want}`);
    else setErr(`We could not find ${want}. Check the number and try again.`);
  };
  return (
    <section className="track-card reveal d2" aria-labelledby="track-title">
      <h2 id="track-title">
        <Icon name="search" /> Track your complaint
      </h2>
      <p>Enter the complaint number you got when you reported the problem.</p>
      <form className="track-form" onSubmit={submit} noValidate>
        <label htmlFor="track-id" className="sr-only">
          Complaint number
        </label>
        <input
          id="track-id"
          className="input"
          placeholder="JD-26-00001"
          autoComplete="off"
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            setErr(null);
          }}
          aria-invalid={!!err}
          aria-describedby={err ? 'track-err' : undefined}
        />
        <button className="btn" type="submit">
          Track
        </button>
      </form>
      {err && (
        <p id="track-err" className="track-err" role="alert">
          {err}
        </p>
      )}
      <p className="track-try">
        Try an example:{' '}
        <button type="button" onClick={() => navigate('/complaints/JD-26-00001')}>
          JD-26-00001
        </button>
      </p>
      <div className="track-divider" />
      {session?.role === 'officer' ? (
        <Link className="btn btn-white" to="/desk">
          Open my work list <Icon name="arrowRight" size={20} />
        </Link>
      ) : (
        <Link className="btn btn-white" to={session ? '/my' : '/login?next=%2Fmy'}>
          See all my complaints <Icon name="arrowRight" size={20} />
        </Link>
      )}
    </section>
  );
}

/** Loops through one complaint moving up the chain as deadlines pass. */
function EscalationDemo() {
  const chain = useMemo(() => chainFrom(assignee('pothole', 'kothrud').id), []);
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStep(1);
      return;
    }
    const t = window.setInterval(() => setStep((s) => (s + 1) % 4), 2600);
    return () => window.clearInterval(t);
  }, []);
  const owner = Math.min(step, 2);
  const fixed = step === 3;
  return (
    <div className="chain" aria-label="Example: a pothole complaint moving to senior officers as deadlines are missed">
      <div className="chain-head">
        <span>Example: pothole on Karve Road</span>
        <span className={`pill ${fixed ? 'ok' : step === 0 ? 'ok' : 'esc'}`}>
          {fixed ? 'Fixed' : step === 0 ? 'On time' : `Deadline missed ${step}×`}
        </span>
      </div>
      <ol className="ladder">
        {chain.map((o, i) => (
          <li key={o.id} className={i < owner ? 'missed' : i === owner ? 'now' : ''}>
            <span className="lvl">{o.level}</span>
            <span>
              <strong>{o.designation}</strong>
              <small>{o.name}</small>
            </span>
            <span className="tag">{i < owner ? 'Missed deadline' : i === owner ? (fixed ? 'Fixed it' : 'Working on it') : ''}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Landing() {
  const { db, session } = useStore();
  const now = useNow(30_000);
  const list = db.complaints;

  const stats = useMemo(() => {
    const open = list.filter(isOpen);
    const resolved = list.flatMap((c) => c.events.filter((e) => e.kind === 'resolved').map((e) => ({ e, c })));
    const onTime = resolved.filter((x) => x.e.onTime && escalationCount(x.c) === 0).length;
    const days = resolved.reduce((s, x) => s + (x.e.at - x.c.createdAt) / DAY, 0);
    return {
      open: open.length,
      escalated: list.filter((c) => escalationCount(c) > 0).length,
      onTimePct: resolved.length ? Math.round((onTime / resolved.length) * 100) : 0,
      avgDays: resolved.length ? days / resolved.length : 0,
    };
  }, [list]);

  const ranked = useMemo(
    () =>
      OFFICERS.filter((o) => o.level < 4)
        .map((o) => ({ o, s: officerStats(o.id, list) }))
        .filter((x) => x.s.resolved > 0)
        .sort((a, b) => b.s.score - a.s.score)
        .slice(0, 3),
    [list],
  );
  const sample = useMemo(() => list.find((c) => c.status === 'closed' && c.proof && c.rating && c.rating.stars >= 4), [list]);
  const recent = useMemo(() => [...list].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3), [list]);

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="kicker reveal">Roads · Water · Drainage · Street lights · Garbage</span>
            <h1 className="reveal d1">
              Report a civic problem. <em>Know who will fix it, and by when.</em>
            </h1>
            <p className="hero-lede reveal d2">
              Every complaint goes to a named officer with a fixed deadline. If the deadline is missed, it moves to their
              senior officer automatically. A complaint is closed only when the officer shows a real photo of the work.
            </p>
            <div className="hero-ctas reveal d3">
              {session?.role === 'officer' ? (
                <Link className="btn btn-primary btn-lg" to="/desk">
                  <Icon name="list" /> Open my work list
                </Link>
              ) : (
                <Link className="btn btn-primary btn-lg" to="/file">
                  <Icon name="plus" /> Report a problem
                </Link>
              )}
              <Link className="btn btn-lg" to="/map">
                <Icon name="map" /> See complaints near me
              </Link>
            </div>
            <ul className="hero-points reveal d3">
              <li>
                <Icon name="check" size={20} /> Free to use
              </li>
              <li>
                <Icon name="check" size={20} /> Takes about 2 minutes
              </li>
              <li>
                <Icon name="check" size={20} /> Track it any time
              </li>
            </ul>
          </div>
          <TrackCard />
        </div>
      </section>

      <section className="section wrap" aria-labelledby="services-title">
        <div className="section-head">
          <div>
            <span className="kicker">Start here</span>
            <h2 id="services-title">What would you like to report?</h2>
          </div>
          <p>Choose a service. You can pick the exact problem on the next page.</p>
        </div>
        <div className="services">
          {DEPARTMENTS.map((d) => (
            <Link key={d.id} to={`/file?dept=${d.id}`} className="service">
              <span className="service-ico">
                <Icon name={DEPT_ICON[d.id]} size={28} />
              </span>
              <b>{d.name}</b>
              <span>
                {CATEGORIES.filter((c) => c.dept === d.id)
                  .map((c) => c.name)
                  .join(', ')}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="band" aria-labelledby="how-title">
        <div className="section wrap">
          <div className="section-head">
            <div>
              <span className="kicker">How it works</span>
              <h2 id="how-title">Four simple steps</h2>
            </div>
            <p>The same rules apply to every department, so you always know what happens next.</p>
          </div>
          <ol className="steps">
            <li>
              <span className="num">1</span>
              <h3>You report it</h3>
              <p>Choose the problem, mark the place on the map and add a photo if you can.</p>
            </li>
            <li>
              <span className="num">2</span>
              <h3>An officer is named</h3>
              <p>It goes to the officer for your ward, with a date by which it must be fixed.</p>
            </li>
            <li>
              <span className="num">3</span>
              <h3>Late? It goes up</h3>
              <p>If the date passes, the complaint moves to the senior officer automatically.</p>
            </li>
            <li>
              <span className="num">4</span>
              <h3>Photo proof</h3>
              <p>The officer must send a new photo from the site. You confirm it is really fixed.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="section wrap" aria-labelledby="numbers-title">
        <div className="section-head">
          <div>
            <span className="kicker">Open record</span>
            <h2 id="numbers-title">How the city is doing</h2>
          </div>
          <Link className="btn btn-sm" to="/map">
            View the map <Icon name="arrowRight" size={20} />
          </Link>
        </div>
        <div className="stats">
          <div className="stat">
            <b>{stats.open}</b>
            <span>Complaints being worked on</span>
          </div>
          <div className="stat">
            <b>{stats.onTimePct}%</b>
            <span>Fixed before the deadline</span>
          </div>
          <div className="stat">
            <b>{stats.avgDays.toFixed(1)}</b>
            <span>Average days to fix</span>
          </div>
          <div className={`stat${stats.escalated ? ' alert' : ''}`}>
            <b>{stats.escalated}</b>
            <span>Moved to a senior officer</span>
          </div>
        </div>
      </section>

      <section className="section wrap" style={{ paddingTop: 0 }}>
        <div className="grid-2">
          <div>
            <span className="kicker">Accountability</span>
            <h2 style={{ margin: '0.35rem 0 0.75rem' }}>If the deadline is missed, it goes up</h2>
            <p className="muted">
              Each problem type has a fixed time limit, from 1 day for a dangerous wire to 10 days for a broken footpath.
              When the time runs out, the complaint moves to the next senior officer with a new, shorter deadline, all
              the way up to the Additional Municipal Commissioner. Every missed deadline is shown on the officer's
              public record.
            </p>
            <EscalationDemo />
          </div>
          {sample && (
            <div>
              <span className="kicker">Proof of work</span>
              <h2 style={{ margin: '0.35rem 0 0.75rem' }}>Old photos cannot close a case</h2>
              <p className="muted">
                The officer must take a new photo at the site after the complaint was filed. Every photo gets a digital
                fingerprint, so a reused photo is caught and recorded.
              </p>
              <div className="panel">
                <div className="photos">
                  <figure className="photo">
                    <img src={photoSrc(sample.photo)} alt={`Citizen's photo of the ${category(sample.categoryId)?.name.toLowerCase()}`} />
                    <figcaption>Before: citizen's photo</figcaption>
                  </figure>
                  <figure className="photo">
                    <img src={photoSrc(sample.proof!.photo)} alt="Officer's photo after the repair" />
                    <figcaption>After: officer's proof</figcaption>
                  </figure>
                </div>
                <Link to={`/complaints/${sample.id}`} style={{ display: 'inline-block', marginTop: '0.75rem', fontWeight: 700 }}>
                  See this complaint ({sample.id})
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="band">
        <div className="section wrap">
          <div className="grid-2">
            <div>
              <div className="section-head" style={{ marginBottom: '1rem' }}>
                <div>
                  <span className="kicker">Recently reported</span>
                  <h2>Latest complaints</h2>
                </div>
              </div>
              <div className="clist">
                {recent.map((c) => (
                  <ComplaintCard key={c.id} c={c} now={now} />
                ))}
              </div>
            </div>
            <div>
              <div className="section-head" style={{ marginBottom: '1rem' }}>
                <div>
                  <span className="kicker">Officer performance</span>
                  <h2>Top officers</h2>
                </div>
                <Link className="btn btn-sm" to="/officers">
                  All officers
                </Link>
              </div>
              <div className="clist">
                {ranked.map(({ o, s }, i) => (
                  <Link key={o.id} to={`/officers/${o.id}`} className="ofc-row top">
                    <span className="ofc-rank">{i + 1}</span>
                    <Avatar name={o.name} />
                    <span style={{ minWidth: 0 }}>
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
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section wrap" aria-labelledby="faq-title">
        <div className="section-head">
          <div>
            <span className="kicker">Help</span>
            <h2 id="faq-title">Common questions</h2>
          </div>
        </div>
        <details className="faq">
          <summary>How do I know who is handling my complaint?</summary>
          <div>
            Open the complaint. You will see the officer's name and designation, the date it must be fixed by, and who it
            will go to if that date is missed.
          </div>
        </details>
        <details className="faq">
          <summary>What happens if nothing is done?</summary>
          <div>
            When the deadline passes, the complaint moves to the senior officer automatically. You do not need to call or
            visit any office. It keeps moving up until it is fixed.
          </div>
        </details>
        <details className="faq">
          <summary>My neighbour already reported the same problem. What should I do?</summary>
          <div>
            When you mark the place on the map, we show complaints of the same type nearby. Press "Support this
            instead". More people supporting a complaint gives it higher priority.
          </div>
        </details>
        <details className="faq">
          <summary>Is my Aadhaar number stored?</summary>
          <div>
            No. In this demo, the number is only checked for typing mistakes on your own device, and only the last 4
            digits are kept. Your name is never shown publicly.
          </div>
        </details>
        <details className="faq">
          <summary>The text is too small. Can I make it bigger?</summary>
          <div>Yes. Use the A− A A+ buttons at the very top of the page. Your choice is remembered.</div>
        </details>
      </section>
    </>
  );
}
