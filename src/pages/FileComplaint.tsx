import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Avatar } from '../components/bits';
import { PinPicker } from '../components/Maps';
import { assignee, CATEGORIES, DEPARTMENTS, ward as wardById } from '../lib/catalog';
import { findDuplicates } from '../lib/duplicates';
import { fmtDateTime } from '../lib/format';
import { formatDistance, wardFor } from '../lib/geo';
import { currentPosition, fileToJpeg, hashPhoto } from '../lib/photos';
import { DAY } from '../lib/sla';
import { useStore } from '../lib/store';

const MAX_TEXT = 600;

export default function FileComplaint() {
  const { db, file, support, notify, now, session } = useStore();
  const navigate = useNavigate();
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
      notify({ tone: 'ok', text: `${id} filed and assigned to ${owner?.name}.` });
      navigate(`/complaints/${id}`);
    } catch (err) {
      setErrors({ submit: (err as Error).message });
      setSubmitting(false);
    }
  };

  return (
    <div className="wrap">
      <div className="page-head">
        <span className="kicker">New complaint</span>
        <h1>What needs fixing?</h1>
        <p>It goes straight to the officer responsible for that ward, with a deadline you can see.</p>
      </div>

      <form className="grid-2" onSubmit={submit} noValidate>
        <div className="stack">
          <section className="panel" data-err={!!errors.cat}>
            <div className="panel-title">
              <h2 className="row">
                <span className="step-num">1</span> Problem
              </h2>
            </div>
            {DEPARTMENTS.map((d) => (
              <fieldset key={d.id} style={{ border: 0, padding: 0, margin: '0 0 14px' }}>
                <legend className="label" style={{ marginBottom: 8 }}>
                  {d.name}
                </legend>
                <div className="cat-grid">
                  {CATEGORIES.filter((c) => c.dept === d.id).map((c) => (
                    <button key={c.id} type="button" className="cat" aria-pressed={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
                      <span className="cat-glyph" aria-hidden="true">
                        {c.glyph}
                      </span>
                      <span>
                        {c.name}
                        <small>Fix within {c.slaDays === 1 ? '1 day' : `${c.slaDays} days`}</small>
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
                <span className="step-num">2</span> Location
              </h2>
              <button className="btn btn-sm" type="button" onClick={useMyLocation} disabled={locating}>
                {locating ? 'Finding you…' : '◎ Use my location'}
              </button>
            </div>
            <p className="hint" style={{ marginTop: 0 }}>
              Tap the map to drop a pin, then drag it to the exact spot. {cat && sameKindNearby.length > 0 && 'Orange pins are open complaints of the same type.'}
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
              <span>Landmark (optional)</span>
              <input className="input" maxLength={80} placeholder="e.g. opposite Vanaz bus stop" value={landmark} onChange={(e) => setLandmark(e.target.value)} />
            </label>
          </section>

          {dupes.length > 0 && (
            <section className="callout" data-err={!!errors.dupe} aria-live="polite">
              <span className="step-num" aria-hidden="true">
                !
              </span>
              <div className="stack" style={{ gap: 10 }}>
                <strong>Already reported {formatDistance(dupes[0].meters)} away</strong>
                {dupes.slice(0, 2).map(({ complaint: d, meters }) => {
                  const mine = d.citizenId === myId || d.supporters.includes(myId);
                  return (
                    <div key={d.id} className="row" style={{ justifyContent: 'space-between' }}>
                      <span>
                        <span className="mono">{d.id}</span> · {formatDistance(meters)} · {d.supporters.length + 1} people
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
                <label className="row" style={{ gap: 8, fontSize: 14 }}>
                  <input type="checkbox" checked={separate} onChange={(e) => setSeparate(e.target.checked)} style={{ width: 20, height: 20 }} />
                  Mine is a different problem. File it separately.
                </label>
                {errors.dupe && <p className="err" role="alert" style={{ margin: 0 }}>{errors.dupe}</p>}
              </div>
            </section>
          )}

          <section className="panel" data-err={!!errors.text}>
            <div className="panel-title">
              <h2 className="row">
                <span className="step-num">3</span> Details
              </h2>
              <span className="hint">
                {text.length}/{MAX_TEXT}
              </span>
            </div>
            <label className="field">
              <span>What's wrong?</span>
              <textarea className="input" maxLength={MAX_TEXT} value={text} onChange={(e) => setText(e.target.value)} placeholder="What, since when, and who is affected." aria-invalid={!!errors.text} />
            </label>
            {errors.text && <p className="err" role="alert">{errors.text}</p>}

            <div className="field" style={{ marginTop: 16 }}>
              <span>Photo (optional, helps the officer)</span>
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
                  <b>{photoBusy ? 'Preparing photo…' : '📷  Take or choose a photo'}</b>
                  <span className="hint">JPG or PNG, up to 15 MB. It's shrunk before saving.</span>
                </label>
              )}
              {errors.photo && <p className="err" role="alert">{errors.photo}</p>}
            </div>
          </section>
        </div>

        <aside className="stack" style={{ position: 'sticky', top: 88 }}>
          <div className="panel strong">
            <span className="kicker">Routing preview</span>
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
                  <span className="sla-label">Deadline if filed now</span>
                  <span className="sla-time" style={{ fontSize: 28 }}>
                    {fmtDateTime(now() + cat.slaDays * DAY)}
                  </span>
                  <span className="sla-sub">
                    {cat.name} · {wardById(w.id)?.name} ward · {cat.slaDays} day{cat.slaDays > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="hint" style={{ margin: 0 }}>
                  If it isn't fixed by then, it moves to their senior automatically.
                </p>
              </div>
            ) : (
              <p className="muted" style={{ marginBottom: 0 }}>
                Pick a problem and a place to see who it goes to and the deadline.
              </p>
            )}
          </div>
          {errors.submit && <p className="err" role="alert">{errors.submit}</p>}
          <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%', minHeight: 56, fontSize: 18 }}>
            {submitting ? 'Filing…' : 'File complaint'}
          </button>
        </aside>
      </form>
    </div>
  );
}
