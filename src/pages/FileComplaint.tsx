import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Avatar, DEPT_ICON } from '../components/bits';
import { Icon } from '../components/icons';
import { PinPicker } from '../components/Maps';
import { assignee, CATEGORIES, DEPARTMENTS, ward as wardById } from '../lib/catalog';
import { findDuplicates } from '../lib/duplicates';
import { fmtLong } from '../lib/format';
import { formatDistance, wardFor } from '../lib/geo';
import { currentPosition, fileToJpeg, hashPhoto } from '../lib/photos';
import { DAY } from '../lib/sla';
import { useStore } from '../lib/store';

const MAX_TEXT = 600;

export default function FileComplaint() {
  const { db, file, support, notify, now, session } = useStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const deptParam = params.get('dept');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [landmark, setLandmark] = useState('');
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<{ url: string; hash: string } | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [separate, setSeparate] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const w = pin ? wardFor(pin.lat, pin.lng) : null;
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  const owner = cat && w ? assignee(cat.id, w.id) : null;
  const dupes = useMemo(
    () => (cat && pin ? findDuplicates(db.complaints, { categoryId: cat.id, lat: pin.lat, lng: pin.lng }) : []),
    [db.complaints, cat, pin],
  );
  const myId = session?.role === 'citizen' ? session.citizenId : '';
  const sameKindNearby = useMemo(() => (cat ? db.complaints.filter((c) => c.categoryId === cat.id && c.status !== 'closed') : []), [db.complaints, cat]);

  const useMyLocation = async () => {
    setLocating(true);
    const p = await currentPosition();
    setLocating(false);
    if (!p) return setErrors((e) => ({ ...e, pin: 'Could not get your location. Tap the map instead.' }));
    setPin(p);
    setErrors((e) => ({ ...e, pin: wardFor(p.lat, p.lng) ? '' : 'You are outside the demo area (6 wards of Pune). Tap the map to place a pin.' }));
  };

  const onPhoto = async (f: File | undefined) => {
    if (!f) return;
    setPhotoBusy(true);
    try {
      const url = await fileToJpeg(f);
      setPhoto({ url, hash: await hashPhoto(url) });
      setErrors((e) => ({ ...e, photo: '' }));
    } catch (err) {
      setErrors((e) => ({ ...e, photo: (err as Error).message }));
    } finally {
      setPhotoBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!cat) errs.cat = 'Pick what the problem is.';
    if (!pin) errs.pin = 'Place a pin where the problem is.';
    else if (!w) errs.pin = 'That spot is outside the demo area. Pick a point inside one of the 6 wards.';
    if (text.trim().length < 10) errs.text = 'Describe the problem in a sentence or two (at least 10 characters).';
    if (dupes.length && !separate) errs.dupe = 'Someone already reported this nearby. Support their complaint, or confirm yours is different.';
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) {
      document.querySelector('[data-err="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSubmitting(true);
    try {
      const id = file({ categoryId: cat!.id, wardId: w!.id, description: text, lat: pin!.lat, lng: pin!.lng, landmark, photo: photo?.url, photoHash: photo?.hash });
      notify({ tone: 'ok', text: `Complaint sent. Your number is ${id}. It is now with ${owner?.name}.` });
      navigate(`/complaints/${id}`);
    } catch (err) {
      setErrors({ submit: (err as Error).message });
      setSubmitting(false);
    }
  };

  return (
    <div className="wrap">
      <div className="page-head">
        <span className="kicker">Report a problem</span>
        <h1>What needs fixing?</h1>
        <p>Answer three short questions. Your complaint goes straight to the officer for that area, with a date by which it must be fixed.</p>
      </div>

      <div className="steps-bar" aria-label="Your progress">
        <span className={cat ? 'done' : ''}>
          <span className="step-num">{cat ? <Icon name="check" size={18} /> : 1}</span> Problem
        </span>
        <span className={pin && w ? 'done' : ''}>
          <span className="step-num">{pin && w ? <Icon name="check" size={18} /> : 2}</span> Place
        </span>
        <span className={text.trim().length >= 10 ? 'done' : ''}>
          <span className="step-num">{text.trim().length >= 10 ? <Icon name="check" size={18} /> : 3}</span> Details
        </span>
      </div>

      <form className="grid-2" onSubmit={submit} noValidate>
        <div className="stack">
          <section className="panel" data-err={!!errors.cat}>
            <div className="panel-title">
              <h2 className="row">
                <span className="step-num">1</span> What is the problem?
              </h2>
            </div>
            {[...DEPARTMENTS].sort((a, b) => Number(b.id === deptParam) - Number(a.id === deptParam)).map((d) => (
              <fieldset key={d.id} style={{ border: 0, padding: 0, margin: '0 0 14px' }}>
                <legend className="label" style={{ marginBottom: '0.5rem' }}>
                  {d.name}
                </legend>
                <div className="cat-grid">
                  {CATEGORIES.filter((c) => c.dept === d.id).map((c) => (
                    <button key={c.id} type="button" className="cat" aria-pressed={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
                      <span className="cat-glyph" aria-hidden="true">
                        <Icon name={DEPT_ICON[c.dept]} size={22} />
                      </span>
                      <span>
                        {c.name}
                        <small>Must be fixed within {c.slaDays === 1 ? '1 day' : `${c.slaDays} days`}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
            {errors.cat && <p className="err" role="alert">{errors.cat}</p>}
          </section>

          <section className="panel" data-err={!!errors.pin}>
            <div className="panel-title">
              <h2 className="row">
                <span className="step-num">2</span> Where is it?
              </h2>
              <button className="btn btn-sm" type="button" onClick={useMyLocation} disabled={locating}>
                <Icon name="pin" size={20} /> {locating ? 'Finding you…' : 'Use my location'}
              </button>
            </div>
            <p className="hint" style={{ marginTop: 0 }}>
              Tap the map where the problem is. You can drag the pin to move it. {cat && sameKindNearby.length > 0 && 'Orange pins show the same problem already reported by others.'}
            </p>
            <PinPicker
              value={pin}
              others={sameKindNearby}
              onChange={(lat, lng) => {
                setPin({ lat, lng });
                setSeparate(false);
                setErrors((e) => ({ ...e, pin: wardFor(lat, lng) ? '' : 'That spot is outside the demo area. Pick a point inside one of the 6 wards.' }));
              }}
            />
            {errors.pin && <p className="err" role="alert">{errors.pin}</p>}
            <label className="field" style={{ marginTop: 14 }}>
              <span>Nearby landmark (optional)</span>
              <input className="input" maxLength={80} placeholder="e.g. opposite Vanaz bus stop" value={landmark} onChange={(e) => setLandmark(e.target.value)} />
            </label>
          </section>

          {dupes.length > 0 && (
            <section className="callout" data-err={!!errors.dupe} aria-live="polite">
              <Icon name="users" />
              <div className="stack" style={{ gap: '0.6rem' }}>
                <strong>Someone already reported this {formatDistance(dupes[0].meters)} away</strong>
                {dupes.slice(0, 2).map(({ complaint: d, meters }) => {
                  const mine = d.citizenId === myId || d.supporters.includes(myId);
                  return (
                    <div key={d.id} className="row" style={{ justifyContent: 'space-between' }}>
                      <span>
                        <span className="mono">{d.id}</span> · {formatDistance(meters)} away · {d.supporters.length + 1} people affected
                      </span>
                      {mine ? (
                        <Link className="btn btn-sm" to={`/complaints/${d.id}`}>
                          You're on it · view
                        </Link>
                      ) : (
                        <button
                          className="btn btn-sm btn-primary"
                          type="button"
                          onClick={() => {
                            support(d.id);
                            notify({ tone: 'ok', text: `You now support ${d.id}. More supporters means higher priority.` });
                            navigate(`/complaints/${d.id}`);
                          }}
                        >
                          Support this instead
                        </button>
                      )}
                    </div>
                  );
                })}
                <label className="row" style={{ gap: '0.6rem', fontWeight: 600 }}>
                  <input type="checkbox" checked={separate} onChange={(e) => setSeparate(e.target.checked)} style={{ width: '1.4rem', height: '1.4rem' }} />
                  Mine is a different problem. Report it separately.
                </label>
                {errors.dupe && <p className="err" role="alert" style={{ margin: 0 }}>{errors.dupe}</p>}
              </div>
            </section>
          )}

          <section className="panel" data-err={!!errors.text}>
            <div className="panel-title">
              <h2 className="row">
                <span className="step-num">3</span> Tell us more
              </h2>
              <span className="hint">
                {text.length}/{MAX_TEXT}
              </span>
            </div>
            <label className="field">
              <span>Describe the problem</span>
              <textarea className="input" maxLength={MAX_TEXT} value={text} onChange={(e) => setText(e.target.value)} placeholder="For example: Deep pothole near the bus stop, there since Monday. Scooters are slipping." aria-invalid={!!errors.text} />
            </label>
            {errors.text && <p className="err" role="alert">{errors.text}</p>}

            <div className="field" style={{ marginTop: 16 }}>
              <span>Add a photo (optional, but it helps)</span>
              {photo ? (
                <div className="photo-preview">
                  <img src={photo.url} alt="Your photo of the problem" />
                  <button className="btn btn-sm" type="button" onClick={() => setPhoto(null)}>
                    Remove
                  </button>
                </div>
              ) : (
                <label className="dropzone">
                  <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
                  <Icon name="camera" size={34} />
                  <b>{photoBusy ? 'Preparing photo…' : 'Take a photo or choose one'}</b>
                  <span className="hint">Any photo from your phone, up to 15 MB.</span>
                </label>
              )}
              {errors.photo && <p className="err" role="alert">{errors.photo}</p>}
            </div>
          </section>
        </div>

        <aside className="stack" style={{ position: 'sticky', top: 88 }}>
          <div className="panel strong">
            <span className="kicker">Who will handle it</span>
            {owner && cat && w ? (
              <div className="stack" style={{ gap: 14, marginTop: 12 }}>
                <div className="row">
                  <Avatar name={owner.name} />
                  <div>
                    <strong>{owner.name}</strong>
                    <div className="hint">{owner.designation}</div>
                  </div>
                </div>
                <div className="sla">
                  <span className="sla-label">
                    <Icon name="calendar" /> Must be fixed by
                  </span>
                  <span className="sla-time">{fmtLong(now() + cat.slaDays * DAY)}</span>
                  <span className="sla-sub">
                    {cat.name} · {wardById(w.id)?.name} ward · {cat.slaDays} day{cat.slaDays > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="hint" style={{ margin: 0 }}>
                  If it is not fixed by then, it goes to their senior officer automatically.
                </p>
              </div>
            ) : (
              <p className="muted" style={{ marginBottom: 0 }}>
                Choose the problem and mark the place. We will show you the officer's name and the deadline here.
              </p>
            )}
          </div>
          {errors.submit && <p className="err" role="alert">{errors.submit}</p>}
          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send complaint'} <Icon name="arrowRight" />
          </button>
          <p className="hint" style={{ margin: 0, textAlign: 'center' }}>
            You will get a complaint number to track it.
          </p>
        </aside>
      </form>
    </div>
  );
}
