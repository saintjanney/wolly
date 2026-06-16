# CLAUDE.md

Guidance for Claude Code (and other agents) working in this repository.

## What this is

Wolly is a book publishing & reading platform. This is a monorepo of all its
surfaces plus the shared contracts that keep them in sync:

```
apps/reader/        Flutter app — readers browse & read books (BLoC state mgmt)
apps/creator-hub/   Next.js — authors create, publish & track books
apps/backoffice/    Next.js — staff moderation & publishing workflow
packages/schema/    Canonical Firestore types — SINGLE SOURCE OF TRUTH (TS)
packages/firebase-config/  Shared firestore.rules, storage.rules, indexes
```

All surfaces share one Firebase project (`wolly-1133d`): Auth, Firestore, Storage.

## Working with the code

- JS apps & packages use **npm workspaces + Turborepo**: `npm install`, then
  `npm run dev|build|lint`. The Flutter `reader` is **not** in the npm workspace
  — use `flutter` from `apps/reader/`.
- The reader uses the **BLoC** pattern for state management — keep new reader
  state in BLoC + Repository, not ad-hoc providers.

## The shared contract (read before touching Firestore)

The reader and creator-hub read/write the same collections, so shapes must not
drift. Document shapes live once in `@wolly/schema`; `SCHEMA.md` is the canonical
human-readable reference and the Dart models mirror it. Books are stored in the
**`epubs`** collection; the creator-hub writes the reader-contract fields so
published books appear in the reader. If you change a shape, change `@wolly/schema`,
`SCHEMA.md`, and the Dart model in the same commit.

## Branching & deploys

- Work only on `develop` or `main` — do **not** create feature or `claude/*`
  branches.
- `develop` → **mock** environment, `main` → **prod**.
- CI (`.github/workflows/deploy.yml`) deploys web surfaces to their Firebase
  Hosting targets and distributes the Android reader APK via Firebase App
  Distribution. The service-account JSON is the GitHub secret
  `FIREBASE_SERVICE_ACCOUNT` — never commit credentials.

## Commit & PR rules

- **Never** add any mention of Claude, AI, or co-authorship to git commits or
  pull requests. No `Co-Authored-By: Claude …` trailer, no "Generated with
  Claude Code" line, no AI attribution anywhere in commit messages or PR bodies.
  Write commit/PR text as a normal human author would.
