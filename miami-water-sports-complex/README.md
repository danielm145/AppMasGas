# Miami Watersports Complex — Management System

Working front-end prototype for the day-to-day operation of Miami Watersports
Complex — cable wakeboard park, obstacle line, aqua park and boat services in
Hialeah, FL. Codes, services and equipment follow the real park: helmets and
vests branded MWC, Hyperlite / Liquid Force boards, Nautique boats, a Rixen
System 2.0 alongside the full cable, and pro-shop racks labeled A1–F6.

The app runs entirely in the browser against seeded demo data persisted in
`localStorage`, so every screen is clickable and every action has a real effect
on the rest of the app. There is no backend yet — the types in
`src/lib/types.ts` are the contract the future API should implement.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle
npm run typecheck
```

## Language

**English is the system language** (the park operates in Miami) and Spanish is
available as a translation. The `EN / ES` toggle sits in the top bar and the
choice is remembered per browser.

Translation is applied at the presentation primitives (`src/components/ui`), so
screens are written in plain English and the Spanish copy lives in one place:
`src/lib/locales/es.ts`. The translation key *is* the English string, so a
missing entry degrades to English instead of showing a raw key. Adding a third
language means adding one dictionary file and one entry in `LANGUAGES`.

> The Spanish dictionary is currently a stub. See *Known gaps* below.

## How identification works on the dock

This is the core of the operation and it drives most of the data in the system.

- Every **helmet** and every **board** carries a **permanent QR label** —
  laminated waterproof vinyl, printed once when the asset is registered. Nothing
  is printed per session.
- At check-in the helmet and board are **linked to the customer**. That handout
  is written into each asset's own history, so you always know which board a
  given customer had on a given day.
- On the dock the operator points a **phone camera** at the QR on the helmet
  (or the board). The code resolves to the active session, adds the lap, and
  records **which employee scanned it**.
- Scanning the helmet, the board or the fallback wristband all resolve to the
  same session (`logLap` in `src/lib/store.tsx`).
- Returning the gear releases the asset, adds usage hours and moves it toward
  its next preventive service.

Label specification and the full flow are documented in-app under
**Settings → QR codes**. Printable label sheets: **Assets → QR labels**.

## Front-desk rules the system enforces

Taken from the signage at the counter, because these are the rules that
actually block a sale:

- **"Must know how to swim."** The customer must declare it before a session
  can be opened. Check-in refuses to continue without it, and an existing
  customer who never declared it gets a red block on the package step.
- **"Please have your ID ready."** Photo-ID verification is recorded with the
  customer, so the waiver has something to stand on.
- **Credit card only · No refunds or rainchecks.** Shown at the point where the
  price is charged, not buried in settings.
- **Paid parking Fri–Sun and holidays** (county lot) — carried on the booking
  confirmation.

All four are toggles under **Settings → Park**, since policy changes with the
season.

AEDs and the Cintas first-aid cabinets are registered as safety assets with
their own preventive check (battery, pads, expiry dates, service log).

## Modules

| Module | What it does |
|---|---|
| **Dashboard** | Revenue, sessions, laps, unique customers, live congestion per line, peak hours, day × hour heat map, fleet utilization, urgent tickets, low stock |
| **Live operations** | Who is on the water, which line, time remaining, laps and falls, gear assigned, +1 lap / fall / end session |
| **Lap scanner** | Always-focused scan station for helmet/board QR; works with a phone camera or a Bluetooth reader |
| **Check-in & gear** | Find or create the customer → sign the waiver → charge the package → hand out gear → open the session |
| **Reservations** | Weekly agenda and list, booking sources, convert to check-in |
| **Services covered** | Cable (full + System 2.0), obstacle zone, aqua park, wakesurf and tubing behind the boat, lessons, birthday parties, corporate events, Summer Camp |
| **Customers** | CRM with tiers, lifetime spend, visit history, churn risk, CSV export |
| **Waivers** | Digital signature capture, expiry tracking, self-service kiosk QR, who cannot enter the water |
| **Loyalty & points** | Four tiers, points per dollar, rewards catalog, redemptions, leaderboard |
| **Marketing & CRM** | Live segments computed from real behavior, campaigns, automation catalog |
| **Summer Camp** | Enrollment with medical info, emergency contacts, authorized pickup list, daily attendance, activity schedule, weekly capacity |
| **Assets & inventory** | Every board, helmet, vest, boat, obstacle: photo, cost, condition, location, usage hours, full event history |
| **Maintenance** | Kanban of corrective tickets + preventive plan with checklists and due dates |
| **Supplies** | Consumables with minimum stock and purchase-order generation |
| **Employees** | Roster, roles, certifications with expiry alerts |
| **Scheduling** | Weekly shift planner, copy previous week, publish, email each employee their own shifts |
| **Reports** | Revenue, peak hours, heat map, laps per attraction, repeat frequency, top riders |
| **Settings** | Park data, pricing, capacity, loyalty rules, role/permission matrix, QR spec, integrations |

Roles (`owner`, `manager`, `supervisor`, `operator`, `instructor`, `frontdesk`,
`maintenance`) gate the navigation and the routes. Switch the active user from
the top-right avatar menu to see the app as each role.

## Architecture

```
src/
  lib/
    types.ts       domain model — the API contract
    store.tsx      state + all mutations, persisted to localStorage
    analytics.ts   peak hours, congestion, utilization, cohorts
    i18n.tsx       language provider; locales/es.ts holds the Spanish copy
    nav.ts         navigation + per-role access
  components/
    ui/            design system primitives (they also apply translation)
    charts.tsx     Recharts wrappers with a CVD-validated palette
    QrCode.tsx     QR generation, printable asset tags
  pages/           one file per module
  data/seed.ts     deterministic demo data (fixed PRNG seed)
