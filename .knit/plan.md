# JanDrishti        Goal: citizens file any civic complaint, see who owns it and by when, and missed deadlines climb to the senior officer automatically; fixes need verified photo proof.
Users: citizens (file, track, rate), officers (work queue, proof), the public (map, officer scores). Full idea: ../IDEA.md

## Stories
- US-1 Sign in. Citizen: phone OTP (shown on screen, demo) + Aadhaar demo check (12 digits, Verhoeff checksum, only last 4 stored). Officer: pick a sample officer.
- US-2 File. Category, description, map pin, optional photo. Auto-assigned to the ward's officer for that department; deadline = category SLA. Tracking ID shown.
- US-3 Duplicates. Same category within 150 m and still open → offered "support this one instead"; supporter count raises priority.
- US-4 Track. Timeline, assigned officer card, live countdown, escalation ladder.
- US-5 Escalate. Deadline passes → moves to senior with a new deadline, logged, counts against the officer; repeats up the chain. Time-travel dock (+1/+3/+7 days, reset) drives the clock.
- US-6 Officer proof. Queue sorted by deadline; start work; resolve only with an after-photo that passes: live capture, GPS within 150 m + taken after filing, not a reused photo (image fingerprint). Failures block closing and are logged.
- US-7 Confirm and rate. Citizen confirms the fix (or reopens it) and rates 1–5, once.
- US-8 Officers. Directory, leaderboard, profile with score (on-time rate, proof pass rate, escalations, ratings).
- US-9 Public map. All complaints by status with filters, ward stats.

## Look
"Civic signal": public-works signage meets a control room. Hazard yellow on asphalt ink, concrete-paper light mode (default follows system) and asphalt dark, toggle remembered.
Type: Big Shoulders Display (civic signage) for headings, Atkinson Hyperlegible for body, JetBrains Mono for IDs and timers, Tiro Devanagari Hindi for जनदृष्टि.
Signature: eye-shaped logo, countdown "SLA clock" on every complaint, hazard-tape stripe on overdue items, escalation ladder.
Status colours are functional (on time green, due soon amber, overdue red, escalated orange) and always paired with text.
Polish: 360 px phones, 44 px targets, focus rings, empty/loading/error states, reduced motion respected.

## Build
Vite + React 19 + TypeScript, react-router, react-leaflet (OpenStreetMap), exifr. Static SPA on Vercel (rewrite to index.html). No server.
Data: one store in localStorage (`jd:v1`), seeded with fictional Pune data: 6 wards, 5 departments, 12 categories with SLA days, ~20 officers in 4-level chains (JE → AE → EE → Ward Commissioner), ~30 complaints, past proof photos.
Clock: `now = Date.now() + offsetMs`; escalation runs on every clock change and on load.
Photos: before/after "evidence plates" for seed data are generated SVG scenes; uploads are downscaled to 1024 px JPEG data URLs. Fingerprint = 64-bit dHash, reuse if Hamming distance ≤ 10.
src/lib (pure, tested): verhoeff, geo, sla+escalation, scoring, dhash, duplicates, store. src/pages, src/components.

## Tasks
- [ ] 1. Scaffold, design tokens, theme toggle, shell (header, footer + Knit badge), seed data + store, landing page (US-4 base)
- [ ] 2. Logic + unit tests: verhoeff, geo, SLA/escalation, scoring, dHash, duplicates (US-1,3,5,6,8)
- [ ] 3. Sign-in flows (US-1)
- [ ] 4. File complaint with map pin, photo, duplicate check (US-2,3)
- [ ] 5. My complaints + complaint detail: timeline, officer, countdown, ladder; time-travel dock (US-4,5)
- [ ] 6. Officer workspace + proof capture and checks (US-6)
- [ ] 7. Confirm/reopen + rating (US-7)
- [ ] 8. Officer directory, leaderboard, profile (US-8)
- [ ] 9. Public map + ward stats (US-9)
- [ ] 10. Check pass, README with media, deploy on approval

## Decisions
- User: v1 extras = public map + duplicate merging; data in browser (demo); Vercel; solo mode; UI via frontend-design.
- Voice filing, AI before/after check, real Aadhaar/DigiLocker, SMS: later (IDEA.md §8).
- Real Aadhaar auth needs UIDAI approval, so the prototype mocks it and never stores the full number.
- "Live capture" in a browser: camera via getUserMedia counts as live; a gallery upload is accepted but fails the live check. Demo shortcuts ("I'm on site", "reuse an old photo") are labelled as demo.
- Risk: data is per browser; a "Reset demo" button restores the seed.
