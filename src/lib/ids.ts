/** Accepts "JD-26-00001", "jd 26 00001", "26-1" or just "1". */
export function normaliseId(input: string) {
  const s = input.trim().toUpperCase().replace(/\s+/g, '-');
  const m = s.match(/^(?:JD-?)?(?:(\d{2})-?)?(\d{1,5})$/);
  if (!m) return s;
  return `JD-${m[1] ?? '26'}-${m[2].padStart(5, '0')}`;
}
