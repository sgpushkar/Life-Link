# LifeLink — Master Build Prompt

> Paste everything below the line into Claude Code / Cursor / your AI builder of choice. It is written to be self-contained: the agent should be able to build the whole thing without asking questions. If the agent has a context limit, feed it one "PHASE" at a time (Section 16), always keeping Sections 1–5 in context.

---

## 0. ROLE & MISSION

You are a senior full-stack engineer and product designer. Build **LifeLink**, a real-time, low-bandwidth inventory-sharing platform that connects rural hospitals, PHCs/CHCs, blood banks, blood donors, ambulance services, and district health officers in India, so that idle ICU equipment and near-expiry blood units get to the patients who need them, in minutes instead of hours.

This is for a hackathon (Team Rage Quitters, Global Innovation Hackathon). That means:
- It must **work end to end in a live demo**, with seeded realistic data.
- It must **look premium** (judges score on polish and storytelling).
- It must **honestly implement** the headline features (live registry, urgency prioritization, donor matching, forecasting, SMS fallback, logistics), not fake them with static screens. Where a third party is needed (SMS gateway, ABDM), build a clean adapter with a **mock provider** that can be swapped for the real one via env vars.
- Ship complete files, not snippets. Every file you create must be complete and runnable.

## 1. PRODUCT CONTEXT

**Problem.** Rural hospitals face critical shortages of ventilators, oxygen concentrators, ICU beds and blood units while a facility 20 km away may have idle surplus. There is no real-time visibility, coordination happens over phone calls, blood expires in one place while another blood bank runs dry, and nobody ranks which request is the most urgent.

**Solution pillars (all must exist in the build):**
1. **Live Equipment Registry** — ventilators, oxygen concentrators, ICU beds, blood units.
2. **Smart Search & Request** — search by resource + distance, send a borrow request in a couple of taps.
3. **Urgency-Based Auto-Prioritization** — requests are scored on patient criticality, distance, and time-sensitivity, not first-come-first-served.
4. **Blood Donor Dashboard** — donors see active nearby requests and pledge donations. A live request-matching board, not a static donor list.
5. **Lightweight Demand Forecasting** — 7–30 day trends (moving average + seasonal) alert facilities before predictable surges. No heavy ML infra.
6. **Logistics Coordination** — pickup/return tracking, handover checklists, SMS/WhatsApp alerts.
7. **Low-bandwidth access** — PWA, offline-first sync, and SMS/USSD fallback for feature phones.
8. **District oversight** — DHO dashboards revealing chronic gaps to guide procurement.

**Target users / roles:**
| Role | Who | Primary jobs |
|---|---|---|
| `FACILITY_ADMIN` | Rural hospital / CHC / PHC / district hospital staff | Maintain inventory, raise requests, respond to requests |
| `BLOOD_BANK` | Blood bank and donation camp staff | Manage blood units, expiry, raise blood requests, match donors |
| `DONOR` | Individual blood donors | See nearby requests, pledge, track donation history |
| `TRANSPORT` | Ambulance / transport operators | Accept pickup/return jobs, update status |
| `DHO` | District health officer | Oversight, analytics, procurement guidance |
| `STATE_ADMIN` | State health department | Cross-district analytics (read-mostly) |

## 2. TECH STACK (fixed — do not substitute)

