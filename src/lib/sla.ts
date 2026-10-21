import { category, officer } from './catalog';
import { OPEN_STATUSES, type Complaint } from './types';

export const DAY = 86_400_000;
export const HOUR = 3_600_000;

export function slaDays(categoryId: string) {
  return category(categoryId)?.slaDays ?? 7;
}

/** Extra time a senior officer gets after an escalation: half the original SLA, at least 1 day. */
export function escalationDays(categoryId: string) {
  return Math.max(1, Math.ceil(slaDays(categoryId) / 2));
}

export const isOpen = (c: Complaint) => OPEN_STATUSES.includes(c.status);

export type Urgency = 'ok' | 'soon' | 'overdue' | 'done';

export function urgency(c: Complaint, now: number): Urgency {
  if (!isOpen(c)) return 'done';
  const left = c.deadline - now;
  if (left <= 0) return 'overdue';
  if (left <= Math.min(DAY, (slaDays(c.categoryId) * DAY) / 3)) return 'soon';
  return 'ok';
}

export interface Escalation {
  complaintId: string;
  from: string;
  to: string;
  at: number;
}

/**
 * Move every open complaint whose deadline has passed up to the senior officer.
 * A big clock jump can escalate the same complaint several times; each step starts
 * from the missed deadline, so the result does not depend on how often this runs.
 * Complaints already at the top stay overdue there.
 */
export function applyEscalations(list: Complaint[], now: number): { complaints: Complaint[]; escalations: Escalation[] } {
  const escalations: Escalation[] = [];
  const complaints = list.map((c) => {
    if (!isOpen(c) || c.deadline > now) return c;
    let cur = c;
    for (;;) {
      const owner = officer(cur.officerId);
      if (!owner?.seniorId || cur.deadline > now) break;
      const at = cur.deadline;
      const next = {
        ...cur,
        officerId: owner.seniorId,
        deadline: at + escalationDays(cur.categoryId) * DAY,
        // Work restarts with the new owner.
        status: cur.status === 'reopened' ? cur.status : ('assigned' as const),
        events: [
          ...cur.events,
          {
            at,
            kind: 'escalated' as const,
            officerId: owner.seniorId,
            fromOfficerId: owner.id,
            note: 'Deadline missed',
          },
        ],
      };
      escalations.push({ complaintId: c.id, from: owner.id, to: owner.seniorId, at });
      cur = next;
    }
    return cur;
  });
  return { complaints, escalations };
}

export function escalationCount(c: Complaint) {
  return c.events.filter((e) => e.kind === 'escalated').length;
}
