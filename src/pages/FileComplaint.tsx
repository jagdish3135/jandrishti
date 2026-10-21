import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Avatar, DEPT_ICON } from '../components/bits';
import { Icon } from '../components/icons';
import { PinPicker } from '../components/Maps';
import { assignee, CATEGORIES, DEPARTMENTS } from '../lib/catalog';
import { findDuplicates } from '../lib/duplicates';
import { formatDistance, wardFor } from '../lib/geo';
import { useT } from '../lib/i18n';
import { currentPosition, fileToJpeg, hashPhoto } from '../lib/photos';
import { DAY } from '../lib/sla';
import { useStore } from '../lib/store';
import type { DeptId } from '../lib/types';

const MAX_TEXT = 600;
const isDept = (v: string | null): v is DeptId => !!v && DEPARTMENTS.some((d) => d.id === v);

export default function FileComplaint() {
  const { db, file, support, notify, now, session } = useStore();
  const { t, dept: deptName, catName, wardName, designation, days, fmtLong } = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fromHome = params.get('dept');
  const [dept, setDept] = useState<DeptId | ''>(isDept(fromHome) ? fromHome : '');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [otherType, setOtherType] = useState('');
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
  const cat = CATEGORIES.find((c) => c.id === categoryId && c.dept === dept);
  const types = CATEGORIES.filter((c) => c.dept === dept);
  const owner = cat && w ? assignee(cat.id, w.id) : null;
  const problemDone = !!cat && (!cat.other || otherType.trim().length >= 3);
  // "Other" complaints are all different, so they are never treated as duplicates.
  const dupes = useMemo(
    () => (cat && !cat.other && pin ? findDuplicates(db.complaints, { categoryId: cat.id, lat: pin.lat, lng: pin.lng }) : []),
    [db.complaints, cat, pin],
  );
  const myId = session?.role === 'citizen' ? session.citizenId : '';
  const sameKindNearby = useMemo(
    () => (cat && !cat.other ? db.complaints.filter((c) => c.categoryId === cat.id && c.status !== 'closed') : []),
    [db.complaints, cat],
  );

  const useMyLocation = async () => {
    setLocating(true);
    const p = await currentPosition();
    setLocating(false);
    if (!p) return setErrors((e) => ({ ...e, pin: t('file.errLocate') }));
    setPin(p);
    setErrors((e) => ({ ...e, pin: wardFor(p.lat, p.lng) ? '' : t('file.errLocateOut') }));
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
    if (!dept) errs.dept = t('file.errDept');
    else if (!cat) errs.cat = t('file.errCat');
    else if (cat.other && otherType.trim().length < 3) errs.other = t('file.errOther');
    if (!pin) errs.pin = t('file.errPin');
    else if (!w) errs.pin = t('file.errOutside');
    if (text.trim().length < 10) errs.text = t('file.errText');
    if (dupes.length && !separate) errs.dupe = t('file.errDup');
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) {
      window.setTimeout(() => document.querySelector('[data-err="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
      return;
    }
    setSubmitting(true);
    try {
      const id = file({ categoryId: cat!.id, otherType, wardId: w!.id, description: text, lat: pin!.lat, lng: pin!.lng, landmark, photo: photo?.url, photoHash: photo?.hash });
      notify({ tone: 'ok', key: 'toast.filed', vars: { id, officerId: owner!.id } });
      navigate(`/complaints/${id}`);
    } catch (err) {
      setErrors({ submit: (err as Error).message });
      setSubmitting(false);
    }
  };

  const stepDone = (done: boolean, n: number) => (
    <span className="step-num">{done ? <Icon name="check" size={18} /> : n}</span>
  );

  return (
    <div className="wrap">
      <div className="page-head">
        <span className="kicker">{t('file.kicker')}</span>
        <h1>{t('file.title')}</h1>
        <p>{t('file.help')}</p>
      </div>

      <div className="steps-bar" aria-label={t('file.progress')}>
        <span className={problemDone ? 'done' : ''}>
          {stepDone(problemDone, 1)} {t('file.stepProblem')}
        </span>
        <span className={pin && w ? 'done' : ''}>
          {stepDone(!!(pin && w), 2)} {t('file.stepPlace')}
        </span>
        <span className={text.trim().length >= 10 ? 'done' : ''}>
          {stepDone(text.trim().length >= 10, 3)} {t('file.stepDetails')}
        </span>
      </div>

      <form className="grid-2" onSubmit={submit} noValidate>
        <div className="stack">
          <section className="panel" data-err={!!(errors.dept || errors.cat || errors.other)}>
            <div className="panel-title">
              <h2>
                <span className="step-num">1</span> {t('file.q1')}
              </h2>
            </div>

            <label className="field">
              <span>{t('file.dept')}</span>
              <div className="select-wrap">
                {dept && (
                  <span className="select-ico" aria-hidden="true">
                    <Icon name={DEPT_ICON[dept]} size={22} />
                  </span>
                )}
                <select
                  className={`input${dept ? ' has-ico' : ''}`}
                  value={dept}
                  aria-invalid={!!errors.dept}
                  onChange={(e) => {
                    setDept(e.target.value as DeptId);
                    setCategoryId(null);
                    setErrors((x) => ({ ...x, dept: '', cat: '', other: '' }));
                  }}
                >
                  <option value="">{t('file.deptChoose')}</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {deptName(d.id)}
                    </option>
                  ))}
                </select>
              </div>
              <span className="hint">{t('file.deptHelp')}</span>
            </label>
            {errors.dept && (
              <p className="err" role="alert">
                {errors.dept}
              </p>
            )}

            {dept && (
              <fieldset className="types" aria-describedby={errors.cat ? 'cat-err' : undefined}>
                <legend className="label">{t('file.type')}</legend>
                <div className="cat-grid">
                  {types.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`cat${c.other ? ' cat-other' : ''}`}
                      aria-pressed={categoryId === c.id}
                      onClick={() => {
                        setCategoryId(c.id);
                        setSeparate(false);
                        setErrors((x) => ({ ...x, cat: '', other: '' }));
                      }}
                    >
                      <span className="cat-glyph" aria-hidden="true">
                        <Icon name={c.other ? 'more' : DEPT_ICON[c.dept]} size={22} />
                      </span>
                      <span>
                        {catName(c.id)}
                        <small>{c.other ? t('file.otherHelp') : t('file.within', { span: days(c.slaDays) })}</small>
                      </span>
                    </button>
                  ))}
                </div>
                {errors.cat && (
                  <p id="cat-err" className="err" role="alert">
                    {errors.cat}
                  </p>
                )}
                {cat?.other && (
                  <label className="field" style={{ marginTop: '0.9rem' }}>
                    <span>{t('file.otherLabel')}</span>
                    <input
                      className="input"
                      maxLength={60}
                      value={otherType}
                      placeholder={t('file.otherPh')}
                      onChange={(e) => {
                        setOtherType(e.target.value);
                        setErrors((x) => ({ ...x, other: '' }));
                      }}
                      aria-invalid={!!errors.other}
                      autoFocus
                    />
                    <span className="hint">{t('file.within', { span: days(cat.slaDays) })}</span>
                  </label>
                )}
                {errors.other && (
                  <p className="err" role="alert">
                    {errors.other}
                  </p>
                )}
              </fieldset>
            )}
          </section>

          <section className="panel" data-err={!!errors.pin}>
            <div className="panel-title">
              <h2>
                <span className="step-num">2</span> {t('file.q2')}
              </h2>
              <button className="btn btn-sm" type="button" onClick={useMyLocation} disabled={locating}>
                <Icon name="pin" size={20} /> {locating ? t('file.finding') : t('file.useLocation')}
              </button>
            </div>
            <p className="hint" style={{ marginTop: 0 }}>
              {t('file.mapHelp')} {sameKindNearby.length > 0 && t('file.mapHelpDup')}
            </p>
            <PinPicker
              value={pin}
              others={sameKindNearby}
              onChange={(lat, lng) => {
                setPin({ lat, lng });
                setSeparate(false);
                setErrors((e) => ({ ...e, pin: wardFor(lat, lng) ? '' : t('file.errOutside') }));
              }}
            />
            {errors.pin && (
              <p className="err" role="alert">
                {errors.pin}
              </p>
            )}
            <label className="field" style={{ marginTop: '0.9rem' }}>
              <span>{t('file.landmark')}</span>
              <input className="input" maxLength={80} placeholder={t('file.landmarkPh')} value={landmark} onChange={(e) => setLandmark(e.target.value)} />
            </label>
          </section>

          {dupes.length > 0 && (
            <section className="callout" data-err={!!errors.dupe} aria-live="polite">
              <Icon name="users" />
              <div className="stack" style={{ gap: '0.6rem' }}>
                <strong>{t('file.dupTitle', { dist: formatDistance(dupes[0].meters) })}</strong>
                {dupes.slice(0, 2).map(({ complaint: d, meters }) => {
                  const mine = d.citizenId === myId || d.supporters.includes(myId);
                  return (
                    <div key={d.id} className="row" style={{ justifyContent: 'space-between' }}>
                      <span>
                        <span className="mono">{d.id}</span> · {t('file.dupRow', { dist: formatDistance(meters), n: d.supporters.length + 1 })}
                      </span>
                      {mine ? (
                        <Link className="btn btn-sm" to={`/complaints/${d.id}`}>
                          {t('file.dupMine')}
                        </Link>
                      ) : (
                        <button
                          className="btn btn-sm btn-primary"
                          type="button"
                          onClick={() => {
                            support(d.id);
                            notify({ tone: 'ok', key: 'toast.supported', vars: { id: d.id } });
                            navigate(`/complaints/${d.id}`);
                          }}
                        >
                          {t('file.dupSupport')}
                        </button>
                      )}
                    </div>
                  );
                })}
                <label className="row" style={{ gap: '0.6rem', fontWeight: 600 }}>
                  <input type="checkbox" checked={separate} onChange={(e) => setSeparate(e.target.checked)} style={{ width: '1.4rem', height: '1.4rem' }} />
                  {t('file.dupSeparate')}
                </label>
                {errors.dupe && (
                  <p className="err" role="alert">
                    {errors.dupe}
                  </p>
                )}
              </div>
            </section>
          )}

          <section className="panel" data-err={!!errors.text}>
            <div className="panel-title">
              <h2>
                <span className="step-num">3</span> {t('file.q3')}
              </h2>
              <span className="hint">
                {text.length}/{MAX_TEXT}
              </span>
            </div>
            <label className="field">
              <span>{t('file.describe')}</span>
              <textarea className="input" maxLength={MAX_TEXT} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('file.describePh')} aria-invalid={!!errors.text} />
            </label>
            {errors.text && (
              <p className="err" role="alert">
                {errors.text}
              </p>
            )}

            <div className="field" style={{ marginTop: '1rem' }}>
              <span>{t('file.photo')}</span>
              {photo ? (
                <div className="photo-preview">
                  <img src={photo.url} alt={t('file.photoAlt')} />
                  <button className="btn btn-sm" type="button" onClick={() => setPhoto(null)}>
                    {t('file.remove')}
                  </button>
                </div>
              ) : (
                <label className="dropzone">
                  <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
                  <Icon name="camera" size={34} />
                  <b>{photoBusy ? t('file.photoBusy') : t('file.photoBtn')}</b>
                  <span className="hint">{t('file.photoHint')}</span>
                </label>
              )}
              {errors.photo && (
                <p className="err" role="alert">
                  {errors.photo}
                </p>
              )}
            </div>
          </section>
        </div>

        <aside className="stack" style={{ position: 'sticky', top: '6rem' }}>
          <div className="panel strong">
            <span className="kicker">{t('file.who')}</span>
            {owner && cat && w ? (
              <div className="stack" style={{ gap: '0.9rem', marginTop: '0.75rem' }}>
                <div className="row" style={{ flexWrap: 'nowrap' }}>
                  <Avatar name={owner.name} />
                  <div>
                    <strong>{owner.name}</strong>
                    <div className="hint">{designation(owner)}</div>
                  </div>
                </div>
                <div className="sla">
                  <span className="sla-label">
                    <Icon name="calendar" /> {t('sla.mustBy')}
                  </span>
                  <span className="sla-time">{fmtLong(now() + cat.slaDays * DAY)}</span>
                  <span className="sla-sub">
                    {t('file.wardDays', { cat: cat.other && otherType.trim() ? otherType.trim() : catName(cat.id), ward: wardName(w.id), span: days(cat.slaDays) })}
                  </span>
                </div>
                <p className="hint" style={{ margin: 0 }}>
                  {t('file.goesUp')}
                </p>
              </div>
            ) : (
              <p className="muted" style={{ marginBottom: 0 }}>
                {t('file.whoEmpty')}
              </p>
            )}
          </div>
          {errors.submit && (
            <p className="err" role="alert">
              {errors.submit}
            </p>
          )}
          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={submitting}>
            {submitting ? t('file.sending') : t('file.send')} <Icon name="arrowRight" />
          </button>
          <p className="hint" style={{ margin: 0, textAlign: 'center' }}>
            {t('file.getNumber')}
          </p>
        </aside>
      </form>
    </div>
  );
}
