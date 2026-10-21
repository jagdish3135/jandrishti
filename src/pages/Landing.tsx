import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Avatar, ComplaintCard, DEPT_ICON } from '../components/bits';
import { Icon } from '../components/icons';
import { assignee, CATEGORIES, chainFrom, DEPARTMENTS, OFFICERS } from '../lib/catalog';
import { useT, type Key } from '../lib/i18n';
import { photoSrc } from '../lib/photos';
import { officerStats } from '../lib/scoring';
import { DAY, escalationCount, isOpen } from '../lib/sla';
import { normaliseId } from '../lib/ids';
import { useNow, useStore } from '../lib/store';

function TrackCard() {
  const { db, session } = useStore();
  const { t } = useT();
  const navigate = useNavigate();
  const [id, setId] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!id.trim()) return setErr(t('track.empty'));
    const want = normaliseId(id);
    if (db.complaints.some((c) => c.id === want)) navigate(`/complaints/${want}`);
    else setErr(t('track.notFound', { id: want }));
  };
  return (
    <section className="track-card reveal d2" aria-labelledby="track-title">
      <h2 id="track-title">
        <Icon name="search" /> {t('track.title')}
      </h2>
      <p>{t('track.help')}</p>
      <form className="track-form" onSubmit={submit} noValidate>
        <label htmlFor="track-id" className="sr-only">
          {t('track.label')}
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
          {t('track.btn')}
        </button>
      </form>
      {err && (
        <p id="track-err" className="track-err" role="alert">
          {err}
        </p>
      )}
      <p className="track-try">
        {t('track.try')}{' '}
        <button type="button" onClick={() => navigate('/complaints/JD-26-00001')}>
          JD-26-00001
        </button>
      </p>
      <div className="track-divider" />
      {session?.role === 'officer' ? (
        <Link className="btn btn-white" to="/desk">
          {t('home.ctaWork')} <Icon name="arrowRight" size={20} />
        </Link>
      ) : (
        <Link className="btn btn-white" to={session ? '/my' : '/login?next=%2Fmy'}>
          {t('track.all')} <Icon name="arrowRight" size={20} />
        </Link>
      )}
    </section>
  );
}

