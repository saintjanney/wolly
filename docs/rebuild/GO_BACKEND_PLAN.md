# Go backend rebuild: implementation and learning plan

These milestones are proposed work, not implemented functionality. Follow [the architecture](ARCHITECTURE.md) and [API map](API_MAP.md); integrate the existing clients throughout using [the client plan](CLIENT_INTEGRATION_PLAN.md). A milestone may take several sessions. Do not put a fixed date on a full rebuild before measuring the first slices.

The [title and digital-media specification](TITLES_AND_DIGITAL_MEDIA.md) extends this plan with ebook/audio scope and acceptance cases. Implement title/delivery/edition separation from B1; ebook-only learning slices are not audio completion. Physical books are excluded.

## Working conventions

Build under `backend/go/`; retain current applications/services for comparison. Follow the repository agreement: work on `develop` or `main`, do not create feature branches, and do not push merely to share a draft because those branches trigger deployments. Never copy production credentials or payment data into fixtures.

Start with handlers calling domain services that use explicit SQL. Add an interface when a real boundary needs a replacement, particularly payment, email, SMS, file storage and conversion adapters. Use real local PostgreSQL; fake external networks rather than the database or authorization result. Commands below become available when their associated project/milestone is built.

## B0 — Learn basic Go and serve a response

**Learn:** modules, packages, functions, structs, JSON encoding, returned errors and HTTP handlers.

**Build:** `cmd/api`, configuration for listen address, graceful shutdown, `GET /health/live`. Add a minimal Go module and README with exact local startup instructions. Use a supported pinned Go toolchain at implementation time.

**Done when:** a local HTTP request receives the expected JSON; an unknown path returns a proper 404; stopping the server closes it cleanly. No database or frontend rebuild is needed for this first task.

## B1 — HTTP contract, PostgreSQL, migrations and durable work foundation

**Learn:** context/deadlines, SQL rows, keys/indexes, migrations, transactions, basic testing.

**Build:** local PostgreSQL configuration, explicit migration command, readiness endpoint, standard error/validation envelope, request IDs, pagination conventions and OpenAPI examples. Introduce durable audit/outbox/idempotency tables and worker job claiming before the first operation depends on asynchronous work. Local files and inspectable email/SMS outbox adapters must be available by B2; actual dispatch is a worker responsibility.

**Done when:** fresh DB setup and restart preserve records; failed transaction leaves no half-write; unavailable DB changes readiness; job lease recovery and deduplication survive a worker crash. A Next.js page can call the Go readiness/capabilities endpoint through its local same-origin proxy.

## B2 — Identity, sessions and permissions

**Learn:** middleware, hashing through vetted libraries, unique constraints, sessions, authorization and single-use state.

**Read:** reader auth repository/screens; Creator Hub AuthContext; blog AuthProvider/session route; Backoffice login/page; user rules and legacy user-field adapters.

**Build in smaller substeps:** email/password registration/login/reset and email verification; browser cookie/CSRF session restore/logout; mobile access/rotating refresh sessions; phone OTP; email magic links/deep links; Google OAuth/OIDC and explicit identity linking; staff permissions, step-up/MFA, bootstrap and session revocation. Normalize first/last name, DOB, phone, persona, preferences and creator onboarding. Add safe public-author DTOs and private profile allowlists.

**Done when:** a reader and creator can use one identity; all retained login methods work through test adapters/provider sandboxes; expired/reused challenges fail; reset and logout revoke the intended sessions; refresh replay is denied; profile updates cannot set staff privileges; a reader cannot invoke any staff endpoint; suspended users lose access. Tests cover CSRF, identity-link takeover, credential enumeration responses and account switching. Exercise real Flutter secure storage and browser refresh.

**Coverage:** R01–R02, C01, A01/A07, public-blog identity. Shipping only an email OTP demo does not complete B2.

## B3 — Catalog, genres, public authors and authorized free delivery

