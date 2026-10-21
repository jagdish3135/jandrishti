import { assignee, CATEGORIES, category, chainFrom, CORE_CATEGORIES, WARDS } from './catalog';
import { between, mulberry32, pick } from './rand';
import { SCENE_FOR_CATEGORY, seedRef } from './scenes';
import { DAY, escalationDays, HOUR } from './sla';
import type { CEvent, Citizen, Complaint, DB, Proof } from './types';

export const DEMO_CITIZEN_ID = 'cz-priya';

const LANDMARKS: Record<string, string[]> = {
  kothrud: ['Karve Road signal', 'Paud Road, near Vanaz', 'Mayur Colony lane 3'],
  aundh: ['ITI Road', 'Parihar Chowk', 'Bremen Chowk'],
  shivajinagar: ['FC Road, opposite college gate', 'JM Road', 'Model Colony'],
  kasba: ['Lane behind Shaniwar Wada', 'Tulshibaug market', 'Kasba Ganpati lane'],
  yerawada: ['Shastrinagar', 'Airport Road', 'Gunjan Chowk'],
  hadapsar: ['Magarpatta gate 2', 'Solapur Road', 'Gadital'],
};

const TEXT: Record<string, string> = {
  pothole: 'Deep pothole in the middle of the road. Two-wheelers are skidding here, worse after rain.',
  footpath: 'Footpath tiles are broken and lifted. Elderly people are tripping on them every day.',
  debris: 'Construction debris dumped on the road, blocking one full lane since last week.',
  'no-water': 'No water supply in our building for two days. Around 40 families affected.',
  'dirty-water': 'Tap water is brown and smells bad since yesterday morning.',
  leak: 'Main pipeline is leaking. Clean water has been flowing onto the road all day.',
  drain: 'Roadside drain is fully blocked with plastic. Water collects after every shower.',
  sewer: 'Sewer chamber overflowing onto the road. Children walk through it on the way to school.',
  streetlight: 'Three streetlights in a row are off. The lane is completely dark after 7 pm.',
  wire: 'Exposed wire hanging from the junction box at child height. Dangerous in rain.',
  garbage: 'Garbage van has not come for four days. Bins are overflowing onto the road.',
  dumping: 'People dump waste on the empty plot every night. Stray dogs spread it around.',
};

const CITIZENS: Citizen[] = [
  { id: DEMO_CITIZEN_ID, name: 'Priya Deshmukh', phone: '9876543210', aadhaarLast4: '4821', verifiedAt: 0 },
  ...['Rahul Kale', 'Sana Shaikh', 'Omkar Joshi', 'Neha Patwardhan', 'Imran Pathan', 'Kavita Rao', 'Aditya Bhave', 'Fatima Sayyed'].map(
    (name, i) => ({ id: `cz-${i + 1}`, name, phone: `98${String(20000000 + i * 1371).padStart(8, '0')}`, aadhaarLast4: String(1000 + i * 977).slice(-4), verifiedAt: 0 }),
  ),
];

type Plan = 'closed' | 'closed-late' | 'closed-unrated' | 'resolved' | 'open' | 'soon' | 'escalated' | 'escalated2' | 'top';

// Priya's own cases come first so the demo account has one of everything.
const PLANS: Plan[] = [
  'soon', 'resolved', 'escalated', 'closed', 'closed-unrated',
  'closed', 'closed', 'closed-late', 'open', 'open', 'soon', 'resolved', 'escalated', 'closed', 'closed',
  'closed-late', 'open', 'escalated2', 'closed', 'open', 'soon', 'closed', 'top', 'resolved', 'closed',
  'open', 'closed', 'escalated', 'closed', 'open', 'closed-late', 'closed',
];

