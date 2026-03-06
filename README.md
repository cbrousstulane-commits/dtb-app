# DTB Admin Panel (DTB App)

Admin panel for Down the Bayou Charters operations: boats, customers, trips, bookings, payments, and maintenance.

## Links
- Repo: https://github.com/cbrousstulane-commits/dtb-app
- Prod: https://dtb-app--dtb-admin-panel.us-east4.hosted.app
- Admin: https://dtb-app--dtb-admin-panel.us-east4.hosted.app/admin
- Config: https://dtb-app--dtb-admin-panel.us-east4.hosted.app/admin/config
- Auth test: https://dtb-app--dtb-admin-panel.us-east4.hosted.app/auth-test
- Login: https://dtb-app--dtb-admin-panel.us-east4.hosted.app/login

## Local development (Windows)
    cd /d C:\dev\dtb-app\apps\web
    npm install
    npm run dev

## Required checks before pushing
    cd /d C:\dev\dtb-app\apps\web
    npm run lint
    npm run build

## Repo layout
- apps/web — Next.js app (App Router in apps/web/src/app)
- docs — workflow notes, roadmap, progress log
- firestore.rules / firestore.indexes.json — Firestore security + indexes

## Security model
- Firestore is default deny.
- /admin/** requires Firebase Auth custom claim admin: true.
- Local script to set claim: apps/web/scripts/grant-admin.mjs
  (requires service account JSON via GOOGLE_APPLICATION_CREDENTIALS).
