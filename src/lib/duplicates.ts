import { distance } from './geo';
import { isOpen } from './sla';
import type { Complaint } from './types';

export const DUPLICATE_RADIUS_M = 150;

/** Open complaints of the same category near a point, closest first. */
export function findDuplicates(
  list: Complaint[],
  q: { categoryId: string; lat: number; lng: number },
  radius = DUPLICATE_RADIUS_M,
) {
  return list
    .filter((c) => c.categoryId === q.categoryId && isOpen(c))
    .map((c) => ({ complaint: c, meters: distance(q.lat, q.lng, c.lat, c.lng) }))
    .filter((x) => x.meters <= radius)
    .sort((a, b) => a.meters - b.meters);
}

/** Priority: more supporters first, then the nearest deadline. */
export function byPriority(a: Complaint, b: Complaint) {
  return b.supporters.length - a.supporters.length || a.deadline - b.deadline;
}
