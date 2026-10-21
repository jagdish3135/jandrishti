// Generates the README banner and "how it works" diagram in light and dark versions.
// Fonts are subset from Google Fonts and embedded, so the SVGs look right on GitHub.
// Usage: node docs/readme/make-svgs.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function font(family, weight, text) {
  const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();
  const src = css.match(/url\((https:[^)]+)\)/)?.[1];
  if (!src) throw new Error(`No font file for ${family}`);
  const b64 = Buffer.from(await (await fetch(src)).arrayBuffer()).toString('base64');
  return `@font-face{font-family:'${family}';font-weight:${weight};src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
}

const DISPLAY_TEXT = 'JANDRISHTIEVERYCOMPLAINTGETSANAMEDEADLINEBOSS.,0123456789FILEONCEOWNERAUTOESCALATEPROOFNOTPROMISESHOWITWORKSL';
const MONO_TEXT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·-+:./() ';
const BODY_TEXT = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,·’\'-–()';
const fonts = [
  await font('Big Shoulders Display', 900, DISPLAY_TEXT + DISPLAY_TEXT.toLowerCase()),
  await font('JetBrains Mono', 700, MONO_TEXT),
  await font('Atkinson Hyperlegible Next', 400, BODY_TEXT),
  await font('Atkinson Hyperlegible Next', 700, BODY_TEXT),
  await font('Tiro Devanagari Hindi', 400, 'जनदृष्टि'),
].join('');

const THEMES = {
  light: { bg: '#f2efe6', card: '#fbfaf6', ink: '#17191c', muted: '#4a4f57', line: '#d3ccbc', ghost: '#ddd6c6' },
  dark: { bg: '#111315', card: '#1b1e22', ink: '#ece8dc', muted: '#b3b7be', line: '#2f343a', ghost: '#22262b' },
};
const HAZ = '#ffc21a';
const PLATE = '#17191c';
const D = "font-family=\"'Big Shoulders Display'\" font-weight=\"900\"";
const M = "font-family=\"'JetBrains Mono'\" font-weight=\"700\"";
const B = "font-family=\"'Atkinson Hyperlegible Next'\"";

const stripes = (id) =>
  `<pattern id="${id}" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="24" fill="${HAZ}"/><rect x="12" width="12" height="24" fill="${PLATE}"/></pattern>`;
const eye = (x, y, s) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><rect width="64" height="64" rx="12" fill="${PLATE}"/><path d="M6 32c7-11 16-17 26-17s19 6 26 17c-7 11-16 17-26 17S13 43 6 32z" fill="${HAZ}"/><circle cx="32" cy="32" r="11" fill="${PLATE}"/><circle cx="32" cy="32" r="4.5" fill="${HAZ}"/></g>`;