- **Monorepo** with npm workspaces (or pnpm): `apps/web`, `apps/api`, `packages/shared`.
- **Frontend:** Next.js 14+ (App Router), TypeScript (strict), Tailwind CSS, Framer Motion for UI motion, TanStack Query for server state, Zustand for local UI state, `next-pwa` (or Serwist) for service worker, `idb` for IndexedDB, Leaflet + OpenStreetMap tiles for maps (no paid map keys), Recharts for charts, `next-intl` for i18n (English, Hindi, Marathi minimum; structure so more languages are just JSON files), `react-hook-form` + `zod`.
- **Backend:** Node.js 20, Express (or Fastify) in TypeScript, Prisma ORM, PostgreSQL 15, Socket.io for real-time, `zod` for validation, `jsonwebtoken` + `bcrypt` for auth, `node-cron` for scheduled jobs (expiry sweeps, forecasting, escalation), `pino` for logging, `vitest` + `supertest` for tests.
- **Messaging adapters:** `SmsProvider` interface with `MockSmsProvider` (default; writes to a `sms_outbox` table and to a live "SMS simulator" page) and `TwilioSmsProvider` / `Msg91SmsProvider` stubs selected by `SMS_PROVIDER` env. Same pattern for `WhatsAppProvider`.
- **USSD/SMS inbound:** an HTTP webhook `POST /api/sms/inbound` and `POST /api/ussd` that works with a **built-in simulator UI** (a fake feature phone) so it can be demoed without a telecom contract.
- **ABDM/ABHA:** `AbdmAdapter` interface with a mock that validates ABHA ID format (14 digits) and returns a fake profile. Real integration is out of scope; make the seam obvious.
- **Infra:** `docker-compose.yml` with `postgres`, `api`, `web`. One command (`docker compose up`) must bring up everything, run migrations, and seed.
- **Env:** `.env.example` at root documenting every variable.

## 3. DESIGN DIRECTION

Match the pitch deck: deep navy `#16334A` base, teal `#25868B` cards, emerald green glow `#217A4B` in corners, cyan `#2DD4CF` accent lines, near-white text `#E8F1F5`. Add a **critical red** `#FF4D5E`, **amber** `#FFB020`, and **safe green** `#3DDC97` for status semantics only.

This is a life-critical tool, so the split is:
- **Landing page = cinematic.** Think in camera shots, not sections: full-bleed editorial scenes, dramatic typography, scroll-driven transitions (Framer Motion `useScroll` / or GSAP + Lenis if you prefer), a hero showing a living district map with pulsing facility nodes and equipment "packets" travelling between them. Absolutely no generic template energy: no symmetric three-card feature grids, no stock gradient blobs.
- **App (dashboards) = calm, dense, fast.** High contrast, large tap targets (min 44px), skimmable status chips, zero decorative motion that slows a nurse down. Motion is used only to communicate state (a new request sliding in, a count ticking, a node pulsing when inventory changes).
- Dark theme default, with a high-contrast light theme toggle.
- Typography: a characterful display face for the landing (e.g. Space Grotesk / Clash Display) and a highly legible UI face (Inter) for the app. Tabular numerals for all counts.
- Accessibility: WCAG AA contrast, full keyboard navigation, visible focus rings, `aria-live` regions for incoming requests, `prefers-reduced-motion` respected.
- **Low-bandwidth mode:** a toggle (auto-enabled when `navigator.connection.saveData` or effectiveType ≤ 3g) that disables maps tiles/animations/images and swaps to a text-table UI.

## 4. DOMAIN MODEL (Prisma schema — implement fully)

Create `apps/api/prisma/schema.prisma` with at least:

