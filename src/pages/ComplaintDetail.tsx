import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Avatar, DEPT_ICON, SlaPlate, Stars, StatusPill, Tracker } from '../components/bits';
import { Icon } from '../components/icons';
import { ComplaintsMap } from '../components/Maps';
import ProofDialog from '../components/ProofDialog';
import { category, chainFrom, officer } from '../lib/catalog';
import { maskName } from '../lib/format';
import { checkText, useT, type Key, type T } from '../lib/i18n';
import { photoSrc } from '../lib/photos';
import { officerStats } from '../lib/scoring';
import { isOpen } from '../lib/sla';
import { useNow, useStore } from '../lib/store';
import type { CEvent, Complaint } from '../lib/types';
import NotFound from './NotFound';

function eventText(e: CEvent, t: T['t'], designation: T['designation']) {
  const o = e.officerId ? officer(e.officerId) : undefined;
  const from = e.fromOfficerId ? officer(e.fromOfficerId) : undefined;
  const v = { name: o?.name ?? '', designation: o ? designation(o) : '', from: from?.name ?? '' };
  switch (e.kind) {
    case 'filed':
      return t('ev.filed');
    case 'assigned':
      return t('ev.assigned', v);
    case 'started':
      return t('ev.started', v);
    case 'escalated':
      return t('ev.escalated', v);
    case 'proof_rejected':
      return t('ev.rejected', v);
    case 'resolved':
      return t('ev.resolved', v);
    case 'confirmed':
      return t('ev.confirmed');
    case 'reopened':
      return t('ev.reopened', v);
    case 'rated':
      return t('ev.rated', { n: (e.note ?? '').split(' ')[0] });
    case 'supported':
      return t('ev.supported');
  }
}

function Ladder({ c }: { c: Complaint }) {
  const { t, designation } = useT();
  const first = c.events.find((e) => e.kind === 'assigned')?.officerId ?? c.officerId;
  const chain = chainFrom(first);
  const missed = new Set(c.events.filter((e) => e.kind === 'escalated').map((e) => e.fromOfficerId));
  const idx = chain.findIndex((o) => o.id === c.officerId);
  return (
    <ol className="ladder">
      {chain.map((o, i) => (
        <li key={o.id} className={o.id === c.officerId && isOpen(c) ? 'now' : missed.has(o.id) ? 'missed' : ''}>
          <span className="lvl" aria-hidden="true">
            {o.level}
          </span>
          <span>
            <Link to={`/officers/${o.id}`}>{o.name}</Link>
            <small>{designation(o)}</small>
          </span>
          <span className="tag">
            {missed.has(o.id) ? t('cd.missed') : o.id === c.officerId ? (isOpen(c) ? t('cd.hasNow') : t('cd.fixedIt')) : i > idx ? t('cd.nextLate') : ''}
          </span>
        </li>
      ))}
    </ol>
  );
}

function CitizenActions({ c }: { c: Complaint }) {
  const { confirm, reopen, rate } = useStore();
  const { t } = useT();
  const [why, setWhy] = useState('');
  const [reopening, setReopening] = useState(false);
  const [stars, setStars] = useState(0);
  const [note, setNote] = useState('');

  if (c.status === 'resolved')
    return (
      <section className="panel strong stack" style={{ gap: '0.9rem' }} aria-labelledby="confirm-title">
        <span className="kicker">{t('cf.kicker')}</span>
        <h2 id="confirm-title">{t('cf.title')}</h2>
        <p className="muted" style={{ margin: 0 }}>
          {t('cf.body')}
        </p>
        {!reopening ? (
          <div className="row">
            <button className="btn btn-primary btn-lg" type="button" onClick={() => confirm(c.id)}>
              <Icon name="check" /> {t('cf.yes')}
            </button>
            <button className="btn btn-danger btn-lg" type="button" onClick={() => setReopening(true)}>
              <Icon name="close" /> {t('cf.no')}
            </button>
          </div>
        ) : (
          <form
            className="stack"
            style={{ gap: '0.75rem' }}
            onSubmit={(e) => {
              e.preventDefault();
              reopen(c.id, why);
            }}
          >
            <label className="field">
              <span>{t('cf.why')}</span>
              <textarea className="input" maxLength={300} value={why} onChange={(e) => setWhy(e.target.value)} style={{ minHeight: '6rem' }} autoFocus />
            </label>
            <div className="row">
              <button className="btn btn-danger" type="submit">
                {t('cf.send')}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setReopening(false)}>
                {t('common.cancel')}
              </button>
            </div>
          </form>
        )}
      </section>
    );

  if (c.status === 'closed' && !c.rating)
    return (
      <form
        className="panel strong stack"
        style={{ gap: '0.9rem' }}
        onSubmit={(e) => {
          e.preventDefault();
          if (stars) rate(c.id, stars, note);
        }}
        aria-labelledby="rate-title"
      >
        <span className="kicker">{t('rt.kicker')}</span>
        <h2 id="rate-title">{t('rt.title')}</h2>
        <p className="muted" style={{ margin: 0 }}>
          {t('rt.body', { name: officer(c.resolvedBy ?? c.officerId)?.name ?? '' })}
        </p>
        <div className="stars" role="group" aria-label={t('rt.group')}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" aria-pressed={stars >= n} aria-label={t('rt.star', { n })} onClick={() => setStars(n)}>
              ★
            </button>
          ))}
        </div>
        {stars > 0 && <p style={{ margin: 0, fontWeight: 700 }}>{t(`rt.l${stars}` as Key)}</p>}
        <label className="field">
          <span>{t('rt.comment')}</span>
          <input className="input" maxLength={160} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button className="btn btn-primary" type="submit" disabled={!stars} style={{ justifySelf: 'start' }}>
          {t('rt.submit')}
        </button>
      </form>
    );
  return null;
}

