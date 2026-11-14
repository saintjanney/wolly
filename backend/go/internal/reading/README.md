# reading

Owns: Profile-owned reading/listening state, bookmarks and library projections.

Implementation roadmap: B4. Apart from explicitly implemented files, this is a module boundary, not a completed feature.

Add domain rules under `domain/`, use cases and consumer-owned ports under `application/`, HTTP handlers under `transport/http/`, and storage/provider implementations under `adapters/` when the feature needs them. Module-owned SQL migrations belong under `migrations/` and may not alter another module's tables. No empty interface or duplicate generic repository is required.

Export an intentional application facade for composition. Other modules must not import this module's adapters, transport or private domain implementation. The application composition root wires facades through narrow interfaces; pass stable IDs/DTOs, never shared mutable database models. Durable cross-module events are versioned and dispatched through an outbox when implemented. Extract to a process only after defining consistency, idempotency, auth and failure behavior.
