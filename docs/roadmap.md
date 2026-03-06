# DTB Admin Panel Roadmap

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