```
User            id, name, phone (unique), email?, passwordHash, role, facilityId?, abhaId?, language, createdAt
Facility        id, name, type (DISTRICT_HOSPITAL|CHC|PHC|BLOOD_BANK|DONATION_CAMP), districtId, lat, lng, address, contactPhone, is24x7, active
District        id, name, state, centroidLat, centroidLng
EquipmentType   id, code (VENTILATOR|OXYGEN_CONCENTRATOR|ICU_BED|BIPAP|DEFIBRILLATOR|SYRINGE_PUMP|...), name, unit
EquipmentUnit   id, facilityId, typeId, assetTag, status (AVAILABLE|IN_USE|RESERVED|MAINTENANCE|ON_LOAN), lentToFacilityId?, shareable (bool), lastServicedAt, notes, updatedAt
BloodUnit       id, facilityId, bloodGroup (A+|A-|B+|B-|AB+|AB-|O+|O-), component (WHOLE|PRBC|PLATELETS|PLASMA), collectedAt, expiresAt, status (AVAILABLE|RESERVED|ISSUED|EXPIRED|DISCARDED)
Request         id, kind (EQUIPMENT|BLOOD), requesterFacilityId, createdById, equipmentTypeId?, bloodGroup?, bloodComponent?, quantity, patientCriticality (1-5), timeSensitivityMins, patientSummary (no PII beyond age/sex/condition), status (OPEN|MATCHED|IN_TRANSIT|FULFILLED|CANCELLED|EXPIRED), priorityScore (float), scoreBreakdown (json), createdAt, neededBy
Offer           id, requestId, providerFacilityId, unitIds (json), distanceKm, etaMins, status (PROPOSED|ACCEPTED|DECLINED|EXPIRED), createdAt
Allocation      id, requestId, offerId, status, acceptedAt
LogisticsJob    id, allocationId, type (PICKUP|RETURN), transportId?, status (PENDING|ASSIGNED|PICKED_UP|IN_TRANSIT|DELIVERED|RETURNED|FAILED), checklist (json), handoverSignatures (json), timeline (json)
DonorProfile    id, userId, bloodGroup, lastDonatedAt, lat, lng, radiusKm, available, totalDonations
DonorPledge     id, requestId, donorId, status (PLEDGED|CONFIRMED|DONATED|NO_SHOW|CANCELLED), slotAt
InventorySnapshot id, facilityId, date, resourceKey, available, total   (daily, feeds forecasting)
DemandEvent     id, facilityId, resourceKey, date, quantityRequested   (feeds forecasting)
ForecastAlert   id, facilityId, resourceKey, horizonDays, predictedDemand, confidence, message, createdAt, acknowledgedAt?
Notification    id, userId?, facilityId?, channel (INAPP|SMS|WHATSAPP), template, payload, status, createdAt
SmsOutbox       id, toPhone, body, provider, status, createdAt
SmsInbox        id, fromPhone, body, parsedIntent, createdAt
AuditLog        id, actorId?, action, entity, entityId, before(json), after(json), ip, createdAt
SyncOp          id, clientId, userId, opType, payload, clientTimestamp, appliedAt?, conflict (bool)
```

Add indexes on `(facilityId, typeId, status)`, `(bloodGroup, status, expiresAt)`, `(status, priorityScore desc)`, and geo lookups (`lat`,`lng` with a bounding-box prefilter; use PostGIS only if trivially available, otherwise haversine in SQL/JS).

**Privacy rule:** never store patient names, phone numbers, or IDs on a Request. Only age band, sex, condition summary, and criticality. Add this as a comment in the schema and enforce it in the zod validators.

## 5. CORE ALGORITHMS (implement exactly, unit-test them)

### 5.1 Urgency Prioritization Engine — `apps/api/src/services/priority.ts`
Priority score in `[0, 100]`:

```
criticalityScore   = (patientCriticality / 5) * 100
timeScore          = clamp(1 - (minutesUntilNeededBy / 240), 0, 1) * 100     // 4h window; overdue => 100
distanceScore      = clamp(1 - (nearestViableProviderKm / 100), 0, 1) * 100  // closer supply => easier to fulfil => bump
scarcityScore      = clamp(1 - (networkAvailableUnits / max(quantity*3,1)), 0, 1) * 100
ageBonus           = min(minutesWaiting / 60, 1) * 100                        // anti-starvation

priority = 0.45*criticalityScore + 0.25*timeScore + 0.10*distanceScore + 0.10*scarcityScore + 0.10*ageBonus
```
- Weights live in a `PRIORITY_WEIGHTS` config object, editable by `STATE_ADMIN` via an admin screen; every change is audit-logged.
- Store `scoreBreakdown` JSON on each request so the UI can show *why* a request ranked where it did (explainability is a judging point).
- Recompute all OPEN request scores every 60 seconds and on every relevant inventory/request event; emit `queue:updated` over Socket.io.
- **Contention resolution:** when two open requests want the same scarce unit, the higher priority gets the offer first; the lower gets the next-best provider or a "queued, ETA" state. Never silently drop a request.
- Include a **"Simulate surge"** admin tool that fires N synthetic requests so judges can watch re-ranking happen live.

