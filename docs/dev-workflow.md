# DTB Admin Panel – Dev Workflow (Windows + VS Code + Firebase)

## Repo + App Links
- Repo: https://github.com/cbrousstulane-commits/dtb-app
- App Hosting (prod): https://dtb-app--dtb-admin-panel.us-east4.hosted.app
- Admin route: https://dtb-app--dtb-admin-panel.us-east4.hosted.app/admin

## Local Repo Location (canonical)
- Repo lives at: `C:\dev\dtb-app`
- Always start from that path in Command Prompt.

### Open repo in VS Code
```bat
cd /d C:\dev\dtb-app
code .
```

## Core rule: build before push
We **do not push** without running a clean build first.

```bat
cd /d C:\dev\dtb-app\apps\web
npm run build
```

If build fails: fix it before committing/pushing.

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

### 3) Make changes in VS Code
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
Every session should end with updates to:
- `docs/roadmap.md`
- `docs/progress-log.md`

Open quickly:
```bat
cd /d C:\dev\dtb-app
code docs\roadmap.md
code docs\progress-log.md
```

## Firebase setup notes (what lives where)

### App Hosting (GitHub-connected)
- App Hosting builds/deploys the Next.js app from GitHub pushes.
- This is separate from Firebase CLI deployments (rules/indexes/functions).

### Firebase CLI (local machine) – used for rules/indexes/functions
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

## Firestore security model (current)
- Firestore rules are **default deny**.
- `/admin/**` requires Firebase Auth custom claim: `admin: true`.
- `/users/{uid}` is readable/writable by the user (and admins).

## Admin claims bootstrap (one-time, local)
We use a local Node script to grant `admin: true` via Firebase Admin SDK:

- Script: `apps\web\scripts\grant-admin.mjs`
- Dependency: `firebase-admin` is installed in `apps\web`

### Required local secret (DO NOT COMMIT)
Service account JSON should be stored outside the repo, e.g.:
- `C:\Users\chris\secrets\dtb-admin-panel-sa.json`

### Run the script
```bat
cd /d C:\dev\dtb-app
set "GOOGLE_APPLICATION_CREDENTIALS=C:\Users\chris\secrets\dtb-admin-panel-sa.json"
set "ADMIN_EMAIL=your.actual.google.email@gmail.com"
node apps\web\scripts\grant-admin.mjs
```

After success:
- Sign out of the web app
- Sign back in (or force token refresh) so the claim is present in the client ID token.

## Secrets + safety rules
- Never commit service account keys, API keys, or private secrets.
- Do not store “security” in `NEXT_PUBLIC` env vars:
  - `NEXT_PUBLIC_*` is shipped to the browser.
- Keep local secrets outside repo folders (ex: `C:\Users\chris\secrets\...`).

## Troubleshooting quick hits

### VS Code CLI
If `code` ever breaks, reinstall the VS Code shell command:
- VS Code → Ctrl+Shift+P → “Shell Command: Install 'code' command in PATH”

### Windows line endings warnings
Git may warn about LF/CRLF conversions on Windows. This is expected and not blocking.