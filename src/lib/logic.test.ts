import { describe, expect, it } from 'vitest';
import { assignee, chainFrom, OFFICERS, WARDS } from './catalog';
import { dhashFromGray, findReuse, hamming } from './dhash';
import { findDuplicates } from './duplicates';
import { distance, wardFor } from './geo';
import { runChecks } from './proof';
import { officerStats } from './scoring';
import { seedDB } from './seed';
import { applyEscalations, DAY, escalationDays, HOUR, urgency } from './sla';
import type { Complaint } from './types';
import { aadhaarError, phoneError, testAadhaar, verhoeffDigit, verhoeffValid } from './verhoeff';

const T0 = Date.UTC(2026, 9, 21, 6, 0, 0);

function complaint(over: Partial<Complaint> = {}): Complaint {
  const je = assignee('pothole', 'kothrud');
  return {
    id: 'JD-T-1',
    citizenId: 'cz-1',
    categoryId: 'pothole',
    wardId: 'kothrud',
    description: 'x',
    lat: 18.5074,
    lng: 73.8077,
    createdAt: T0,
    deadline: T0 + 7 * DAY,
    officerId: je.id,
    status: 'assigned',
    supporters: [],
    events: [{ at: T0, kind: 'filed' }],
    ...over,
  };
}

describe('Aadhaar and phone checks', () => {
  it('validates Verhoeff check digits', () => {
    expect(verhoeffValid('2363')).toBe(true); // textbook example: 236 → check digit 3
    expect(verhoeffDigit('236')).toBe(3);
    expect(verhoeffValid('2364')).toBe(false);
  });
  it('accepts generated test numbers and rejects typos', () => {
    const n = testAadhaar(() => 0.37);
    expect(aadhaarError(n)).toBeNull();
    expect(aadhaarError(`${n.slice(0, 4)} ${n.slice(4, 8)} ${n.slice(8)}`)).toBeNull();
    const typo = n.slice(0, 11) + ((Number(n[11]) + 1) % 10);
    expect(aadhaarError(typo)).toMatch(/checksum/);
    expect(aadhaarError('123412341234')).toMatch(/0 or 1/);
    expect(aadhaarError('2345')).toMatch(/12 digits/);
  });
  it('checks Indian mobile numbers', () => {
    expect(phoneError('98765 43210')).toBeNull();
    expect(phoneError('+91 9876543210')).toBeNull();
    expect(phoneError('5876543210')).not.toBeNull();
    expect(phoneError('98765')).not.toBeNull();
  });
});

describe('geo', () => {
  it('measures distance in metres', () => {
    const d = distance(18.5074, 73.8077, 18.5084, 73.8077);
    expect(d).toBeGreaterThan(105);
    expect(d).toBeLessThan(118);
  });
  it('finds the ward and rejects points outside the city', () => {
    expect(wardFor(18.508, 73.809)?.id).toBe('kothrud');
    expect(wardFor(19.076, 72.8777)).toBeNull(); // Mumbai
  });
});

describe('assignment', () => {
  it('routes to the junior engineer for the ward beat', () => {
    expect(assignee('pothole', 'kothrud').id).toBe('roads-je-west');
    expect(assignee('leak', 'hadapsar').id).toBe('water-je-east');
  });
  it('every chain climbs to the commissioner', () => {
    for (const o of OFFICERS.filter((x) => x.level === 1)) {
      const chain = chainFrom(o.id);
      expect(chain.map((x) => x.level)).toEqual([1, 2, 3, 4]);
      expect(chain.at(-1)!.id).toBe('amc');
    }
  });
});

describe('escalation engine', () => {
  it('leaves complaints alone before the deadline', () => {
    const { complaints, escalations } = applyEscalations([complaint()], T0 + 6 * DAY);
    expect(escalations).toHaveLength(0);
    expect(complaints[0].officerId).toBe('roads-je-west');
  });
  it('moves a missed complaint to the senior with a new deadline', () => {
    const { complaints, escalations } = applyEscalations([complaint({ status: 'in_progress' })], T0 + 7 * DAY + HOUR);
    const c = complaints[0];
    expect(escalations).toEqual([{ complaintId: 'JD-T-1', from: 'roads-je-west', to: 'roads-ae', at: T0 + 7 * DAY }]);
    expect(c.officerId).toBe('roads-ae');
    expect(c.deadline).toBe(T0 + 7 * DAY + escalationDays('pothole') * DAY);
    expect(c.status).toBe('assigned');
    expect(c.events.at(-1)).toMatchObject({ kind: 'escalated', fromOfficerId: 'roads-je-west', officerId: 'roads-ae' });
  });
  it('climbs several levels on a big jump, then stops at the top', () => {
    const { complaints, escalations } = applyEscalations([complaint()], T0 + 60 * DAY);
    expect(escalations.map((e) => e.to)).toEqual(['roads-ae', 'roads-ee', 'amc']);
    expect(complaints[0].officerId).toBe('amc');
    expect(urgency(complaints[0], T0 + 60 * DAY)).toBe('overdue');
  });
  it('gives the same result whether it runs once or every day', () => {
    let list = [complaint()];
    for (let d = 1; d <= 30; d++) list = applyEscalations(list, T0 + d * DAY).complaints;
    const once = applyEscalations([complaint()], T0 + 30 * DAY).complaints;
    expect(list[0]).toEqual(once[0]);
  });
  it('never escalates resolved or closed complaints', () => {
    const { escalations } = applyEscalations([complaint({ status: 'resolved' }), complaint({ status: 'closed' })], T0 + 30 * DAY);
    expect(escalations).toHaveLength(0);
  });
  it('flags complaints that are due soon', () => {
    expect(urgency(complaint(), T0 + 6.5 * DAY)).toBe('soon');
    expect(urgency(complaint(), T0 + DAY)).toBe('ok');
  });
});

