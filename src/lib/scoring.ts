import { DAY } from './sla';
import type { Complaint } from './types';

export interface OfficerStats {
  resolved: number;
  onTime: number;
  late: number;
  escalations: number;
  proofFails: number;
  reopens: number;
  ratings: number;
  ratingAvg: number | null;
  avgDays: number | null;
  open: number;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
}

/**
 * Score out of 100. Each part is smoothed with a small prior so one bad (or good) case
 * doesn't swing a new officer to 0 or 100.
 *  40%  resolved before the deadline
 *  20%  proof photos that passed on the first try
 *  25%  citizen ratings
 *  15%  free of escalations and reopened cases
 */
export function officerStats(officerId: string, complaints: Complaint[]): OfficerStats {
  let resolved = 0;
  let onTime = 0;
  let escalations = 0;
  let proofFails = 0;
  let reopens = 0;
  let ratingSum = 0;
  let ratings = 0;
  let daysSum = 0;
  let open = 0;

  for (const c of complaints) {
    if (c.officerId === officerId && ['assigned', 'in_progress', 'reopened'].includes(c.status)) open++;
    for (const e of c.events) {
      if (e.kind === 'resolved' && e.officerId === officerId) {
        resolved++;
        if (e.onTime) onTime++;
        daysSum += (e.at - c.createdAt) / DAY;
      }
      if (e.kind === 'escalated' && e.fromOfficerId === officerId) escalations++;
      if (e.kind === 'proof_rejected' && e.officerId === officerId) proofFails++;
      if (e.kind === 'reopened' && e.officerId === officerId) reopens++;
    }
    if (c.rating && c.resolvedBy === officerId) {
      ratings++;
      ratingSum += c.rating.stars;
    }
  }

  const onTimeRate = (onTime + 1) / (resolved + 2);
  const proofRate = (resolved + 1) / (resolved + proofFails + 2);
  const ratingNorm = (ratingSum + 3.5 * 2) / (ratings + 2) / 5;
  const strikes = escalations + reopens;
  const cleanRate = 1 - strikes / (resolved + strikes + 2);
  const score = Math.round(100 * (0.4 * onTimeRate + 0.2 * proofRate + 0.25 * ratingNorm + 0.15 * cleanRate));

  return {
    resolved,
    onTime,
    late: resolved - onTime,
    escalations,
    proofFails,
    reopens,
    ratings,
    ratingAvg: ratings ? ratingSum / ratings : null,
    avgDays: resolved ? daysSum / resolved : null,
    open,
    score,
    grade: score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : 'D',
  };
}
