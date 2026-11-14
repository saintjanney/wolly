# Wolly contracts and schema ownership

The implemented HTTP contract is [OpenAPI v1](contracts/openapi/wolly.v1.json). It currently defines liveness, unavailable business readiness and disabled capabilities only. Web DTOs derive from it in `packages/api-client`; native reader parsing is verified with explicit wire fixtures. Add generated/verified Dart business DTOs when business contracts are introduced.

Proposed domain schemas are documented in [entity relationships](docs/rebuild/ENTITY_RELATIONSHIPS.md), [accounts](docs/rebuild/ACCOUNTS_AND_USER_GROUPS.md), [profiles](docs/rebuild/READER_PROFILES_AND_HOUSEHOLDS.md) and [commercial policy](docs/rebuild/CONTENT_OFFERS_AND_SUBSCRIPTIONS.md). Proposed entities are not yet persisted SQL tables or public endpoints. Module-owned SQL migrations and a runner are required before database readiness is enabled.

The historical Firestore shape documentation is preserved at [legacy/SCHEMA.md](legacy/SCHEMA.md), with original TypeScript/Dart models under `legacy/packages/schema` and `legacy/apps/reader`. It is migration evidence, not an active package or new API schema. No existing Firestore document was changed or deployed by this branch restructure.

Every wire change updates OpenAPI, generated/verified clients, Go handlers and contract tests together. Every SQL change owns a versioned migration and authorization/concurrency evidence. No frontend imports storage models or accesses the database directly. See [workspace boundaries](docs/development/WORKSPACE.md).