function banner(t) {
  const rows = [
    ['L1', 'Junior Engineer', 'MISSED'],
    ['L2', 'Assistant Engineer', 'MISSED'],
    ['L3', 'Executive Engineer', 'OWNS IT'],
    ['L4', 'Commissioner', ''],
  ];
  const ladder = rows
    .map(([l, who, tag], i) => {
      const y = 132 + i * 50;
      const now = i === 2;
      return `<g transform="translate(870 ${y})">
        <rect width="330" height="40" rx="6" fill="${now ? HAZ : 'none'}" stroke="${now ? HAZ : '#3a3f45'}" stroke-width="1.5" ${tag === 'MISSED' ? 'stroke-dasharray="5 4"' : ''}/>
        <text x="14" y="26" ${M} font-size="13" fill="${now ? PLATE : '#a7a59c'}">${l}</text>
        <text x="52" y="26" ${B} font-size="16" fill="${now ? PLATE : tag === 'MISSED' ? '#8d939b' : '#f3efe4'}">${who}</text>
        <text x="316" y="26" text-anchor="end" ${M} font-size="11" letter-spacing="1" fill="${now ? PLATE : '#ff8a7e'}">${tag}</text>
      </g>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 400" width="1280" height="400">
  <defs><style>${fonts}</style>${stripes('hz')}</defs>
  <rect width="1280" height="400" fill="${t.bg}"/>
  <text x="640" y="330" ${'font-family="\'Tiro Devanagari Hindi\'"'} font-size="300" fill="none" stroke="${t.ghost}" stroke-width="2">जनदृष्टि</text>
  ${eye(64, 56, 1.1)}
  <text x="150" y="112" ${D} font-size="72" fill="${t.ink}">JANDRISHTI</text>
  <text x="152" y="148" font-family="'Tiro Devanagari Hindi'" font-size="26" fill="${t.muted}">जनदृष्टि</text>
  <text x="64" y="222" ${D} font-size="50" fill="${t.ink}">EVERY COMPLAINT GETS A</text>
  <rect x="62" y="236" width="146" height="54" fill="${HAZ}"/><text x="70" y="282" ${D} font-size="50" fill="${PLATE}">NAME,</text>
  <rect x="216" y="236" width="190" height="54" fill="${HAZ}"/><text x="224" y="282" ${D} font-size="50" fill="${PLATE}">DEADLINE</text>
  <text x="420" y="282" ${D} font-size="50" fill="${t.ink}">AND A BOSS.</text>
  <text x="64" y="330" ${B} font-size="19" fill="${t.muted}">Civic complaints with named officers, automatic escalation and AI-checked proof photos.</text>
  <g>
    <rect x="846" y="58" width="378" height="300" rx="10" fill="${PLATE}"/>
    <text x="870" y="96" ${M} font-size="12" letter-spacing="2" fill="#a7a59c">ESCALATION CHAIN · SAMPLE</text>
    <text x="1200" y="96" text-anchor="end" ${M} font-size="12" letter-spacing="2" fill="#ff6b5e">● LIVE</text>
    ${ladder}
  </g>
  <rect y="384" width="1280" height="16" fill="url(#hz)"/>
</svg>`;
}

function howItWorks(t) {
  const steps = [
    ['01', 'FILE ONCE', ['Pick the problem, drop a pin,', 'add a photo. Duplicates nearby', 'are offered as "support it".']],
    ['02', 'NAMED OWNER', ['Routed to the ward officer for', 'that department, with a fixed', 'deadline you can see.']],
    ['03', 'AUTO-ESCALATE', ['Miss the deadline and it climbs', 'to the senior officer, up to the', 'Commissioner. It stays on record.']],
    ['04', 'PROOF, NOT PROMISES', ['Closes only with a live photo,', 'taken on site after filing, that', 'matches no earlier proof photo.']],
  ];
  const w = 282;
  const cards = steps
    .map(([n, title, lines], i) => {
      const x = 40 + i * (w + 24);
      return `<g transform="translate(${x} 92)">
        <rect width="${w}" height="210" rx="10" fill="${PLATE}"/>
        <rect x="3" y="3" width="${w - 6}" height="204" rx="8" fill="none" stroke="#3a3f45" stroke-width="2"/>
        <text x="22" y="72" ${D} font-size="64" fill="${HAZ}">${n}</text>
        <text x="22" y="112" ${D} font-size="28" fill="#f3efe4">${title}</text>
        ${lines.map((l, j) => `<text x="22" y="${142 + j * 21}" ${B} font-size="15" fill="#c9c6bb">${l.replace(/&/g, '&amp;')}</text>`).join('')}
      </g>${i < 3 ? `<path d="M${x + w + 4} 197 l14 0 m-6 -6 l6 6 l-6 6" stroke="${t.ink}" stroke-width="2.5" fill="none"/>` : ''}`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 340" width="1280" height="340">
  <defs><style>${fonts}</style>${stripes('hz')}</defs>
  <rect width="1280" height="340" fill="${t.bg}"/>
  <text x="40" y="62" ${D} font-size="40" fill="${t.ink}">HOW IT WORKS</text>
  <text x="1240" y="62" text-anchor="end" ${B} font-size="16" fill="${t.muted}">Same four rules for every department</text>
  ${cards}
  <rect y="326" width="1280" height="14" fill="url(#hz)"/>
</svg>`;
}

for (const [name, t] of Object.entries(THEMES)) {
  writeFileSync(join(here, `banner-${name}.svg`), banner(t));
  writeFileSync(join(here, `how-it-works-${name}.svg`), howItWorks(t));
  console.log('✓', name);
}
