# DTB App Progress Log

## 2026-03-11 - Product vision locked for Codex handoff

### Summary
Locked the product direction and build order before transitioning active build work into a Codex-oriented workflow.

### Confirmed product rules
- Website is the forward-looking source of truth.
- Admin app is the retrospective operational source of truth.
- Captains are a first-class entity with their own login/access path later.
- Boats are a core managed asset.
- Lodge rooms are a core managed asset.
- Customers are admin-managed and will need Square CSV import.
- Trip Types are admin-defined and determine trip duration in hours.
- Each boat has a primary captain.
- Trip logs and maintenance logs should default to the boat's primary captain but allow override.
- Deactivation is preferred over deletion.
- Historical records must preserve values recorded at the time of entry.

### Inventory direction
- Boats, captains, and lodge rooms are inventory-like assets.
- Each boat = inventory of 1.
- Each captain = inventory of 1.
- Each lodge room = inventory of 1.
- Lodge total inventory = 8 rooms.

### Captain access direction
- Captains will later gain access through the Gmail entered by admin.
- Captains should have access to all trips for the current day and all customers.
- Captains should be able to work within day-of trip-log workflows.
- On trip logs, captains should be able to:
  - change the boat
  - keep the prepopulated customer
  - switch to another existing customer
  - search the customer list
  - add a new customer if needed
  - create an ad hoc entry if the scheduled trip does not represent reality exactly

### Lodge room direction
- Lodge rooms should be modeled as 8 separate room records.
- Default room assignment should fill sequentially from room 1 through room 8.
- Related parties should be placed adjacent whenever possible.
- Manual override should remain possible.

### Pricing direction
- Pricing is asset-specific, not global.
- Boat + Trip Type should support:
  - retail/customer-facing price
  - owner contract price, if applicable
- Captain + Trip Type should support:
  - captain pay amount

### Website booking import direction
- Trips/bookings must import from the website via CSV.
- The system must handle new bookings, modifications, and cancellations.
- Imported website bookings may contain multiple separate booking items under one overall booking group.
- Example components include:
  - offshore trip
  - inshore trip
  - lodge stay
  - all-inclusive add-on
- All-inclusive should be modeled as an add-on item, not an inventory asset.

### Identity resolution direction
- Complete trips will likely require marrying separate bookings into one operational context.
- Primary identifiers for customer matching should be email and phone.
- Secondary identifiers may include normalized name and booking context.
- Duplicate customer profiles are expected and merge tooling will be needed later.
- Import should preserve raw data first and avoid unsafe auto-merges.

### Current repo state at handoff
- Firebase + Next.js admin scaffold exists.
- Google Auth exists.
- Admin claim gating exists.
- `/auth-test` already supports token/claim inspection and refresh.
- Captains CRUD is partially implemented.
- Boats currently has only a placeholder page.
- Lodge rooms CRUD is not implemented yet.
- Customers CRUD/import is not implemented yet.
- Trip Types CRUD is not implemented yet.
- Website booking import is not implemented yet.
- Shared activity views are not implemented yet.
- Captain portal is not implemented yet.

### Documentation changes
- `docs/roadmap.md` should be rewritten into milestone-based Codex-friendly format.
- `docs/dev-workflow.md` should be updated with Codex execution and verification rules.
- Build order should be explicit and stable so each Codex session can take one milestone at a time.

### Intended implementation order
1. Admin shell stabilization
2. Boats CRUD v1
3. Lodge Rooms CRUD v1
4. Customers CRUD + Square CSV import v1
5. Trip Types CRUD v1
6. Website Booking Import v1
7. Customer Review / Merge v1
8. Rate Tables v1
9. Shared Activity Views v1
10. Captain Access v1
11. Operational Trip Assembly v1
12. Trips / Operational Records v1
13. Trip Logs and Maintenance Logs v1

## 2026-03-11 - Milestone 0 admin shell route pass

### Summary
Verified that `apps/web/src/app/admin/layout.tsx` mounts the shared admin shell for admin child routes and tightened the shell navigation for the Milestone 0 route set.

### Completed
- Confirmed /admin, /admin/captains, /admin/boats, and /admin/config are all routed under the shared `apps/web/src/app/admin/layout.tsx` layout.
- Moved /admin/config into the persistent shared shell nav so the milestone routes are reachable from the shell without relying on the slide-over menu.
- Left Boats CRUD and auth architecture untouched.


## 2026-03-11 - Milestone 1 boats CRUD v1

### Summary
Replaced the boats placeholder with real admin CRUD flows under the shared admin shell.

### Completed
- Added Firestore helper utilities at `apps/web/src/lib/admin/boats.ts` for boat records, form normalization, and path helpers.
- Added boats list, create, and edit UI components in `apps/web/src/components/admin/BoatsList.tsx`, `apps/web/src/components/admin/BoatForm.tsx`, and `apps/web/src/components/admin/BoatEditPage.tsx`.
- Added routes for `apps/web/src/app/admin/boats/page.tsx`, `apps/web/src/app/admin/boats/new/page.tsx`, and `apps/web/src/app/admin/boats/[boatId]/page.tsx`.
- Boats can now be created, edited, deactivated/reactivated, and assigned a primary captain from the existing captains collection.
- Verified with `npm run build` from `apps/web`.

## 2026-03-11 - Milestone 2 lodge rooms CRUD v1

