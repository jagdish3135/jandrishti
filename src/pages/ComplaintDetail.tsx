import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Avatar, SlaPlate, Stars, StatusPill } from '../components/bits';
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

const CHECK_NAMES = { live: 'Live capture', location: 'On site', time: 'After filing', reuse: 'Never used before' };

function eventText(e: CEvent) {
  const o = e.officerId ? officer(e.officerId) : undefined;
  const from = e.fromOfficerId ? officer(e.fromOfficerId) : undefined;
  switch (e.kind) {
    case 'filed':
      return 'Complaint filed';
    case 'assigned':
      return `Assigned to ${o?.name}, ${o?.designation}`;
    case 'started':
      return `${o?.name} started work`;
    case 'escalated':
      return `${from?.name} missed the deadline. Escalated to ${o?.name}, ${o?.designation}`;
    case 'proof_rejected':
      return `Proof photo from ${o?.name} was rejected`;
    case 'resolved':
      return `Marked fixed by ${o?.name}${e.onTime ? ', before the deadline' : ', after the deadline'}`;
    case 'confirmed':
      return 'Citizen confirmed the fix';
    case 'reopened':
      return `Citizen reopened it. Back to ${o?.name}`;
    case 'rated':
      return `Citizen rated the resolution ${e.note}`;
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
    <ol className="ladder" style={{ color: 'var(--plate-ink)' }}>
      {chain.map((o, i) => (
        <li key={o.id} className={o.id === c.officerId && isOpen(c) ? 'now' : missed.has(o.id) ? 'missed' : ''}>
          <span className="lvl">L{o.level}</span>
          <span>
            <Link to={`/officers/${o.id}`} style={{ textDecoration: 'none' }}>
              {o.name}
            </Link>
            <br />
            <small>{o.designation}</small>
          </span>
          <small>{missed.has(o.id) ? 'missed deadline' : o.id === c.officerId ? (isOpen(c) ? 'owns it now' : 'resolved') : i > idx ? 'next if missed' : ''}</small>
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
      <div className="panel strong stack" style={{ gap: 12 }}>
        <span className="kicker">Your turn</span>
        <h2 style={{ fontSize: 30 }}>Is it really fixed?</h2>
        <p className="muted" style={{ margin: 0 }}>
          Check the proof photo below. If the problem is still there, reopen it and it goes back to the officer with a short deadline.
        </p>
        {!reopening ? (
          <div className="row">
            <button className="btn btn-primary" type="button" onClick={() => confirm(c.id)}>
              ✓ Yes, it's fixed
            </button>
            <button className="btn btn-danger" type="button" onClick={() => setReopening(true)}>
              No, reopen it
            </button>
          </div>
        ) : (
          <form
            className="stack"
            style={{ gap: 10 }}
            onSubmit={(e) => {
              e.preventDefault();
              reopen(c.id, why);
            }}
          >
            <label className="field">
              <span>What's still wrong?</span>
              <textarea className="input" maxLength={300} value={why} onChange={(e) => setWhy(e.target.value)} style={{ minHeight: 80 }} autoFocus />
            </label>
            <div className="row">
              <button className="btn btn-danger" type="submit">
                Reopen complaint
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setReopening(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    );

  if (c.status === 'closed' && !c.rating)
    return (
      <form
        className="panel strong stack"
        style={{ gap: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (stars) rate(c.id, stars, note);
        }}
      >
        <span className="kicker">Rate the resolution</span>
        <h2 style={{ fontSize: 30 }}>How was it handled?</h2>
        <p className="muted" style={{ margin: 0 }}>
          You're rating this one case, not the person. It counts toward {officer(c.resolvedBy ?? c.officerId)?.name}'s score.
        </p>
        <div className="stars" role="group" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" aria-pressed={stars >= n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setStars(n)}>
              ★
            </button>
          ))}
        </div>
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
  const now = useNow(1000);
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
  const rejected = c.events.filter((e) => e.kind === 'proof_rejected');

  return (
    <div className="wrap">
      <div className="page-head">
        <div className="row">
          <span className="kicker mono">{c.id}</span>
          <StatusPill c={c} now={now} />
          <span className="chip">{department(cat.dept)?.name}</span>
        </div>
        <h1>{cat.name}</h1>
        <p>
          {ward(c.wardId)?.name} ward{c.landmark ? ` · ${c.landmark}` : ''} · filed {fmtDateTime(c.createdAt)} by {isOwner ? 'you' : citizen ? maskName(citizen.name) : 'a citizen'}
          {c.supporters.length > 0 && ` · supported by ${c.supporters.length} neighbour${c.supporters.length > 1 ? 's' : ''}`}
        </p>
      </div>

      <div className="grid-2">
        <div className="stack">
          {isOwner && <CitizenActions c={c} />}

          {isOfficer && isOpen(c) && (
            <div className="panel strong stack" style={{ gap: 12 }}>
              <span className="kicker">Assigned to you</span>
              <div className="row">
                {c.status !== 'in_progress' && (
                  <button className="btn" type="button" onClick={() => startWork(c.id)}>
                    Start work
                  </button>
                )}
                <button className="btn btn-primary" type="button" onClick={() => setProofOpen(true)}>
                  Upload proof and resolve
                </button>
              </div>
            </div>
          )}

          <section className="panel">
            <div className="panel-title">
              <h2>Description</h2>
            </div>
            <p style={{ margin: 0, fontSize: 17 }}>{c.description}</p>
          </section>

          <section className="panel">
            <div className="panel-title">
              <h2>Photos</h2>
              {c.proof && <span className="pill ok">Proof verified</span>}
            </div>
            <div className="photos">
              {c.photo ? (
                <figure className="photo">
                  <img src={photoSrc(c.photo)} alt={`Citizen's photo of the ${cat.name.toLowerCase()}`} />
                  <figcaption>Citizen · before</figcaption>
                </figure>
              ) : (
                <div className="photo-empty">No photo from the citizen</div>
              )}
              {c.proof ? (
                <figure className="photo">
                  <img src={photoSrc(c.proof.photo)} alt="Officer's proof photo after the fix" />
                  <figcaption>Proof · after</figcaption>
                </figure>
              ) : (
                <div className="photo-empty">The officer's proof photo appears here once it passes all checks</div>
              )}
            </div>
            {c.proof && (
              <ul className="checks" style={{ marginTop: 16 }}>
                {c.proof.checks.map((k) => (
                  <li key={k.id}>
                    <span className={`mark ${k.pass ? 'pass' : 'fail'}`} aria-hidden="true">
                      {k.pass ? '✓' : '✕'}
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
              <p className="callout bad" style={{ marginTop: 16, marginBottom: 0 }}>
                <span aria-hidden="true">✕</span>
                <span>
                  {rejected.length} proof photo{rejected.length > 1 ? 's were' : ' was'} rejected before this case could close. It's on the officer's record.
                </span>
              </p>
            )}
          </section>

          <section className="panel">
            <div className="panel-title">
              <h2>Timeline</h2>
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
            <span className="kicker">{isOpen(c) ? 'Responsible officer' : 'Resolved by'}</span>
            <Link to={`/officers/${owner.id}`} className="row" style={{ textDecoration: 'none', margin: '12px 0' }}>
              <Avatar name={owner.name} />
              <span style={{ flex: 1 }}>
                <strong>{owner.name}</strong>
                <span className="hint" style={{ display: 'block' }}>
                  {owner.designation}
                </span>
              </span>
              <span className={`grade ${stats.grade}`} title={`Score ${stats.score}`}>
                {stats.grade}
              </span>
            </Link>
            <p className="hint" style={{ margin: 0 }}>
              Score {stats.score}/100 · {stats.onTime} of {stats.resolved} fixed on time · {stats.escalations} escalations
            </p>
            {c.rating && (
              <p style={{ marginBottom: 0 }}>
                Citizen rating: <Stars n={c.rating.stars} />
                {c.rating.note && <span className="muted"> “{c.rating.note}”</span>}
              </p>
            )}
          </section>

          <section className="board" style={{ boxShadow: 'none' }}>
            <div className="board-head">
              <span>ESCALATION CHAIN</span>
            </div>
            <Ladder c={c} />
          </section>

          {canSupport && (
            <button className="btn btn-primary" type="button" onClick={() => support(c.id)}>
              + I have this problem too
            </button>
          )}

          <div style={{ height: 260 }}>
            <ComplaintsMap complaints={[c]} now={now} />
          </div>
        </aside>
      </div>
      {proofOpen && <ProofDialog c={c} onClose={() => setProofOpen(false)} />}
    </div>
  );
}