**Learn:** joins, filtering, cursor pagination, scoped DTOs, file adapters and authorization tables.

**Read:** reader LibraryRepository/GenreRepository/search/detail; shared epub/genre models; download function and free fallback.

**Build:** seed owned test books and genres, published catalog/detail/search, genre counts, safe author page, private assets, format selection, signed/authorized download adapter, public sample contract, owner-only draft access. Establish book publication/rights/entitlement policy before payments. Use the sample seed as a trusted approved edition/contract fixture; do not introduce an author publish shortcut to seed it.

**Done when:** Flutter browses/searches the seeded catalog and opens a free EPUB/PDF; an unpublished book is absent for another user; paid or revoked files cannot be obtained through catalog URLs; disputed rules differ correctly for owner/reader; public-author response contains no payment or private profile data. Unauthorized asset-ID substitution fails.

**Coverage:** R03, R09 and C01 reference data. SQL text search is enough initially; use a dedicated search engine only if measured needs justify it.

## B4 — Reading state, recommendations, reviews and follows

**Learn:** upserts, uniqueness, ownership, version conflicts and retry-safe mutations.

**Read:** DashboardRepository, BookmarkRepository, reviews/follows, EPUB/PDF readers, local ReaderSettings.

**Build:** continue-reading joins, genre recommendations, per-edition progress/locators, bookmarks/notes, idempotent follows, review submission/edit/delete and approved-review reading. Keep device font/theme settings local first; any sync has an explicit per-user version. Provide library/purchase DTO shape even before paid purchases are introduced.

**Done when:** reopen a book and resume; two books named `book.epub` never share bookmarks; a stale second-device progress update is handled by the documented conflict rule; one user cannot read/change another's notes; duplicate follows/reviews do not create extra rows; review edits return to moderation where required. Logout clears account-scoped cache without deleting user-selected external files unexpectedly.

**Coverage:** R04–R07, R10. Complete a device save/reopen check before advertising offline reading.

## B5 — Creator profiles, title persistence and uploads

**Learn:** resource lifecycles, optimistic locking, multipart/streaming IO and validated inputs.

**Read:** TitleService, BookService, wizard, onboarding/settings and ManuscriptService.

**Build:** creator profiles/reference data; title CRUD with shared categorisation/contributors and metadata revisions; independently resumable ebook/audio delivery drafts with typed details, pricing/distribution settings and unique title/kind. Save title and chosen delivery before uploads. Add scoped asset bindings, eligible cover inheritance/override, manuscript and resumable chapter upload sessions, allowed bulk operations and draft deletion/archive. Normalize legacy wizard/title commands; remove physical-book choices. Preserve immutable uploads separately from working drafts and private evidence.

**Done when:** author leaves/reopens a partial title; cover/manuscript upload failure preserves saved fields and shows a truthful retry state; foreign title uploads and forged completion are denied; type/size/content mismatch fails; stale tab autosave is `409`; client-supplied owner/status/revenue/verification fields are rejected. No author can publish by patching a boolean.

**Additional acceptance:** create audio first with no ebook/files; later add ebook to the same title. Persist independent setup/status; reject a third or duplicate mode, physical values and cross-title asset bindings.

**Coverage:** C01–C04. Payout destination storage/verification is completed in B7/B9 before commercial signing/payout respectively.

## B6 — Ebook imports/editor, audio processing and edition quality

**Learn:** worker concurrency, cancellation, leases, immutable inputs, checksums and resource isolation.

**Read:** converter ingest/HTML/EPUB/PDF/fonts/provenance code and tests; owner-preview function; manuscript watcher.

**Build:** Go-owned conversion queue, isolated conversion adapter, versioned editions/assets/metrics, owner binary preview, EPUB/PDF links, progress polling and retry. Initially run existing conversion logic as a private worker/process with explicit input/output schema and no Firebase SDK dependency. Go controls jobs/storage/state; converter only transforms bounded inputs. Record converter version and source/cover hashes.