### Summary
Implemented lodge room management for the 8 nightly room units under the shared admin shell.

### Completed
- Added Firestore helper utilities at `apps/web/src/lib/admin/lodgeRooms.ts` for lodge room records, form normalization, and path helpers.
- Added lodge room list, create, and edit UI components in `apps/web/src/components/admin/LodgeRoomsList.tsx`, `apps/web/src/components/admin/LodgeRoomForm.tsx`, and `apps/web/src/components/admin/LodgeRoomEditPage.tsx`.
- Added routes for `apps/web/src/app/admin/lodge-rooms/page.tsx`, `apps/web/src/app/admin/lodge-rooms/new/page.tsx`, and `apps/web/src/app/admin/lodge-rooms/[roomId]/page.tsx`.
- Added an 8-room cap so the admin UI does not create a ninth lodge room record.
- Verified with `npm run build` from `apps/web`.

## 2026-03-11 - Roadmap order shift

### Summary
Deferred Square customer import until later in the roadmap so master-data CRUD can be built first without taking on external import/API integration early.

### Updated order
- Milestone 3 is now Trip Types CRUD v1.
- Customers manual CRUD moves ahead of Square import.
- Square customer import is deferred to a later milestone after core customer records and website booking import work.
## 2026-03-11 - Milestone 3 trip types CRUD v1

### Summary
Implemented trip type management so the admin app can define trip durations in hours before pricing and import work.

### Completed
- Added Firestore helper utilities at `apps/web/src/lib/admin/tripTypes.ts` for trip type records, form normalization, and path helpers.
- Added trip type list, create, and edit UI components in `apps/web/src/components/admin/TripTypesList.tsx`, `apps/web/src/components/admin/TripTypeForm.tsx`, and `apps/web/src/components/admin/TripTypeEditPage.tsx`.
- Added routes for `apps/web/src/app/admin/trip-types/page.tsx`, `apps/web/src/app/admin/trip-types/new/page.tsx`, and `apps/web/src/app/admin/trip-types/[tripTypeId]/page.tsx`.
- Shifted the roadmap order so Square customer import is deferred until after core master-data and booking work.
- Verified with `npm run build` from `apps/web`.
## 2026-03-11 - Milestone 4 customers CRUD v1

### Summary
Implemented manual customer master-record management before import and merge workflows.

### Completed
- Added Firestore helper utilities at `apps/web/src/lib/admin/customers.ts` for customer records, form normalization, and path helpers.
- Added customer list, create, and edit UI components in `apps/web/src/components/admin/CustomersList.tsx`, `apps/web/src/components/admin/CustomerForm.tsx`, and `apps/web/src/components/admin/CustomerEditPage.tsx`.
- Added routes for `apps/web/src/app/admin/customers/page.tsx`, `apps/web/src/app/admin/customers/new/page.tsx`, and `apps/web/src/app/admin/customers/[customerId]/page.tsx`.
- Kept this milestone manual-only: customer source defaults to `manual`, with no Square import or merge workflow yet.
- Verified with `npm run build` from `apps/web`.
## 2026-03-11 - Access and role linkage subtask

### Summary
Added a small access layer so matching Google emails can receive app access automatically at sign-in, while preserving the existing admin shell gating.

### Completed
- Added server-side Firebase Admin initialization and a `POST /api/auth/sync-role` route to assign managed claims from active captain or access-user records.
- Extended captains with an `adminAccess` flag so a captain can either get captain-level site access or full admin access.
- Added admin-managed non-captain access users under `apps/web/src/app/admin/users/**`.
- Added `/access` as the signed-in non-admin landing page.
- Updated login flow to sync claims immediately after Google sign-in and redirect by effective role.
## 2026-03-11 - Website booking data shell

### Summary
Added the internal booking-import data shell ahead of the CSV pipeline so the app now has stable collection shapes and an admin landing page for imported booking records.

### Completed
- Added shared helper/types for `bookingImportRuns`, `bookingGroups`, and `bookingItems` at `apps/web/src/lib/admin/websiteBookings.ts`.
- Added the admin overview page at `apps/web/src/app/admin/bookings/page.tsx` with `apps/web/src/components/admin/WebsiteBookingsOverview.tsx`.
- Added booking-shell navigation entry points in the admin dashboard and shared admin shell.
- Left the actual CSV parser/import pipeline out of scope for this pass.
## 2026-03-11 - Import guidance tightened

### Summary
Clarified the website-booking import guidance before parser work begins so the next pass starts from raw-source preservation rather than direct normalization assumptions.

### Completed
- Updated Milestone 5 in `docs/roadmap.md` to require raw imported row preservation before normalized booking records.
- Added explicit unresolved/match-metadata expectations for uncertain customer and trip-type linkage.
- Updated `docs/dev-workflow.md` to make raw preservation and no-forced-match rules explicit for import work.
## 2026-03-11 - Square customer reconciliation rules

### Summary
Locked the intended Square customer matching behavior before import implementation so the importer can automate the safe cases and isolate only real anomalies for admin review.

### Completed
- Matching email or phone is now the explicit auto-reconcile rule for Square customer imports.
- Last-name-only similarity without matching email or phone is now an explicit review case.
- Additional discovered names should be preserved under `additionalNames` on the customer record.
- Review anomalies should surface once in admin until resolved rather than repeatedly reappearing on each import.