[![Built with Knit](https://jagdish3135.github.io/knit/badge.svg)](https://jagdish3135.github.io/knit/)

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/banner-dark.svg">
  <img alt="JanDrishti: every complaint gets a name, a deadline and a boss" src="docs/readme/banner-light.svg" width="100%">
</picture>

<p align="center">
  <a href="https://jandrishti.vercel.app"><b>Live demo</b></a> ·
  <a href="#try-it-in-60-seconds">Try it in 60 seconds</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="#run-it-locally">Run locally</a>
</p>

<p align="center">
  <img alt="React 19" src="https://img.shields.io/badge/React-19-17191c?logo=react&logoColor=ffc21a">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-17191c?logo=typescript&logoColor=ffc21a">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-17191c?logo=vite&logoColor=ffc21a">
  <img alt="Leaflet + OpenStreetMap" src="https://img.shields.io/badge/Map-Leaflet%20%2B%20OSM-17191c?logo=leaflet&logoColor=ffc21a">
  <img alt="Tests" src="https://img.shields.io/badge/tests-26%20passing-1b7a46">
  <img alt="No server" src="https://img.shields.io/badge/backend-none%20(runs%20in%20browser)-ffc21a?labelColor=17191c">
</p>

**JanDrishti** (जनदृष्टि, "the people's eye") is one dashboard for complaints about any government service:
roads, water, drainage, streetlights and garbage. Every complaint gets a **named officer** and a **visible deadline**.
Miss the deadline and it **moves up to that officer's senior automatically**. It only closes with a **live, on-site
photo that hasn't been used before**, and every officer has a public score built from their actual work.

## See it work

**A missed deadline climbs the chain.** Priya's pothole goes from the Junior Engineer to the Assistant Engineer,
then the Executive Engineer, then the Commissioner, each time its deadline passes. The demo clock fast-forwards time.

<p align="center">
  <a href="docs/readme/escalation.mp4">
    <picture>
      <source srcset="docs/readme/escalation.webp" type="image/webp">
      <img alt="Demo: the complaint's countdown hits zero and moves up the escalation chain" src="docs/readme/escalation.gif" width="100%">
    </picture>
  </a>
</p>

**Old photos don't close cases.** The officer tries last month's proof photo and it's caught by its fingerprint and
logged on their record. A live photo taken on site passes every check and closes the case.

<p align="center">
  <a href="docs/readme/proof.mp4">
    <picture>
      <source srcset="docs/readme/proof.webp" type="image/webp">
      <img alt="Demo: a reused proof photo is rejected, then a new on-site photo passes" src="docs/readme/proof.gif" width="100%">
    </picture>
  </a>
</p>

<sub>MP4 versions: <a href="docs/readme/escalation.mp4">escalation.mp4</a> · <a href="docs/readme/proof.mp4">proof.mp4</a></sub>

## How it works

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme/how-it-works-dark.svg">
  <img alt="File once, named owner, auto-escalate, proof not promises" src="docs/readme/how-it-works-light.svg" width="100%">
</picture>

| | What happens | Where it lives |
|---|---|---|
| **File** | Pick one of 12 problem types, drop a pin, add a photo. The pin picks the ward; the type picks the department. | [`FileComplaint.tsx`](src/pages/FileComplaint.tsx) |
| **Duplicates** | Same type, still open, within 150 m? You're offered "support this instead". Supporters raise priority. | [`duplicates.ts`](src/lib/duplicates.ts) |
| **Deadlines** | Each type has a fixed time limit (1 to 10 days), in the spirit of Maharashtra's Right to Public Services Act. | [`catalog.ts`](src/lib/catalog.ts) |
| **Escalation** | Deadline passed → the senior officer gets it with half the original time. Repeats up to the Commissioner. Each step counts against the officer who missed it. | [`sla.ts`](src/lib/sla.ts) |
| **Proof checks** | Live camera capture · within 150 m of the site · taken after filing · 64-bit image fingerprint (dHash) matches no earlier proof photo. Failed attempts are logged. | [`proof.ts`](src/lib/proof.ts), [`dhash.ts`](src/lib/dhash.ts) |
| **Scores** | 40% fixed on time · 20% proof passed first time · 25% citizen ratings · 15% free of escalations and reopened cases. Only the citizen who filed can rate, once, per case. | [`scoring.ts`](src/lib/scoring.ts) |
| **Sign-in** | Mobile OTP, then an Aadhaar format check (12 digits + Verhoeff checksum). Only the last 4 digits are kept. | [`verhoeff.ts`](src/lib/verhoeff.ts) |

## Screenshots

<table>
  <tr>
    <td width="50%"><img alt="Landing page, dark" src="docs/readme/landing-dark.jpg"></td>
    <td width="50%"><img alt="Landing page, light" src="docs/readme/landing-light.jpg"></td>
  </tr>
  <tr>
    <td><img alt="Complaint page with countdown, officer and escalation chain" src="docs/readme/complaint-dark.jpg"><br><sub><b>Complaint:</b> live countdown, who owns it, who's next.</sub></td>
    <td><img alt="Filing a complaint with a duplicate found nearby" src="docs/readme/file-duplicate.jpg"><br><sub><b>Filing:</b> routing preview and a duplicate 122 m away.</sub></td>
  </tr>
  <tr>
    <td><img alt="Proof dialog rejecting a reused photo" src="docs/readme/proof-rejected.jpg"><br><sub><b>Proof:</b> a reused photo is caught (distance 0/64).</sub></td>
    <td><img alt="Officer profile with score dial and verified work" src="docs/readme/officer-dark.jpg"><br><sub><b>Officer profile:</b> score, record and verified work.</sub></td>
  </tr>
  <tr>
    <td><img alt="Public map, dark" src="docs/readme/map-dark.jpg"><br><sub><b>Public map:</b> every complaint by status, ward table.</sub></td>
    <td><img alt="Public map, light" src="docs/readme/map-light.jpg"><br><sub>Light and dark themes, with a toggle.</sub></td>
  </tr>
</table>

<p align="center"><img alt="Complaint page on a phone" src="docs/readme/mobile-complaint.jpg" width="300"></p>

## Try it in 60 seconds

1. Open the [live demo](https://jandrishti.vercel.app) and press **Sign in → Continue as Priya Deshmukh**.
2. Open her **Pothole** complaint (due soon). Press **+1d** on the demo clock at the bottom right and watch it escalate.
3. **Sign out**, sign in as **Officer → Amit Deshpande** (or whoever owns it now) and press **Upload proof and resolve**.
4. Try **"cheat with an old proof photo"** (rejected), then **"simulate a live photo on site"** (passes).
5. Back as Priya: confirm the fix and rate it. The officer's score updates on **Officers**.

Or file your own: tap anywhere in the six Pune wards on the map. **Reset demo data** is in the footer.

<details>
<summary><b>What's real and what's a demo</b></summary>

- **Real:** the escalation engine, deadlines, duplicate detection, photo fingerprinting, GPS and time checks,
  scoring, the Aadhaar checksum, the map. All of it runs and is unit-tested.
- **Demo:** officers, wards and complaints are fictional sample data for Pune. Data is stored in your browser
  (`localStorage`), so it isn't shared between devices. The OTP is shown on screen instead of sent by SMS.
- **Aadhaar:** real Aadhaar authentication needs approval from UIDAI. The prototype only checks the number's format
  and keeps the last 4 digits; a live system would verify through UIDAI or DigiLocker.
- **Camera:** in a browser, "live capture" means the in-app camera (`getUserMedia`). Gallery uploads are accepted
  but fail the live check. Because you're probably not standing in Pune, the proof dialog has clearly labelled demo shortcuts.
- **Later:** voice complaints in Marathi and Hindi, an AI before/after comparison, real DigiLocker sign-in, SMS and WhatsApp alerts.
  See [IDEA.md](IDEA.md).

</details>

<details>
<summary><b>Project layout</b></summary>

```
src/
  lib/           pure logic (unit-tested): sla, scoring, dhash, proof, duplicates, geo, verhoeff,
                 catalog (wards, departments, officers), seed (sample data), scenes (sample photos), store
  components/    layout, map, proof dialog, shared bits
  pages/         landing, login, file, my complaints, complaint, officer desk, officers, officer profile, map
docs/readme/     README media and the scripts that make it (capture.mjs, make-svgs.mjs)
```

</details>

## Run it locally

```bash
npm install
npm run dev        # http://127.0.0.1:5180
npm test           # 26 unit tests (vitest)
npm run lint
npm run build      # static site in dist/
```

Regenerate the README media (needs `ffmpeg`): `npm run build && npm run preview`, then
`node docs/readme/capture.mjs shots,video http://127.0.0.1:5181` and `node docs/readme/make-svgs.mjs`.

## Deploy

It's a static site. On Vercel, import the repo with the default Vite settings; [`vercel.json`](vercel.json) sends
every route to `index.html`. No environment variables or database needed.

---

<sub>A prototype with fictional data. Not a government service. Map data © OpenStreetMap contributors.</sub>
