# Rebuild workspace and module boundaries

Implemented structure, 14 November 2026. This is a buildable integration foundation, not a migration of all legacy product behavior. The Go API exposes only liveness, deliberately failing business readiness, and disabled capability metadata. There is no implemented authentication, database access, durable queue, payment, publishing or reader feature yet.

## Directory ownership

| Path | Owns | Independent workflow |
| --- | --- | --- |
| `apps/storefront` | Consumer web integration and future ebook/audio/web_text UX | npm workspace, port 3000 |
| `apps/creator-hub` | Creator/account publishing UX | npm workspace, port 3001 |
| `apps/backoffice` | Wolly staff UX, separate from customer organisation roles | npm workspace, port 3002 |
| `apps/blog` | Public channel routes/SSR over canonical title APIs | npm workspace, port 3003 |
| `apps/reader` | Native Flutter reader, separate platform dependency graph | Flutter pub/build/analyze/test |
| `backend/go/cmd/api` | API process lifecycle | `make api` |
| `backend/go/cmd/worker` | Worker lifecycle; no jobs enabled yet | `make worker` |
| `backend/go/internal/<domain>` | Module-owned rules, use cases, ports, adapters and future tables | `go test ./internal/<domain>/...` once code exists |
| `backend/go/internal/app` | Explicit in-process composition and HTTP route mounting | Only composition can wire multiple domain implementations |
| `backend/go/internal/platform` | Small config/HTTP infrastructure; no shared business entities | No domain-to-platform dependency from domain rules |
| `contracts/openapi` | Implemented versioned wire contract | Generate/check TS DTOs; future domain endpoints are planned in API_MAP, not falsely exposed here |
| `packages/api-client` | Framework-independent typed web transport, no business storage objects | Isolated transport tests and TS checking |
| `services/converter` | Retained pure manuscript conversion implementation/fonts/tests | Node adapter boundary, no cloud trigger or SDK |
| `infra/local` | Optional local PostgreSQL container with developer-owned credentials | Docker Compose; no schema or database readiness implied |
| `legacy` | Original UI/server/schema migration reference | Excluded from every active workspace/build/deployment |

Web modules have independent manifests, routes, configuration and entry points. They depend only on the API client, not each other's UI or server code. Feature implementations should use `src/features/<feature>` for presentation, use cases and API adapters. Flutter retains its own native toolchain and future repository/BLoC interfaces. The original feature screens have been preserved under `legacy/apps`; they are not silently claimed as working against Go.

## API integration

Start `make api`, then `npm run dev --workspace @wolly/creator-hub` (or another app). Browsers call the same-origin `/api/v1` proxy; the server reads `WOLLY_API_ORIGIN`. The current proxy allowlists only three read-only diagnostic endpoints. Business mutations/auth must be added with CSRF/origin checks, server-side session/token handling, User/account/profile context, timeout/errors and matching Go authorization. Do not widen it into an arbitrary upstream proxy. No credentials are put in browser configuration.

`GET /api/v1/health/live` returns 200. `GET /api/v1/health/ready` returns 503 because persistence/identity/jobs are not ready. `GET /api/v1/capabilities` returns the current disabled modules. Unknown endpoints return 404, not fake success or fabricated sample data. The capability pages show connectivity only; no product module is currently marked enabled.

The client package validates the current wire payload and uses finite timeouts. `npm run contracts:generate` derives TypeScript DTOs from OpenAPI; `contracts:check` fails on drift. Mobile uses a native adapter and contract-validation fixtures; generated business Dart DTOs are required when business contracts are introduced. Do not reuse the archived Firestore schema as new wire types.

## Go module structure and extraction

Use one Go module and one workspace entry initially. Domain modules are packages, not independent `go.mod` files and not separate services by default. This follows Go's `cmd`/`internal` conventions while preserving straightforward local tests and transactions. Do not create modules simply because a folder is named a domain.

