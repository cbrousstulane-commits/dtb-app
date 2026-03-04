# DTB Admin Panel Roadmap

## Current State
- Next.js App Router app deployed via Firebase App Hosting.
- Google Auth working.
- `/admin` route currently gated client-side (legacy) via `NEXT_PUBLIC_ADMIN_EMAILS` allowlist.
- Firebase CLI connected to project `dtb-admin-panel`.
- Firestore provisioned with rules deployed:
  - Default deny
  - `/admin/**` requires Auth custom claim `admin: true`

---

## Milestone 1 — Lock down admin access (REAL security)
### Goals
- Enforce admin access server-side using Firestore Rules + Auth custom claims.
- Remove any “security” logic based on `NEXT_PUBLIC_*` env vars.

### Tasks
- [ ] Create local secrets folder and download service account JSON (do not commit).
  - Example path: `C:\Users\chris\secrets\dtb-admin-panel-sa.json`
- [ ] Run bootstrap script to grant `admin: true` claim:
  - `node apps/web/scripts/grant-admin.mjs`
- [ ] Update `/admin` route UX gating:
  - Replace allowlist (`NEXT_PUBLIC_ADMIN_EMAILS`) with claim check:
    - `token.claims.admin === true`
- [ ] Add explicit “Not authorized” UI for signed-in non-admin users.
- [ ] Add a simple “Admin status” indicator (optional):
  - shows email + `admin` true/false

### Exit Criteria
- Signed-in non-admin cannot read/write any `/admin/**` document (PERMISSION_DENIED).
- Admin user can read/write `/admin/**`.
- `/admin` page renders only for admin users (good UX), but rules remain the true enforcement.

---

## Milestone 2 — Define v0 data model (Firestore)
### Goals
- Establish stable collections + fields for initial admin functionality.
- Keep everything under `/admin/**` initially to keep rules simple.

### v0 Collections (admin-only)
- `/admin/config/app`
- `/admin/boats/{boatId}`
- `/admin/customers/{customerId}`
- `/admin/trips/{tripId}`
- `/admin/bookings/{bookingId}`
- `/admin/payments/{paymentId}`
- `/admin/maintenance/{maintenanceId}`
- `/admin/auditLogs/{logId}`

### Data conventions
- Every doc includes:
  - `createdAt`, `updatedAt`
- Reference related entities by ID:
  - `boatId`, `customerId`, `tripId`, `bookingId`
- Use explicit status enums (strings):
  - bookings: `hold | deposit-paid | paid | canceled | refunded`
  - trips: `planned | confirmed | completed | canceled`

### Exit Criteria
- `/admin/config/app` exists and can be read in the admin UI.
- CRUD proof-of-life for at least one entity (boats or customers).

---

## Milestone 3 — Admin UI (CRUD + navigation)
### Goals
- Build basic admin navigation and pages.
- Provide quick visibility into operational objects.

### Tasks
- [ ] Add admin layout + nav:
  - Boats, Customers, Trips, Bookings, Payments, Maintenance, Audit
- [ ] Implement CRUD UI for:
  - Boats
  - Customers
- [ ] Add list/search/filter (minimal):
  - text search by name/email for customers
  - active/inactive filter for boats

### Exit Criteria
- Admin can create/edit/delete boats and customers through UI.
- Changes persist in Firestore and are blocked for non-admin.

---

## Milestone 4 — Bookings + payments integration hooks (v0)
### Goals
- Start capturing booking state and payments in a consistent schema.
- Defer provider-specific sync until the schema is stable.

### Tasks
- [ ] Trip creation flow (minimal):
  - date, boat, captain, trip type, depart/return, status
- [ ] Booking creation flow:
  - customer, trip, quoted price, deposit requirements, status
- [ ] Payment records:
  - provider, amount, providerRef, bookingId

### Exit Criteria
- Admin can record a booking and payments tied to it.
- Audit log entries generated for create/update.

---

## Milestone 5 — Audit + accountability
### Goals
- Record all admin changes for debugging and accountability.

### Tasks
- [ ] Add `/admin/auditLogs` write helper:
  - actorUid, action, entityPath, before/after, timestamp
- [ ] Surface audit log in UI (read-only)

### Exit Criteria
- All CRUD actions write an audit log entry.
- Admin can view audit logs.

---

## Later (deliberately deferred)
- Customer portal / tenant portal
- Public booking flows
- Payments provider sync (Square/ACH/etc.)
- Role hierarchy (beyond single admin claim)
- Server-side APIs (Functions/Next API routes) for sensitive operations