### 5.2 Provider Matching — `services/matching.ts`
For a request, find candidate providers:
1. Same district first, then expand radius in steps (25 → 50 → 100 km).
2. Filter to facilities with `shareable` units of the type (or blood units of a compatible group).
3. **Blood compatibility matrix** (implement fully): e.g. O- can donate to all; AB+ receives from all. Prefer exact match, then compatible; for platelets/plasma use the correct (different) compatibility rules and note them in code comments.
4. **Blood expiry-first (FEFO):** prefer units with the *soonest expiry that still leaves enough shelf life* for transport time + transfusion (`expiresAt - now > etaMins + 6h`). This is the mechanism that reduces wastage.
5. Never let a provider's offer drop them below a configurable **reserve floor** (e.g. keep ≥1 ventilator and ≥2 units of O- on site). Reserve floors are per-facility settings.
6. Rank by `etaMins` (distance / average road speed, 40 km/h default, editable) then facility load.
7. Auto-create `Offer`s to the top 3 providers; the first to ACCEPT wins; others auto-expire with a notification. Offers expire in 10 minutes for CRITICALITY ≥ 4, 30 minutes otherwise, then escalate to the next provider.

### 5.3 Blood Expiry Watch — `jobs/expirySweep.ts`
Every 15 minutes:
- Mark units past `expiresAt` as `EXPIRED`.
- For units expiring within 72h at a facility with low local demand and another facility with open demand for the same group, generate a **"Redistribute before expiry"** suggestion and notify both blood banks.
- Track `wastagePrevented` and `wastageOccurred` counters for the impact dashboard.

### 5.4 Forecasting — `services/forecast.ts`
No ML libs. Implement:
- **Simple moving average** over 7 and 30 days of `DemandEvent`.
- **Day-of-week seasonality index** (mean of that weekday / overall mean over the last 8 weeks).
- **Trend** via least-squares slope over the last 14 days.
- `forecast(day) = SMA7 * seasonalityIndex(weekday) + trendSlope * daysAhead`, floored at 0.
- **Confidence** derived from coefficient of variation (low variance => high confidence).
- Nightly cron produces `ForecastAlert`s when predicted 3-day demand > `available * 0.8` for a facility. Alert message must be human-readable: *"PHC Kalyan expects ~4 oxygen concentrator requests in the next 3 days; you have 2 available. Consider pre-positioning from CHC Murbad."*
- Provide a "what-if" endpoint that accepts a surge multiplier.
- Unit-test with synthetic series (flat, weekly-seasonal, rising).

### 5.4b Distance
Haversine in `packages/shared`, used by both API and web (offline distance sorting must work client-side).

## 6. FEATURE SPEC BY MODULE

### 6.1 Auth & onboarding
- Phone + password login (OTP is mocked: fixed code `123456` in dev, clearly flagged). JWT access token (15 min) + refresh token (7 days, httpOnly cookie).
- Facility onboarding wizard: facility details → location (map pin or "use my GPS") → initial inventory (quick add with quantities) → sharing rules (which types shareable, reserve floors, quiet hours) → staff invites.
- Role-based access control middleware; every mutation writes an `AuditLog`.
- **Demo login switcher** (dev/demo mode only): one-click "Log in as…" for each role so a judge can hop between personas in seconds.

### 6.2 Facility dashboard (`FACILITY_ADMIN`)
- Top strip: live counters (available/in-use/reserved ventilators, concentrators, ICU beds; blood by group), each with a tiny sparkline.
- **One-tap inventory updates**: big +/– steppers and status toggles, optimistic UI, works offline (queued to IndexedDB).
- Incoming requests inbox sorted by priority score with the explainable score breakdown popover, Accept / Decline / Counter-offer (partial quantity).
- Outgoing requests with a live status stepper (Open → Matched → In transit → Fulfilled).
- "Share settings" panel (shareable flags, reserve floors).
- Active forecast alerts card.

