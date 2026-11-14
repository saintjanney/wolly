# Restructure verification — 14 November 2026

Verified locally against the new workspace, not a deployed environment:

- Go race tests and vet: pass, including the commercial truth table and implemented OpenAPI operation/status/envelope checks.
- Contract drift and module boundary checks: pass.
- All six active npm workspace typechecks: pass.
- Four Next.js application production builds and converter TypeScript build: pass.
- Shared transport validation/error tests: 2 pass.
- Four built web apps exercised against a temporary Go server: page/proxy/capabilities, business readiness 503 and unknown-route 404 all pass. Temporary processes stopped afterward.
- Active Flutter reader: analyzer clean; capability parsing/version/type test passes. Native application IDs were restored to their original values; no APK/iOS build or physical-device reading/playback/distribution is claimed.
- Converter regression fixtures: 61 tests pass with a real local Chromium. EPUBCheck and Poppler suites skip locally because those tools are absent; the separate CI converter job installs and runs them. Full rendition validation is not claimed from the partial local environment.
- Clean dependency installation reports zero npm vulnerabilities at this snapshot. Root overrides select patched PostCSS/minimatch versions; converter lint passes with the resolved graph. Re-audit when dependencies change.
- Active package lock contains no Firebase/Firestore SDK packages. File-link and whitespace checks pass. Legacy migration reference is deliberately outside the active dependency graph.

Not exercised locally: Docker/PostgreSQL (Docker CLI unavailable), production signing/hosting, authentication, storage, queues, business endpoints, provider payments or end-to-end legacy feature migration. Those capabilities are not implemented/advertised as ready. CI definitions were authored but no remote Actions run was triggered by this task.
