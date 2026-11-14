# Wolly — agent working agreement

## Branching & deploys

- The user explicitly authorised the `Go-Rebuild` branch for this rebuild. Stay on it for this work; do not create additional feature branches.
- `develop` / `main` remain future integration/release branches. The old automatic cloud deployment has been removed; no deployment is implied by this scaffold.
- Independent frontend modules live in `apps/`; Go modules live in `backend/go`. Follow `docs/development/WORKSPACE.md` and the API contract in `contracts/openapi`.

## Commit & PR rules

- **Never** add any mention of Claude, AI, or co-authorship to git commits or
  pull requests. No `Co-Authored-By: Claude …` trailer, no "Generated with
  Claude Code" line, no AI attribution anywhere in commit messages or PR bodies.
  Write commit/PR text as a normal human author would.

## Secrets

- Never commit credentials. Use ignored environment files and externally managed production secrets. Legacy reference code must not be deployed.

## Contracts and module ownership

- OpenAPI is the executable HTTP contract; update Go handlers and generated/verified web/Dart wire models together.
- SQL migrations are owned by a backend domain; frontend apps never access the database or import archived storage shapes.
- Keep `legacy/` outside active builds. Use it only to port behavior behind the API.
- Run contract drift and module boundary checks plus relevant Go/web/Flutter verification for changes.
