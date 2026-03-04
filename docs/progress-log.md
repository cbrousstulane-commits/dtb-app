# DTB App Progress Log

## 2026-02-26
### Completed
- Created local repo at `C:\Users\chris\Desktop\dtb-app`
- Initialized Git and pushed to GitHub:
  - https://github.com/cbrousstulane-commits/dtb-app
- Created Next.js app:
  - `apps/web` (TypeScript, App Router, Tailwind)
- Verified dev server:
  - `npm run dev`
  - http://localhost:3000

### Current Status
- Repo + web scaffold in place, running locally.

### Next Step
- Initialize Firebase (Firestore + Functions + Hosting) in this repo and connect to a new Firebase project.

---

## 2026-03-03
### Completed
- Confirmed VS Code CLI works from CMD (`code` command on PATH).
- Confirmed App Hosting deployment is live:
  - https://dtb-app--dtb-admin-panel.us-east4.hosted.app
- Firebase CLI connected to project `dtb-admin-panel`.
- Initialized Firestore via Firebase CLI and created default Firestore database.
- Added and deployed Firestore rules + indexes (repo-tracked):
  - `.firebaserc`
  - `firebase.json`
  - `firestore.rules` (default deny; `/admin/**` requires `admin: true` claim)
  - `firestore.indexes.json`
- Added admin-claim bootstrap script (local execution):
  - `apps/web/scripts/grant-admin.mjs`
- Installed Admin SDK dependency in `apps/web`:
  - `firebase-admin` (dev dependency)
- Moved repo to canonical dev location:
  - from `C:\Users\chris\Desktop\dtb-app`
  - to `C:\dev\dtb-app`

### Current Status
- Next.js App Router app deployed; Google Auth working.
- `/admin` route still needs to be gated by **custom claim** (client UX) instead of `NEXT_PUBLIC_ADMIN_EMAILS`.
- Firestore is live with enforced rules; `/admin/**` is protected server-side.

### Next Step (immediate)
1. Download service account JSON for `dtb-admin-panel` and store locally (NOT in repo):
   - `C:\Users\chris\secrets\dtb-admin-panel-sa.json` (or equivalent)
2. Run:
   - `node apps/web/scripts/grant-admin.mjs`
   - Set `admin: true` claim for primary Google login
3. Update `/admin` gating to check `token.claims.admin === true` (remove public allowlist gating).
4. Create initial config doc:
   - `/admin/config/app`
5. Define v0 data model collections under `/admin/**` and begin building admin UI pages.