describe('officer score', () => {
  const resolved = (onTime: boolean, stars?: number): Complaint =>
    complaint({
      status: 'closed',
      resolvedBy: 'roads-je-west',
      rating: stars ? { stars, at: T0 } : undefined,
      events: [{ at: T0 + DAY, kind: 'resolved', officerId: 'roads-je-west', onTime }],
    });

  it('rewards on-time work and good ratings', () => {
    const good = officerStats('roads-je-west', [resolved(true, 5), resolved(true, 5), resolved(true, 4)]);
    const bad = officerStats('roads-je-west', [resolved(false, 1), resolved(false, 2), resolved(false, 1)]);
    expect(good.score).toBeGreaterThan(bad.score);
    expect(good.onTime).toBe(3);
    expect(good.ratingAvg).toBeCloseTo(14 / 3);
    expect(good.grade).toBe('A');
  });
  it('counts escalations and failed proofs against the officer who caused them', () => {
    const c = complaint({
      events: [
        { at: T0, kind: 'escalated', fromOfficerId: 'roads-je-west', officerId: 'roads-ae' },
        { at: T0, kind: 'proof_rejected', officerId: 'roads-ae' },
      ],
    });
    expect(officerStats('roads-je-west', [c]).escalations).toBe(1);
    expect(officerStats('roads-ae', [c]).proofFails).toBe(1);
    expect(officerStats('roads-ae', [c]).escalations).toBe(0);
  });
  it('gives a new officer a middle score, not 0 or 100', () => {
    const s = officerStats('nobody', []).score;
    expect(s).toBeGreaterThan(45);
    expect(s).toBeLessThan(80);
  });
});

describe('photo fingerprint', () => {
  const gradient = Array.from({ length: 72 }, (_, i) => (i % 9) * 20);
  it('hashes 9x8 pixels to 16 hex chars', () => {
    expect(dhashFromGray(gradient)).toBe('0000000000000000');
    expect(dhashFromGray(gradient.map((v) => 255 - v))).toBe('ffffffffffffffff');
    expect(() => dhashFromGray([1, 2, 3])).toThrow();
  });
  it('counts differing bits', () => {
    expect(hamming('0000000000000000', 'ffffffffffffffff')).toBe(64);
    expect(hamming('00000000000000f0', '0000000000000010')).toBe(3);
  });
  it('finds a reused photo and respects per-photo thresholds', () => {
    const known = [
      { hash: '00000000000000ff', label: 'other proof' },
      { hash: 'f000000000000000', label: 'citizen photo', threshold: 2 },
    ];
    expect(findReuse('00000000000000fe', known)?.label).toBe('other proof');
    expect(findReuse('ff00000000000000', known)).toBeNull(); // 4 bits from citizen photo, limit 2
    expect(findReuse('0f0f0f0f0f0f0f0f', known)).toBeNull();
  });
});

describe('proof checks', () => {
  const c = complaint();
  const base = { hash: 'aaaaaaaaaaaaaaaa', source: 'camera' as const, takenAt: T0 + DAY, lat: c.lat + 0.0003, lng: c.lng };

  it('passes a live, on-site, new photo', () => {
    expect(runChecks(base, c, [], T0 + DAY).every((x) => x.pass)).toBe(true);
  });
  it('fails gallery uploads, wrong places, old photos and reused photos', () => {
    const fail = (over: object, known = [] as { hash: string; label: string }[]) =>
      runChecks({ ...base, ...over }, c, known, T0 + DAY).filter((x) => !x.pass).map((x) => x.id);
    expect(fail({ source: 'upload' })).toEqual(['live']);
    expect(fail({ lat: c.lat + 0.01 })).toEqual(['location']);
    expect(fail({ lat: undefined, lng: undefined })).toEqual(['location']);
    expect(fail({ takenAt: T0 - HOUR })).toEqual(['time']);
    expect(fail({}, [{ hash: 'aaaaaaaaaaaaaaab', label: 'proof photo of JD-1' }])).toEqual(['reuse']);
  });
});