/** Loops through one complaint moving up the chain as deadlines pass. */
function EscalationDemo() {
  const { t, designation } = useT();
  const chain = useMemo(() => chainFrom(assignee('pothole', 'kothrud').id), []);
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStep(1);
      return;
    }
    const id = window.setInterval(() => setStep((s) => (s + 1) % 4), 2600);
    return () => window.clearInterval(id);
  }, []);
  const owner = Math.min(step, 2);
  const fixed = step === 3;
  return (
    <div className="chain" aria-label={t('acc.exampleLabel')}>
      <div className="chain-head">
        <span>{t('acc.example')}</span>
        <span className={`pill ${fixed || step === 0 ? 'ok' : 'esc'}`}>{fixed ? t('acc.fixed') : step === 0 ? t('acc.onTime') : t('acc.missedN', { n: step })}</span>
      </div>
      <ol className="ladder">
        {chain.map((o, i) => (
          <li key={o.id} className={i < owner ? 'missed' : i === owner ? 'now' : ''}>
            <span className="lvl">{o.level}</span>
            <span>
              <strong>{designation(o)}</strong>
              <small>{o.name}</small>
            </span>
            <span className="tag">{i < owner ? t('acc.missed') : i === owner ? (fixed ? t('acc.fixedIt') : t('acc.working')) : ''}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Landing() {
  const { db, session } = useStore();
  const { t, dept, catName, designation } = useT();
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
  const steps: [Key, Key][] = [
    ['how.s1t', 'how.s1'],
    ['how.s2t', 'how.s2'],
    ['how.s3t', 'how.s3'],
    ['how.s4t', 'how.s4'],
  ];
  const faqs: [Key, Key][] = [
    ['faq.q1', 'faq.a1'],
    ['faq.q2', 'faq.a2'],
    ['faq.q3', 'faq.a3'],
    ['faq.q4', 'faq.a4'],
    ['faq.q5', 'faq.a5'],
    ['faq.q6', 'faq.a6'],
  ];

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="kicker reveal">{t('home.kicker')}</span>
            <h1 className="reveal d1">
              {t('home.h1a')} <em>{t('home.h1b')}</em>
            </h1>
            <p className="hero-lede reveal d2">{t('home.lede')}</p>
            <div className="hero-ctas reveal d3">
              {session?.role === 'officer' ? (
                <Link className="btn btn-primary btn-lg" to="/desk">
                  <Icon name="list" /> {t('home.ctaWork')}
                </Link>
              ) : (
                <Link className="btn btn-primary btn-lg" to="/file">
                  <Icon name="plus" /> {t('nav.report')}
                </Link>
              )}
              <Link className="btn btn-lg" to="/map">
                <Icon name="map" /> {t('home.ctaMap')}
              </Link>
            </div>
            <ul className="hero-points reveal d3">
              {(['home.p1', 'home.p2', 'home.p3'] as Key[]).map((k) => (
                <li key={k}>
                  <Icon name="check" size={20} /> {t(k)}
                </li>
              ))}
            </ul>
          </div>
          <TrackCard />
        </div>
      </section>

      <section className="section wrap" aria-labelledby="services-title">
        <div className="section-head">
          <div>
            <span className="kicker">{t('svc.kicker')}</span>
            <h2 id="services-title">{t('svc.title')}</h2>
          </div>
          <p>{t('svc.help')}</p>
        </div>
        <div className="services">
          {DEPARTMENTS.map((d) => (
            <Link key={d.id} to={`/file?dept=${d.id}`} className="service">
              <span className="service-ico">
                <Icon name={DEPT_ICON[d.id]} size={28} />
              </span>
              <b>{dept(d.id)}</b>
              <span>
                {CATEGORIES.filter((c) => c.dept === d.id && !c.other)
                  .map((c) => catName(c.id))
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
              <span className="kicker">{t('how.kicker')}</span>
              <h2 id="how-title">{t('how.title')}</h2>
            </div>
            <p>{t('how.help')}</p>
          </div>
          <ol className="steps">
            {steps.map(([title, body], i) => (
              <li key={title}>
                <span className="num">{i + 1}</span>
                <h3>{t(title)}</h3>
                <p>{t(body)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section wrap" aria-labelledby="numbers-title">
        <div className="section-head">
          <div>
            <span className="kicker">{t('stats.kicker')}</span>
            <h2 id="numbers-title">{t('stats.title')}</h2>
          </div>
          <Link className="btn btn-sm" to="/map">
            {t('stats.map')} <Icon name="arrowRight" size={20} />
          </Link>
        </div>
        <div className="stats">
          <div className="stat">
            <b>{stats.open}</b>
            <span>{t('stats.open')}</span>
          </div>
          <div className="stat">
            <b>{stats.onTimePct}%</b>
            <span>{t('stats.onTime')}</span>
          </div>
          <div className="stat">
            <b>{stats.avgDays.toFixed(1)}</b>
            <span>{t('stats.days')}</span>
          </div>
          <div className={`stat${stats.escalated ? ' alert' : ''}`}>
            <b>{stats.escalated}</b>
            <span>{t('stats.escalated')}</span>
          </div>
        </div>
      </section>

      <section className="section wrap" style={{ paddingTop: 0 }}>
        <div className="grid-2">
          <div>
            <span className="kicker">{t('acc.kicker')}</span>
            <h2 style={{ margin: '0.35rem 0 0.75rem' }}>{t('acc.title')}</h2>
            <p className="muted">{t('acc.body')}</p>
            <EscalationDemo />
          </div>
          {sample && (
            <div>
              <span className="kicker">{t('pr.kicker')}</span>
              <h2 style={{ margin: '0.35rem 0 0.75rem' }}>{t('pr.title')}</h2>
              <p className="muted">{t('pr.body')}</p>
              <div className="panel">
                <div className="photos">
                  <figure className="photo">
                    <img src={photoSrc(sample.photo)} alt={t('cd.photoBefore')} />
                    <figcaption>{t('pr.before')}</figcaption>
                  </figure>
                  <figure className="photo">
                    <img src={photoSrc(sample.proof!.photo)} alt={t('cd.photoAfter')} />
                    <figcaption>{t('pr.after')}</figcaption>
                  </figure>
                </div>
                <Link to={`/complaints/${sample.id}`} style={{ display: 'inline-block', marginTop: '0.75rem', fontWeight: 700 }}>
                  {t('pr.see', { id: sample.id })}
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
                  <span className="kicker">{t('rec.kicker')}</span>
                  <h2>{t('rec.title')}</h2>
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
                  <span className="kicker">{t('top.kicker')}</span>
                  <h2>{t('top.title')}</h2>
                </div>
                <Link className="btn btn-sm" to="/officers">
                  {t('top.all')}
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
                        {designation(o)}
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
          </div>
        </div>
      </section>

      <section className="section wrap" aria-labelledby="faq-title">
        <div className="section-head">
          <div>
            <span className="kicker">{t('faq.kicker')}</span>
            <h2 id="faq-title">{t('faq.title')}</h2>
          </div>
        </div>
        {faqs.map(([q, a]) => (
          <details className="faq" key={q}>
            <summary>{t(q)}</summary>
            <div>{t(a)}</div>
          </details>
        ))}
      </section>
    </>
  );
}
