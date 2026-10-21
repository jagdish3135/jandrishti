// Generates the README banner and "how it works" diagram in light and dark versions.
// Fonts are subset from Google Fonts and embedded, so the SVGs look right on GitHub.
// Usage: node docs/readme/make-svgs.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function font(family, weight, text, axis = 'wght') {
  const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:${axis}@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();
  const src = css.match(/url\((https:[^)]+)\)/)?.[1];
  if (!src) throw new Error(`No font file for ${family}`);
  const b64 = Buffer.from(await (await fetch(src)).arrayBuffer()).toString('base64');
  return `@font-face{font-family:'${family}';font-weight:${weight};src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
}

const ASCII = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,·’\'-–()?:/+×';
const fonts = [
  await font('Literata', 700, ASCII),
  await font('Atkinson Hyperlegible Next', 400, ASCII),
  await font('Atkinson Hyperlegible Next', 700, ASCII),
  await font('JetBrains Mono', 700, ASCII),
  await font('Tiro Devanagari Hindi', 400, 'जनदृष्टि'),
].join('');

const THEMES = {
  light: { bg: '#ffffff', page: '#f6f9fe', card: '#ffffff', ink: '#0f1b2d', muted: '#33425a', line: '#cfdcef', blue: '#1a64d6', deep: '#1559c7', tint: '#e6f0fe', onBlue: '#ffffff', warnBg: '#ffeadb', warn: '#9c3d00' },
  dark: { bg: '#0b1424', page: '#0b1424', card: '#111e33', ink: '#eef3fb', muted: '#c6d2e4', line: '#2a3d60', blue: '#8ab8ff', deep: '#9cc3ff', tint: '#16284a', onBlue: '#0a1a33', warnBg: '#3d2312', warn: '#ffab76' },
};
const S = "font-family=\"'Literata'\" font-weight=\"700\"";
const B = "font-family=\"'Atkinson Hyperlegible Next'\"";
const M = "font-family=\"'JetBrains Mono'\" font-weight=\"700\"";

const logo = (x, y, s, t) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><rect width="64" height="64" rx="14" fill="${t.deep}"/><path d="M8 32c6.5-10 14.7-15 24-15s17.5 5 24 15c-6.5 10-14.7 15-24 15S14.5 42 8 32z" fill="${t.bg === '#ffffff' ? '#ffffff' : t.card}"/><circle cx="32" cy="32" r="10" fill="${t.deep}"/><circle cx="35.5" cy="28.5" r="3" fill="${t.bg === '#ffffff' ? '#ffffff' : t.card}"/></g>`;

