import exifr from 'exifr';
import { useEffect, useRef, useState } from 'react';
import { category } from '../lib/catalog';
import { fileToJpeg, currentPosition, hashPhoto, photoSrc, toJpeg } from '../lib/photos';
import { allPass, knownPhotos, runChecks } from '../lib/proof';
import { SCENE_FOR_CATEGORY, sceneSvg } from '../lib/scenes';
import { useStore } from '../lib/store';
import type { Check, Complaint, PhotoSource } from '../lib/types';

const CHECK_NAMES = { live: 'Live capture', location: 'On site', time: 'After filing', reuse: 'Never used before' };

interface Shot {
  photo: string;
  source: PhotoSource;
  takenAt: number | null;
  lat?: number;
  lng?: number;
}

export default function ProofDialog({ c, onClose }: { c: Complaint; onClose: () => void }) {
  const { db, now, submitProof, notify } = useStore();
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
      setCamError('This browser has no camera access. Use the demo options below.');
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
      .catch(() => setCamError('Camera is blocked or not available. Allow camera access, or use the demo options below.'));
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
    setBusy('Checking photo…');
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
    setBusy('Getting your location…');
    const photo = toJpeg(v, 800, v.videoWidth, v.videoHeight);
    const pos = await currentPosition();
    verify({ photo, source: 'camera', takenAt: now(), lat: pos?.lat, lng: pos?.lng });
  };

  const upload = async (f: File | undefined) => {
    if (!f) return;
    setBusy('Reading photo…');
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
    const kind = SCENE_FOR_CATEGORY[c.categoryId];
    const svg = sceneSvg(kind, c.id, true, String(Date.now()));
    const jitter = () => (Math.random() - 0.5) * 0.0006;
    verify({ photo: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), source: 'demo-camera', takenAt: now(), lat: c.lat + jitter(), lng: c.lng + jitter() });
  };

  const demoReuse = () => {
    const old =
      db.complaints.find((x) => x.proof && x.id !== c.id && x.categoryId === c.categoryId) ?? db.complaints.find((x) => x.proof && x.id !== c.id);
    if (!old?.proof) return notify({ tone: 'info', text: 'No earlier proof photos to reuse.' });
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
        <h2 id="proof-title">Proof of work · {c.id}</h2>
        <button className="icon-btn" type="button" onClick={() => dlg.current?.close()} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="modal-body">
        <p className="muted" style={{ margin: 0 }}>
          Take a live photo of the fixed {category(c.categoryId)?.name.toLowerCase()} at the site. The case only closes if every check passes.
          Failed attempts are logged on your record.
        </p>

        <div className="camera">
          {shot ? (
            <img src={shot.photo} alt="Captured proof photo" />
          ) : (
            <>
              <video ref={video} autoPlay playsInline muted aria-label="Camera preview" />
              {!stream && (
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#c9c6bb', padding: 20, textAlign: 'center' }}>
                  {camError ?? 'Starting camera…'}
                </div>
              )}
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
            {checks.map((k, i) => (
              <li key={k.id}>
                <span className={`mark ${i < shown ? (k.pass ? 'pass' : 'fail') : 'wait'}`} aria-hidden="true">
                  {i < shown ? (k.pass ? '✓' : '✕') : ''}
                </span>
                <span>
                  <b>{CHECK_NAMES[k.id]}</b>
                  <span className="muted">{i < shown ? k.detail : 'Checking…'}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        {done && !passed && logged && (
          <p className="callout bad" style={{ margin: 0 }}>
            <span aria-hidden="true">✕</span>
            <span>Rejected. The case stays open and this attempt is logged on your record. Retake the photo at the site.</span>
          </p>
        )}

        <div className="row">
          {!shot && (
            <>
              <button className="btn btn-primary" type="button" onClick={capture} disabled={!stream || !!busy}>
                ◉ Take photo
              </button>
              <label className="btn">
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
                Upload from gallery
              </label>
            </>
          )}
          {shot && done && passed && (
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                submitProof(c.id, { photo: shot.photo, hash: hashRef.current, takenAt: shot.takenAt ?? now(), lat: shot.lat, lng: shot.lng, source: shot.source, checks: checks! });
                notify({ tone: 'ok', text: `${c.id} marked fixed. The citizen has been asked to confirm.` });
                dlg.current?.close();
              }}
            >
              ✓ Mark as resolved
            </button>
          )}
          {shot && done && (
            <button className="btn" type="button" onClick={retake}>
              Retake
            </button>
          )}
        </div>

        {!shot && (
          <div className="demo-tools">
            <span className="kicker">Demo shortcuts (you're not really in Pune)</span>
            <div className="row">
              <button className="btn btn-sm" type="button" onClick={demoOnSite} disabled={!!busy}>
                Simulate a live photo on site
              </button>
              <button className="btn btn-sm btn-danger" type="button" onClick={demoReuse} disabled={!!busy}>
                Try to cheat with an old proof photo
              </button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
