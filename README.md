# Wolly Platform (monorepo)

Wolly is a book publishing & reading platform. This monorepo contains all of its
surfaces plus the shared contracts that keep them in sync.

```
wolly/
├── apps/
│   ├── reader/         # Flutter mobile/web app — readers browse & read books (BLoC)
│   ├── creator-hub/    # Next.js web app — authors create, publish & track books
│   └── backoffice/     # Next.js web app — staff moderation / publishing workflow (Phase 5)
├── packages/
│   ├── schema/         # Canonical Firestore types — SINGLE SOURCE OF TRUTH (TS)
│   └── firebase-config/# Shared firestore.rules, storage.rules, firestore.indexes.json
├── firebase.json       # Unified multi-site Firebase Hosting + Firestore/Storage rules
└── SCHEMA.md           # Human-readable schema contract (mirrored into the Dart reader)
```

All apps share one Firebase project (`wolly-1133d`): Auth, Firestore, Storage.

## Tooling

- **JS apps & packages** (`apps/creator-hub`, `apps/backoffice`, `packages/*`) are
  managed with **npm workspaces + Turborepo**. The Flutter `reader` app is *not*
  part of the npm workspace — it uses its own `pub`/`flutter` toolchain.

```bash
npm install          # install all JS workspace deps
npm run dev          # turbo: run dev for all JS apps
npm run build        # turbo: build all JS apps
npm run lint         # turbo: lint all JS apps
```

For the reader:

```bash
cd apps/reader
flutter pub get
flutter run
```

## The shared contract

The reader and creator-hub both read/write the same Firestore collections. To stop
the two apps from drifting (a real bug we hit: the hub wrote a `books` collection
the reader never read), the document shapes live in **one place**:

- TypeScript apps import them from `@wolly/schema`.
- The Dart reader mirrors them; `SCHEMA.md` is the canonical human-readable reference.

Books published in the Creator Hub are written to the **`epubs`** collection in the
shape the reader expects, so they appear in the reader immediately.

## Deployment

Hosting uses Firebase multi-site targets (`reader`, `creator-hub`, `backoffice`).
The site IDs in `.firebaserc` (`wolly-reader`, `wolly-creator-hub`, `wolly-backoffice`)
are placeholders — create the matching Hosting sites in the Firebase console (or
adjust the IDs) before the first `firebase deploy`.
