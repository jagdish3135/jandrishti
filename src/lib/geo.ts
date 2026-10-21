import { WARDS } from './catalog';
import type { Ward } from './types';

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in metres. */
export function distance(aLat: number, aLng: number, bLat: number, bLng: number) {
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const SERVICE_RADIUS_M = 5000;

/** Nearest ward to a point, or null when it's outside the service area. */
export function wardFor(lat: number, lng: number): Ward | null {
  let best: Ward | null = null;
  let bestD = Infinity;
  for (const w of WARDS) {
    const d = distance(lat, lng, w.lat, w.lng);
    if (d < bestD) {
      bestD = d;
      best = w;
    }
  }
  return bestD <= SERVICE_RADIUS_M ? best : null;
}

export function formatDistance(m: number) {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}
