# DTB Admin Panel Roadmap

## Product Direction

### Source Of Truth Rules
- The public website is the forward-looking source of truth for public availability and booking presentation.
- The admin app is the retrospective operational source of truth for assignments, schedules, invoices, logs, overrides, imported bookings, and historical records.
- Historical operational records must preserve the values recorded at the time of entry, even if the related boat, captain, customer, room, trip type, or rate record changes later.

## Core Domain Rules
- Captains are a first-class entity with their own login and access path.
- Boats are a core managed asset.
- Lodge rooms are a core managed asset.
- Customers are admin-managed records and support Square CSV import.
- Trip types are admin-defined records that determine trip duration in hours.
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
Captains are created by admin and linked through the Gmail address entered by admin.

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
- fishSpecies
- accessUsers

### Rate And Pricing Collections
- boatTripTypeRates
- captainTripTypeRates

### Imported Booking Collections
- bookingImportRuns
- bookingGroups
- bookingItems

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
- adminAccess
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
- additionalNames
- source (`manual | square-import | website-import | captain-created`)
- squareCustomerId (optional)
- websiteCustomerId (optional)
- customerMatchStatus (`matched | new | review | unresolved`)
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
One record per boat plus trip type.

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
One record per captain plus trip type.

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
Represents the overall imported website reservation or order.

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

## Identity Resolution And Customer Matching

### Matching Philosophy
Website bookings are imperfect identity data. Import should preserve the raw booking data first, then attempt customer matching safely.

### Primary Identifiers
- email
- phone

Square customer import should auto-match when email matches or phone matches.

### Secondary Identifiers
- normalized full name
- booking date proximity
- overlapping lodge or trip dates
- shared external booking or order identifiers

If the last name matches without a matching email or phone number, the import should flag the record for review instead of auto-merging.

### Match Outcome States
Each import or customer match should land in one of these states:
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

The system should preserve raw imported booking items first, then assemble complete operational trip and package views from:
- booking-group relationships
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

For unscheduled and ad hoc day-of work:
- captain may create a new trip-log entry
- captain may select a boat
- captain may search or select an existing customer
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
- Firebase plus Next.js admin scaffold exists.
- Google Auth exists.
- Admin claim gating exists.
- `/auth-test` exists and is used for token and claim inspection.
- Captains CRUD is implemented with Google-email linkage and per-captain admin access.
- Boats CRUD v1 is implemented with list, create, edit, active and inactive status, and primary captain assignment.
- Lodge rooms CRUD v1 is implemented with list, create, edit, active and inactive status, and an 8-room cap.
- Customers CRUD v1 is implemented with manual list, create, edit, active and inactive status, unified search, and 10-per-page pagination.
- Customers list now uses one-time loads plus short session caching instead of a live full-collection listener for routine admin browsing.
- Admin browse and setup screens now default to one-time loads instead of full-collection realtime listeners, including captains, boats, lodge rooms, trip types, users, booking overview, and trip pricing.
- Trip types CRUD v1 is implemented with list, create, edit, `durationHours`, and active and inactive status.
- Non-captain access users CRUD is implemented for limited user and admin access by Google email.
- `/access` exists as the signed-in non-admin landing page.
- Square customer CSV import is implemented with preview, run logging, raw imported rows, auto-match by email or phone, and review outcomes for uncertain cases.
- Website booking import is not implemented yet, but the internal booking-shell types, paths, and `/admin/bookings` overview are now in place.
- Settings now holds lower-frequency master-data tools and a centralized backup and restore workspace instead of scattering import/export actions across the sidebar.
- Boat trip pricing is implemented for boat plus trip type retail price and optional owner contract price.
- Shared activity and date-range views are not implemented yet.
- Fish species master data is implemented with embedded subspecies rows for catch reporting.
- Captain daily fish catch reporting is implemented at /access/daily-reports as an early day-of reporting shell.
- Captain portal is not implemented yet beyond the basic signed-in access landing page.

## Build Order

### Milestone 0 - Admin Shell Stabilization
Goal:
- Ensure all `/admin` routes render within the intended shared admin shell and navigation.

Status:
- Complete.

### Milestone 1 - Boats CRUD v1
Goal:
- Implement real boat management.

Status:
- Complete.

### Milestone 2 - Lodge Rooms CRUD v1
Goal:
- Implement management of the 8 lodge rooms as first-class assets.

Status:
- Complete.

### Milestone 3 - Trip Types CRUD v1
Goal:
- Create admin-defined trip types and durations.

Status:
- Complete.

### Milestone 4 - Customers CRUD v1
Goal:
- Create the customer master record.

Status:
- Complete.

### Milestone 5 - Website Booking Import v1
Goal:
- Import website bookings from CSV while preserving raw source data first, then materializing booking groups and booking items safely.

Scope:
- CSV import flow
- import runs log
- raw imported row preservation for audit and debug
- bookingGroups
- bookingItems
- unresolved and match-status metadata where customer or trip-type linkage is uncertain
- support new bookings
- support modifications and cancellations by status changes
- idempotent upsert behavior where stable external IDs exist

Done when:
- admin can import website CSV data
- imported source rows are preserved before normalization
- imported data is preserved as raw booking groups and items without dropping unmapped fields
- uncertain matches survive import without unsafe forced links
- cancellations do not delete historical imported records

Out of scope:
- full trip assembly
- customer merge tooling

### Milestone 6 - Customers Square CSV Import v1
Goal:
- Reconcile Square customer exports into the customer master record with as much safe automation as possible.

Status:
- Core import flow complete.

Remaining follow-up:
- dedicated review and merge workflow
- longer-term sync decisions beyond CSV import

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
- boat plus trip type retail price
- boat plus trip type owner contract price
- captain plus trip type pay amount

Status:
- Boat trip type rate management complete.

Remaining follow-up:
- captain trip type pay amounts

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
- Marry imported booking items into complete operational trip and package contexts.

Scope:
- relationship handling across trip, lodge, and add-on items
- use booking-group data plus customer matching
- create admin-usable assembled trip views

Done when:
- admins can view complete package and trip contexts assembled from imported components

Out of scope:
- full scheduling engine
- full automation of every edge case

### Milestone 12 - Trips / Operational Records v1
Goal:
- Create the operational record tying together boat, captain, customer, trip type, and imported booking context.

Scope:
- trips collection
- trip references to bookingGroups and bookingItems where applicable
- snapshot preservation
- status fields

Done when:
- trips preserve historical snapshot values
- trips can support invoice and log integrations later

Out of scope:
- full booking engine
- maintenance workflow

### Milestone 13 - Trip Logs And Maintenance Logs v1
Goal:
- Add boat-centered operational logging.

Scope:
- trip logs
- maintenance logs
- default captain from boat primary captain
- allow manual override
- preserve scheduled versus actual snapshots

Done when:
- logs default correctly
- overrides are preserved
- historical snapshots are preserved

Out of scope:
- analytics dashboard
- public display

## Codex Working Rules For This Roadmap
- Work one milestone at a time unless a tightly bounded subtask clearly belongs to an in-progress milestone.
- Do not broaden scope inside a milestone without explicitly reordering the roadmap.
- Prefer targeted edits over broad refactors.
- Preserve existing working auth unless the milestone explicitly requires auth changes.
- Do not create a repo-root `src` folder.
- Use separate collections for first-class entities.
- Prefer deactivation over deletion.
- Preserve history with snapshots on operational records.





