# DTB App Progress Log

## 2026-02-26
### Completed
- Created local repo and pushed to GitHub
- Created Next.js app in apps/web (TypeScript, App Router, Tailwind)
- Verified dev server runs locally

### Next Step
- Initialize Firebase (Firestore + Hosting) in this repo

---

## 2026-03-03
### Completed
- Firebase App Hosting configured and deploying from GitHub
- Google Auth working in the hosted app
- Firestore created; rules deployed (default deny; /admin/** requires admin: true)
- Added admin-claim bootstrap script: apps/web/scripts/grant-admin.mjs
- Added /admin/config page to manage Firestore doc admin/config

### Next Step
- Add a shared admin layout and begin mobile-first UI pass

---

## 2026-03-05
### Completed
- Added mobile-first Admin shell scaffolding:
  - AdminLayoutClient (claim gate) + AdminShell (header/nav/menu)
  - /admin/* wrapped by src/app/admin/layout.tsx
- Standardized ESLint on flat config (apps/web/eslint.config.mjs) and removed legacy .eslintignore
- Confirmed repo conventions:
  - App Router lives in apps/web/src/app
  - Components in apps/web/src/components
  - @/… resolves into apps/web/src/…
- Verified npm run lint and npm run build clean; pushed updates to main

### Next Step
- Update /auth-test to show ID token claims clearly and support token refresh
- Convert /admin landing into a real mobile dashboard
- Start Boats CRUD using Firestore path admin/data/boats/{boatId}

## 2026-03-05 — Product model clarified: captains, boats, trips, maintenance

### Decisions made
- Confirmed that the **website** is the forward-looking source of truth for public-facing inventory/availability.
- Confirmed that the **DTB Admin Panel** is the retrospective operational source of truth for what actually happened.
- Confirmed that the admin app should **mirror** core website entities as needed, but should **not** yet write operational data back to the website.
- Confirmed that **deactivation** is preferred over deletion for managed records.

### Core entities established
The initial operational data model will center on:
- Captains
- Boats
- Trip Logs
- Maintenance Logs

### Boats
- Boats are confirmed as a core managed asset.
- Admins must be able to:
  - list boats
  - create boats
  - edit/rename boats
  - deactivate/reactivate boats
- Boats will later support reconciliation/mirroring with website-side boat identity.
- Boats will serve as the anchor record for trip and maintenance history.

### Captains
- Captains are confirmed as a separate model/entity.
- Captains will require their own login/access path.
- Admins will authorize or provision captain access.
- Captain identity and captain authentication should remain separate concerns in the data model.

### Boat/captain relationship
- Each boat has a **primary captain**.
- Trip logs should default to the boat’s primary captain but allow override for substitute captains.
- Maintenance logs should also default to the boat’s primary captain/responsible operator but allow override.

### Historical integrity rule
- Historical trip and maintenance records must preserve the captain and boat values recorded at the time of entry.
- Editing a boat’s primary captain later must not retroactively change old logs.

### Product intent clarified
Primary goals:
- create a retrospective trip log with operational datapoints
- create a maintenance log with operational and cost history

Secondary goals:
- generate partner/owner statements showing actual boat usage
- support contractual lease-payment calculations based on usage
- support maintenance-cost reporting by boat

### Agreed next build sequence
1. Captains CRUD
2. Boats CRUD
3. Auth/role linkage for admin and captain access
4. Trip Logs
5. Maintenance Logs