export default function ComplaintDetail() {
  const { id } = useParams();
  const { db, session, support, startWork } = useStore();
  const { t, lang, dept, complaintTitle, wardName, designation, fmtDateTime } = useT();
  const now = useNow(30_000);
  const [proofOpen, setProofOpen] = useState(false);
  const c = db.complaints.find((x) => x.id === id);
  if (!c) return <NotFound what="complaint" />;

  const cat = category(c.categoryId)!;
  const owner = officer(c.officerId)!;
  const stats = officerStats(owner.id, db.complaints);
  const citizen = db.citizens.find((z) => z.id === c.citizenId);
  const isOwner = session?.role === 'citizen' && session.citizenId === c.citizenId;
  const isOfficer = session?.role === 'officer' && session.officerId === c.officerId;
  const canSupport = session?.role === 'citizen' && !isOwner && !c.supporters.includes(session.citizenId) && isOpen(c);
  const supported = session?.role === 'citizen' && c.supporters.includes(session.citizenId);
  const rejected = c.events.filter((e) => e.kind === 'proof_rejected');
  const title = complaintTitle(c);

  return (
    <div className="wrap">
      <div className="page-head">
        <nav className="crumbs" aria-label={t('cd.breadcrumb')}>
          <Link to="/">{t('nav.home')}</Link> <span aria-hidden="true">›</span>
          {isOwner ? <Link to="/my">{t('nav.my')}</Link> : <Link to="/map">{t('cd.complaints')}</Link>} <span aria-hidden="true">›</span>
          <span className="mono">{c.id}</span>
        </nav>
        <div className="row" style={{ marginTop: '0.9rem' }}>
          <span className="cat-glyph" aria-hidden="true">
            <Icon name={DEPT_ICON[cat.dept]} />
          </span>
          <span className="chip">{dept(cat.dept)}</span>
          <StatusPill c={c} now={now} />
        </div>
        <h1>{title}</h1>
        <p>
          <strong>{t('cd.number')}</strong> <span className="mono">{c.id}</span> · {t('cd.ward', { ward: wardName(c.wardId) })}
          {c.landmark ? `, ${c.landmark}` : ''} · {isOwner
            ? t('cd.reportedYou', { date: fmtDateTime(c.createdAt) })
            : t('cd.reported', { date: fmtDateTime(c.createdAt), who: citizen ? maskName(citizen.name) : t('cd.aCitizen') })}
          {c.supporters.length > 0 && ` · ${t('cd.neighbours', { n: c.supporters.length })}`}
        </p>
      </div>

      <section className="panel" style={{ marginBottom: 'var(--gap)' }}>
        <Tracker c={c} />
      </section>

      {isOwner && (c.status === 'resolved' || (c.status === 'closed' && !c.rating)) && (
        <div style={{ marginBottom: 'var(--gap)' }}>
          <CitizenActions c={c} />
        </div>
      )}

      {isOfficer && isOpen(c) && (
        <section className="panel strong row" style={{ marginBottom: 'var(--gap)', justifyContent: 'space-between' }}>
          <div>
            <span className="kicker">{t('cd.assignedYou')}</span>
            <p style={{ margin: '0.25rem 0 0' }}>{t('cd.assignedHelp')}</p>
          </div>
          <div className="row">
            {c.status !== 'in_progress' && (
              <button className="btn" type="button" onClick={() => startWork(c.id)}>
                <Icon name="tools" /> {t('cd.start')}
              </button>
            )}
            <button className="btn btn-primary" type="button" onClick={() => setProofOpen(true)}>
              <Icon name="camera" /> {t('cd.upload')}
            </button>
          </div>
        </section>
      )}

      <div className="grid-2 detail">
        <div className="stack">
          <section className="panel">
            <div className="panel-title">
              <h2>{t('cd.whatProblem')}</h2>
            </div>
            <p style={{ margin: 0, fontSize: '1.05rem' }}>{c.description}</p>
          </section>

          <section className="panel">
            <div className="panel-title">
              <h2>{t('cd.photos')}</h2>
              {c.proof && (
                <span className="pill ok">
                  <Icon name="shield" /> {t('cd.proofChecked')}
                </span>
              )}
            </div>
            <div className="photos">
              {c.photo ? (
                <figure className="photo">
                  <img src={photoSrc(c.photo)} alt={t('cd.photoBefore')} />
                  <figcaption>{t('pr.before')}</figcaption>
                </figure>
              ) : (
                <div className="photo-empty">{t('cd.noPhoto')}</div>
              )}
              {c.proof ? (
                <figure className="photo">
                  <img src={photoSrc(c.proof.photo)} alt={t('cd.photoAfter')} />
                  <figcaption>{t('pr.after')}</figcaption>
                </figure>
              ) : (
                <div className="photo-empty">{t('cd.proofWill')}</div>
              )}
            </div>
            {c.proof && (
              <ul className="checks" style={{ marginTop: '1.1rem' }}>
                {c.proof.checks.map((k) => {
                  const { title: ct, detail } = checkText(k, t, lang);
                  return (
                    <li key={k.id}>
                      <span className={`mark ${k.pass ? 'pass' : 'fail'}`} aria-hidden="true">
                        <Icon name={k.pass ? 'check' : 'close'} />
                      </span>
                      <span>
                        <b>{ct}</b>
                        {detail && <span className="muted">{detail}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {rejected.length > 0 && (
              <div className="callout bad" style={{ marginTop: '1.1rem' }}>
                <Icon name="alert" />
                <span>{t('cd.rejected', { n: rejected.length })}</span>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-title">
              <h2>{t('cd.history')}</h2>
            </div>
            <ol className="timeline">
              {[...c.events].reverse().map((e, i) => (
                <li key={i}>
                  <span className={`tl-dot ${e.kind}`} aria-hidden="true" />
                  <div>
                    <time dateTime={new Date(e.at).toISOString()}>{fmtDateTime(e.at)}</time>
                    <p>{eventText(e, t, designation)}</p>
                    {e.note && ['reopened'].includes(e.kind) && <p className="note">“{e.note}”</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="stack">
          <SlaPlate c={c} now={now} />

          <section className="panel strong">
            <span className="kicker">{isOpen(c) ? t('cd.officerNow') : t('cd.fixedBy')}</span>
            <Link to={`/officers/${owner.id}`} className="row" style={{ textDecoration: 'none', color: 'inherit', margin: '0.75rem 0', flexWrap: 'nowrap' }}>
              <Avatar name={owner.name} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: '1.05rem' }}>{owner.name}</strong>
                <span className="hint" style={{ display: 'block' }}>
                  {designation(owner)}
                </span>
              </span>
              <span className={`grade ${stats.grade}`} title={t('cd.scoreTitle', { score: stats.score })}>
                {stats.grade}
              </span>
            </Link>
            <p className="hint" style={{ margin: 0 }}>
              {t('cd.perf', { score: stats.score, onTime: stats.onTime, resolved: stats.resolved, esc: stats.escalations })}
            </p>
            {c.rating && (
              <p style={{ margin: '0.75rem 0 0' }}>
                {t('cd.rating')} <Stars n={c.rating.stars} />
                {c.rating.note && <span className="muted"> “{c.rating.note}”</span>}
              </p>
            )}
          </section>

          {canSupport && (
            <button className="btn btn-primary btn-lg btn-block" type="button" onClick={() => support(c.id)}>
              <Icon name="users" /> {t('cd.support')}
            </button>
          )}
          {supported && (
            <div className="callout ok">
              <Icon name="check" />
              <span>{t('cd.supporting')}</span>
            </div>
          )}

          <section className="chain" aria-labelledby="chain-title">
            <div className="chain-head">
              <span id="chain-title">{t('cd.chain')}</span>
              <Icon name="ladder" />
            </div>
            <Ladder c={c} />
          </section>

          <div style={{ height: '16rem' }}>
            <ComplaintsMap complaints={[c]} now={now} />
          </div>
        </aside>
      </div>
      {proofOpen && <ProofDialog c={c} onClose={() => setProofOpen(false)} />}
    </div>
  );
}