A module adds `domain`, `application`, `transport/http`, `adapters` and owned `migrations` when real code needs them. Define consumer-owned interfaces at application boundaries; inject implementations in `internal/app`. Avoid global repositories, cross-domain table reads, shared mutable database structs or business logic in Next.js handlers. Boundary CI disallows direct cross-domain implementation imports. Module facades are wired by composition; domain rules do not import HTTP/config/storage.

For later extraction: keep stable application contracts and IDs; inventory consistency/authorization and failure assumptions; move the owning module and migrations behind a versioned API/event consumer; replace an in-process port with a transport adapter; introduce transactional outbox/inbox/idempotency and a reconciliation plan for cross-service changes; deploy independently and migrate ownership through one writer. Process extraction is work, not a folder move. Shared database transactions may need explicit redesign. No message broker, service mesh or per-module deployment is required now.

## Removed versus preserved

Removed active Firebase Hosting/Functions configuration, automatic deployment workflow, rules/indexes workspace, cloud operational scripts, project-bound mobile config, frontend/cloud SDK dependencies and converter cloud trigger. The root lockfile/workspaces must contain none of those removed packages. Old frontends/server behavior/schema are retained only as excluded reference so porting can preserve product semantics; their SDK imports are not installed or executed. Original rules/deployment files remain available in Git history.

No external infrastructure was deleted, deployed or changed. Existing production does not switch to these integration shells automatically. The branch's prior product contracts remain in docs/rebuild; any production migration still requires their explicit release gates.

## Verification and development commands

```
npm ci --ignore-scripts
make test
make check
make build
make smoke
```

Use Node 22.18+ (native TS stripping for transport tests), npm 10 and Go 1.26+. `make` sets a writable local Go build cache; override `GOCACHE` normally if desired. Root `go test ./...` is not the workspace command: use `cd backend/go && go test ./...` or `make test`.

Run mobile separately: `cd apps/reader && flutter pub get && flutter analyze && flutter test`. Debug emulator API origin uses `--dart-define=WOLLY_API_ORIGIN=http://10.0.2.2:8080`; physical devices require a reachable bind/HTTPS origin. Debug Android permits local HTTP; release must use HTTPS. iOS native files are scaffolding only, not a verified distribution path.

Optional database: copy `infra/local/.env.example` to `.env`, set a local password, then `make infra-up`. `make infra-down` stops the container without deleting its volume. No destructive reset target is provided. API database connectivity and migrations remain a subsequent slice. Docker CLI/daemon and native platform builds require their own local setup.

The converter is the deliberate Node exception to the business backend. It exports `convertManuscript`, the storage-independent conversion function; Go orchestration/private process protocol is future integration. Its full quality suite needs Chromium, Java/EPUBCheck and Poppler; CI installs them explicitly. Nothing fetches cloud credentials. Go container build context is `backend/go`, with `--build-arg SERVICE=worker` for the worker process.

## Future feature development

Use a roadmap release slice containing reader, creator and staff behavior. Implement domain rule/port, storage migration, HTTP contract/validation, web/mobile client and recovery/denial evidence together. Update capabilities only when the whole supported slice is ready. Document any source/renderer restriction; retain raw uploads and provenance. Commercial policy is free OR paid; paid allows lifetime, subscription, or both. The catalog's first implemented rule enforces that truth table, but no publication endpoint exists yet.

This branch is the explicitly requested `Go-Rebuild` workspace. No automatic deployment exists. Restore intentional, reviewed API/worker/web/mobile release pipelines only after isolated QA, database/job/auth readiness and migration evidence exist. See the release plan; its earlier deployment inspection is historical evidence now that the old workflow is removed.

`make smoke` starts temporary Go/Next.js processes, checks all four independent pages and proxies (including truthful 503/404 cases), and stops them. It requires completed web builds and local TCP permissions. It does not test product authorisation or business workflows that do not exist yet.
