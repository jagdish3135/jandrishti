# JanDrishti — Central Complaint Dashboard

> One place for citizens to report any government service problem, track it to the end,
> and make sure it is actually fixed: on time, by an accountable officer, with proof.

---

## 1. The problem

- Complaints about roads, drainage, water, streetlights and garbage are scattered across
  different portals, apps, offices and phone numbers.
- After filing, citizens rarely know **who** is handling it or **by when**.
- Deadlines are missed with no consequence, and nobody higher up finds out.
- Complaints get marked "resolved" without the work being done, sometimes with old or
  reused photos.
- Citizens have no way to see which officers and departments actually perform.

## 2. The solution

A **centralized dashboard for all government services** where a citizen can:

1. File a complaint about any service (road, drainage, water and more).
2. See the **assigned officer** and the **deadline** right away.
3. Watch it **escalate automatically to the senior officer** if the deadline is missed.
4. See **photo proof** of the completed work, checked by AI so old photos can't be reused.
5. View **officer profiles**, their work record and their score, and rate resolved complaints.

Citizens sign in with an Aadhaar-based identity check so false complaints are discouraged.

---

## 3. Users

| User | What they do |
|---|---|
| **Citizen** | Files complaints, tracks status, confirms the fix, rates the resolution |
| **Officer** | Gets assigned complaints, updates status, uploads before/after proof photos |
| **Senior officer** | Receives escalated complaints, reassigns them, sees their team's performance |
| **Admin / department head** | Manages departments, service categories, deadlines and officer hierarchy |

---

## 4. Core features

### 4.1 File a complaint
- Pick a category: Road, Drainage, Water supply, Streetlight, Garbage, Electricity, Other.
- Add a description, location (map pin or GPS) and photos.
- **Voice filing in Marathi, Hindi or English.** AI turns speech into text, detects the
  category and department, and fills in the form.
- Each complaint gets a tracking ID.

### 4.2 Tracking and deadlines
- A status timeline: Filed → Assigned → In progress → Resolved → Verified by citizen.
- It shows the **assigned officer** (name, designation, department, profile link).
- It shows the **deadline**. Each category has a fixed time limit, modelled on the
  Maharashtra Right to Public Services Act, 2015.
- Countdown timer and notifications at each stage.

### 4.3 Automatic escalation
- If the deadline passes without resolution, the complaint **moves to the current
  officer's senior** automatically.
- Escalation continues up the chain (e.g. Junior Engineer → Assistant Engineer →
  Executive Engineer → Commissioner).
- Every escalation is logged on the complaint timeline and counts against the officer's score.
- **Demo "time-travel" control:** fast-forward time so escalation can be shown live.

### 4.4 Proof of work with AI verification
- Officers must upload **after** photos before they can mark a complaint resolved.
- Photos are checked in layers:
  1. **Live capture only.** Photos are taken inside the app; uploading from the gallery is blocked.
  2. **Location and time match.** The photo's GPS and timestamp must match the complaint
     location and fall after the complaint date.
  3. **Reuse detection.** A perceptual hash (image fingerprint) is compared against every
     earlier proof photo to catch reused or slightly edited images.
  4. **Before/after check.** AI compares the citizen's original photo with the officer's
     photo to confirm the issue is visibly fixed.
- Failed checks flag the complaint and block it from closing.

### 4.5 Officer profiles and scores
- A public profile for each officer: department, area, complaints handled, on-time rate,
  escalations and average rating.
- **Ratings are given per resolved complaint, only by the citizen who filed it**, not as
  open reviews of the person. This prevents harassment and fake ratings.
- The score is calculated from on-time resolutions, verified proof, escalations and citizen ratings.
- Leaderboards by department and ward.

### 4.6 Preventing false complaints
- Citizen identity check through **Aadhaar-based authentication**.
  - *Prototype:* phone OTP plus a mock "Verify with DigiLocker / Aadhaar" step, because real
    Aadhaar authentication requires approval from UIDAI.
  - *Production:* real Aadhaar / DigiLocker e-KYC through an approved agency.
- Rate limits per citizen and an AI check that flags spam or abusive text.

### 4.7 Duplicate merging
- If many people report the same problem (same category, nearby location), they are
  merged into **one complaint with a supporter count**.
- More supporters means higher priority.

### 4.8 Public transparency map
- Map of open, overdue and resolved complaints by ward.
- Department-level stats: average resolution time, overdue count, escalation rate.

---

## 5. What makes it different

| | Existing portals (CPGRAMS, Aaple Sarkar, city apps) | This project |
|---|---|---|
| File and track complaints | ✅ | ✅ |
| Named officer and deadline shown | Partly | ✅ |
| Automatic escalation to a senior officer | Rare / manual | ✅ Automatic |
| Proof photos verified by AI | ❌ | ✅ |
| Public officer scores | ❌ | ✅ |
| Duplicate merging | ❌ | ✅ |
| Voice complaints in Indian languages | Rare | ✅ |

**One-line pitch:** existing portals record complaints. This one makes sure they are fixed.

---

## 6. Example flow

1. Priya sees a broken drain on her street and opens the app.
2. She signs in (Aadhaar check), records a voice note in Marathi and takes a photo.
3. AI files it under **Drainage → Ward 12**, assigned to Junior Engineer R. Patil,
   deadline **7 days**.
4. Day 8: not resolved. The complaint **escalates to Assistant Engineer S. Desai**, and
   Patil's score drops.
5. Desai's team fixes the drain and uploads a live photo. AI confirms the location matches,
   the photo is new, and the drain is visibly repaired.
6. Priya confirms the fix and rates the resolution 4/5.

---

## 7. Suggested tech stack

| Part | Choice |
|---|---|
| Frontend | Next.js (citizen, officer and admin views), Tailwind |
| Maps | Leaflet + OpenStreetMap |
| Backend / DB | Next.js API routes + Postgres (Supabase or Neon) |
| Escalation engine | Scheduled job (Vercel Cron) that checks deadlines |
| Photo verification | EXIF/GPS checks, perceptual hashing, vision LLM for before/after |
| Voice and language | Speech-to-text + LLM classification (Marathi / Hindi / English) |
| Auth | Phone OTP + mock Aadhaar/DigiLocker step |
| Deploy | Vercel |

---

## 8. MVP scope (first build)

**In:**
- Citizen: file (text + photo + location), track, confirm, rate
- Officer: assigned list, status updates, proof photo upload
- Deadlines per category, automatic escalation, time-travel demo control
- Photo checks: live capture, GPS/time match, perceptual-hash reuse detection
- Officer profiles with scores
- Demo mode with sample departments, officers and complaints

**Later:**
- Voice filing in Indian languages
- AI before/after comparison
- Duplicate merging and public map
- Real Aadhaar / DigiLocker integration
- SMS / WhatsApp notifications

---

## 9. Risks and how to handle them

| Risk | Plan |
|---|---|
| Aadhaar authentication needs UIDAI approval | Mock it in the prototype; describe the real integration path |
| Officers gaming photos | Layered checks: live capture, GPS/time, hash, AI comparison |
| Unfair or abusive ratings | Only the complainant rates, per resolved complaint; score mostly from objective data |
| Officer privacy | Show work data and designation, not personal details |
| Wrong department assigned by AI | Officer can reassign; admin can correct categories |

---

## 10. Success metrics

- Share of complaints resolved before the deadline
- Average resolution time per department
- Escalation rate per officer
- Proof photos flagged as reused
- Citizen confirmation rate ("yes, it's fixed")
