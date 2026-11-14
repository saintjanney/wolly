# Wolly

A modular monorepo for the Go rebuild: independent web/Flutter frontend apps, a modular Go API/worker, explicit wire contracts, and isolated supporting adapters.

```
apps/                 storefront, creator-hub, backoffice, blog, reader
backend/go/           cmd/api, cmd/worker, internal domain modules, migrations
contracts/openapi/    implemented HTTP wire contract
packages/api-client/  shared web transport and generated DTOs
services/converter/   isolated manuscript conversion implementation
infra/local/          optional PostgreSQL development container
legacy/               excluded pre-rebuild UI/server/schema references
docs/development/     concrete workspace and module rules
docs/rebuild/         product scope, architecture, roadmap and release plan
```

Start the API with `make api`. In another terminal:

```
npm ci --ignore-scripts
npm run dev --workspace @wolly/creator-hub
```

Web apps use ports 3000–3003 (storefront, Creator Hub, Backoffice, blog). Each has its own README and server-only `.env.example`. Mobile uses its own Flutter package; see [reader setup](apps/reader/README.md).

The current app entry points verify Go API connectivity. Original screens are preserved in `legacy/apps` for per-feature porting; authentication, database persistence, publishing, payments, reading and profile flows are not implemented by this restructure. The API deliberately reports business readiness as unavailable and all capabilities disabled. This is not a replacement production release.

Use `make test`, `make check`, `make build` and the [workspace guide](docs/development/WORKSPACE.md) for commands, boundaries, contract generation, CI and later service extraction. No active Firebase runtime or automatic deployment remains. Nothing has been deployed and no external cloud resources have been changed.

Product decisions and release sequencing start in [the rebuild index](docs/rebuild/README.md). The current executable API/schema boundary is described in [SCHEMA.md](SCHEMA.md).
