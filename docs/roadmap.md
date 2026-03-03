\# DTB App Roadmap



\## Vision

\- Ingest new WP Booking System bookings into Firebase as they are created.

\- Captains log trip ops (fuel, engine hours, catch, cancellations).

\- Reschedule workflow for cancelled trips.

\- Square invoices (deposit + final) created from app; auto-close when paid.

\- Lodge bookings + all-inclusive purchases views.

\- CSV exports (single booking, captain/date range, all activity/date range).



\## Stack / Constraints

\- Web: Next.js (apps/web)

\- Auth: Firebase Auth (Google login)

\- DB: Firestore

\- Backend: Cloud Functions

\- Source: WordPress + WP Booking System

\- Payments: Square (single account/location)

\- Repo: https://github.com/cbrousstulane-commits/dtb-app



\## Phases

1\. Repo + web scaffold ✅

2\. Firebase project init + local emulators + deploy pipeline

3\. Auth + roles (admin/captain) + Firestore rules

4\. Bookings ingestion endpoint + WP hook

5\. Captain views + trip logging

6\. Admin views + cancellations/reschedule queue

7\. Square invoice create + Square webhook

8\. Exports (CSV) + admin tools

9\. Lodge + purchases



\## Current Focus

Phase 2: Firebase initialization + basic deploy of web app.



\## Next 3 Tasks

1\. Create Firebase project + initialize firebase.json, Firestore, Functions, Hosting.

2\. Add Google Auth and a minimal login page in apps/web.

3\. Create Firestore rules skeleton for captain/admin access control.



\## Open Questions

\- WP Booking System: confirm which add-ons are in use (Booking Manager?) and which fields are available on submission.

\- Captain assignment source: from WP booking form field vs set by admin in app?

- Guardrails: Use VS Code for edits; require `npm run build` before every push; update `docs/dev-workflow.md` + progress log at end of each chat.