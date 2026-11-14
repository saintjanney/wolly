# Creator Hub

Independent Next.js application, port 3001. From the root: `npm run dev --workspace @wolly/creator-hub`. Start the Go API first with `make api`. `.env.example` documents its server-side API origin; do not expose secrets through browser configuration.

`src/app/` owns routes/UI; add functionality under `src/features/<feature>/` with view/application/API adapters. Share only the versioned transport client, never another app's components or backend storage models. The current capability page and read-only same-origin proxy are integration scaffolding, not migrated product screens. Unsupported requests fail explicitly.

Original screens are preserved at `../../legacy/apps/creator-hub` for deliberate per-feature porting. Production authentication, CSRF, scoped profiles, account-context handling and endpoints must land together before business proxy routes are enabled. This scaffold has no browser tokens, cloud SDK or direct database access.
