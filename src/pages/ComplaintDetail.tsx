import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Avatar, DEPT_ICON, SlaPlate, Stars, StatusPill, Tracker } from '../components/bits';
import { Icon } from '../components/icons';
import { ComplaintsMap } from '../components/Maps';
import ProofDialog from '../components/ProofDialog';
import { category, chainFrom, department, officer, ward } from '../lib/catalog';
import { fmtDateTime, maskName } from '../lib/format';
import { photoSrc } from '../lib/photos';
import { officerStats } from '../lib/scoring';
import { isOpen } from '../lib/sla';
import { useNow, useStore } from '../lib/store';
import type { CEvent, Complaint } from '../lib/types';
import NotFound from './NotFound';

const CHECK_NAMES = { live: 'Taken live with the app camera', location: 'Taken at the complaint location', time: 'Taken after the complaint was filed', reuse: 'A new photo, never used before' };

function eventText(e: CEvent) {
  const o = e.officerId ? officer(e.officerId) : undefined;
  const from = e.fromOfficerId ? officer(e.fromOfficerId) : undefined;
  switch (e.kind) {
    case 'filed':
      return 'Complaint reported';
    case 'assigned':
      return `Given to ${o?.name}, ${o?.designation}`;
    case 'started':
      return `${o?.name} started the work`;
    case 'escalated':
      return `${from?.name} missed the deadline. Moved to ${o?.name}, ${o?.designation}`;
    case 'proof_rejected':
      return `A proof photo from ${o?.name} was rejected`;
    case 'resolved':
      return `Marked as fixed by ${o?.name}`;
    case 'confirmed':
      return 'Citizen confirmed it is fixed';
    case 'reopened':
      return `Citizen said it is not fixed. Sent back to ${o?.name}`;
    case 'rated':
      return `Citizen rated the work ${e.note}`;
    case 'supported':
      return 'A neighbour added their support';
  }
}

function Ladder({ c }: { c: Complaint }) {
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
            <small>{o.designation}</small>
          </span>
          <span className="tag">
            {missed.has(o.id) ? 'Missed deadline' : o.id === c.officerId ? (isOpen(c) ? 'Has it now' : 'Fixed it') : i > idx ? 'Next if late' : ''}
          </span>
        </li>
      ))}
    </ol>
  );
}

function CitizenActions({ c }: { c: Complaint }) {
  const { confirm, reopen, rate } = useStore();
  const [why, setWhy] = useState('');
  const [reopening, setReopening] = useState(false);
  const [stars, setStars] = useState(0);
  const [note, setNote] = useState('');

  if (c.status === 'resolved')
    return (
      <section className="panel strong stack" style={{ gap: '0.9rem' }} aria-labelledby="confirm-title">
        <span className="kicker">Your answer is needed</span>
        <h2 id="confirm-title">Is the problem really fixed?</h2>
        <p className="muted" style={{ margin: 0 }}>
          Look at the officer's photo below, or check the place yourself. If it is not fixed, tell us and it goes back to
          the officer with a short deadline.
        </p>
        {!reopening ? (
          <div className="row">
            <button className="btn btn-primary btn-lg" type="button" onClick={() => confirm(c.id)}>
              <Icon name="check" /> Yes, it is fixed
            </button>
            <button className="btn btn-danger btn-lg" type="button" onClick={() => setReopening(true)}>
              <Icon name="close" /> No, not fixed
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
              <span>What is still wrong? (optional)</span>
              <textarea className="input" maxLength={300} value={why} onChange={(e) => setWhy(e.target.value)} style={{ minHeight: '6rem' }} autoFocus />
            </label>
            <div className="row">
              <button className="btn btn-danger" type="submit">
                Send it back to the officer
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setReopening(false)}>
                Cancel
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
        <span className="kicker">One last step</span>
        <h2 id="rate-title">How well was it handled?</h2>
        <p className="muted" style={{ margin: 0 }}>
          Your rating is about this complaint only. It counts towards {officer(c.resolvedBy ?? c.officerId)?.name}'s
          performance score.
        </p>
        <div className="stars" role="group" aria-label="Rating, 1 to 5 stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" aria-pressed={stars >= n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setStars(n)}>
              ★
            </button>
          ))}
        </div>
        {stars > 0 && <p style={{ margin: 0, fontWeight: 700 }}>{['', 'Very poor', 'Poor', 'Okay', 'Good', 'Excellent'][stars]}</p>}
        <label className="field">
          <span>Comment (optional)</span>
          <input className="input" maxLength={160} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button className="btn btn-primary" type="submit" disabled={!stars} style={{ justifySelf: 'start' }}>
          Submit rating
        </button>
      </form>
    );
  return null;
}

