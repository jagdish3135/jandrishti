import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { assignee, category } from './catalog';
import { hashPhoto } from './photos';
import { allPass } from './proof';
import { seedDB } from './seed';
import { applyEscalations, DAY, escalationDays, isOpen, type Escalation } from './sla';
import type { Key } from './i18n-en';
import type { Check, Citizen, Complaint, DB, PhotoSource, Session } from './types';

const KEY = 'jd:v1';

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const db = JSON.parse(raw) as DB;
      if (db.version === 1 && Array.isArray(db.complaints)) return db;
    }
  } catch {
    // Private mode or corrupt data: start from the seed.
  }
  return seedDB(Date.now());
}

export interface Notice {
  id: number;
  tone: 'info' | 'warn' | 'ok' | 'bad';
  /** Translation key and values; `officerId` in vars is shown as that officer's name and title. */
  key?: Key;
  vars?: Record<string, string | number>;
  text?: string;
  link?: string;
}

export interface NewComplaint {
  categoryId: string;
  otherType?: string;
  wardId: string;
  description: string;
  lat: number;
  lng: number;
  landmark?: string;
  photo?: string;
  photoHash?: string;
}

export interface ProofInput {
  photo: string;
  hash: string;
  takenAt: number;
  lat?: number;
  lng?: number;
  source: PhotoSource;
  checks: Check[];
}

interface Store {
  db: DB;
  now: () => number;
  session: Session | null;
  me: Citizen | null;
  notices: Notice[];
  storageFull: boolean;
  notify: (n: Omit<Notice, 'id'>) => void;
  dismiss: (id: number) => void;
  signInCitizen: (c: { phone: string; name: string; aadhaarLast4: string }) => void;
  signInOfficer: (id: string) => void;
  signOut: () => void;
  file: (c: NewComplaint) => string;
  support: (id: string) => void;
  startWork: (id: string) => void;
  submitProof: (id: string, p: ProofInput) => boolean;
  confirm: (id: string) => void;
  reopen: (id: string, note: string) => void;
  rate: (id: string, stars: number, note?: string) => void;
  travel: (ms: number) => void;
  resetClock: () => void;
  resetDemo: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(load);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [storageFull, setStorageFull] = useState(false);
  const noticeId = useRef(0);
  const dbRef = useRef(db);
  dbRef.current = db;

  const notify = useCallback((n: Omit<Notice, 'id'>) => {
    const id = ++noticeId.current;
    setNotices((list) => [...list.slice(-3), { ...n, id }]);
    window.setTimeout(() => setNotices((list) => list.filter((x) => x.id !== id)), 7000);
  }, []);
  const dismiss = useCallback((id: number) => setNotices((l) => l.filter((x) => x.id !== id)), []);

  const now = useCallback(() => Date.now() + dbRef.current.offsetMs, []);

  const announce = useCallback(
    (list: Escalation[]) => {
      // One notice per complaint (where it ended up), the signed-in citizen's own first.
      const last = new Map<string, Escalation>();
      for (const e of list) last.set(e.complaintId, e);
      const s = dbRef.current.session;
      const mine = (id: string) => s?.role === 'citizen' && dbRef.current.complaints.some((c) => c.id === id && c.citizenId === s.citizenId);
      const ordered = [...last.values()].sort((a, b) => Number(mine(b.complaintId)) - Number(mine(a.complaintId)));
      const shown = ordered.slice(0, 2);
      for (const e of shown) notify({ tone: 'warn', key: 'toast.escalated', vars: { id: e.complaintId, officerId: e.to }, link: `/complaints/${e.complaintId}` });
      if (ordered.length > shown.length) notify({ tone: 'warn', key: 'toast.moreEscalated', vars: { n: ordered.length - shown.length }, link: '/map' });
    },
    [notify],
  );

