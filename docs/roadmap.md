# DTB Admin Panel Roadmap

## Product Direction

### Source of Truth Rules
- The public website is the forward-looking source of truth for public availability and booking presentation.
- The admin app is the retrospective operational source of truth for assignments, schedules, invoices, logs, overrides, imported bookings, and historical records.
- Historical operational records must preserve the values recorded at the time of entry, even if the related boat, captain, customer, room, trip type, or rate record changes later.

## Core Domain Rules
- Captains are a first-class entity with their own login/access path later.
- Boats are a core managed asset.
- Lodge rooms are a core managed asset.
- Customers are admin-managed records and must support import from Square CSV.
- Trip Types are admin-defined records that determine trip duration in hours.
- Each boat has a primary captain.
- Trip logs and maintenance logs should default to the boat's primary captain but allow override.
- Deactivation is preferred over deletion.
- Boats, captains, and lodge rooms are inventory-like assets:
  - each boat = inventory of 1
  - each captain = inventory of 1
  - each lodge room = inventory of 1
  - lodge inventory = 8 rooms total

## Access Model

### Admin
Admins can manage all master records and operational data.

### Captain
Captains are created by admin and linked later through the Gmail address entered by admin.

A captain should have access to:
- all trips for the current day
- all customers
- day-of operational trip-log workflows

Captains should not have general admin CRUD access to master data such as:
- boats
- captains
- lodge rooms
- trip types
- rate tables

Captains may have narrow operational write access for day-of work, including:
- updating trip logs
- changing the boat on a trip log if needed
- switching the customer if needed
- searching the customer list
- adding a new customer if needed
- creating an ad hoc trip-log entry if the trip was not represented correctly in the schedule

## Data Model Direction

### First-Class Master Collections
Use separate first-class collections. Do not collapse these into one generic inventory abstraction at this stage.

- boats
- captains
- lodgeRooms
- customers
- tripTypes
- accessUsers

### Rate / Pricing Collections
- boatTripTypeRates
- captainTripTypeRates

### Imported Booking Collections
- bookingGroups
- bookingItems
- bookingImportRuns

### Operational Collections
- trips
- tripLogs
- maintenanceLogs
- roomAssignments

## Entity Definitions

### Boat
Core fields:
- id
- name
- slug
- status (`active | inactive`)
- primaryCaptainId
- primaryCaptainNameSnapshot
- createdAt
- updatedAt

### Captain
Core fields:
- id
- fullName
- slug
- email
- authUid (optional until captain auth is provisioned)
- status (`active | inactive`)
- createdAt
- updatedAt


### Access User
Core fields:
- id
- fullName
- email
- authUid (optional until first sign-in)
- role (`user | admin`)
- status (`active | inactive`)
- createdAt
- updatedAt
### Lodge Room
Core fields:
- id
- name
- slug
- status (`active | inactive`)
- createdAt
- updatedAt

### Customer
Core fields:
- id
- fullName
- email
- phone
- source (`manual | square-import | website-import | captain-created`)
- squareCustomerId (optional)
- websiteCustomerId (optional)
- status (`active | inactive | merged`)
- mergedIntoCustomerId (optional)
- createdAt
- updatedAt

### Trip Type
Core fields:
- id
- name
- slug
- durationHours
- status (`active | inactive`)
- createdAt
- updatedAt

### Boat Trip Type Rate
One record per boat + trip type.

Core fields:
- id
- boatId
- tripTypeId
- retailPrice
- ownerContractPrice
- status (`active | inactive`)
- createdAt
- updatedAt

### Captain Trip Type Rate
One record per captain + trip type.

Core fields:
- id
- captainId
- tripTypeId
- payAmount
- status (`active | inactive`)
- createdAt
- updatedAt

## Imported Booking Model

### Booking Group
Represents the overall imported website reservation/order.

Core fields:
- id
- source (`website-csv`)
- externalBookingGroupId
- customerId (optional if unresolved at import)
- customerNameSnapshot
- customerEmailSnapshot
- customerPhoneSnapshot
- status (`active | cancelled | modified`)
- bookingDate
- rawImportReference
- createdAt
- updatedAt

### Booking Item
Represents one component of a booking group.

Possible item types:
- `trip`
- `lodge`
- `addon`

Core fields:
- id
- bookingGroupId
- externalBookingItemId
- itemType
- sourceProductName
- status (`active | cancelled | modified`)
- startDateTime
- endDateTime
- linkedTripTypeId (optional)
- linkedBoatId (optional)
- linkedCaptainId (optional)
- quantity
- createdAt
- updatedAt

### Add-On Rule
Add-ons such as all-inclusive should be modeled as add-on booking items, not inventory assets.

## Identity Resolution and Customer Matching

### Matching Philosophy
Website bookings are imperfect identity data. Import should preserve the raw booking data first, then attempt customer matching safely.