export default function ComplaintDetail() {
  const { id } = useParams();
  const { db, session, support, startWork } = useStore();
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

  return (
    <div className="wrap">
      <div className="page-head">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link> <span aria-hidden="true">›</span>
          {isOwner ? <Link to="/my">My complaints</Link> : <Link to="/map">Complaints</Link>} <span aria-hidden="true">›</span>
          <span className="mono">{c.id}</span>
        </nav>
        <div className="row" style={{ marginTop: '0.9rem' }}>
          <span className="cat-glyph" aria-hidden="true">
            <Icon name={DEPT_ICON[cat.dept]} />
          </span>
          <span className="chip">{department(cat.dept)?.name}</span>
          <StatusPill c={c} now={now} />
        </div>
        <h1>{cat.name}</h1>
        <p>
          <strong>Complaint number:</strong> <span className="mono">{c.id}</span> · {ward(c.wardId)?.name} ward
          {c.landmark ? `, ${c.landmark}` : ''} · reported {fmtDateTime(c.createdAt)} by {isOwner ? 'you' : citizen ? maskName(citizen.name) : 'a citizen'}
          {c.supporters.length > 0 && ` · ${c.supporters.length} neighbour${c.supporters.length > 1 ? 's have' : ' has'} the same problem`}
        </p>
      </div>

      <section className="panel" style={{ marginBottom: 'var(--gap)' }} aria-label="Progress">
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
            <span className="kicker">Assigned to you</span>
            <p style={{ margin: '0.25rem 0 0' }}>Fix the problem, then send a photo taken at the site.</p>
          </div>
          <div className="row">
            {c.status !== 'in_progress' && (
              <button className="btn" type="button" onClick={() => startWork(c.id)}>
                <Icon name="tools" /> Start work
              </button>
            )}
            <button className="btn btn-primary" type="button" onClick={() => setProofOpen(true)}>
              <Icon name="camera" /> Upload proof and resolve
            </button>
          </div>
        </section>
      )}

      <div className="grid-2 detail">
        <div className="stack">
          <section className="panel">
            <div className="panel-title">
              <h2>What is the problem?</h2>
            </div>
            <p style={{ margin: 0, fontSize: '1.1rem' }}>{c.description}</p>
          </section>

          <section className="panel">
            <div className="panel-title">
              <h2>Photos</h2>
              {c.proof && (
                <span className="pill ok">
                  <Icon name="shield" /> Proof checked
                </span>
              )}
            </div>
            <div className="photos">
              {c.photo ? (
                <figure className="photo">
                  <img src={photoSrc(c.photo)} alt={`Citizen's photo of the ${cat.name.toLowerCase()}`} />
                  <figcaption>Before: citizen's photo</figcaption>
                </figure>
              ) : (
                <div className="photo-empty">No photo was added with this complaint</div>
              )}
              {c.proof ? (
                <figure className="photo">
                  <img src={photoSrc(c.proof.photo)} alt="Officer's photo after the repair" />
                  <figcaption>After: officer's proof</figcaption>
                </figure>
              ) : (
                <div className="photo-empty">The officer's photo of the finished work will appear here</div>
              )}
            </div>
            {c.proof && (
              <ul className="checks" style={{ marginTop: '1.1rem' }}>
                {c.proof.checks.map((k) => (
                  <li key={k.id}>
                    <span className={`mark ${k.pass ? 'pass' : 'fail'}`} aria-hidden="true">
                      <Icon name={k.pass ? 'check' : 'close'} />
                    </span>
                    <span>
                      <b>{CHECK_NAMES[k.id]}</b>
                      <span className="muted">{k.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {rejected.length > 0 && (
              <div className="callout bad" style={{ marginTop: '1.1rem' }}>
                <Icon name="alert" />
                <span>
                  {rejected.length === 1 ? 'One proof photo was' : `${rejected.length} proof photos were`} rejected before this complaint could close. This is shown on the officer's record.
                </span>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-title">
              <h2>Full history</h2>
            </div>
            <ol className="timeline">
              {[...c.events].reverse().map((e, i) => (
                <li key={i}>
                  <span className={`tl-dot ${e.kind}`} aria-hidden="true" />
                  <div>
                    <time dateTime={new Date(e.at).toISOString()}>{fmtDateTime(e.at)}</time>
                    <p>{eventText(e)}</p>
                    {e.note && !['rated', 'escalated'].includes(e.kind) && <p className="note">“{e.note}”</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="stack">
          <SlaPlate c={c} now={now} />

          <section className="panel strong">
            <span className="kicker">{isOpen(c) ? 'Officer responsible now' : 'Fixed by'}</span>
            <Link to={`/officers/${owner.id}`} className="row" style={{ textDecoration: 'none', color: 'inherit', margin: '0.75rem 0', flexWrap: 'nowrap' }}>
              <Avatar name={owner.name} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: '1.1rem' }}>{owner.name}</strong>
                <span className="hint" style={{ display: 'block' }}>
                  {owner.designation}
                </span>
              </span>
              <span className={`grade ${stats.grade}`} title={`Performance score ${stats.score} of 100`}>
                {stats.grade}
              </span>
            </Link>
            <p className="hint" style={{ margin: 0 }}>
              Performance score {stats.score} of 100 · fixed {stats.onTime} of {stats.resolved} on time · missed {stats.escalations} deadline{stats.escalations === 1 ? '' : 's'}
            </p>
            {c.rating && (
              <p style={{ margin: '0.75rem 0 0' }}>
                Citizen rating: <Stars n={c.rating.stars} />
                {c.rating.note && <span className="muted"> “{c.rating.note}”</span>}
              </p>
            )}
          </section>

          {canSupport && (
            <button className="btn btn-primary btn-lg btn-block" type="button" onClick={() => support(c.id)}>
              <Icon name="users" /> I have this problem too
            </button>
          )}
          {supported && (
            <div className="callout ok">
              <Icon name="check" />
              <span>You are supporting this complaint. It now has higher priority.</span>
            </div>
          )}

          <section className="chain" aria-labelledby="chain-title">
            <div className="chain-head">
              <span id="chain-title">Who handles it, in order</span>
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
