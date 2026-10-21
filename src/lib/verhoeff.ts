// Verhoeff checksum, the check digit scheme Aadhaar numbers use.
const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];
const INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

function digits(s: string) {
  return s.split('').reverse().map(Number);
}

export function verhoeffValid(num: string): boolean {
  if (!/^\d+$/.test(num)) return false;
  let c = 0;
  digits(num).forEach((d, i) => {
    c = D[c][P[i % 8][d]];
  });
  return c === 0;
}

export function verhoeffDigit(num: string): number {
  let c = 0;
  digits(num).forEach((d, i) => {
    c = D[c][P[(i + 1) % 8][d]];
  });
  return INV[c];
}

export function cleanAadhaar(input: string) {
  return input.replace(/[\s-]/g, '');
}

/** Format check only: 12 digits, cannot start with 0 or 1, valid Verhoeff check digit. */
export function aadhaarError(input: string): string | null {
  const n = cleanAadhaar(input);
  if (!/^\d{12}$/.test(n)) return 'Aadhaar has 12 digits.';
  if (/^[01]/.test(n)) return 'Aadhaar numbers never start with 0 or 1.';
  if (!verhoeffValid(n)) return 'This number fails the Aadhaar checksum. Check for a typo.';
  return null;
}

/** A random number that passes the format check, for trying the demo. Not a real Aadhaar. */
export function testAadhaar(rand: () => number = Math.random): string {
  let body = String(2 + Math.floor(rand() * 8));
  while (body.length < 11) body += Math.floor(rand() * 10);
  return body + verhoeffDigit(body);
}

export function phoneError(input: string): string | null {
  const n = input.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  if (!/^[6-9]\d{9}$/.test(n)) return 'Enter a 10-digit Indian mobile number.';
  return null;
}

export function cleanPhone(input: string) {
  return input.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
}