**Done when:** DOCX/Markdown/text fixtures produce valid EPUB, full PDF and preview; images/fonts/glyph warnings and provenance survive; tests compare parsed content/metadata and EPUBCheck results, with visual PDF samples. Kill a worker mid-run and recover without multiple active editions; an older conversion finishing late cannot replace a newer title source. A malformed DOCX/ZIP bomb, unsafe image URL or executable markup is bounded/rejected; processing deadlines produce recoverable job state.

**Ebook additions:** implement DOCX and isolated legacy DOC import into versioned structured editor drafts, autosave/conflicts and frozen conversion revisions. Accept direct PDF/EPUB, validate safely and preview with the consumption renderer in read-only mode; do not require press-only checks or invent a second rendition. Show formatting/import failures and preserve original files.

**Audio additions:** implement resumable MP3/WAV/FLAC chapter uploads, explicit order/labels/credits, isolated probe/transcode jobs, versioned quality profiles, measured duration, square artwork, a deliberately generated/reviewed sample and immutable playback manifests. Configure audio-specific upload/resource limits. Streaming supports seeking with per-delivery authorization. Add Flutter chapter playback, background controls, speed, sleep timer, resume and offline downloads; do not defer the client work while claiming audio completion.

**Additional acceptance:** exercise every source route; edited draft creates a new edition while original bytes remain; PDF/EPUB have no content-edit command. Interrupted uploads/jobs recover; late jobs cannot replace new chapters; reordered/replaced chapters require a new reviewed manifest. Preview/sample permissions and expired-link seek recovery pass. Run the audio device walkthrough in the specification before audio sales.

**Go-only follow-on:** port parsing/EPUB/provenance and replace PDF adapter only after the same corpus passes. A bridge is not completion of a strict Go-only converter requirement. Keep external Chromium/EPUBCheck dependencies explicit rather than promising Go alone typesets equivalent PDFs.

**Coverage:** C04, R05/R09, A08 edition preview plus new ebook editor/direct import and audiobook preparation/listening capabilities; these additions are not credited as legacy parity.

## B7 — Readiness, rights registry, agreements and staff publishing

**Learn:** pure domain functions, state machines, immutable consent and multi-row transaction rules.

**Read:** publishing-report, rights, contract and revenue schemas/tests; rights service; signing function; Backoffice book controls.

**Build:** versioned readiness engine using `title`/`listing` scope and canonical data; grants/evidence/archive and staff verification; server-issued agreement offers; validated paid/free pricing and payout-destination existence; signing, staff edition/listing review, contract activation/end, suspension/restoration, rights cases/takedown. Add missing admin controls and audit reasons. Decide the transition policy for pre-existing buyer access when an ordinary agreement ends.

**Done when:** complete “title -> chosen delivery -> content preparation -> rights declaration -> preflight -> pending agreement -> staff approval -> published delivery”; a second creator cannot sign/review it; two simultaneous signs for the same delivery create one live agreement; concurrent manuscript/rights changes invalidate a stale offer; canonical agreement text cannot be substituted; staff changes cannot rewrite old terms; revoked files stop issuing new links. Rights declaration is immutable, only staff verifies, expiry badges reflect dates. A replacement edition needs review before becoming public.

**Additional acceptance:** readiness and offer/contract uniqueness are per delivery, binding title revision and edition. Publish ebook with audio still draft and audio with no ebook. Test format-specific and title-wide rights restrictions and independent withdrawal; shared metadata/cover revisions cannot mutate approved releases.

**Coverage:** C05–C07, A02/A08/A09, R09. Use source report/rights fixtures as Go golden cases, including applicability, score determinism and blocking-check parity. These records preserve product evidence; this plan does not make legal claims about enforceability.

## B8 — Delivery checkout, settlement, ledger and recovery

**Learn:** external HTTP clients, HMAC, idempotency, row locking and crash recovery.

