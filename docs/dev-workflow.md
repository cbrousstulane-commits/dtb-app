# DTB Admin Panel – Dev Workflow (Windows + VS Code + Firebase)

## Repo + App Links
- Repo: https://github.com/cbrousstulane-commits/dtb-app
- App Hosting (prod): https://dtb-app--dtb-admin-panel.us-east4.hosted.app
- Admin: https://dtb-app--dtb-admin-panel.us-east4.hosted.app/admin
- Admin config: https://dtb-app--dtb-admin-panel.us-east4.hosted.app/admin/config
- Auth test: https://dtb-app--dtb-admin-panel.us-east4.hosted.app/auth-test
- Login: https://dtb-app--dtb-admin-panel.us-east4.hosted.app/login

## Local Repo Location (canonical)
- Repo lives at: C:\dev\dtb-app

Open repo in VS Code:
    cd /d C:\dev\dtb-app
    code .

## Project layout conventions (important)
- Next.js App Router lives at: apps\web\src\app
- Shared UI/components live at: apps\web\src\components
- The @/… import alias resolves into: apps\web\src\…
- Do NOT create a second router root at apps\web\app (causes duplicate routing + module resolution issues)
- Do NOT use apps\web\components (use apps\web\src\components only)

## Required checks before any push
We do not push without both of these clean:
    cd /d C:\dev\dtb-app\apps\web
    npm run lint
    npm run build

## Standard daily loop
### 1) Pull latest
    cd /d C:\dev\dtb-app
    git pull

### 2) Run locally
    cd /d C:\dev\dtb-app\apps\web
    npm run dev
Local URL: http://localhost:3000

### 3) Edit in VS Code
    cd /d C:\dev\dtb-app
    code .

### 4) Lint + build (required)
    cd /d C:\dev\dtb-app\apps\web
    npm run lint
    npm run build

### 5) Commit + push
    cd /d C:\dev\dtb-app
    git status
    git add -A
    git commit -m "Describe change"
    git push

## Documentation discipline (every session)
Every session ends with updates to:
- docs/roadmap.md
- docs/progress-log.md

Quick open:
    cd /d C:\dev\dtb-app
    code docs\roadmap.md
    code docs\progress-log.md

## Firebase: App Hosting vs Firebase CLI (important distinction)

### App Hosting (GitHub-connected)
- Builds/deploys the Next.js app automatically from GitHub pushes.

### Firebase CLI (local machine)
- Used for Firestore rules/indexes (and later Functions).
Repo contains:
- .firebaserc
- firebase.json
- firestore.rules
- firestore.indexes.json

Deploy Firestore rules/indexes:
    cd /d C:\dev\dtb-app
    firebase use <your-project-alias-or-id>
    firebase deploy --only firestore:rules,firestore:indexes

## Security model (current)
- Firestore rules are default deny.
- /admin/** in Firestore is admin-only via Auth custom claim: admin: true.
- Client-side gating is UX-only; Firestore rules are the real enforcement.

## Admin claims bootstrap (one-time, local)
We use a local Node script to grant admin: true via Firebase Admin SDK.

- Script: apps\web\scripts\grant-admin.mjs
- firebase-admin is installed in apps\web

Service account JSON must be stored outside the repo (DO NOT COMMIT), e.g.:
- C:\Users\chris\secrets\dtb-admin-panel-sa.json

Run:
    cd /d C:\dev\dtb-app
    set "GOOGLE_APPLICATION_CREDENTIALS=C:\Users\chris\secrets\dtb-admin-panel-sa.json"
    set "ADMIN_EMAIL=<your-admin-email>"
    node apps\web\scripts\grant-admin.mjs

After success:
- Sign out of the web app
- Sign back in (ID token picks up the claim)
- Confirm access at /admin and claim visibility at /auth-test

## ESLint ignores (current)
.eslintignore is deprecated (ESLint 9+). Ignores live in:
- apps\web\eslint.config.mjs