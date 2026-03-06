# DTB Admin Panel – Dev Workflow (Windows + VS Code + Firebase)

## Repo + App Links
- Repo: https://github.com/cbrousstulane-commits/dtb-app
- App Hosting (prod): https://dtb-app--dtb-admin-panel.us-east4.hosted.app
- Admin: https://dtb-app--dtb-admin-panel.us-east4.hosted.app/admin
- Auth test: https://dtb-app--dtb-admin-panel.us-east4.hosted.app/auth-test
- Admin config: https://dtb-app--dtb-admin-panel.us-east4.hosted.app/admin/config

## Local Repo Location (canonical)
- Repo lives at: `C:\dev\dtb-app`

Open repo in VS Code:
```bat
cd /d C:\dev\dtb-app
code .
```

## Core rule: build before push
We do **not** push without a clean build.

```bat
cd /d C:\dev\dtb-app\apps\web
npm run build
```

## Standard daily loop

### 1) Pull latest
```bat
cd /d C:\dev\dtb-app
git pull
```

### 2) Run locally
```bat
cd /d C:\dev\dtb-app\apps\web
npm run dev
```
- Local URL: http://localhost:3000

### 3) Edit in VS Code
```bat
cd /d C:\dev\dtb-app
code .
```

### 4) Build (required)
```bat
cd /d C:\dev\dtb-app\apps\web
npm run build
```

### 5) Commit + push
```bat
cd /d C:\dev\dtb-app
git status
git add .
git commit -m "Describe change"
git push
```

## Documentation discipline (every chat)
Every session ends with updates to:
- `docs/roadmap.md`
- `docs/progress-log.md`

Quick open:
```bat
cd /d C:\dev\dtb-app
code docs\roadmap.md
code docs\progress-log.md
```

## Firebase: App Hosting vs Firebase CLI (important distinction)

### App Hosting (GitHub-connected)
- Builds/deploys the Next.js app automatically from GitHub pushes.
- This is how the hosted URL stays updated.

### Firebase CLI (local machine)
- Used for Firestore rules/indexes (and later Functions).
Repo contains:
- `.firebaserc`
- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`

Deploy Firestore rules/indexes:
```bat
cd /d C:\dev\dtb-app
firebase use
firebase deploy --only firestore
```

## Security model (current)
- Firestore rules are **default deny**.
- `/admin/**` is **admin-only** via Auth custom claim: `admin: true`.
- Client-side gating is for UX only; Firestore rules are the true enforcement.
- `/auth-test` shows whether the signed-in user has `admin: true`.

## Admin claims bootstrap (one-time, local)
We use a local Node script to grant `admin: true` via Firebase Admin SDK:

- Script: `apps\web\scripts\grant-admin.mjs`
- Dependency: `firebase-admin` installed in `apps\web`

Service account JSON must be stored outside the repo (DO NOT COMMIT), e.g.:
- `C:\Users\chris\secrets\dtb-admin-panel-sa.json`

Run:
```bat
cd /d C:\dev\dtb-app
set "GOOGLE_APPLICATION_CREDENTIALS=C:\Users\chris\secrets\dtb-admin-panel-sa.json"
set "ADMIN_EMAIL=cbrousstulane@gmail.com"
node apps\web\scripts\grant-admin.mjs
```

After success:
- Sign out of the web app
- Sign back in (so the ID token includes the claim)
- Confirm at `/auth-test`

## Editor/tooling (monorepo specifics)
If VS Code shows “squiggles” even when build succeeds:
- Open `apps\web` as a workspace root:
```bat
cd /d C:\dev\dtb-app
code apps\web
```

Repo includes:
- `.vscode/settings.json` (forces ESLint/TS to resolve from `apps\web`)
- `apps/web/.eslintignore` (prevents ESLint from linting `.next`, etc.)

## Secrets + safety rules
- Never commit service account keys or secrets.
- Do not store “security” in `NEXT_PUBLIC_*` env vars (they ship to the browser).
- `.gitignore` includes patterns to avoid committing secrets.

## Mobile-first UI (next focus)
All admin UI work should be optimized for mobile:
- Mobile-first layout (single-column, large tap targets, sticky top nav)
- Readable typography and spacing
- Minimal forms (labels above inputs)
- Avoid horizontal scrolling; use responsive tables/cards
- Prefer cards/lists with inline edit links
- Keep primary actions visible (sticky action bar on mobile)

Recommended process:
1) Define base layout + nav (mobile first)
2) Create reusable UI primitives (Button, Input, Card, Section header)
3) Apply across Admin pages (Config → Boats → Customers → Trips)