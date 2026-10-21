import exifr from 'exifr';
import { useEffect, useRef, useState } from 'react';
import { checkText, useT } from '../lib/i18n';
import { fileToJpeg, currentPosition, hashPhoto, photoSrc, toJpeg } from '../lib/photos';
import { allPass, knownPhotos, runChecks } from '../lib/proof';
import { sceneFor, sceneSvg } from '../lib/scenes';
import { useStore } from '../lib/store';
import type { Check, Complaint, PhotoSource } from '../lib/types';
import { Icon } from './icons';

interface Shot {
  photo: string;
  source: PhotoSource;
  takenAt: number | null;
  lat?: number;
  lng?: number;
}

export default function ProofDialog({ c, onClose }: { c: Complaint; onClose: () => void }) {
  const { db, now, submitProof, notify } = useStore();
  const { t, lang } = useT();
  const dlg = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [shot, setShot] = useState<Shot | null>(null);
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [shown, setShown] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [logged, setLogged] = useState(false);
  const hashRef = useRef('');

  // Removing the element on unmount ends the modal, so there is no close() in a cleanup
  // (StrictMode re-runs effects, and close() would fire onClose and unmount the dialog).
  useEffect(() => {
    if (dlg.current && !dlg.current.open) dlg.current.showModal();
  }, []);

  // Start the camera; stop it when the dialog closes or a photo is taken.
  useEffect(() => {
    if (shot) return;
    let s: MediaStream | null = null;
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError('noCam');
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false })
      .then((ms) => {
        if (cancelled) return ms.getTracks().forEach((t) => t.stop());
        s = ms;
        setStream(ms);
        if (video.current) video.current.srcObject = ms;
      })
      .catch(() => setCamError('blocked'));
    return () => {
      cancelled = true;
      s?.getTracks().forEach((t) => t.stop());
      setStream(null);
    };
  }, [shot]);

  // Reveal check results one by one.
  useEffect(() => {
    if (!checks || shown >= checks.length) return;
    const t = window.setTimeout(() => setShown((n) => n + 1), 380);
    return () => window.clearTimeout(t);
  }, [checks, shown]);

  const verify = async (s: Shot) => {
    setShot(s);
    setChecks(null);
    setShown(0);
    setLogged(false);
    setBusy(t('pd.checking'));
    try {
      const hash = await hashPhoto(s.photo);
      const res = runChecks({ ...s, hash }, c, knownPhotos(db.complaints, c), now());
      setChecks(res);
      if (!allPass(res)) {
        // Failed attempts are recorded, so retrying with a fake photo is visible on the record.
        submitProof(c.id, { ...s, hash, takenAt: s.takenAt ?? now(), checks: res });
        setLogged(true);
      } else {
        hashRef.current = hash;
      }
    } catch (e) {
      notify({ tone: 'bad', text: (e as Error).message });
      setShot(null);
    } finally {
      setBusy(null);
    }
  };

  const capture = async () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    setBusy(t('pd.locating'));
    const photo = toJpeg(v, 800, v.videoWidth, v.videoHeight);
    const pos = await currentPosition();
    verify({ photo, source: 'camera', takenAt: now(), lat: pos?.lat, lng: pos?.lng });
  };

  const upload = async (f: File | undefined) => {
    if (!f) return;
    setBusy(t('pd.reading'));
    try {
      const [photo, meta] = await Promise.all([fileToJpeg(f), exifr.parse(f, { gps: true, pick: ['DateTimeOriginal', 'latitude', 'longitude'] }).catch(() => null)]);
      const taken = meta?.DateTimeOriginal instanceof Date ? meta.DateTimeOriginal.getTime() : null;
      verify({ photo, source: 'upload', takenAt: taken, lat: meta?.latitude, lng: meta?.longitude });
    } catch (e) {
      setBusy(null);
      notify({ tone: 'bad', text: (e as Error).message });
    }
  };

  const demoOnSite = () => {
    const kind = sceneFor(c.categoryId);
    const svg = sceneSvg(kind, c.id, true, String(Date.now()));
    const jitter = () => (Math.random() - 0.5) * 0.0006;
    verify({ photo: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), source: 'demo-camera', takenAt: now(), lat: c.lat + jitter(), lng: c.lng + jitter() });
  };

  const demoReuse = () => {
    const old =
      db.complaints.find((x) => x.proof && x.id !== c.id && x.categoryId === c.categoryId) ?? db.complaints.find((x) => x.proof && x.id !== c.id);
    if (!old?.proof) return notify({ tone: 'info', key: 'toast.noOld' });
    verify({ photo: photoSrc(old.proof.photo)!, source: 'demo-camera', takenAt: now(), lat: c.lat + 0.0002, lng: c.lng - 0.0002 });
  };

  const retake = () => {
    setShot(null);
    setChecks(null);
    setShown(0);
  };

  const done = checks && shown >= checks.length;
  const passed = done && allPass(checks!);

  return (
    <dialog ref={dlg} className="modal" onClose={onClose} aria-labelledby="proof-title">
      <div className="modal-head">
        <h2 id="proof-title">{t('pd.title', { id: c.id })}</h2>
        <button className="icon-btn" type="button" onClick={() => dlg.current?.close()} aria-label={t('pd.close')}>
          <Icon name="close" />
        </button>
      </div>
      <div className="modal-body">
        <p className="muted" style={{ margin: 0 }}>
          {t('pd.help')}
        </p>

        <div className="camera">
          {shot ? (
            <img src={shot.photo} alt={t('pd.captured')} />
          ) : (
            <>
              <video ref={video} autoPlay playsInline muted aria-label={t('pd.preview')} />
              {!stream && <div className="camera-msg">{t(camError === 'noCam' ? 'pd.noCam' : camError ? 'pd.blocked' : 'pd.starting')}</div>}
            </>
          )}
          <span className="camera-frame" aria-hidden="true" />
        </div>

        {busy && (
          <p className="row" role="status" style={{ margin: 0 }}>
            <span className="mark wait" aria-hidden="true" />
            {busy}
          </p>
        )}

        {checks && (
          <ul className="checks" aria-live="polite">
            {checks.map((k, i) => {
              const text = checkText(k, t, lang);
              const ready = i < shown;
              return (
                <li key={k.id}>
                  <span className={`mark ${ready ? (k.pass ? 'pass' : 'fail') : 'wait'}`} aria-hidden="true">
                    {ready && <Icon name={k.pass ? 'check' : 'close'} />}
                  </span>
                  <span>
                    <b>{ready ? text.title : t(`ck.${k.id}`)}</b>
                    <span className="muted">{ready ? text.detail : t('pd.checkingShort')}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {done && !passed && logged && (
          <div className="callout bad">
            <Icon name="alert" />
            <span>{t('pd.rejected')}</span>
          </div>
        )}

        <div className="row">
          {!shot && (
            <>
              <button className="btn btn-primary" type="button" onClick={capture} disabled={!stream || !!busy}>
                <Icon name="camera" /> {t('pd.take')}
              </button>
              <label className="btn">
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
                {t('pd.gallery')}
              </label>
            </>
          )}
          {shot && done && passed && (
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                submitProof(c.id, { photo: shot.photo, hash: hashRef.current, takenAt: shot.takenAt ?? now(), lat: shot.lat, lng: shot.lng, source: shot.source, checks: checks! });
                notify({ tone: 'ok', key: 'toast.resolved', vars: { id: c.id } });
                dlg.current?.close();
              }}
            >
              <Icon name="check" /> {t('pd.mark')}
            </button>
          )}
          {shot && done && (
            <button className="btn" type="button" onClick={retake}>
              {t('pd.retake')}
            </button>
          )}
        </div>

        {!shot && (
          <div className="demo-tools">
            <span className="kicker">{t('pd.demoTitle')}</span>
            <div className="row">
              <button className="btn btn-sm" type="button" onClick={demoOnSite} disabled={!!busy}>
                {t('pd.demoLive')}
              </button>
              <button className="btn btn-sm btn-danger" type="button" onClick={demoReuse} disabled={!!busy}>
                {t('pd.demoCheat')}
              </button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
