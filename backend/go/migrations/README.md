# Migration ownership

No production schema or migration runner exists yet. Add versioned, forward SQL migrations with explicit owning module and an integration-tested runner before persistence is enabled. One database can hold per-domain schemas, but no module may query another module's tables or create cross-domain storage coupling without an explicit architecture decision. Keep transactional invariants inside an owning module; extraction may require a saga/outbox rather than simply moving folders. Do not claim readiness based on the local database container starting.
