// Captures the README media from a running app (npm run dev): screenshots in both themes,
// a phone shot, and two demo videos (MP4 + animated WebP + GIF fallback).
// Every run starts from fresh sample data, so nothing personal ends up in the README.
// Usage: node docs/readme/capture.mjs [shots,video] [baseUrl]   (needs ffmpeg on PATH)
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ONLY = (process.argv[2] ?? 'shots,video').split(',');
const BASE = (process.argv[3] ?? 'http://127.0.0.1:5180').replace(/\/$/, '');
const browser = await chromium.launch();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ffmpeg = (...args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
// Grain is static noise that bloats animated WebP/GIF and JPEGs; the media look the same without it.
const NO_GRAIN = 'body::before { display: none !important; }';

async function context(theme, size = { width: 1280, height: 800 }, extra = {}) {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 2, colorScheme: theme, reducedMotion: 'no-preference', ...extra });
  await ctx.addInitScript((t) => localStorage.setItem('jd:theme', t), theme);
  return ctx;
}

async function open(ctx, path) {
  const page = await ctx.newPage();
  await page.goto(BASE + path);
  await page.addStyleTag({ content: NO_GRAIN });
  await wait(900);
  return page;
}

const asPriya = async (page, next) => {
  await page.goto(`${BASE}/login?next=${encodeURIComponent(next)}`);
  await page.getByRole('button', { name: 'Continue as Priya Deshmukh' }).click();
  await page.waitForURL(`**${next}`);
  await page.addStyleTag({ content: NO_GRAIN });
  await wait(900);
};
const asOfficer = async (page, id, next) => {
  await page.goto(`${BASE}/login?as=officer&next=${encodeURIComponent(next)}`);
  await page.locator('select').selectOption(id);
  await page.getByRole('button', { name: 'Open officer desk' }).click();
  await page.waitForURL(`**${next}`);
  await page.addStyleTag({ content: NO_GRAIN });
  await wait(900);
};
const scrollTo = (page, sel, offset = 90) =>
  page.evaluate(([s, o]) => window.scrollTo(0, window.scrollY + document.querySelector(s).getBoundingClientRect().top - o), [sel, offset]);
const shot = async (page, name, opts = {}) => {
  // The floating demo clock covers content in stills; the videos show it in use.
  await page.addStyleTag({ content: '.dock { display: none !important; }' });
  await page.screenshot({ path: join(here, `${name}.jpg`), type: 'jpeg', quality: 84, ...opts });
  console.log('✓', name);
};