  /** Apply a change, then run the escalation engine at the (possibly new) clock time. */
  const update = useCallback(
    (fn: (d: DB) => DB) => {
      const next = fn(dbRef.current);
      const { complaints, escalations } = applyEscalations(next.complaints, Date.now() + next.offsetMs);
      const out = escalations.length ? { ...next, complaints } : next;
      dbRef.current = out;
      setDb(out);
      if (escalations.length) announce(escalations);
    },
    [announce],
  );

  // Escalate on load and keep checking as real time passes.
  useEffect(() => {
    update((d) => d);
    const t = window.setInterval(() => update((d) => d), 15_000);
    return () => window.clearInterval(t);
  }, [update]);

  // Sample photos get their fingerprints on first load.
  useEffect(() => {
    const missing = dbRef.current.complaints.filter((c) => (c.photo && !c.photoHash) || (c.proof && !c.proof.hash));
    if (!missing.length) return;
    let cancelled = false;
    (async () => {
      const hashes = new Map<string, { photo?: string; proof?: string }>();
      for (const c of missing) {
        try {
          hashes.set(c.id, {
            photo: c.photo && !c.photoHash ? await hashPhoto(c.photo) : undefined,
            proof: c.proof && !c.proof.hash ? await hashPhoto(c.proof.photo) : undefined,
          });
        } catch {
          // Leave it unhashed; it is retried next load.
        }
      }
      if (cancelled) return;
      update((d) => ({
        ...d,
        complaints: d.complaints.map((c) => {
          const h = hashes.get(c.id);
          if (!h) return c;
          return {
            ...c,
            photoHash: c.photoHash ?? h.photo,
            proof: c.proof && h.proof ? { ...c.proof, hash: h.proof } : c.proof,
          };
        }),
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, [update]);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
      setStorageFull(false);
    } catch {
      setStorageFull(true);
    }
  }, [db]);

  const patch = useCallback(
    (id: string, fn: (c: Complaint, t: number) => Complaint) =>
      update((d) => {
        const t = Date.now() + d.offsetMs;
        return { ...d, complaints: d.complaints.map((c) => (c.id === id ? fn(c, t) : c)) };
      }),
    [update],
  );

  const store = useMemo<Store>(() => {
    const session = db.session;
    const me = session?.role === 'citizen' ? (db.citizens.find((c) => c.id === session.citizenId) ?? null) : null;
    return {
      db,
      now,
      session,
      me,
      notices,
      storageFull,
      notify,
      dismiss,
      signInCitizen: ({ phone, name, aadhaarLast4 }) =>
        update((d) => {
          const existing = d.citizens.find((c) => c.phone === phone);
          const t = Date.now() + d.offsetMs;
          const citizen: Citizen = existing
            ? { ...existing, aadhaarLast4, verifiedAt: t }
            : { id: `cz-${phone.slice(-4)}-${t.toString(36)}`, name: name.trim(), phone, aadhaarLast4, verifiedAt: t };
          return {
            ...d,
            citizens: existing ? d.citizens.map((c) => (c.id === existing.id ? citizen : c)) : [...d.citizens, citizen],
            session: { role: 'citizen', citizenId: citizen.id },
          };
        }),
      signInOfficer: (id) => update((d) => ({ ...d, session: { role: 'officer', officerId: id } })),
      signOut: () => update((d) => ({ ...d, session: null })),
      file: (input) => {
        const d = dbRef.current;
        if (d.session?.role !== 'citizen') throw new Error('Sign in as a citizen first.');
        const citizenId = d.session.citizenId;
        const seq = d.seq + 1;
        const id = `JD-26-${String(seq).padStart(5, '0')}`;
        const t = now();
        const cat = category(input.categoryId);
        if (!cat) throw new Error('Pick a category.');
        const owner = assignee(input.categoryId, input.wardId);
        const c: Complaint = {
          id,
          citizenId,
          categoryId: input.categoryId,
          otherType: cat.other ? input.otherType?.trim().slice(0, 60) || undefined : undefined,
          wardId: input.wardId,
          description: input.description.trim(),
          lat: input.lat,
          lng: input.lng,
          landmark: input.landmark?.trim() || undefined,
          photo: input.photo,
          photoHash: input.photoHash,
          createdAt: t,
          deadline: t + cat.slaDays * DAY,
          officerId: owner.id,
          status: 'assigned',
          supporters: [],
          events: [
            { at: t, kind: 'filed' },
            { at: t, kind: 'assigned', officerId: owner.id },
          ],
        };
        update((x) => ({ ...x, seq, complaints: [c, ...x.complaints] }));
        return id;
      },
      support: (id) => {
        const s = dbRef.current.session;
        if (s?.role !== 'citizen') return;
        patch(id, (c, t) =>
          c.citizenId === s.citizenId || c.supporters.includes(s.citizenId)
            ? c
            : { ...c, supporters: [...c.supporters, s.citizenId], events: [...c.events, { at: t, kind: 'supported' }] },
        );
      },
      startWork: (id) =>
        patch(id, (c, t) =>
          !isOpen(c) || c.status === 'in_progress'
            ? c
            : { ...c, status: 'in_progress', events: [...c.events, { at: t, kind: 'started', officerId: c.officerId }] },
        ),
      submitProof: (id, p) => {
        const ok = allPass(p.checks);
        patch(id, (c, t) => {
          if (!isOpen(c)) return c;
          if (!ok) {
            const failed = p.checks.filter((x) => !x.pass).map((x) => x.detail).join(' ');
            return { ...c, events: [...c.events, { at: t, kind: 'proof_rejected', officerId: c.officerId, note: failed }] };
          }
          return {
            ...c,
            status: 'resolved',
            resolvedAt: t,
            resolvedBy: c.officerId,
            proof: { ...p, at: t, officerId: c.officerId },
            events: [...c.events, { at: t, kind: 'resolved', officerId: c.officerId, onTime: t <= c.deadline }],
          };
        });
        return ok;
      },
      confirm: (id) =>
        patch(id, (c, t) => (c.status !== 'resolved' ? c : { ...c, status: 'closed', events: [...c.events, { at: t, kind: 'confirmed' }] })),
      reopen: (id, note) =>
        patch(id, (c, t) => {
          if (c.status !== 'resolved') return c;
          const owner = c.resolvedBy ?? c.officerId;
          return {
            ...c,
            status: 'reopened',
            proof: undefined,
            pastProofHashes: [...(c.pastProofHashes ?? []), ...(c.proof?.hash ? [c.proof.hash] : [])],
            officerId: owner,
            deadline: t + escalationDays(c.categoryId) * DAY,
            resolvedAt: undefined,
            events: [...c.events, { at: t, kind: 'reopened', officerId: owner, note: note.trim() || undefined }],
          };
        }),
      rate: (id, stars, note) =>
        patch(id, (c, t) =>
          c.rating || c.status !== 'closed'
            ? c
            : { ...c, rating: { stars, at: t, note: note?.trim() || undefined }, events: [...c.events, { at: t, kind: 'rated', note: `${stars} of 5` }] },
        ),
      travel: (ms) => update((d) => ({ ...d, offsetMs: d.offsetMs + ms })),
      resetClock: () => update((d) => ({ ...d, offsetMs: 0 })),
      resetDemo: () => {
        const fresh = seedDB(Date.now());
        dbRef.current = fresh;
        setDb(fresh);
        notify({ tone: 'info', key: 'toast.reset' });
        // Re-run the photo fingerprinting for the new seed.
        window.setTimeout(() => window.location.reload(), 400);
      },
    };
  }, [db, notices, storageFull, now, notify, dismiss, update, patch]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}

/** The demo clock, re-rendering every `ms`. */
export function useNow(ms = 1000) {
  const { now } = useStore();
  const [t, setT] = useState(now);
  useEffect(() => {
    setT(now());
    const id = window.setInterval(() => setT(now()), ms);
    return () => window.clearInterval(id);
  }, [now, ms]);
  // Clock jumps (time travel) show immediately.
  const live = now();
  return Math.abs(live - t) > ms * 2 ? live : t;
}
