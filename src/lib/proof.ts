import { findReuse, type KnownPhoto } from './dhash';
import { distance, formatDistance } from './geo';
import type { Check, Complaint, PhotoSource } from './types';

export const SITE_RADIUS_M = 150;
const CLOCK_SLACK_MS = 10 * 60_000;

export interface Capture {
  hash: string;
  source: PhotoSource;
  takenAt: number | null;
  lat?: number;
  lng?: number;
}

/** Every earlier photo an officer must not reuse: all other proofs and the citizen's own photo. */
export function knownPhotos(all: Complaint[], target: Complaint): KnownPhoto[] {
  const out: KnownPhoto[] = [];
  for (const c of all) {
    if (c.proof && c.id !== target.id) out.push({ hash: c.proof.hash, label: `proof photo of ${c.id}` });
  }
  if (target.photoHash)
    out.push({ hash: target.photoHash, label: "the citizen's own photo of this complaint", threshold: 4 });
  return out;
}

export function runChecks(cap: Capture, c: Complaint, known: KnownPhoto[], now: number): Check[] {
  const live = cap.source !== 'upload';
  const checks: Check[] = [
    {
      id: 'live',
      pass: live,
      detail: live ? 'Taken with the in-app camera.' : 'Picked from the gallery. Proof must be taken live in the app.',
    },
  ];

  if (cap.lat == null || cap.lng == null) {
    checks.push({ id: 'location', pass: false, detail: 'No location on this photo. Turn on location and retake it.' });
  } else {
    const m = distance(cap.lat, cap.lng, c.lat, c.lng);
    checks.push({
      id: 'location',
      pass: m <= SITE_RADIUS_M,
      detail:
        m <= SITE_RADIUS_M
          ? `Taken ${formatDistance(m)} from the complaint location.`
          : `Taken ${formatDistance(m)} away. It must be within ${SITE_RADIUS_M} m of the site.`,
    });
  }

  if (cap.takenAt == null) {
    checks.push({ id: 'time', pass: false, detail: 'No capture time on this photo.' });
  } else if (cap.takenAt < c.createdAt) {
    checks.push({ id: 'time', pass: false, detail: 'Taken before the complaint was filed.' });
  } else if (cap.takenAt > now + CLOCK_SLACK_MS) {
    checks.push({ id: 'time', pass: false, detail: 'Capture time is in the future.' });
  } else {
    checks.push({ id: 'time', pass: true, detail: 'Taken after the complaint was filed.' });
  }

  const reuse = findReuse(cap.hash, known);
  checks.push(
    reuse
      ? { id: 'reuse', pass: false, detail: `Matches ${reuse.label} (fingerprint distance ${reuse.distance}/64).` }
      : { id: 'reuse', pass: true, detail: 'New photo. No match among earlier proof photos.' },
  );
  return checks;
}

export const allPass = (checks: Check[]) => checks.every((c) => c.pass);
