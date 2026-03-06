# DTB Admin Panel Roadmap
## Fleet operations data model and admin foundation

### Product direction
The DTB website remains the forward-looking source of truth for prospectively offered inventory and availability.  
The DTB Admin Panel will mirror core website entities as needed, but its primary role is retrospective operational truth: logging what actually happened on trips and what maintenance actually occurred.

### Core entity model
The first operational entities for the admin panel are:

- **Captains**
- **Boats**
- **Trip Logs**
- **Maintenance Logs**

These will form the foundation for later reporting, statements, and partner accounting.

### Captains
Captains will be a first-class model/entity.

Required capabilities:
- create captain
- edit captain
- deactivate/reactivate captain
- maintain a separate captain profile record independent of boats
- support captain-specific login/access provisioned or authorized by admins

Initial model goals:
- captains exist as operational records even before login is provisioned
- captain identity and captain authentication remain related but distinct
- inactive captains remain attached to historical records but are excluded from normal new-entry dropdowns

### Boats
Boats are a core managed asset.

Required capabilities:
- create boat
- edit boat
- rename boat
- deactivate/reactivate boat

Initial product purpose:
- maintain the fleet in one authoritative admin location
- mirror boat identity needed for reconciliation with the public website
- assign a default/primary captain to each boat
- serve as the anchor entity for trip logs and maintenance logs

Important constraint:
- boat removal should use **deactivation**, not hard deletion, to preserve historical record integrity

### Boat/captain relationship
Each boat has a **primary captain**.

Operational behavior:
- trip logs default to the boat’s primary captain, but allow override for substitutes
- maintenance logs default to the boat’s primary captain/responsible operator, but allow override for substitutes

### Trip logs
Primary purpose:
- create a retrospective log of what actually happened on the water

Initial requirements:
- every trip log belongs to exactly one boat
- every trip log records the actual captain for that trip
- captain should default from the boat’s primary captain
- preserve historical values even if the default captain changes later

### Maintenance logs
Primary purpose:
- create a retrospective log of maintenance activity and associated cost

Initial requirements:
- every maintenance log belongs to exactly one boat
- every maintenance entry records the responsible captain/operator
- captain should default from the boat’s primary captain
- preserve historical values even if the default captain changes later

### Reporting direction
Secondary business goals supported by this model:
- generate partner/owner statements showing actual boat usage
- generate contractual lease-payment statements based on usage
- track maintenance costs attributable to each boat over time

### Build order
1. Captains CRUD
2. Boats CRUD with primary captain relationship
3. Role/auth linkage for admin and captain access
4. Trip Logs
5. Maintenance Logs
6. Partner/owner reporting and statements

## Current State (Mar 5, 2026)
- Next.js app (apps/web) deployed via Firebase App Hosting.
- Google Auth working.
- Firestore rules deployed: default deny; /admin/** requires custom claim admin: true.
- Admin UX gate implemented in src/app/admin/layout.tsx via AdminLayoutClient + AdminShell.
- /admin/config reads/writes Firestore doc admin/config.
- ESLint 9 flat config in apps/web/eslint.config.mjs (no .eslintignore).

---

## Milestone 1 — Security foundation ✅

### Goals
- Server-side security: Firestore rules + role/claim enforcement.
- No security based on public NEXT_PUBLIC_* env vars.

### Completed
- Firestore rules deployed (default deny + /admin/** requires admin: true).
- Admin claim bootstrap script created (apps/web/scripts/grant-admin.mjs).
- Admin gate uses ID token custom claim checks (UX) + Firestore rules (enforcement).

---

## Milestone 2 — Mobile-first UI system (CURRENT)

### Goals
- Admin panel usable primarily from a phone.
- Consistent layout + reusable patterns.

### Completed
- Shared Admin shell exists (AdminShell) with sticky header + bottom nav + slide-over menu.
- /admin and /admin/config run inside shared admin layout.

### Remaining Tasks
- [ ] Convert /admin landing into a real mobile dashboard (cards, summaries, quick links).
- [ ] Tighten /admin/config UI: consistent spacing, button/input patterns, basic validation.
- [ ] Update /auth-test to show token claims clearly (admin true/false) + add “refresh token” action.
- [ ] Optional: define lightweight UI primitives (Button, Input, Card) if duplication grows.

### Exit Criteria
- All /admin/* pages share the same layout.
- Forms are comfortable on a phone (no horizontal scroll; readable; easy tap targets).

---

## Milestone 3 — v0 Data Model + CRUD (Boats, Customers)

### Firestore path convention (important)
Firestore alternates: collection/doc/collection/doc.

We keep all admin data under /admin/** to leverage existing rules:
- admin/config (doc) — global admin configuration
- admin/data/boats/{boatId} (subcollection under doc admin/data)
- admin/data/customers/{customerId} (subcollection under doc admin/data)

### Tasks
- [ ] Boats CRUD (mobile-first):
  - list + create + edit + deactivate
  - fields (start minimal): name, status, notes
- [ ] Customers CRUD (mobile-first):
  - list + create + edit
  - quick search by name/email

### Exit Criteria
- Admin can manage boats and customers from mobile.
- Non-admin cannot read/write any admin docs.

---

## Milestone 4 — Trips, Bookings, Payments (v0)

### Goals
- Record trips and bookings; attach payments; begin operational tracking.

### Tasks
- [ ] Trips:
  - date, boat, captain, type, status, depart/return, notes
- [ ] Bookings:
  - customer, trip, quoted price, deposit required/paid, status
- [ ] Payments:
  - provider, amount, providerRef, bookingId

---

## Milestone 5 — Audit + accountability

### Goals
- Record admin changes for debugging and oversight.

### Tasks
- [ ] Add audit log writes for create/update/delete actions.
- [ ] Add read-only audit view.

---

## Later (deferred)
- WordPress booking ingestion (webhooks/hooks)
- Square invoice + webhook sync
- Exports (CSV)
- Lodging/purchases modules
- Roles beyond admin (captain/manager), per-collection permissions