**Read:** services/payments, shared purchase/transaction/revenue code, Flutter checkout/pending/history, webhook tests.

**Build:** separate checkout attempts, frozen terms and price, fake Paystack adapter followed by test-mode Paystack, signed durable inbox, owner verification, shared settlement transaction, entitlement, immutable sale and balanced ledger, scheduled reconciliation and full history. Include stale initializing/unknown provider outcomes and two-attempt recovery. Persist reference before calling provider.

**Done when:** opening checkout grants nothing; verified success grants once; webhook/client verify/reconcile races count once; wrong buyer/reference/amount/currency cannot settle; duplicate/out-of-order events cannot change historical terms; crash between provider success and DB commit recovers; a second successful attempt becomes a visible overpayment case. Confirm interrupted mobile-money checkout after app restart. Verify integer split fixtures and per-currency ledger balance, including negative platform margin.

**Additional acceptance:** buy ebook/audio independently; each payment/refund affects only its delivery entitlement. Freeze title/delivery/edition and terms in sales; later sibling publication grants nothing automatically. Bundles/credits/audio subscriptions remain deferred.

**Coverage:** R08–R09, C08 foundations, A10 payment inspection. Do not test with real money.

## B9 — Analytics, creator statements, refunds and real payouts

**Learn:** aggregates, immutable accounting adjustments, allocation locking and operator workflows.

**Read:** analytics/payout services, destination/settings UI, transaction snapshots and revenue settings.

**Build:** complete date-filtered sales/revenue/title/geography analytics with ebook/audio breakdowns, creator statements, liability balance, verified/masked payout destinations and payout schedule preferences; staff policy settings, refunds/disputes, payout batches/approval/allocations and actual confirmations. Start with documented manual-transfer evidence and reconciliation; add Paystack transfers only after capability/secret/failure validation. Account export/deletion honors retention and consent history.

**Done when:** failed/pending purchases do not inflate sales; old author/split remains correct after book transfer/settings change; mixed currencies stay separate; refund/chargeback is an appended adjustment; overlapping payout runs cannot allocate/pay the same liability twice; uncertain provider transfer never triggers a blind second transfer. Creator sees pending versus paid based on transfer evidence. A moderator cannot change revenue policies or approve transfers.

**Coverage:** C08–C09, A09–A10. No invented payout dates, no live-settings recomputation of earned money, no currency conversion inferred from a display preference.

## B10 — Publications, authoring, rendering and public blog

**Learn:** structured document validation, safe rendering, unique slugs, cache boundaries and scheduled commands.

**Read:** BlogService, Tiptap editor/paywall node, publish/render implementation/tests, public blog data/access layer and RSS/sitemap routes.

**Build:** publication/handle/settings/branding, versioned tiers, drafts/autosave, allowlist Tiptap renderer, free/paid splitting, revisions/restore, publish/schedule/unpublish/archive, discovery/direct-unlisted lookup and canonical access resolver. Next.js keeps public rendering/SEO/RSS/sitemap and calls Go. Implement post and publication lifecycle checks centrally.

**Done when:** author saves and republishes a real post; simultaneous same-slug creates are safe; old body revisions stay private; scheduled frozen revision publishes once at the correct instant across restart; cancel/unpublish/remove/suspend prevents both direct body access and discovery. Unsafe URLs/nodes never produce executable HTML. Test paid segments through raw HTML, JSON, SSR/prefetch, cache, RSS and sitemap responses—not just a visible paywall card.

**Coverage:** C10–C11, R11, public blog, A05 foundations. Scheduled publishing and revision restoration are completion work beyond the currently established implementation.

## B11 — Free/paid subscriptions, comps and billing lifecycle

**Learn:** time-bounded entitlements, recurring provider state, event ordering and calendar arithmetic.

**Read:** initializeSubscription, comp, Paystack webhook, subscription/access schema, reader subscription repository and web SubscribeOptions.

