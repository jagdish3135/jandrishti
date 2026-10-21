import { between, hashString, mulberry32, pick } from './rand';

/**
 * Sample "evidence photos" for the demo data, drawn as SVG street scenes.
 * Each seed gives a different street; `fixed` draws the same spot after the repair,
 * from a slightly different camera position, the way a real after-photo would look.
 */
export type SceneKind = 'pothole' | 'footpath' | 'debris' | 'tap' | 'pipe' | 'drain' | 'light' | 'wire' | 'garbage';

export const SCENE_FOR_CATEGORY: Record<string, SceneKind> = {
  pothole: 'pothole',
  footpath: 'footpath',
  debris: 'debris',
  'no-water': 'tap',
  'dirty-water': 'tap',
  leak: 'pipe',
  drain: 'drain',
  sewer: 'drain',
  streetlight: 'light',
  wire: 'wire',
  garbage: 'garbage',
  dumping: 'garbage',
  'tree-fall': 'debris',
  park: 'garbage',
  toilet: 'drain',
  mosquito: 'drain',
  encroach: 'footpath',
  hoarding: 'debris',
};

/** Scene for any category, including "Other problem" ones. */
export const sceneFor = (categoryId: string): SceneKind => SCENE_FOR_CATEGORY[categoryId] ?? 'debris';

const SKIES = [
  ['#9ec9e8', '#e8f1f4'],
  ['#c9ccd1', '#eceae4'],
  ['#f2b58a', '#f6e3c8'],
  ['#86b7d8', '#d9e8ee'],
  ['#d7c7a8', '#f1ebdf'],
];
const WALLS = ['#d9cdb5', '#c7b299', '#e6dfd0', '#b8a58c', '#d1a98a', '#a7b5a8', '#e2c9a0', '#c3c9cf', '#9e8f7c'];

export function seedRef(kind: SceneKind, seed: string, fixed: boolean) {
  return `seed:${kind}:${seed}:${fixed ? 1 : 0}`;
}

export function parseSeedRef(ref: string) {
  const [, kind, seed, fixed] = ref.split(':');
  return { kind: kind as SceneKind, seed, fixed: fixed === '1' };
}