### 6.3 Smart Search & Request
- Search UI: resource type (icon grid), quantity, urgency slider (with plain-language labels: "Stable → Life-threatening"), needed-by, optional short clinical note.
- Results as a **list + map** (map hidden in low-bandwidth mode): facility, units available *and shareable*, distance, ETA, last-updated freshness badge (green <15 min, amber <2 h, red older, because stale data kills trust).
- "Send request" broadcasts to top providers per §5.2 and shows a live tracker of who has seen/accepted.
- Works with cached data offline (stale badge shown) and queues the request; on reconnect it is sent with its original timestamp.

### 6.4 Blood module (`BLOOD_BANK`)
- Inventory grid: 8 groups × components, colour-coded shelf-life bars, expiring-soon filter.
- Raise blood request with group, component, units, criticality.
- **Live Request-Matching Board**: kanban-like columns (Open → Donors pledged → Units matched → Fulfilled), each card showing group, units, criticality, matched sources, donor pledges. Real-time via sockets.
- Donation camp mode: create a camp (date, place, target units), donors can register, walk-in check-in via QR/phone lookup, units auto-added to inventory after screening confirmation.

### 6.5 Donor app (`DONOR`)
- Mobile-first PWA. Profile: blood group, last donation date (enforce 90-day eligibility for whole blood), radius, availability toggle.
- **Nearby active requests** feed, filtered to compatible groups, sorted by urgency then distance. Card shows facility, units needed, time left, distance. "Pledge" opens a slot picker.
- After pledge: confirmation, directions link, reminder SMS, post-donation thank-you and next-eligible date.
- Donation history and a small tasteful badge/streak system (no gamification that pressures unsafe donation).
- Anonymity: donors never see patient info; facilities see only donor first name + group until confirmed.

### 6.6 Logistics (`FACILITY_ADMIN`, `TRANSPORT`)
- On allocation, auto-create a `LogisticsJob` (PICKUP) and, for equipment, a scheduled RETURN job with a due date.
- Transport view: available jobs near me, accept, status buttons (Picked up → In transit → Delivered), big-button UI, works offline.
- **Handover checklist** (configurable per equipment type): e.g. ventilator — circuits included, filters, power cable, battery %, calibration OK, photo (optional, compressed client-side). Both sides tick + "sign" (typed name/PIN).
- Timeline view of every state change with timestamps.
- Overdue-return alerts to both parties, escalating to DHO after N days.
- Live location: simple "share ETA" updates (manual or periodic GPS ping while job is active). Do not build continuous background tracking.

### 6.7 District oversight (`DHO`, `STATE_ADMIN`)
- District map with facility nodes coloured by stock health; click to drill in.
- KPIs: median request-to-allocation time, equipment idle time (%) with a before/after baseline chart, blood wastage (units and %), fulfilment rate, unmet-request count.
- **Chronic gap report**: facilities/resources with repeated shortages across 30/60/90 days, with a generated procurement recommendation ("PHC X requested oxygen concentrators 14 times in 60 days and fulfilled 6 from neighbours: recommend procuring 2").
- Equity view: request-fulfilment rate by facility tier (PHC vs district hospital) to demonstrate small PHCs getting the same access.
- Export to CSV/PDF.
- STATE_ADMIN: multi-district comparison and priority-weight configuration; federated model: a district's raw data stays in its own scope, and only availability metadata is visible cross-district.

### 6.8 Notifications
- Templates for: new request, offer received, offer accepted/declined, donor pledge, unit near expiry, pickup assigned, delivered, return due, forecast alert.
- Channels: in-app (Socket.io + notification centre), SMS, WhatsApp. Respect quiet hours except for criticality ≥ 4.
- Rate-limit and de-duplicate to avoid alert fatigue.
- All outbound SMS/WhatsApp visible on a `/dev/sms` "phone simulator" page so the demo shows the messages arriving.

