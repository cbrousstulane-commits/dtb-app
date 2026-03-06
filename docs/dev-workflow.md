# DTB Admin Panel – Dev Workflow (Windows + VS Code + Firebase)

## Repo + App Links
- Repo: https://github.com/cbrousstulane-commits/dtb-app
- App Hosting (prod): https://dtb-app--dtb-admin-panel.us-east4.hosted.app
- Admin: https://dtb-app--dtb-admin-panel.us-east4.hosted.app/admin
- Admin config: https://dtb-app--dtb-admin-panel.us-east4.hosted.app/admin/config
- Auth test: https://dtb-app--dtb-admin-panel.us-east4.hosted.app/auth-test
- Login: https://dtb-app--dtb-admin-panel.us-east4.hosted.app/login

## Local Repo Location (canonical)
- Repo lives at: `C:\dev\dtb-app`

Open repo in VS Code:

    cd /d C:\dev\dtb-app
    code .

## Working directory rule
- App code edits belong under `apps\web\src\...`
- App commands run from `C:\dev\dtb-app\apps\web`
- Git and docs commands usually run from `C:\dev\dtb-app`
- Never create or edit a repo-root `src\` folder

## Project layout conventions
- Next.js App Router lives at: `apps\web\src\app`
- Shared UI/components live at: `apps\web\src\components`
- Firebase/browser utilities live at: `apps\web\src\lib`
- Scripts live at: `apps\web\scripts`
- Docs live at: `docs`
- The `@/…` import alias resolves into `apps\web\src\…`
- Do NOT create a second router root at `apps\web\app`
- Do NOT use `apps\web\components`
- Use `apps\web\src\components` only

## Repository map
Repo root:
- `C:\dev\dtb-app`

Primary app package:
- `apps\web`

App source root:
- `apps\web\src`

App Router pages:
- `apps\web\src\app`

Shared UI/components:
- `apps\web\src\components`

Firebase/browser utilities:
- `apps\web\src\lib`

Scripts:
- `apps\web\scripts`

Docs:
- `docs`

## Standard daily loop

### 1) Pull latest

    cd /d C:\dev\dtb-app
    git pull

### 2) Run locally

    cd /d C:\dev\dtb-app\apps\web
    npm run dev

Local URL:
- `http://localhost:3000`

### 3) Edit in VS Code

    cd /d C:\dev\dtb-app
    code .

### 4) Lint + build before any push

    cd /d C:\dev\dtb-app\apps\web
    npm run lint
    npm run build

### 5) Commit + push

    cd /d C:\dev\dtb-app
    git status
    git add -A
    git commit -m "Describe change"
    git push

## Required checks before any push
We do not push without both of these clean:

    cd /d C:\dev\dtb-app\apps\web
    npm run lint
    npm run build

## Documentation discipline
Update these whenever product direction, file structure, or completed work changes:
- `docs/roadmap.md`
- `docs/progress-log.md`

Quick open:

    cd /d C:\dev\dtb-app
    code docs\roadmap.md
    code docs\progress-log.md

## Before creating new files
1. Confirm current directory with `cd`
2. Confirm target folder exists with `dir`
3. Confirm the file belongs in `apps\web\src\...` and not repo-root `src\...`
4. After file creation, run `git status` from repo root

## After creating or moving files
Run:

    cd /d C:\dev\dtb-app
    git status

This is the fastest way to catch files accidentally created in the wrong directory.

## Important for creating files and avoiding copy/paste errors
Open files from the repo root using full repo-relative paths.

Example:

    cd /d C:\dev\dtb-app
    code apps\web\src\app\admin\captains\page.tsx

Run app validation from the app package directory:

    cd /d C:\dev\dtb-app\apps\web
    npm run build

## Current build surface
Current active product work is in:
- `apps\web\src\app\admin`
- `apps\web\src\components\admin`
- `apps\web\src\lib`

If new admin features are added, default to those locations unless there is a strong reason otherwise.

## Firebase: App Hosting vs Firebase CLI
### App Hosting (GitHub-connected)
- Builds and deploys the Next.js app automatically from GitHub pushes

### Firebase CLI (local machine)
- Used for Firestore rules/indexes
- Later may also be used for Functions

Repo contains:
- `.firebaserc`
- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`

Deploy Firestore rules/indexes:

    cd /d C:\dev\dtb-app
    firebase use <your-project-alias-or-id>
    firebase deploy --only firestore:rules,firestore:indexes

## Security model (current)
- Firestore rules are default deny
- `/admin/**` in Firestore is admin-only via Auth custom claim `admin: true`
- Client-side gating is UX-only
- Firestore rules are the real enforcement

## Admin claims bootstrap (one-time, local)
We use a local Node script to grant `admin: true` via Firebase Admin SDK.

Script:
- `apps\web\scripts\grant-admin.mjs`

Note:
- `firebase-admin` is installed in `apps\web`

Service account JSON must be stored outside the repo and never committed, for example:
- `C:\Users\chris\secrets\dtb-admin-panel-sa.json`

Run:

    cd /d C:\dev\dtb-app
    set "GOOGLE_APPLICATION_CREDENTIALS=C:\Users\chris\secrets\dtb-admin-panel-sa.json"
    set "ADMIN_EMAIL=<your-admin-email>"
    node apps\web\scripts\grant-admin.mjs

After success:
- Sign out of the web app
- Sign back in
- Confirm access at `/admin`
- Confirm claim visibility at `/auth-test`

## ESLint note
`.eslintignore` is deprecated in ESLint 9+.

Ignores live in:
- `apps\web\eslint.config.mjs`