export function sceneSvg(kind: SceneKind, seed: string, fixed: boolean, salt = ''): string {
  const r = mulberry32(hashString(seed));
  // Camera nudge for the after-photo (and per-salt for demo captures).
  const cam = mulberry32(hashString(seed + (fixed ? ':after' : ':before') + salt));
  const W = 640;
  const H = 480;
  const horizon = between(r, 150, 290) + (fixed ? between(cam, 18, 34) * (cam() > 0.5 ? 1 : -1) : 0);
  const vx = between(r, 170, 470) + (fixed ? between(cam, 50, 90) * (cam() > 0.5 ? 1 : -1) : 0);
  const [skyTop, skyBottom] = pick(r, SKIES);
  const parts: string[] = [];

  parts.push(
    `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${skyTop}"/><stop offset="1" stop-color="${skyBottom}"/></linearGradient>` +
      `<linearGradient id="r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#55575a"/><stop offset="1" stop-color="#2f3133"/></linearGradient></defs>`,
    `<rect width="${W}" height="${H}" fill="url(#s)"/>`,
  );

  // Skyline.
  let x = between(r, -60, 0);
  while (x < W) {
    const w = between(r, 50, 150);
    const h = between(r, 40, horizon - 20);
    const wall = pick(r, WALLS);
    parts.push(`<rect x="${x.toFixed(0)}" y="${(horizon - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="${wall}"/>`);
    const rows = Math.floor(h / 26);
    const cols = Math.floor(w / 24);
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < cols; j++)
        if (r() > 0.25)
          parts.push(
            `<rect x="${(x + 8 + j * 24).toFixed(0)}" y="${(horizon - h + 10 + i * 26).toFixed(0)}" width="11" height="13" fill="${r() > 0.8 ? '#f6d77a' : '#5b6670'}" opacity=".75"/>`,
          );
    x += w + between(r, -10, 30);
  }
  // Trees.
  const trees = Math.floor(between(r, 1, 5));
  for (let i = 0; i < trees; i++) {
    const tx = between(r, 0, W);
    const s = between(r, 30, 70);
    parts.push(
      `<rect x="${tx - 4}" y="${horizon - s * 0.4}" width="8" height="${s * 0.6}" fill="#5a4632"/>`,
      `<circle cx="${tx}" cy="${horizon - s * 0.7}" r="${s * 0.55}" fill="${pick(r, ['#4f7a4a', '#5f8a4e', '#3f6b45'])}"/>`,
    );
  }

  // Road in perspective, with a footpath edge.
  parts.push(
    `<rect y="${horizon}" width="${W}" height="${H - horizon}" fill="#8f8a80"/>`,
    `<polygon points="${vx - 6},${horizon} ${vx + 6},${horizon} ${W + 220},${H} ${-220},${H}" fill="url(#r)"/>`,
    `<polygon points="${vx},${horizon} ${vx + 1.5},${horizon} ${vx + 40},${H} ${vx - 40},${H}" fill="#e8d36a" opacity=".55"/>`,
  );

  const ox = between(r, 150, 490);
  const oy = horizon + (H - horizon) * between(r, 0.55, 0.8);
  parts.push(drawSubject(kind, ox, oy, horizon, fixed, r));

  // Fine grain so it reads as a photo.
  parts.push(
    `<filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${hashString(seed) % 100}"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .12 0"/></filter>`,
    `<rect width="${W}" height="${H}" filter="url(#g)"/>`,
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${parts.join('')}</svg>`;
}

function drawSubject(kind: SceneKind, x: number, y: number, horizon: number, fixed: boolean, r: () => number): string {
  const s = 0.6 + (y - horizon) / 300;
  const g = (inner: string) => `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${s.toFixed(2)})">${inner}</g>`;
  switch (kind) {
    case 'pothole':
      return g(
        fixed
          ? `<path d="M-95-30h190v62h-190z" fill="#1f2022" transform="rotate(-3)"/><path d="M-95-30h190v62h-190z" fill="none" stroke="#6d6e70" stroke-width="3" transform="rotate(-3)"/>`
          : `<ellipse rx="85" ry="30" fill="#1b1a18"/><ellipse rx="70" ry="22" fill="#4a5a63" opacity=".8"/><path d="M-90 0l-30 10M88 -4l34-12M20 28l12 22" stroke="#222" stroke-width="4"/>`,
      );
    case 'footpath': {
      let tiles = '';
      for (let i = 0; i < 6; i++)
        for (let j = 0; j < 2; j++) {
          const broken = !fixed && r() > 0.5;
          tiles += `<rect x="${-150 + i * 50}" y="${-40 + j * 40}" width="46" height="36" fill="${broken ? '#7c746a' : '#c9c2b4'}" transform="rotate(${broken ? (r() * 18 - 9).toFixed(0) : 0} ${-127 + i * 50} ${-22 + j * 40})"/>`;
        }
      return g(`<rect x="-156" y="-46" width="312" height="90" fill="#6d665c"/>${tiles}`);
    }
    case 'debris':
      return g(
        fixed
          ? `<path d="M-120 30h240" stroke="#e8d36a" stroke-width="6" stroke-dasharray="30 20"/><rect x="90" y="-60" width="10" height="70" fill="#d9d9d9"/><rect x="80" y="-70" width="30" height="16" fill="#e2522b"/>`
          : `<path d="M-130 30l40-70 30 30 40-60 50 50 30-20 60 70z" fill="#7a6a58"/><circle cx="-40" cy="10" r="22" fill="#5d5145"/><circle cx="50" cy="16" r="16" fill="#8c7b66"/><rect x="-80" y="-20" width="70" height="10" fill="#a0522d" transform="rotate(-20)"/>`,
      );
    case 'tap':
      return g(
        `<rect x="-20" y="-150" width="40" height="150" fill="#3d6f8f"/><rect x="-60" y="-150" width="80" height="22" fill="#2c5570"/><rect x="-70" y="-150" width="14" height="40" fill="#2c5570"/>` +
          (fixed
            ? `<path d="M-63-110 q-6 60 4 110" stroke="#9fd3ef" stroke-width="10" fill="none" opacity=".9"/><ellipse cx="-60" cy="4" rx="40" ry="10" fill="#9fd3ef" opacity=".6"/>`
            : `<path d="M-63-108v8" stroke="#555" stroke-width="6"/><ellipse cx="-60" cy="4" rx="40" ry="10" fill="#7a6b4a" opacity=".5"/>`),
      );
    case 'pipe':
      return g(
        `<rect x="-170" y="-20" width="340" height="34" rx="10" fill="#6c7b86"/>` +
          (fixed
            ? `<rect x="-20" y="-28" width="40" height="50" rx="6" fill="#2f3b44"/><rect x="-26" y="-6" width="52" height="8" fill="#9aa7b0"/>`
            : `<path d="M0-20 q-40-80 -90-70 M0-20 q10-90 40-100 M0-20 q50-60 100-40" stroke="#9fd3ef" stroke-width="7" fill="none"/><ellipse cy="30" rx="110" ry="18" fill="#6e9fbf" opacity=".6"/>`),
      );
    case 'drain':
      return g(
        `<rect x="-80" y="-30" width="160" height="60" fill="#2b2b2b"/>` +
          Array.from({ length: 9 }, (_, i) => `<rect x="${-74 + i * 17}" y="-24" width="8" height="48" fill="#5d5d5d"/>`).join('') +
          (fixed ? '' : `<path d="M-150 30 q60-40 140-20 q80 20 160-10 l20 40 h-340z" fill="#5b5236" opacity=".85"/><circle cx="-20" cy="40" r="10" fill="#d6d0b0"/><rect x="40" y="30" width="22" height="12" fill="#c33" transform="rotate(15)"/>`),
      );
    case 'light':
      return g(
        `<rect x="-6" y="-260" width="12" height="260" fill="#3b3f44"/><path d="M0-258 q40-10 70 6" stroke="#3b3f44" stroke-width="10" fill="none"/><rect x="58" y="-258" width="34" height="14" rx="4" fill="#262a2e"/>` +
          (fixed
            ? `<circle cx="75" cy="-236" r="16" fill="#ffe27a"/><circle cx="75" cy="-236" r="44" fill="#ffe27a" opacity=".3"/><path d="M60-236l-60 236h160z" fill="#ffe27a" opacity=".16"/>`
            : `<circle cx="75" cy="-236" r="12" fill="#4b4f55"/>`),
      );
    case 'wire':
      return g(
        `<rect x="-90" y="-190" width="12" height="190" fill="#4a4a4a"/><rect x="-110" y="-110" width="52" height="70" fill="#7f8b93"/>` +
          (fixed
            ? `<rect x="-112" y="-112" width="56" height="74" fill="#5a6870"/><path d="M-84-190 q120 30 240-10" stroke="#222" stroke-width="4" fill="none"/>`
            : `<path d="M-84-40 q30 40 10 80 q-10 20 30 30" stroke="#222" stroke-width="5" fill="none"/><path d="M-40 70 l8-14 6 10 10-16" stroke="#ffd23f" stroke-width="4" fill="none"/>`),
      );
    case 'garbage':
      return g(
        fixed
          ? `<rect x="-30" y="-70" width="60" height="70" rx="6" fill="#2f7d4f"/><rect x="-36" y="-80" width="72" height="12" rx="4" fill="#256640"/><rect x="40" y="-60" width="50" height="60" rx="6" fill="#2a5a8f"/><rect x="35" y="-68" width="60" height="10" rx="4" fill="#214a76"/>`
          : Array.from({ length: 14 }, () => {
              const cx = r() * 220 - 110;
              const cy = r() * 50 - 30;
              return `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${(18 + r() * 22).toFixed(0)}" ry="${(12 + r() * 14).toFixed(0)}" fill="${pick(r, ['#2d2d2d', '#4c6b3c', '#7a5c3a', '#a33', '#ddd', '#3a5f8a'])}"/>`;
            }).join(''),
      );
  }
}

export function sceneDataUrl(ref: string, salt = ''): string {
  const { kind, seed, fixed } = parseSeedRef(ref);
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sceneSvg(kind, seed, fixed, salt));
}
