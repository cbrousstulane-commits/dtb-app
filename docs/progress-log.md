# DTB App Progress Log

## 2026-02-26
### Completed
- Created local repo and pushed to GitHub
- Created Next.js app in apps/web (TypeScript, App Router, Tailwind)
- Verified dev server runs locally

### Next Step
- Initialize Firebase (Firestore + Hosting) in this repo

---

## 2026-03-03
### Completed
- Firebase App Hosting configured and deploying from GitHub
- Google Auth working in the hosted app
- Firestore created; rules deployed (default deny; /admin/** requires admin: true)
- Added admin-claim bootstrap script: apps/web/scripts/grant-admin.mjs
- Added /admin/config page to manage Firestore doc admin/config

### Next Step
- Add a shared admin layout and begin mobile-first UI pass

---

## 2026-03-05
### Completed
- Added mobile-first Admin shell scaffolding:
  - AdminLayoutClient (claim gate) + AdminShell (header/nav/menu)
  - /admin/* wrapped by src/app/admin/layout.tsx
- Standardized ESLint on flat config (apps/web/eslint.config.mjs) and removed legacy .eslintignore
- Confirmed repo conventions:
  - App Router lives in apps/web/src/app
  - Components in apps/web/src/components
  - @/… resolves into apps/web/src/…
- Verified npm run lint and npm run build clean; pushed updates to main

### Next Step
- Update /auth-test to show ID token claims clearly and support token refresh
- Convert /admin landing into a real mobile dashboard
- Start Boats CRUD using Firestore path admin/data/boats/{boatId}