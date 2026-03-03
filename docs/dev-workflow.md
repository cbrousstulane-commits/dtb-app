# DTB Admin Panel – Dev Workflow (Directive)

## Editor
Use VS Code for all code/config edits (TS/TSX/YAML/JSON/MD).
Open repo:
- `code .`

## File editing rule (Windows)
Prefer VS Code:
- `code <path>`
Fallback:
- `notepad <path>`

Avoid multi-line PowerShell/cmd “file write” one-liners for TSX/YAML content (quoting/newline corruption risk).

## Pre-push checklist (required)
From repo root:

1) Build check (required):
- `cd apps/web`
- `npm run build`

2) Lint check (recommended; add if/when configured):
- `npm run lint`

3) Git hygiene:
- `git status` (confirm no accidental/untracked junk files)

4) Commit + push:
- `git add <paths>`
- `git commit -m "<message>"`
- `git push`

## Deployment
Firebase App Hosting is GitHub-connected:
- Push to `main` → App Hosting builds + deploys automatically.

If production looks stale:
- Check App Hosting build status/logs for the latest commit SHA.

## Secrets / public repo rules
- Never commit `.env.local` or other secret env files.
- `NEXT_PUBLIC_*` Firebase web config values are okay to commit (they are public client config).