### Primary Identifiers
- email
- phone

Square customer import should auto-match when email matches or phone matches.

### Secondary Identifiers
- normalized full name
- booking date proximity
- overlapping lodge/trip dates
- shared external booking/order identifiers

If the last name matches without a matching email or phone number, the import should flag the record for review instead of auto-merging.

### Match Outcome States
Each import/customer match should land in one of these states:
- `matched`
- `new`
- `review`

Ambiguous matches should be flagged for review, not auto-merged.

### Merge Rule
Duplicate customer profiles are expected over time.
Admin merge tooling will be needed later.
Merges must preserve historical snapshots and auditability.

## Trip Assembly Direction
A single website purchase may include multiple separately imported booking items, for example:
- offshore trip
- lodge stay
- inshore trip
- all-inclusive add-on

The system should preserve raw imported booking items first, then assemble complete operational trip/package views from:
- booking group relationships
- customer matching
- dates
- item types
- admin review

Do not assume one imported row equals one complete trip.

## Lodge Room Assignment Rules
- Lodge rooms are modeled as 8 separate room records.
- Default room assignment should fill sequentially from room 1 through room 8.
- Related parties should be placed adjacent whenever possible.
- Manual room override must be allowed.
- Historical room assignments must preserve the actual assigned room values.

## Trip Log Rules
For scheduled trip logs:
- scheduled boat should prepopulate
- scheduled customer should prepopulate
- captain may override the boat
- captain may override the customer

For unscheduled/ad hoc day-of work:
- captain may create a new trip-log entry
- captain may select a boat
- captain may search/select an existing customer
- captain may create a new customer if needed

Historical trip logs must preserve both scheduled values and actual values.

Suggested snapshot fields include:
- scheduledBoatId
- scheduledBoatNameSnapshot
- actualBoatId
- actualBoatNameSnapshot
- scheduledCustomerId
- scheduledCustomerNameSnapshot
- actualCustomerId
- actualCustomerNameSnapshot
- boatOverrideUsed
- customerOverrideUsed

## Historical Snapshot Rule
Trips, trip logs, maintenance logs, room assignments, and invoice-linked operational records must preserve snapshot values at time of entry.

Examples:
- boatNameSnapshot
- captainNameSnapshot
- customerNameSnapshot
- tripTypeNameSnapshot
- durationHoursSnapshot
- boatPriceSnapshot
- ownerContractPriceSnapshot
- captainPaySnapshot
- roomNameSnapshot

## Current Repo State
- Firebase + Next.js admin scaffold exists.
- Google Auth exists.
- Admin claim gating exists.
- `/auth-test` exists and is used for token/claim inspection.
- Captains CRUD is implemented with Google-email linkage and per-captain admin access.
- Boats CRUD v1 is implemented with list, create, edit, active/inactive status, and primary captain assignment.
- Lodge rooms CRUD v1 is implemented with list, create, edit, active/inactive status, and an 8-room cap.
- Customers CRUD v1 is implemented with manual list, create, edit, and active/inactive status.
- Trip types CRUD v1 is implemented with list, create, edit, durationHours, and active/inactive status.
- Non-captain access users CRUD is implemented for limited user/admin access by Google email.
- `/access` exists as the signed-in non-admin landing page.
- Website booking import is not implemented yet, but the internal booking-shell types/paths and /admin/bookings overview are now in place.
- Shared activity/date-range views are not implemented yet.
- Captain portal is not implemented yet.

## Build Order

### Milestone 0 - Admin Shell Stabilization
Goal:
- Ensure all `/admin` routes render within the intended shared admin shell and navigation.

Done when:
- `/admin`, `/admin/captains`, `/admin/boats`, and `/admin/config` render through the shared admin shell.
- No dead nav links remain.

Out of scope:
- boats CRUD
- auth architecture changes

### Milestone 1 - Boats CRUD v1
Goal:
- Implement real boat management.

Scope:
- boat list page
- create boat page
- edit boat page
- active/inactive status
- primary captain selection
- Firestore helpers for boats

Done when:
- admins can create, edit, deactivate, and reactivate boats
- each boat can be assigned a primary captain
- boats list clearly separates active and inactive boats

Out of scope:
- boat activity views
- maintenance logs
- rate tables

### Milestone 2 - Lodge Rooms CRUD v1
Goal:
- Implement management of the 8 lodge rooms as first-class assets.

Scope:
- lodge room list page
- create/edit pages
- active/inactive status

Done when:
- admins can manage the 8 lodge rooms individually
- rooms behave like inventory-of-1 assets

Out of scope:
- auto room assignment
- package booking logic

### Milestone 3 - Trip Types CRUD v1
Goal:
- Create admin-defined trip types and durations.

Scope:
- list/create/edit
- durationHours
- active/inactive status

