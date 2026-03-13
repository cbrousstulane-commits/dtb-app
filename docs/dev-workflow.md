# DTB Admin Panel Dev Workflow

## Repo / App Roots
- Repo root: `C:\dev\dtb-app`
- App package root: `C:\dev\dtb-app\apps\web`

## Command Rules
- Run npm commands from `C:\dev\dtb-app\apps\web`
- Run git and repo-level doc commands from `C:\dev\dtb-app`
- Never create a repo-root `src` folder
- Always use full repo-relative paths when creating or editing files

## Before Starting Any New Task
1. Read:
   - `docs/roadmap.md`
   - `docs/progress-log.md`
   - `docs/dev-workflow.md`
2. Inspect the actual repo files relevant to the task before assuming scaffolds are complete.
3. Confirm the task is limited to a single roadmap milestone or a tightly bounded subtask.

## Codex Operating Rules
- One milestone or tightly bounded subtask per pass.
- Do not mix unrelated features in one pass.
- Prefer targeted edits over architecture rewrites.
- Preserve working authentication and route structure unless the task explicitly requires changes.
- Do not replace separate first-class entities with a generic inventory abstraction.
- Prefer active/inactive status over hard deletion.
- Preserve historical records with snapshot fields on operational records.
- Default admin browse and list pages to one-time reads, not realtime listeners.
- Use realtime listeners only for truly live operational screens where active updates matter.
- Light client caching is acceptable on admin browse pages if writes invalidate the cache.

## Required Output For Each Codex Task
Every coding task should end with:
- files changed
- what was implemented
- any assumptions made
- commands run
- build result
- lint result if run
- manual test path
- known follow-up issues

## Verification Rules
From `C:\dev\dtb-app\apps\web`:
- run `npm run build` before finalizing a milestone or meaningful subtask
- run other checks only if they already exist and are relevant

If a build fails:
- fix the failure before moving on
- do not leave the repo in a knowingly broken state

## Documentation Rules
After each milestone or meaningful subtask:
- update `docs/progress-log.md`
- update `docs/roadmap.md` if milestone status, order, or scope changed

## Architecture Guidance
- Website = forward-looking source of truth
- Admin app = retrospective operational source of truth
- Captains, boats, lodge rooms, customers, and trip types are first-class entities
- Boats, captains, and lodge rooms are inventory-like assets with quantity 1
- Lodge inventory is represented as 8 separate room records
- Historical logs and operational records must preserve snapshot values at time of entry
- Trip logs and maintenance logs should default to the boat's primary captain but allow override
- Imported booking data should be preserved first, then matched and assembled into operational views

## Data-Model Guidance
- Keep master records separate from imported booking records and operational records
- Use separate collections for:
  - master data
  - imported booking data
  - operational logs and records
- Do not assume one imported booking row equals one complete trip
- Do not force ambiguous customer matches into auto-merges
- Ambiguous matches should survive import and be reviewable later
- For import work:
  - preserve raw source rows before normalization
  - do not discard unmapped source fields during early import versions
  - do not force uncertain customer, trip-type, boat, or captain matches
- For customer imports:
  - matching email or phone may auto-reconcile
  - last-name-only similarity must go to review
  - preserve newly discovered alternate names under `additionalNames`
  - keep review noise deduplicated so the same anomaly is not repeatedly re-raised

## Firestore Read Guidance
- Avoid `onSnapshot` on full admin collections unless the screen is operationally live.
- Prefer one-time fetches for admin list pages such as customers, boats, captains, rooms, trip types, and settings-style tools.
- Cache short-lived list data only when it reduces repeated admin reads and can be invalidated after writes.
- Do not load full collections repeatedly just to support client-side paging or search if a lighter pattern will work.

## Current Priority
Follow the milestone order in `docs/roadmap.md`.

Immediate order:
1. Website Booking Import v1
2. Customer Review / Merge v1
3. Captain Trip Type Rates and remaining rate-table work
4. Shared Activity Views v1
5. Captain Access v1
6. Operational Trip Assembly v1
7. Trips / Operational Records v1
8. Trip Logs and Maintenance Logs v1