describe('duplicates', () => {
  it('finds open complaints of the same type within 150 m', () => {
    const near = complaint({ id: 'A' });
    const far = complaint({ id: 'B', lat: 18.52 });
    const other = complaint({ id: 'C', categoryId: 'garbage' });
    const closed = complaint({ id: 'D', status: 'closed' });
    const hits = findDuplicates([far, near, other, closed], { categoryId: 'pothole', lat: 18.5075, lng: 73.8078 });
    expect(hits.map((h) => h.complaint.id)).toEqual(['A']);
  });
});

describe('seed data', () => {
  const db = seedDB(T0);
  it('has the demo citizen with one complaint per kind of state', () => {
    const mine = db.complaints.filter((c) => c.citizenId === 'cz-priya');
    expect(new Set(mine.map((c) => c.status))).toEqual(new Set(['assigned', 'resolved', 'closed']));
    expect(mine.some((c) => c.events.some((e) => e.kind === 'escalated'))).toBe(true);
  });
  it('is stable under the escalation engine at seed time, except the one at the top', () => {
    const { escalations } = applyEscalations(db.complaints, T0);
    expect(escalations).toHaveLength(0);
    expect(db.complaints.filter((c) => urgency(c, T0) === 'overdue').every((c) => c.officerId === 'amc')).toBe(true);
  });
  it('places every complaint in its ward', () => {
    for (const c of db.complaints) expect(wardFor(c.lat, c.lng)?.id).toBe(c.wardId);
    expect(WARDS.length).toBe(6);
  });
});

describe('reopened complaints', () => {
  it('treats the proof from before the reopen as a known photo', async () => {
    const { knownPhotos } = await import('./proof');
    const c = complaint({ pastProofHashes: ['abcdefabcdefabcd'] });
    const checks = runChecks(
      { hash: 'abcdefabcdefabcd', source: 'camera', takenAt: T0 + DAY, lat: c.lat, lng: c.lng },
      c,
      knownPhotos([c], c),
      T0 + DAY,
    );
    expect(checks.find((x) => x.id === 'reuse')).toMatchObject({ pass: false });
  });
});

describe('languages', () => {
  it('has every English string in Hindi and Marathi, with the same placeholders', async () => {
    const { DICTS } = await import('./i18n');
    const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
    for (const lang of ['hi', 'mr'] as const) {
      for (const [key, value] of Object.entries(DICTS.en)) {
        const other = DICTS[lang][key as keyof typeof DICTS.en];
        expect(other, `${lang} ${key}`).toBeTruthy();
        expect(holes(other), `${lang} ${key}`).toBe(holes(value));
      }
    }
  });
  it('names every department, problem type, ward and officer title in each language', async () => {
    const { makeT } = await import('./i18n');
    const { CATEGORIES, DEPARTMENTS, OFFICERS, WARDS } = await import('./catalog');
    for (const lang of ['en', 'hi', 'mr'] as const) {
      const t = makeT(lang);
      for (const d of DEPARTMENTS) expect(t.dept(d.id)).toBeTruthy();
      for (const c of CATEGORIES) expect(t.catName(c.id)).toBeTruthy();
      for (const w of WARDS) expect(t.wardName(w.id)).toBeTruthy();
      for (const o of OFFICERS) expect(t.designation(o)).toBeTruthy();
      if (lang !== 'en') expect(t.catName('pothole')).not.toBe('Pothole');
    }
    expect(makeT('en').wardName('kothrud')).toBe('Kothrud');
    expect(makeT('mr').span(2 * DAY + 3 * HOUR)).toBe('2 दिवस 3 तास');
    expect(makeT('hi').span(DAY)).toBe('1 दिन');
  });
});

describe('departments and "Other" problems', () => {
  it('gives every department an Other type that routes to its junior engineer', async () => {
    const { CATEGORIES, DEPARTMENTS } = await import('./catalog');
    for (const d of DEPARTMENTS) {
      const other = CATEGORIES.find((c) => c.dept === d.id && c.other);
      expect(other, d.id).toBeTruthy();
      expect(assignee(other!.id, 'hadapsar').dept).toBe(d.id);
    }
  });
  it('uses what the citizen wrote as the title of an Other complaint', async () => {
    const { makeT } = await import('./i18n');
    const t = makeT('hi');
    expect(t.complaintTitle({ categoryId: 'roads-other', otherType: 'Broken bench' })).toBe('Broken bench');
    expect(t.complaintTitle({ categoryId: 'roads-other' })).toBe('अन्य समस्या');
  });
  it('reads complaint numbers typed in short forms', async () => {
    const { normaliseId } = await import('./ids');
    expect(normaliseId('jd-26-1')).toBe('JD-26-00001');
    expect(normaliseId(' 26 42 ')).toBe('JD-26-00042');
    expect(normaliseId('7')).toBe('JD-26-00007');
    expect(normaliseId('JD-26-00033')).toBe('JD-26-00033');
  });
});