**Build:** free subscribe/status, separate consent, monthly recurring card checkout, annual prepay, price-version/provider-plan mapping, durable expected charges, renewal/cancel/reactivate, failed-payment state, complimentary grants, tier grandfathering, subscriber management/export and subscribed feed. Add subscription reconciliation and expiry repair.

**Done when:** free readers never obtain paid HTML; retired tier subscribers retain their paid period; wrong-tier users cannot read tier-only content; duplicated annual webhook grants one period from original effective date; out-of-order cancellation/charge events converge; renewal failures retain already-paid time; cancel stops future renewal; lost provider metadata is recoverable from stored subscription codes. A comp cannot erase recurring billing, and tier scope is explicit. Replaying after expiry does not resurrect access. Test month-end/leap-year boundaries.

**Coverage:** R11, C10/C12–C13 subscriber management, A10. Subscription revenue allocation/fees require an explicit policy distinct from book agreements; record the whole charge and liability, and block automated subscription payout until that policy is defined.

## B12 — Engagement, moderation, newsletters and delivery analytics

**Learn:** durable fan-out, consent, dedupe, projection repair and scoped operational tools.

**Read:** PostEngagement, comment/review rules, Backoffice moderation, counters, blog email/stats schema and BLOG_SPEC newsletter requirements.

**Build:** idempotent likes, policy-enforced comments/replies/edits/deletion, reports and queues, review/rating consistency, consent confirmation, welcome/newsletter delivery, personalized free/paid variants, suppression and unsubscribe handling, provider delivery callbacks, defined post/email analytics and notification preference handling. Extend admin job/event/delivery/audit views and creator newsletter statistics. Persist one recipient intent per send/version/recipient.

**Done when:** unauthorized users cannot comment on locked posts or forge author badges; moderation immediately updates visible counts/access; report queues include records beyond the first page/cap; duplicate events do not inflate counters. Unconfirmed/opted-out/suppressed addresses receive no newsletter; a free recipient receives no paid body; duplicate send requests do not fan out twice; failure/retry/dead-letter status is inspectable. Confirm unsubscribe/bounce/complaint callbacks, billing email separation and uncertain-send handling. Clear view/read metric definitions and do not present opens as exact readership.

**Coverage:** A03–A06/A11, C13, blog community and remaining notification features. No full Notes/social network or podcast system is implied.

## B13 — Client parity, imports and production cutover

**Learn:** reconciliation, compatibility contracts, recovery exercises and staged release decisions.

**Build:** every client adapter in the client plan, dry-run import command/exception report, legacy identifier mapping, identity transition, storage/token cleanup, provider callback ownership, backups/restore, monitoring and release flags. Rehearse migration with authorized sanitized exports before touching live traffic. Record API/client version support and old Android app retirement policy.

**Done when:** the reader, Creator Hub, admin and public blog complete the cross-surface walkthrough; no migrated client needs Firebase reads/writes; import/reconciliation matches users, owned title/delivery/edition assets, legacy book-to-ebook mappings, unsupported physical/audio exceptions, rights/consent, agreements, completed purchases, sale amounts by currency, subscription periods and payout allocations. New provider events are never processed by both systems. Demonstrate restart/retry, DB/object restore and rollback including writes after cutover. Obtain a concrete launch decision only after evidence is reviewable.

**Coverage:** all R/C/A IDs, public rendering/discovery, all entry points and platform responsibilities in API_MAP.

## Validation during implementation

Once the Go module exists, run `go test ./...` and `go vet ./...` for relevant changes; use race testing for shared in-process state. Use real PostgreSQL integration tests for concurrency/uniqueness, handler tests for HTTP/auth rules, fixtures/fuzzing for renderers and archives, provider sandbox tests for network contracts, and device/browser walkthroughs for end-to-end parity. Running only unit tests does not establish payment correctness, file quality or paid-content isolation.

Record milestone, smallest completed behavior, source reference, Go concept learned, command/request tried, test result and open questions. Do not mark a milestone done because all route stubs compile.