## 7. LOW-BANDWIDTH & OFFLINE-FIRST (this is a headline differentiator — implement properly)

**PWA:**
- Installable manifest, offline shell, app icons.
- Service worker: precache app shell; **stale-while-revalidate** for inventory/search GETs; network-first for auth.
- Keep JS budget small: route-level code splitting, lazy load maps/charts, no heavy libraries on the critical path. Target < 150 KB gzipped JS for the facility dashboard first load.

**Offline sync:**
- All writes go through a client `outbox` in IndexedDB: `{clientId, opType, payload, clientTimestamp}`.
- Background sync (or on `online` event) replays in order via `POST /api/sync`.
- **Conflict rules** (document them in `docs/sync.md`):
  - Inventory counts: last-writer-wins by `clientTimestamp`, but decrements that would go negative are flagged `conflict=true` and surfaced to the user.
  - Requests: idempotent by `clientId`.
  - Allocations/offers: server is authoritative, client is shown the resolved state.
- Visible connection indicator (Online / Slow / Offline, N changes pending) always in the header.

**SMS/USSD fallback (feature phones):**
Implement a command grammar handled by `POST /api/sms/inbound` and mirrored in a USSD menu tree:
```
STOCK VENT 3            -> set/report ventilator availability at my registered facility
STOCK O2 5
STOCK BLOOD O+ 4
NEED VENT 1 URGENT 5    -> raise equipment request, criticality 5
NEED BLOOD B- 2 URGENT 4
FIND VENT               -> nearest facilities with shareable ventilators + phone numbers
ACCEPT <reqCode>        -> accept an offer
DECLINE <reqCode>
STATUS <reqCode>
PLEDGE <reqCode>        -> donor pledges via SMS
HELP
```
- Sender identified by registered phone; unknown numbers get a registration hint.
- Parse leniently (case-insensitive, typo tolerant for a few keywords), reply in the user's language, keep replies ≤ 160 chars where possible.
- USSD tree example: `*123#` → 1 Update stock / 2 Request resource / 3 Find resource / 4 My requests, each with numbered sub-menus, stateless session handling keyed by `sessionId`.
- Build the **feature-phone simulator page** (`/dev/feature-phone`) with a styled numeric keypad and screen so both SMS and USSD can be demoed live.

## 8. API DESIGN (REST + WebSocket)

Base `/api/v1`. All inputs validated with zod schemas shared from `packages/shared`. Consistent error shape `{error:{code,message,details?}}`. Pagination via cursor.

Minimum endpoints:
```
POST   /auth/login | /auth/refresh | /auth/logout | /auth/otp/request | /auth/otp/verify
GET    /me
GET/POST/PATCH  /facilities, /facilities/:id
GET    /facilities/:id/inventory
PATCH  /facilities/:id/inventory/equipment      (bulk status/quantity)
POST   /facilities/:id/blood-units
GET    /search/resources?type=&bloodGroup=&lat=&lng=&radiusKm=&qty=
POST   /requests                     GET /requests?scope=incoming|outgoing|open
GET    /requests/:id                 POST /requests/:id/cancel
GET    /requests/:id/offers          POST /offers/:id/accept | /decline | /counter
GET    /requests/:id/score-breakdown
GET    /donors/nearby-requests       POST /requests/:id/pledge     PATCH /pledges/:id
POST   /camps                        POST /camps/:id/checkin
GET    /logistics/jobs               PATCH /logistics/jobs/:id/status   POST /logistics/jobs/:id/checklist
GET    /analytics/overview | /analytics/gaps | /analytics/equity | /analytics/wastage
GET    /forecast/alerts              POST /forecast/whatif
POST   /sync                          (batch offline ops)
POST   /sms/inbound   POST /ussd
GET/PUT /admin/priority-weights
POST   /admin/simulate/surge          POST /admin/simulate/reset
GET    /health
```
**Socket.io rooms:** `facility:{id}`, `district:{id}`, `request:{id}`, `donor:{id}`. Events: `inventory:changed`, `request:created`, `queue:updated`, `offer:received`, `offer:resolved`, `pledge:updated`, `logistics:updated`, `forecast:alert`, `notification:new`. Authenticate the socket handshake with the JWT; enforce room membership server-side.

