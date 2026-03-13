# DTB App Progress Log

## 2026-03-11 - Product vision locked for Codex handoff

### Summary
Locked the product direction and build order before transitioning active build work into a Codex-oriented workflow.

### Confirmed product rules
- Website is the forward-looking source of truth.
- Admin app is the retrospective operational source of truth.
- Captains are a first-class entity with their own login and access path.
- Boats are a core managed asset.
- Lodge rooms are a core managed asset.
- Customers are admin-managed and need Square CSV import and later review tooling.
- Trip types are admin-defined and determine trip duration in hours.
- Each boat has a primary captain.
- Trip logs and maintenance logs should default to the boat's primary captain but allow override.
- Deactivation is preferred over deletion.
- Historical records must preserve values recorded at the time of entry.

## 2026-03-11 - Milestones 0 through 4 completed

### Summary
Built the early admin foundation and core master-data CRUD flows.

### Completed
- Stabilized the shared admin shell so `/admin` routes render through the intended layout.
- Implemented boats CRUD with active/inactive state and primary captain assignment.
- Implemented lodge rooms CRUD with an 8-room cap.
- Implemented trip types CRUD with `durationHours`.
- Implemented customers CRUD with manual create and edit flows.

## 2026-03-11 - Access and booking shell pass

### Summary
Added early access linkage and the raw booking-shell foundation before import parser work.

### Completed
- Added claim-sync access logic for captains and managed access users.
- Added per-captain `adminAccess` support and the non-admin `/access` landing page.
- Added the internal website booking shell with `bookingImportRuns`, `bookingGroups`, and `bookingItems` plus the `/admin/bookings` overview.
- Tightened import guidance so raw source preservation happens before normalization.
- Locked Square customer matching rules around email, phone, last-name review, and `additionalNames`.

## 2026-03-12 - Square customer import implemented

### Summary
Built the first repeatable customer-import workflow instead of relying on manual entry.

### Completed
- Added Square customer CSV import under the customers area with preview and apply flows.
- Added import-run logging and raw imported row preservation for auditability.
- Implemented safe auto-match by email or phone.
- Sent uncertain last-name-only cases to review instead of auto-merging.

## 2026-03-13 - Admin information architecture and pricing pass

### Summary
Shifted lower-frequency setup tools into Settings and added the first structured trip-pricing workflow.

### Completed
- Reorganized Settings so master data management now includes boats, lodge rooms, captains, trip types, and users/captains.
- Moved customer import and future import/export tools under Settings.
- Added boat trip pricing management with one rate per boat plus trip type and optional owner contract price.
- Reworked trip pricing into a boat-based grid editor so admins can add, remove, restore, and save multiple trip-type price rows in one pass.
- Added the owner-admin fallback for `cbrousstulane@gmail.com` to prevent accidental admin lockout during early access setup.

## 2026-03-13 - Customer UI and read-efficiency pass

### Summary
Polished the customers experience and reduced repeated Firestore reads during admin browsing.

### Completed
- Updated the customers interface to match the current design direction with desktop table and mobile card layouts.
- Limited customer pagination to 10 per page and added unified search across name, email, and phone.
- Replaced the customers page full-collection realtime listener with one-time loads plus short session caching.
- Added customer-cache invalidation on customer save and Square import apply so repeated browsing stays lighter without serving stale data after writes.

## 2026-03-13 - Broader admin read-efficiency pass

### Summary
Removed the remaining unnecessary full-collection realtime listeners from admin browse and setup screens so routine testing does not keep rereading Firestore data in the background.

### Completed
- Converted access users, captains, boats, lodge rooms, trip types, website booking overview, boat form, boat-rate form, and trip-pricing grid loads to one-time fetches.
- Kept functional behavior the same for browse and setup screens by reloading after writes instead of holding live subscriptions open.
- Verified there are no remaining onSnapshot calls under pps/web/src after this pass.

## 2026-03-13 - Settings backup and restore hub

### Summary
Consolidated import and future export or restore entry points under one Settings workspace instead of scattering separate CSV actions across the settings page.

### Completed
- Replaced the direct import/export card grid in Settings with a single Backup And Restore entry point.
- Added /admin/config/backup-restore as the centralized workspace for live and planned import, export, backup, and restore actions.
- Routed current customer-import and booking-import entry points through that hub so future backup and recovery flows have one home.