export function seedDB(now: number): DB {
  const r = mulberry32(20261021);
  const complaints: Complaint[] = [];
  let seq = 0;

  PLANS.forEach((plan, i) => {
    seq++;
    const cat = i < 5 ? CATEGORIES[[0, 6, 4, 8, 10][i]] : pick(r, CORE_CATEGORIES);
    const w = i < 5 ? WARDS[0] : pick(r, WARDS);
    const id = `JD-26-${String(seq).padStart(5, '0')}`;
    const citizenId = i < 5 ? DEMO_CITIZEN_ID : pick(r, CITIZENS.slice(1)).id;
    const sla = category(cat.id)!.slaDays * DAY;
    const esc = escalationDays(cat.id) * DAY;
    const je = assignee(cat.id, w.id);
    const chain = chainFrom(je.id);

    let age: number;
    switch (plan) {
      case 'open': age = sla * between(r, 0.1, 0.5); break;
      case 'soon': age = sla - between(r, 3, 14) * HOUR; break;
      case 'resolved': age = sla * between(r, 0.5, 0.9); break;
      case 'escalated': age = sla + esc * between(r, 0.2, 0.7); break;
      case 'escalated2': age = sla + esc + esc * between(r, 0.2, 0.6); break;
      case 'top': age = sla + 3 * esc + 2 * DAY; break;
      default: age = sla + between(r, 2, 40) * DAY;
    }
    const createdAt = Math.round(now - age);
    const lat = w.lat + between(r, -0.004, 0.004);
    const lng = w.lng + between(r, -0.004, 0.004);
    const events: CEvent[] = [
      { at: createdAt, kind: 'filed' },
      { at: createdAt + 60_000, kind: 'assigned', officerId: je.id },
    ];

    let officerId = je.id;
    let deadline = createdAt + sla;
    const escalate = (times: number) => {
      for (let k = 0; k < times && k < chain.length - 1; k++) {
        events.push({ at: deadline, kind: 'escalated', officerId: chain[k + 1].id, fromOfficerId: chain[k].id, note: 'Deadline missed' });
        officerId = chain[k + 1].id;
        deadline += esc;
      }
    };

    const c: Complaint = {
      id,
      citizenId,
      categoryId: cat.id,
      wardId: w.id,
      description: TEXT[cat.id],
      lat,
      lng,
      landmark: pick(r, LANDMARKS[w.id]),
      photo: seedRef(SCENE_FOR_CATEGORY[cat.id], id, false),
      createdAt,
      deadline,
      officerId,
      status: 'assigned',
      supporters: [],
      events,
    };

    if (plan === 'escalated') escalate(1);
    if (plan === 'escalated2' || plan === 'closed-late') escalate(plan === 'closed-late' ? 1 : 2);
    if (plan === 'top') escalate(3);
    if (plan !== 'soon' && plan !== 'top' && r() > 0.3) events.push({ at: createdAt + between(r, 2, 20) * HOUR, kind: 'started', officerId: je.id });

    const done = plan.startsWith('closed') || plan === 'resolved';
    if (done) {
      const windowStart = plan === 'closed-late' ? deadline - esc : createdAt;
      const resolvedAt =
        plan === 'resolved'
          ? Math.min(now - 2 * HOUR, createdAt + (now - createdAt) * between(r, 0.5, 0.9))
          : Math.round(windowStart + (deadline - windowStart) * between(r, 0.25, 0.9));
      if (plan === 'closed-late' && r() > 0.4)
        events.push({ at: resolvedAt - 3 * HOUR, kind: 'proof_rejected', officerId, note: 'Proof photo matched an earlier proof photo' });
      const proof: Proof = {
        photo: seedRef(SCENE_FOR_CATEGORY[cat.id], id, true),
        hash: '',
        takenAt: resolvedAt - 20 * 60_000,
        lat: lat + between(r, -0.0004, 0.0004),
        lng: lng + between(r, -0.0004, 0.0004),
        source: 'camera',
        at: resolvedAt,
        officerId,
        checks: [
          { id: 'live', pass: true, detail: 'Taken with the in-app camera.' },
          { id: 'location', pass: true, detail: 'Taken at the complaint location.' },
          { id: 'time', pass: true, detail: 'Taken after the complaint was filed.' },
          { id: 'reuse', pass: true, detail: 'New photo. No match among earlier proof photos.' },
        ],
      };
      events.push({ at: resolvedAt, kind: 'resolved', officerId, onTime: resolvedAt <= deadline });
      Object.assign(c, { proof, resolvedAt, resolvedBy: officerId, status: 'resolved' });
      if (plan !== 'resolved') {
        const confirmedAt = resolvedAt + between(r, 3, 30) * HOUR;
        events.push({ at: confirmedAt, kind: 'confirmed' });
        c.status = 'closed';
        if (plan !== 'closed-unrated') {
          const stars = plan === 'closed-late' ? pick(r, [2, 3, 3]) : pick(r, [4, 4, 5, 5, 5, 3]);
          c.rating = { stars, at: confirmedAt + HOUR };
          events.push({ at: confirmedAt + HOUR, kind: 'rated', note: `${stars} of 5` });
        }
      }
    } else if (events.some((e) => e.kind === 'started' && e.officerId === officerId)) {
      c.status = 'in_progress';
    }
    c.officerId = officerId;
    c.deadline = deadline;
    c.events.sort((a, b) => a.at - b.at);
    complaints.push(c);
  });

  // A cluster of neighbours backing the same open pothole in Kothrud.
  const cluster = complaints.find((c) => c.citizenId === DEMO_CITIZEN_ID && c.categoryId === 'pothole');
  if (cluster) cluster.supporters = CITIZENS.slice(1, 7).map((z) => z.id);
  complaints
    .filter((c) => c.status !== 'closed' && c !== cluster)
    .forEach((c, i) => {
      c.supporters = CITIZENS.slice(1, 1 + ((i * 3) % 5)).filter((z) => z.id !== c.citizenId).map((z) => z.id);
    });

  return { version: 1, seededAt: now, offsetMs: 0, seq, citizens: CITIZENS.map((z) => ({ ...z, verifiedAt: now - 60 * DAY })), complaints, session: null };
}