Security: helmet, CORS allow-list, rate limiting (stricter on `/auth` and `/sms`), input size limits, parameterised queries only, RBAC on every route, audit logs, secrets from env. Add a short `docs/security.md` covering the threat model (data minimisation, no patient PII, role scoping, federated visibility).

## 9. SEED DATA (make the demo feel real)

Seed script `pnpm db:seed` creating a fictional but plausible **Thane/Palghar-style district** (or any Maharashtra district):
- 1 district hospital, 3 CHCs, 8 PHCs, 2 blood banks, 1 donation camp, spread geographically with real-looking lat/lng and Marathi/Hindi-flavoured facility names.
- Equipment: mixed availability (some facilities with idle ventilators, some with zero).
- Blood: every group across the two banks, deliberately including **a batch of O- and B+ expiring in 48h at one bank while another bank has open requests for them** (this powers the wastage demo).
- 60 donors across groups with varied last-donation dates.
- 90 days of `DemandEvent` / `InventorySnapshot` history with weekly seasonality and a recent upward trend at 2 PHCs (this powers the forecast demo).
- 15 requests in various states, at least 3 open with different criticality so the ranking is visibly meaningful.
- Users for every role, phone numbers on a reserved fake range, password `demo1234`.

## 10. THE DEMO SCRIPT (build so this exact flow works flawlessly)

1. **Landing** shows the cinematic problem → solution story and the live district map.
2. Log in as *PHC nurse*: oxygen concentrators = 0, patient deteriorating. Search "oxygen concentrator", see 3 nearby facilities with freshness badges, send an urgent request (criticality 5).
3. Switch persona to *CHC admin*: request appears instantly (socket) at the top of the inbox with score breakdown; accept.
4. *Transport* persona accepts the job; checklist ticked on both sides; status flows to Delivered; the PHC sees the live timeline. Total elapsed time is displayed prominently as "request → allocation: 2m 14s".
5. *Blood bank* raises a B+ request → *donor* persona gets a nearby request, pledges → board updates live. Show the near-expiry redistribution suggestion preventing wastage.
6. Open `/dev/feature-phone`, text `NEED VENT 1 URGENT 5` from a feature phone → request appears on the dashboards and re-ranks the queue. Show the reply SMS.
7. Trigger **Simulate surge**: watch priorities re-rank in real time and explainability popovers change.
8. *DHO* persona: idle-time reduction, wastage prevented, chronic gap report with a procurement recommendation, equity chart.
9. Toggle airplane mode in the browser: update inventory offline, reconnect, watch sync + conflict handling.

## 11. IMPACT METRICS (real, computed — not hardcoded)

Compute from actual data and display on the DHO dashboard and a public "impact" section:
- Median request-to-allocation time (target: minutes).
- Equipment idle-time % and change vs a stored pre-LifeLink baseline (target narrative: 25–40% reduction).
- Blood units saved from expiry via redistribution vs expired.
- Fulfilment rate overall and by facility tier.
- Forecast accuracy (MAPE) of past alerts.
Label anything that is seed/simulated as "demo data" in the UI. Never present fabricated numbers as real outcomes.

## 12. PROJECT STRUCTURE