```

Charts use a categorical palette validated for color-vision deficiency against
a white surface (worst adjacent pair ΔE 16.3 CVD / 19.6 normal vision). Every
chart also exposes a table view for accessibility.

## Known gaps

Honest list of what is *not* done:

- **Spanish dictionary is empty.** The i18n plumbing, the toggle and the
  English copy are in place, but `src/lib/locales/es.ts` still needs its
  entries. Until then the ES toggle renders English.
- **Several screens still contain Spanish copy** in the source: `Marketing`,
  `AssetDetail`, `Waivers`, `Reports`, `CamperDetail`, `Schedule`, `Loyalty`,
  `CustomerDetail`, `Employees`, `Reservations` and parts of `CheckIn`. They
  need the same English pass the other screens got.
- **Seed data is in Spanish** (ticket titles, activity names, supply names).
  It is demo content, not UI, but it should read English for a Miami demo.
- No backend, no auth, no payments. Emails and SMS are simulated with toasts.

## Suggested next steps

Beyond what was asked, these fit the same data model and would pay for
themselves quickly:

1. **Dynamic pricing** on saturated hours — the heat map already identifies them.
2. **Self-service kiosk / PWA** so guests sign the waiver and book before arriving.
3. **Offline-first scanner** — dock connectivity is unreliable; queue scans locally.
4. **Photo & video capture per lap** tied to the helmet QR, sold as an add-on.
5. **Automatic Google review requests** three hours after a session closes.
6. **Incident log** with photos and witnesses, tied to waivers, for insurance.
7. **Equipment depreciation and replacement forecasting** from usage hours.
8. **Membership / season-pass billing** with recurring charges.
9. **Group and corporate events** module with quotes and deposits.
10. **Parent portal** for Summer Camp: daily photos, attendance and balance.

## Going live in 30 minutes

The app works offline against `localStorage`. To let customers register from
their own phone and land at the front desk, add a database and a public URL.

### 1. Supabase — the database

1. Create a free project at supabase.com (region `us-east-1`).
2. SQL Editor → paste `supabase/schema.sql` → **Run**. That creates the
   `signups` table with its indexes and policies.
3. Project Settings → API → copy the **Project URL** and the **anon public** key.

### 2. Cloudflare Pages — the public URL

1. Workers & Pages → Create → Pages → **Connect to Git** → pick this repo.
2. Build command `npm run build`, output directory `dist`.
3. Environment variables:
   - `VITE_SUPABASE_URL` — the Project URL from step 1
   - `VITE_SUPABASE_ANON_KEY` — the anon public key
4. Deploy. You get `something.pages.dev`; add
   `app.miamiwatersportscomplex.com` as a custom domain when ready.

`public/_redirects` is already in the repo so every route serves `index.html` —
without it the `/register` link behind the QR would 404.

Once deployed, the banner on **Lightning hold** turns green and says how many
sign-ups are synced. That green banner is the proof that phones and the front
desk are talking to each other.

### What the anon key can and cannot do

The anon key can insert and read rows in `signups` — nothing else. That is the
minimum the self-registration page needs. Before this handles real volume, move
the writes behind a Supabase Edge Function with rate limiting and drop the
anonymous policies; the schema file notes where.