function banner(t) {
  const levels = [
    ['1', 'Junior Engineer', 'Missed deadline', 'missed'],
    ['2', 'Assistant Engineer', 'Has it now', 'now'],
    ['3', 'Executive Engineer', 'Next if late', ''],
  ];
  const ladder = levels
    .map(([n, who, tag, kind], i) => {
      const y = 214 + i * 46;
      const now = kind === 'now';
      return `<g transform="translate(796 ${y})">
        <rect width="410" height="38" rx="8" fill="${now ? t.tint : t.card}" stroke="${now ? t.blue : t.line}" stroke-width="1.5" ${kind === 'missed' ? 'stroke-dasharray="5 4"' : ''}/>
        ${now ? `<rect width="4" height="38" rx="2" fill="${t.blue}"/>` : ''}
        <circle cx="24" cy="19" r="12" fill="${now ? t.blue : t.page}" stroke="${now ? t.blue : t.line}" stroke-width="1.5"/>
        <text x="24" y="24" text-anchor="middle" ${B} font-weight="700" font-size="13" fill="${now ? t.onBlue : t.muted}">${n}</text>
        <text x="48" y="25" ${B} font-weight="700" font-size="15" fill="${t.ink}">${who}</text>
        <text x="396" y="25" text-anchor="end" ${B} font-weight="700" font-size="13" fill="${kind === 'missed' ? '#b3261e' : now ? t.blue : t.muted}">${tag}</text>
      </g>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 400" width="1280" height="400">
  <defs><style>${fonts}</style></defs>
  <rect width="1280" height="400" fill="${t.bg}"/>
  <g fill="none" stroke="${t.blue}" stroke-opacity=".07" stroke-width="1.5">
    <path d="M-20 90c120-50 240 40 380-10s260-70 450 15"/><path d="M-20 190c130-60 250 50 390-5s270-60 440 25"/><path d="M-20 290c110-40 260 60 400 0s250-80 430 10"/>
  </g>
  ${logo(64, 58, 0.95, t)}
  <text x="140" y="96" ${S} font-size="40" fill="${t.deep}">JanDrishti</text>
  <text x="141" y="122" font-family="'Tiro Devanagari Hindi'" font-size="19" fill="${t.muted}">जनदृष्टि</text>
  <text x="196" y="121" ${B} font-size="15" fill="${t.muted}">· Public complaint portal</text>
  <text x="64" y="200" ${S} font-size="37" fill="${t.ink}">Report a civic problem.</text>
  <rect x="62" y="236" width="644" height="14" fill="${t.tint}"/>
  <text x="64" y="248" ${S} font-size="37" fill="${t.blue}">Know who will fix it, and by when.</text>
  <text x="64" y="300" ${B} font-size="19" fill="${t.muted}">Every complaint gets a named officer and a deadline. Missed deadlines go to</text>
  <text x="64" y="326" ${B} font-size="19" fill="${t.muted}">the senior officer automatically. Cases close only with checked photo proof.</text>
  <g>
    <rect x="770" y="54" width="462" height="312" rx="16" fill="${t.card}" stroke="${t.line}"/>
    <rect x="796" y="78" width="210" height="28" rx="14" fill="${t.warnBg}"/>
    <text x="812" y="97" ${B} font-weight="700" font-size="14" fill="${t.warn}">↑ Moved to senior officer</text>
    <text x="1206" y="97" text-anchor="end" ${M} font-size="13" fill="${t.muted}">JD-26-00001</text>
    <text x="796" y="142" ${S} font-size="26" fill="${t.ink}">Pothole, Karve Road</text>
    <text x="796" y="176" ${B} font-size="15" fill="${t.muted}">Must be fixed by</text>
    <text x="912" y="176" ${B} font-weight="700" font-size="15" fill="${t.ink}">Tue, 28 Oct · 3 days left</text>
    ${ladder}
  </g>
  <rect y="390" width="1280" height="10" fill="${t.deep}"/>
  <rect x="768" y="390" width="320" height="10" fill="${t.blue}"/>
</svg>`;
}

function howItWorks(t) {
  const steps = [
    ['1', 'You report it', ['Choose the problem, mark the', 'place on the map and add a', 'photo if you can.']],
    ['2', 'An officer is named', ['It goes to the officer for your', 'ward, with a date by which it', 'must be fixed.']],
    ['3', 'Late? It goes up', ['If the date passes, it moves', 'to the senior officer', 'automatically.']],
    ['4', 'Photo proof', ['The officer sends a new photo', 'from the site. You confirm it', 'is really fixed.']],
  ];
  const w = 282;
  const cards = steps
    .map(([n, title, lines], i) => {
      const x = 40 + i * (w + 24);
      return `<g transform="translate(${x} 96)">
        <rect width="${w}" height="196" rx="14" fill="${t.card}" stroke="${t.line}"/>
        <rect width="${w}" height="6" rx="3" fill="${t.blue}"/>
        <circle cx="42" cy="54" r="22" fill="${t.blue}"/>
        <text x="42" y="62" text-anchor="middle" ${S} font-size="22" fill="${t.onBlue}">${n}</text>
        <text x="22" y="112" ${S} font-size="21" fill="${t.ink}">${title}</text>
        ${lines.map((l, j) => `<text x="22" y="${140 + j * 21}" ${B} font-size="15" fill="${t.muted}">${l}</text>`).join('')}
      </g>${i < 3 ? `<path d="M${x + w + 5} 194 l13 0 m-5 -5 l5 5 l-5 5" stroke="${t.blue}" stroke-width="2.5" fill="none" stroke-linecap="round"/>` : ''}`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 330" width="1280" height="330">
  <defs><style>${fonts}</style></defs>
  <rect width="1280" height="330" fill="${t.page}"/>
  <text x="40" y="62" ${S} font-size="32" fill="${t.ink}">How it works</text>
  <text x="1240" y="62" text-anchor="end" ${B} font-size="16" fill="${t.muted}">The same four steps for every department</text>
  ${cards}
</svg>`;
}

for (const [name, t] of Object.entries(THEMES)) {
  writeFileSync(join(here, `banner-${name}.svg`), banner(t));
  writeFileSync(join(here, `how-it-works-${name}.svg`), howItWorks(t));
  console.log('✓', name);
}