// ---------- Screenshots
if (ONLY.includes('shots')) {
  for (const theme of ['dark', 'light']) {
    const ctx = await context(theme);
    const page = await open(ctx, '/');
    await wait(5000); // hero board climbs one level
    await shot(page, `landing-${theme}`);

    await asPriya(page, '/complaints/JD-26-00003');
    await shot(page, `complaint-${theme}`);

    await page.goto(`${BASE}/officers/roads-je-west`);
    await page.addStyleTag({ content: NO_GRAIN });
    await wait(1200);
    await shot(page, `officer-${theme}`);

    await page.goto(`${BASE}/map`);
    await page.addStyleTag({ content: NO_GRAIN });
    await wait(3500); // map tiles
    await scrollTo(page, '.map-page', 100);
    await wait(600);
    await shot(page, `map-${theme}`);
    await ctx.close();
  }

  // Filing: duplicate check with the routing preview.
  {
    const ctx = await context('light');
    const page = await ctx.newPage();
    await asPriya(page, '/my');
    // Sign in as a neighbour instead, so the duplicate is someone else's complaint.
    await page.evaluate(() => {
      const db = JSON.parse(localStorage.getItem('jd:v1'));
      db.session = { role: 'citizen', citizenId: 'cz-7' };
      localStorage.setItem('jd:v1', JSON.stringify(db));
    });
    await page.goto(`${BASE}/file`);
    await page.addStyleTag({ content: NO_GRAIN });
    await page.locator('select').selectOption('roads');
    await page.getByRole('button', { name: /Pothole/ }).click();
    await scrollTo(page, '.map', 220);
    await wait(2500);
    const pin = await page.locator('.leaflet-marker-icon[title="Already reported: JD-26-00001"]').boundingBox();
    await page.mouse.click(pin.x + pin.width / 2 + 3, pin.y + pin.height + 3);
    await wait(1200);
    await scrollTo(page, '.map', 170);
    await wait(500);
    await shot(page, 'file-duplicate');
    await ctx.close();
  }

  // Proof dialog: a reused photo is caught.
  {
    const ctx = await context('light', { width: 1280, height: 900 });
    const page = await ctx.newPage();
    await asOfficer(page, 'roads-je-west', '/complaints/JD-26-00001');
    await page.getByRole('button', { name: 'Upload proof and resolve' }).click();
    await page.getByRole('button', { name: 'Try to cheat with an old proof photo' }).click();
    await wait(3200);
    await page.locator('dialog .callout').scrollIntoViewIfNeeded();
    await shot(page, 'proof-rejected');
    await ctx.close();
  }

  // Hindi home page, and a Marathi "Other" problem on the reporting page.
  {
    const ctx = await context('light');
    await ctx.addInitScript(() => localStorage.setItem('jd:lang', 'hi'));
    const page = await open(ctx, '/');
    await wait(1500);
    await shot(page, 'landing-hi');
    await ctx.close();
  }
  {
    const ctx = await context('light', { width: 1280, height: 900 });
    await ctx.addInitScript(() => localStorage.setItem('jd:lang', 'mr'));
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login?next=%2Ffile%3Fdept%3Dwater`);
    await page.locator('.choice .btn').click();
    await page.waitForURL('**/file**');
    await page.addStyleTag({ content: NO_GRAIN });
    await page.locator('.cat-other').click();
    await page.locator('fieldset.types input').fill('पाण्याचे मीटर तुटले आहे');
    await scrollTo(page, 'h1', 110);
    await wait(800);
    await shot(page, 'file-other-mr');
    await ctx.close();
  }

  // Phone.
  {
    const ctx = await context('light', { width: 390, height: 844 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
    const page = await ctx.newPage();
    await asPriya(page, '/complaints/JD-26-00001');
    await shot(page, 'mobile-complaint');
    await ctx.close();
  }
}

// ---------- Videos: record the page, encode MP4 + WebP + GIF
async function record(name, seconds, run, size = { width: 1280, height: 800 }) {
  const tmp = join(here, '.tmp-video');
  rmSync(tmp, { recursive: true, force: true });
  const ctx = await browser.newContext({ viewport: size, recordVideo: { dir: tmp, size }, colorScheme: 'light', reducedMotion: 'no-preference' });
  await ctx.addInitScript(() => localStorage.setItem('jd:theme', 'light'));
  const page = await ctx.newPage();
  const startAt = await run(page);
  await ctx.close();
  const webm = join(tmp, readdirSync(tmp).find((f) => f.endsWith('.webm')));
  const out = (ext) => join(here, `${name}.${ext}`);
  ffmpeg('-ss', String(startAt), '-i', webm, '-t', String(seconds), '-vf', 'fps=30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-movflags', '+faststart', out('mp4'));
  ffmpeg('-i', out('mp4'), '-vf', 'fps=15,scale=960:-2:flags=lanczos', '-c:v', 'libwebp_anim', '-loop', '0', '-q:v', '70', '-an', out('webp'));
  ffmpeg('-i', out('mp4'), '-vf', 'fps=8,scale=720:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle', '-loop', '0', out('gif'));
  rmSync(tmp, { recursive: true, force: true });
  console.log('✓', name, `(${seconds}s)`);
}

if (ONLY.includes('video')) {
  // 1. Escalation: Priya's pothole misses deadline after deadline and climbs the chain.
  await record('escalation', 16, async (page) => {
    const t0 = Date.now();
    await asPriya(page, '/complaints/JD-26-00001');
    await page.evaluate(() => window.scrollTo(0, 0));
    const start = (Date.now() - t0) / 1000;
    await wait(2000);
    for (const label of ['Jump 1 day ahead', 'Jump 3 days ahead', 'Jump 3 days ahead', 'Jump 7 days ahead']) {
      await page.getByTitle(label).click();
      await wait(3200);
    }
    return start;
  });

  // 2. Proof: a reused photo is rejected, then a live on-site photo closes the case.
  await record('proof', 20, async (page) => {
    const t0 = Date.now();
    await asOfficer(page, 'roads-je-west', '/complaints/JD-26-00001');
    const start = (Date.now() - t0) / 1000;
    await wait(1200);
    await page.getByRole('button', { name: 'Upload proof and resolve' }).click();
    await wait(1200);
    await page.getByRole('button', { name: 'Try to cheat with an old proof photo' }).click();
    await wait(4200);
    await page.getByRole('button', { name: 'Retake' }).click();
    await wait(900);
    await page.getByRole('button', { name: 'Simulate a live photo on site' }).click();
    await wait(4000);
    await page.getByRole('button', { name: 'Mark as resolved' }).click();
    await wait(1200);
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await wait(3000);
    return start;
  }, { width: 1280, height: 900 });
}

await browser.close();
