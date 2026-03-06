# DTB Admin Panel Roadmap

## Current State
- Next.js App Router app deployed via Firebase App Hosting.
- Google Auth working.
- Firestore provisioned with deployed rules (default deny; `/admin/**` admin-only via custom claim).
- Admin gating implemented via custom claims (`admin: true`) with `/auth-test` verification.
- `/admin/config` page created to manage Firestore doc `admin/config`.

---

## Milestone 1 — Security foundation ✅
### Goals
- Real server-side security: Firestore rules + role/claim enforcement.
- No “security” based on public `NEXT_PUBLIC_*` env variables.

### Completed
- Firestore rules deployed (default deny + `/admin/**` requires `admin: true`).
- Admin claim bootstrap script created (`apps/web/scripts/grant-admin.mjs`).
- `/admin` gating switched to custom claim checks.
- Removed `NEXT_PUBLIC_ADMIN_EMAILS` from code and hosting env.

---

## Milestone 2 — Mobile-first UI system (CURRENT FOCUS)
### Goals
- Admin panel usable primarily from a phone.
- Consistent layout + reusable UI primitives.

### Tasks
- [ ] Create shared Admin shell layout:
  - sticky top header
  - simple nav (hamburger / drawer on mobile)
  - consistent page padding and max widths
- [ ] Define UI primitives:
  - Button, Input, Select, Card, SectionHeader
  - error + loading states
- [ ] Standardize form patterns:
  - labels above inputs
  - large tap targets
  - one primary action per screen
- [ ] Convert `/admin/config` to new mobile UI shell (first implementation).

### Exit Criteria
- All `/admin/*` pages share the same layout.
- Forms are comfortable on a phone (no horizontal scroll; readable; easy tap).

---

## Milestone 3 — v0 Data Model + CRUD (Boats, Customers)
### v0 Collections (admin-only)
- `admin/config` (doc)
- `admin/boats/{boatId}`
- `admin/customers/{customerId}`
- (next) `admin/trips/{tripId}`, `admin/bookings/{bookingId}`, `admin/payments/{paymentId}`, `admin/maintenance/{maintenanceId}`, `admin/auditLogs/{logId}`

### Data conventions
- All docs include: `createdAt`, `updatedAt`
- References by ID (e.g., `boatId`, `customerId`)
- Explicit status strings for workflow objects

### Tasks
- [ ] Boats CRUD (mobile UI):
  - list + create + edit + deactivate
- [ ] Customers CRUD (mobile UI):
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
- Record all admin changes for debugging and oversight.

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