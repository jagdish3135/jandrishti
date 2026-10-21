/**
 * Difference hash: shrink to 9x8 greyscale, then record whether each pixel is
 * brighter than its right-hand neighbour. Re-saved, resized or slightly edited copies
 * of the same photo keep almost the same 64 bits; different photos don't.
 */
export const HASH_W = 9;
export const HASH_H = 8;
export const REUSE_THRESHOLD = 10;

/** `gray` is HASH_W x HASH_H brightness values, row by row. Returns 16 hex chars. */
export function dhashFromGray(gray: ArrayLike<number>): string {
  if (gray.length !== HASH_W * HASH_H) throw new Error('Expected 9x8 pixels');
  let bits = '';
  for (let y = 0; y < HASH_H; y++) {
    for (let x = 0; x < HASH_W - 1; x++) {
      bits += gray[y * HASH_W + x] > gray[y * HASH_W + x + 1] ? '1' : '0';
    }
  }
  let hex = '';
  for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

export function hamming(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

export interface KnownPhoto {
  hash: string;
  label: string;
  /** Tighter limit for photos of the same spot (the citizen's own photo), where an honest after-photo looks similar. */
  threshold?: number;
}

/** The closest earlier photo within its threshold, if any. */
export function findReuse(hash: string, known: KnownPhoto[], threshold = REUSE_THRESHOLD) {
  let best: (KnownPhoto & { distance: number }) | null = null;
  for (const k of known) {
    const d = hamming(hash, k.hash);
    if (d <= (k.threshold ?? threshold) && (!best || d < best.distance)) best = { ...k, distance: d };
  }
  return best;
}
