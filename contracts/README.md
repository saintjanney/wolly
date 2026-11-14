# API contracts

`openapi/wolly.v1.json` describes implemented endpoints only. The broader proposed API remains in `docs/rebuild/API_MAP.md`. Changing the spec requires corresponding handler/consumer validation and tests, not just adding a proposed route.

Run `npm run contracts:generate` and `npm run contracts:check` to update/check TypeScript wire DTOs. Add code generation support explicitly when introducing schema constructs not handled by the current small generator. Mobile currently validates the capability payload through native parsing fixtures; introduce generated/verified Dart business DTOs with the first business endpoints.

Errors and unsupported requests must remain explicit; future identity, account/profile, permissions, CSRF, idempotency and provider contracts require their roadmap acceptance before enabled business operations. Contract versioning is independent of database schemas and frontend package versions.