Done when:
- admin can manage trip types
- trip type duration is stored in hours

Out of scope:
- rate tables
- scheduling logic

### Milestone 4 - Customers CRUD v1
Goal:
- Create the customer master record.

Scope:
- customer list page
- create/edit pages
- active/inactive status

Done when:
- admin can manage customer records manually
- customers support active/inactive status

Out of scope:
- merge workflow
- website-booking identity resolution

### Milestone 5 - Website Booking Import v1
Goal:
- Import website bookings from CSV while preserving raw source data first, then materializing booking groups and booking items safely.

Scope:
- CSV import flow
- import runs log
- raw imported row preservation for audit/debug
- bookingGroups
- bookingItems
- unresolved/match-status metadata where customer or trip-type linkage is uncertain
- support new bookings
- support modifications/cancellations by status changes
- idempotent upsert behavior where stable external IDs exist

Done when:
- admin can import website CSV data
- imported source rows are preserved before normalization
- imported data is preserved as raw booking groups/items without dropping unmapped fields
- uncertain matches survive import without unsafe forced links
- cancellations do not delete historical imported records

Out of scope:
- full trip assembly
- customer merge tooling

### Milestone 6 - Customers Square CSV Import v1
Goal:
- Reconcile Square customer exports into the customer master record with as much safe automation as possible.

Scope:
- Square CSV import flow
- import preview
- import runs and raw imported row preservation
- import upsert behavior
- automatic matching by email or phone
- review records for last-name-only similarity or other uncertain cases
- carry additional discovered names into dditionalNames`r

Done when:
- admin can import customers from Square CSV
- matching email or phone auto-reconciles into the existing customer when safe
- uncertain cases surface once for review instead of duplicating noise across runs
- additional discovered names are preserved on the customer record
- imported rows are auditable by import run

Out of scope:
- direct live Square API sync
- merge workflow

### Milestone 7 - Customer Review / Merge v1
Goal:
- Support imperfect identity resolution safely.

Scope:
- match statuses (`matched | new | review`)
- admin review workflow
- merge customer records
- preserve auditability

Done when:
- ambiguous customer matches can be reviewed
- duplicate customer records can be merged without destroying history

Out of scope:
- perfect auto-deduplication

### Milestone 8 - Rate Tables v1
Goal:
- Support asset-specific pricing and pay.

Scope:
- boat + trip type retail price
- boat + trip type owner contract price
- captain + trip type pay amount

Done when:
- admins can manage boatTripTypeRates
- admins can manage captainTripTypeRates

Out of scope:
- invoice generation
- payroll export

### Milestone 9 - Shared Activity Views v1
Goal:
- Display assets across a date range for future and historical activity.

Scope:
- boat activity view
- captain activity view
- lodge room activity view
- date range filtering

Done when:
- admins can view future and historical activity over a date range

Out of scope:
- drag-and-drop scheduling
- public website sync

### Milestone 10 - Captain Access v1
Goal:
- Allow captains to sign in and operate within day-of workflows.

Scope:
- map login email to captain record
- show all trips for the current day
- show all customers
- allow day-of trip-log workflows within constrained permissions

Done when:
- active captain accounts can access the day-of operational view
- captains do not have broad admin CRUD access

Out of scope:
- full admin access for captains
- broad master-data management

### Milestone 11 - Operational Trip Assembly v1
Goal:
- Marry imported booking items into complete operational trip/package contexts.

Scope:
- relationship handling across trip/lodge/add-on items
- use booking-group data plus customer matching
- create admin-usable assembled trip views

Done when:
- admins can view complete package/trip contexts assembled from imported components

Out of scope:
- full scheduling engine
- full automation of every edge case

### Milestone 12 - Trips / Operational Records v1
Goal:
- Create the operational record tying together boat, captain, customer, trip type, and imported booking context.

Scope:
- trips collection
- trip references to bookingGroups/bookingItems where applicable
- snapshot preservation
- status fields

Done when:
- trips preserve historical snapshot values
- trips can support invoice/log integrations later

Out of scope:
- full booking engine
- maintenance workflow

### Milestone 13 - Trip Logs and Maintenance Logs v1
Goal:
- Add boat-centered operational logging.

Scope:
- trip logs
- maintenance logs
- default captain from boat primary captain
- allow manual override
- preserve scheduled vs actual snapshots

Done when:
- logs default correctly
- overrides are preserved
- historical snapshots are preserved

Out of scope:
- analytics dashboard
- public display

## Codex Working Rules for This Roadmap
- Work one milestone at a time.
- Do not broaden scope inside a milestone.
- Prefer targeted edits over broad refactors.
- Preserve existing working auth unless the milestone explicitly requires auth changes.
- Do not create a repo-root `src` folder.
- Use separate collections for first-class entities.
- Prefer deactivation over deletion.
- Preserve history with snapshots on operational records.