```
lifelink/
  apps/
    web/
      src/app/(marketing)/page.tsx               # cinematic landing
      src/app/(app)/dashboard|search|requests|blood|donor|logistics|oversight|admin/...
      src/app/dev/sms|feature-phone/...
      src/components/{ui,map,charts,motion}/
      src/lib/{api,socket,offline,i18n,haversine}.ts
      src/messages/{en,hi,mr}.json
      public/manifest.webmanifest, icons/
    api/
      src/{server.ts,app.ts,config.ts}
      src/modules/{auth,facilities,inventory,search,requests,offers,blood,donors,logistics,analytics,forecast,sync,sms,admin}/
      src/services/{priority,matching,forecast,notifications,compatibility}.ts
      src/providers/{sms,whatsapp,abdm}/
      src/jobs/{expirySweep,forecastNightly,offerEscalation,priorityRecompute}.ts
      src/realtime/socket.ts
      prisma/{schema.prisma,seed.ts,migrations/}
      tests/
  packages/shared/  # zod schemas, types, haversine, blood compatibility, constants
  docs/{architecture.md,sync.md,security.md,demo-script.md,api.md}
  docker-compose.yml
  .env.example
  README.md
```

## 13. QUALITY BAR

- TypeScript strict, no `any` without a comment. ESLint + Prettier configured.
- **Tests (must exist and pass):** priority scoring (incl. edge cases), blood compatibility matrix, FEFO selection, reserve floor enforcement, forecast functions, SMS command parser, sync conflict resolution, RBAC on core routes.
- Every list/table has loading, empty, and error states. Every form has validation messages.
- No dead buttons: if something is out of scope, hide it or label "coming soon", don't leave a broken control.
- Performance: Lighthouse PWA ≥ 90, Performance ≥ 85 on mobile throttling for the facility dashboard.
- README must include: what it is, architecture diagram (Mermaid), one-command setup, demo credentials, demo script, env vars, how to swap mock providers for real ones, and a "limitations & honest next steps" section.

## 14. GUARDRAILS

- Do not invent third-party API credentials or call real SMS/WhatsApp/ABDM in dev; use the mocks.
- No patient-identifying data anywhere. This is a resource-sharing coordinator, not an EHR.
- Do not claim clinical decision-making. Prioritization ranks *resource requests* using clinician-entered criticality; it does not diagnose. Show a short disclaimer where the score is displayed.
- Blood handling rules (compatibility, shelf life, donor interval) must be implemented per standard transfusion practice and clearly commented; add a note that the rules must be validated by the blood bank's medical officer before production.
- If a requirement is ambiguous, choose the simplest reasonable interpretation, note it in `docs/decisions.md`, and continue. Do not stop to ask.

## 15. OUT OF SCOPE (do not build)

Real payment flows, full EHR/patient records, real telecom/USSD integration, real ABDM certification, native iOS app, heavy ML models. (A thin Android wrapper can be a later step, e.g. Capacitor/TWA around the PWA.)

## 16. BUILD ORDER (work phase by phase; finish and verify each before moving on)

**Phase 1 — Foundation:** monorepo, docker-compose, Prisma schema + migrations, shared package (zod, haversine, blood compatibility), auth + RBAC, seed script, health check.
**Phase 2 — Registry & Search:** facilities, equipment/blood inventory CRUD, search endpoint with distance, facility dashboard UI with live counters + sockets.
**Phase 3 — Requests & Prioritization:** request creation, priority engine + explainability, matching + offers + accept/decline/escalation, inbox/outbox UI, surge simulator.
**Phase 4 — Blood & Donors:** blood inventory, FEFO matching, expiry sweep + redistribution suggestions, live matching board, donor PWA, pledges, camps.
**Phase 5 — Logistics:** allocation → jobs, checklists, transport view, return tracking, notifications + SMS simulator.
**Phase 6 — Forecasting & Oversight:** history generation, forecast service + nightly job + alerts, DHO/State dashboards, gap and equity reports, exports.
**Phase 7 — Offline & Low-bandwidth:** service worker, IndexedDB outbox, sync endpoint + conflict handling, low-bandwidth mode, SMS/USSD parser + feature-phone simulator.
**Phase 8 — Polish:** cinematic landing page, i18n (en/hi/mr), accessibility pass, motion tuning, tests, Lighthouse, docs, demo script rehearsal.

At the end of each phase, output: what was built, how to run/verify it, and any deviations from this spec. Then proceed to the next phase without waiting.

**Begin with Phase 1. Output complete files.**
