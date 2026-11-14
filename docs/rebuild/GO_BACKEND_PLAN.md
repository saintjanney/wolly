# Go backend rebuild: implementation and learning plan

These milestones are proposed work, not implemented functionality. Follow [the architecture](ARCHITECTURE.md) and [API map](API_MAP.md); integrate the existing clients throughout using [the client plan](CLIENT_INTEGRATION_PLAN.md). A milestone may take several sessions. Do not put a fixed date on a full rebuild before measuring the first slices.

The [title and digital-media specification](TITLES_AND_DIGITAL_MEDIA.md) extends this plan with ebook/audio scope and acceptance cases. Implement optional series, title, title edition, language edition, delivery and content-release identities from B1; ebook-only learning slices are not audio completion. Physical books are excluded.

The [content-type plan](CONTENT_TYPES_AND_CONTAINERS.md) adds a book-first extension contract: B1 defines finite-work type/profile identity and capabilities; B3–B7 exercise novels and academic books without journal-only requirements; B8–B13 preserve typed contracts/imports. Standalone short works, serial publications/issues, composition and periodical-specific coverage follow separate E1–E4 gates; general monthly packages are core R7 scope. Do not expand B0 into a generic publishing framework.

The [account and user-group specification](ACCOUNTS_AND_USER_GROUPS.md) promotes organisation accounts/teams, account creator enrollment and sponsored book access into required scope. It replaces earlier personal-only/team-deferred assumptions. Named-member license offers are a proposed commercial default to settle before B8 sales; internal-only publishing and institutional blog subscriptions remain separate.

The [reader profiles and household access](READER_PROFILES_AND_HOUSEHOLDS.md) specification is required target scope: B1–B2 define reader identities/controls and restricted sessions; B3–B4 isolate state and recommendations; B7 adds suitability review inputs; B8 validates explicit household access terms; B13 verifies profile migration, privacy, switching and eventual independence. Default-owner-profile learning slices do not establish adult/minor household completion.

Scope revision: [unified titles, offers and subscriptions](CONTENT_OFFERS_AND_SUBSCRIPTIONS.md) defines blog posts as titles, source/editor authoring, mutually exclusive free/paid title classification, lifetime and/or subscription routes for paid titles, and independent grant provenance. Release order is R1 free ebooks → R2 free audio → R3 lifetime monetisation → R4 publisher teams → R5 households/minors → R6 sponsored consumption → R7 subscription programme → R8 full rollout. Earlier source inventories describe legacy behavior, not an exception to this target.

## Relationship to outcome releases

The [product roadmap](PRODUCT_ROADMAP.md) is the outcome sequence; the [release plan](RELEASE_PLAN.md) governs activation, client coverage and operations. B0–B13 remain engineering work packages and can be delivered in vertical subsets: R1 ebook publishing uses parts of B5–B7, R3 personal finance parts of B8–B9, R4/R6 organisation work, R5 profiles, R2 free audio and R7 general monthly packages. Earlier slices may remain invited/feature-limited without waiving full scope. R8 requires all applicable B acceptance, all retained client behaviors and B13 reconciliation. Do not mark all of B6/B8 complete after an ebook/personal-only slice.

Consumer web storefront/library/online ebook reading in R3 is explicitly new client work in this proposal; map it to contracts and browser/device acceptance rather than assuming Flutter Android establishes browser parity. Deploy/cut over compatible domains throughout the releases, keeping old writers authoritative until each boundary is ready. R0 must resolve the existing shared-blog/backend QA isolation limitations before customer pilots; no production rollout is authorised by these documents.

## Structural acceptance across milestones

Consolidated 14 November 2026. Use the [domain relationships](ENTITY_RELATIONSHIPS.md) and [content-type plan](CONTENT_TYPES_AND_CONTAINERS.md) as the semantic contract; these checks make that contract observable in the implementation rather than leaving it in background notes.

| Milestone | Required structural result |
| --- | --- |
| B1 | Validated finite-work/book profile and ancestry DTOs; catalog constraints for series memberships, editorial/language editions and delivery variants; immutable publication/access provenance design. Define profile versions and separate creation/reading/commerce capability flags |
| B2 | Individual/organisation accounts, invitations, permission assignments, last-owner protection and account-scoped creator enrollment; separate credited Party identity/claims from login. Authentication, contributor credit, staff role and beneficiary are never interchangeable |
| B3–B4 | Party author pages/follows; book-form/subject filters and exact eligible-product matching; optional series order; context-aware work reviews; release/format-specific progress, including safe unsupported-type behavior |
| B5 | Typed book/academic descriptive metadata and credits; default simple book setup; multiple editorial editions/translations/narrations and explicit membership/asset authority; no identity changes through generic PATCH |
| B6 | Immutable rendition/chapter releases and source provenance; novel and academic-book fixtures with truthful PDF/EPUB limitations; late workers cannot switch another branch or approved publication |
| B7 | Publication revision freezes exact content, approved metadata/credits/artwork, scoped rights, agreement and beneficiary terms. Metadata-only updates reuse unchanged content. Source changes notify translations without replacing them |
| B8–B9 | Buyer-account/actor-scoped personal checkout and approved organisation-license capacity/assignment, expiry/refund and independent sponsored-grant acceptance; no private member reporting. One-product checkout freezes full identity/publication; settlement produces an idempotent purchase-backed grant. Independent grants/refunds, immutable beneficiaries and bounded payout allocations pass concurrency tests |
| B10–B12 | Blog posts map to titles, publications to channels, tiers to explicit subscription packages; one access resolver evaluates free/lifetime/paid-period grants without a universal paid flag |
| B13 | Re-import complete verified ancestry, Party follows/credits, individual/organisation account authority, publications, grants and historical beneficiary/terms without duplicates. Unknown facts become exceptions; no name-based series/translation merging |

Book-launch acceptance includes standalone works, ordered series memberships, alternative same-language translations, bilingual metadata, distinct narration variants and correction/new-product classification. Future independent short works/periodicals/components are not fabricated during legacy migration.

### Expansion gates after book launch

| Gate | Scope | Must pass before enablement |
| --- | --- | --- |
| E1 | Standalone story/poem/essay profiles | Typed work metadata, sensible source/editor/reader behavior, sample/rights/pricing policy and compatible clients; no dummy book parent |
| E2 | Newspapers/magazines/journals as serials with digital issue products | Serial/issue-key identity, dated archive navigation, issue-specific rights/purchase/retained access, corrected-release behavior and supported rendition/device checks |
| E3 | Article/chapter identity, anthology/issue composition and scholarly workflow as separately enabled features | Ordered pinned placements, inclusion rights, component-versus-container access isolation, revision-bound references and evidence for any review/correction/retraction claims |
| E4 | Serialized installments, issue/archive subscriptions and bundles, each separately enabled | Explicit coverage and entitlement targets, ongoing/expired/retained access, cancellation/refunds, immutable allocations and replay-safe provider behavior |

Each gate needs coordinated SQL/API/client changes and observed cross-surface acceptance. Add no dormant future tables or route stubs merely to make a feature flag appear supported. E1–E4 sequence is a proposed roadmap, with details in the content-type plan; it does not change B0's small first task.

## Working conventions

Build under `backend/go/`; retain current applications/services for comparison. Follow the repository agreement: work on `develop` or `main`, do not create feature branches, and do not push merely to share a draft because those branches trigger deployments. Never copy production credentials or payment data into fixtures.

Start with handlers calling domain services that use explicit SQL. Add an interface when a real boundary needs a replacement, particularly payment, email, SMS, file storage and conversion adapters. Use real local PostgreSQL; fake external networks rather than the database or authorization result. Commands below become available when their associated project/milestone is built.

## B0 — Learn basic Go and serve a response

**Learn:** modules, packages, functions, structs, JSON encoding, returned errors and HTTP handlers.

**Build:** `cmd/api`, configuration for listen address, graceful shutdown, `GET /health/live`. Add a minimal Go module and README with exact local startup instructions. Use a supported pinned Go toolchain at implementation time.

**Done when:** a local HTTP request receives the expected JSON; an unknown path returns a proper 404; stopping the server closes it cleanly. No database or frontend rebuild is needed for this first task.

## B1 — HTTP contract, PostgreSQL, migrations and durable work foundation

**Learn:** context/deadlines, SQL rows, keys/indexes, migrations, transactions, basic testing.

**Build:** local PostgreSQL configuration, explicit migration command, readiness endpoint, standard error/validation envelope, request IDs, pagination conventions and OpenAPI examples. Define launch `work_type` (`book` initially, `blog_post` enabled with the unified editor path by R3), typed book-form/optional academic descriptive profiles and unsupported-type capability errors. Define catalog ancestry tables/constraints and DTO examples for a standalone title and a multi-volume multilingual series; use `UNIQUE(language_edition_id, kind, variant_key)` and allow alternative same-language translations and delivery variants. Define party credits versus personal managing-account memberships, publication revisions and entitlement-grant provenance as specified in the [relationship review](ENTITY_RELATIONSHIPS.md). Introduce durable audit/outbox/idempotency tables and worker job claiming before the first operation depends on asynchronous work. Local files and inspectable email/SMS outbox adapters must be available by B2; actual dispatch is a worker responsibility.

**Done when:** fresh DB setup and restart preserve records; failed transaction leaves no half-write; unavailable DB changes readiness; job lease recovery and deduplication survive a worker crash. A Next.js page can call the Go readiness/capabilities endpoint through its local same-origin proxy.

## B2 — Identity, sessions and permissions

**Learn:** middleware, hashing through vetted libraries, unique constraints, sessions, authorization and single-use state.

**Read:** reader auth repository/screens; Creator Hub AuthContext; blog AuthProvider/session route; Backoffice login/page; user rules and legacy user-field adapters.

**Build in smaller substeps:** establish individual/organisation accounts, personal owner and organisation invitation/membership permissions, last-owner protection and account-scoped creator enrollment, separate from Party credits; email/password registration/login/reset and email verification; browser cookie/CSRF session restore/logout; mobile access/rotating refresh sessions; phone OTP; email magic links/deep links; Google OAuth/OIDC and explicit identity linking; staff permissions, step-up/MFA, bootstrap and session revocation. Normalize first/last name, DOB, phone, persona, preferences and creator onboarding. Add safe public-author DTOs and private profile allowlists.

**Done when:** a reader and creator can use one identity; all retained login methods work through test adapters/provider sandboxes; expired/reused challenges fail; reset and logout revoke the intended sessions; refresh replay is denied; profile updates cannot set staff privileges; a reader cannot invoke any staff endpoint; suspended users lose access. Tests cover CSRF, identity-link takeover, credential enumeration responses and account switching. Exercise real Flutter secure storage and browser refresh.

**Coverage:** R01–R02, C01, A01/A07, public-blog identity. Shipping only an email OTP demo does not complete B2.

## B3 — Catalog, genres, public authors and authorized free delivery

**Learn:** joins, filtering, cursor pagination, scoped DTOs, file adapters and authorization tables.

**Read:** reader LibraryRepository/GenreRepository/search/detail; shared epub/genre models; download function and free fallback.

**Build:** seed owned test books and genres, published catalog/detail/search, genre counts, safe author page, private assets, optional series order, title-edition/language/format selection, signed/authorized download adapter, public sample contract, owner-only draft access. Establish book publication/rights/entitlement policy before payments. Use the sample seed as a trusted approved release/contract fixture; do not introduce an author publish shortcut to seed it.

**Done when:** Flutter browses/searches the seeded catalog and opens a free EPUB/PDF; an unpublished book is absent for another user; paid or revoked files cannot be obtained through catalog URLs; disputed rules differ correctly for owner/reader; public-author response contains no payment or private profile data. Unauthorized asset-ID substitution fails. Language and format filters must match one eligible delivery, not separate siblings; hide unpublished languages/editions and deduplicate title counts.

**Coverage:** R03, R09 and C01 reference data. SQL text search is enough initially; use a dedicated search engine only if measured needs justify it.

## B4 — Reading state, recommendations, reviews and follows

**Learn:** upserts, uniqueness, ownership, version conflicts and retry-safe mutations.

**Read:** DashboardRepository, BookmarkRepository, reviews/follows, EPUB/PDF readers, local ReaderSettings.

**Build:** continue-reading joins, genre recommendations, per-release progress/locators, bookmarks/notes, idempotent follows, review submission/edit/delete and approved-review reading. Keep device font/theme settings local first; any sync has an explicit per-user version. Provide library/purchase DTO shape even before paid purchases are introduced.

**Done when:** reopen a book and resume; two books named `book.epub` never share bookmarks; a stale second-device progress update is handled by the documented conflict rule; one user cannot read/change another's notes; duplicate follows/reviews do not create extra rows; review edits return to moderation where required. Logout clears account-scoped cache without deleting user-selected external files unexpectedly.

**Coverage:** R04–R07, R10. Complete a device save/reopen check before advertising offline reading.

## B5 — Creator profiles, title persistence and uploads

**Learn:** resource lifecycles, optimistic locking, multipart/streaming IO and validated inputs.

**Read:** TitleService, BookService, wizard, onboarding/settings and ManuscriptService.

**Build:** creator profiles/reference data; optional series CRUD/authorized ordered membership; title CRUD with shared categorisation/contributors and metadata revisions; title editions and language editions with localized metadata, translation credits/provenance and reviewed snapshots; independently resumable ebook/audio delivery drafts with typed details, pricing/distribution settings and unique language-edition/kind/variant-key. Save title and chosen delivery before uploads. Add scoped asset bindings, eligible cover inheritance/override, manuscript and resumable chapter upload sessions, allowed bulk operations and draft deletion/archive. Normalize legacy wizard/title commands; remove physical-book choices. Preserve immutable uploads separately from working drafts and private evidence.

**Done when:** author leaves/reopens a partial title; cover/manuscript upload failure preserves saved fields and shows a truthful retry state; foreign title uploads and forged completion are denied; type/size/content mismatch fails; stale tab autosave is `409`; client-supplied owner/status/revenue/verification fields are rejected. No author can publish by patching a boolean. Prepare novel and academic-book fixtures through the same book flow with applicable metadata checks, completing rendering in B6 and publication in B7; a type/form label never grants a peer-review badge or enables journal workflows.

**Additional acceptance:** create audio first with no ebook/files; later add ebook to the same title. Persist independent setup/status; allow first/revised title editions and multiple language editions including distinct translations in the same language; reject duplicate kind/variant key within a language edition, invalid provenance/cycles, physical values and cross-tree assets. Support separate narration/abridgement variants, primary/additional content languages and typed party credits without granting contributor permissions. Default the simple path to first edition plus original language and default variant; standalone titles need no series.

**Coverage:** C01–C04. Payout destination storage/verification is completed in B7/B9 before commercial signing/payout respectively.

## B6 — Ebook imports/editor, audio processing and release quality

**Learn:** worker concurrency, cancellation, leases, immutable inputs, checksums and resource isolation.

**Read:** converter ingest/HTML/EPUB/PDF/fonts/provenance code and tests; owner-preview function; manuscript watcher.

**Build:** Go-owned conversion queue, isolated conversion adapter, versioned releases/assets/metrics, owner binary preview, EPUB/PDF links, progress polling and retry. Initially run existing conversion logic as a private worker/process with explicit input/output schema and no Firebase SDK dependency. Go controls jobs/storage/state; converter only transforms bounded inputs. Record converter version and source/cover hashes.

**Done when:** DOCX/Markdown/text fixtures produce valid EPUB, full PDF and preview; images/fonts/glyph warnings and provenance survive; tests compare parsed content/metadata and EPUBCheck results, with visual PDF samples. Kill a worker mid-run and recover without multiple active releases; an older conversion finishing late cannot replace a newer title source. A malformed DOCX/ZIP bomb, unsafe image URL or executable markup is bounded/rejected; processing deadlines produce recoverable job state.

**Ebook additions:** implement DOCX and isolated legacy DOC import into versioned structured editor drafts, autosave/conflicts and frozen conversion revisions. Accept direct PDF/EPUB, validate safely and preview with the consumption renderer in read-only mode; do not require press-only checks or invent a second rendition. Show formatting/import failures and preserve original files.

**Audio additions:** implement resumable MP3/WAV/FLAC chapter uploads, explicit order/labels/credits, isolated probe/transcode jobs, versioned quality profiles, measured duration, square artwork, a deliberately generated/reviewed sample and immutable playback manifests. Configure audio-specific upload/resource limits. Streaming supports seeking with per-delivery authorization. Add Flutter chapter playback, background controls, speed, sleep timer, resume and offline downloads; do not defer the client work while claiming audio completion.

**Additional acceptance:** exercise every source route; edited draft creates a new content release while original bytes remain; changed source releases flag dependent translations for review without overwriting them; PDF/EPUB have no content-edit command. Interrupted uploads/jobs recover; late jobs cannot replace new chapters; reordered/replaced chapters require a new reviewed manifest. Preview/sample permissions and expired-link seek recovery pass. Run the audio device walkthrough in the specification before audio sales.

**Go-only follow-on:** port parsing/EPUB/provenance and replace PDF adapter only after the same corpus passes. A bridge is not completion of a strict Go-only converter requirement. Keep external Chromium/EPUBCheck dependencies explicit rather than promising Go alone typesets equivalent PDFs.

**Coverage:** C04, R05/R09, A08 release preview plus new ebook editor/direct import and audiobook preparation/listening capabilities; these additions are not credited as legacy parity.

## B7 — Readiness, rights registry, agreements and staff publishing

**Learn:** pure domain functions, state machines, immutable consent and multi-row transaction rules.

**Read:** publishing-report, rights, contract and revenue schemas/tests; rights service; signing function; Backoffice book controls.

**Build:** versioned readiness engine using `title`/`listing` scope and canonical data; grants/evidence/archive and staff verification; server-issued agreement offers; validated paid/free pricing and payout-destination existence; signing, staff release/listing review, contract activation/end, suspension/restoration, rights cases/takedown. Add missing admin controls and audit reasons. Decide the transition policy for pre-existing buyer access when an ordinary agreement ends.

**Done when:** complete “title -> title edition -> language edition -> chosen delivery -> content preparation -> rights declaration -> preflight -> pending agreement -> staff approval -> published delivery”; a second creator cannot sign/review it; two simultaneous signs for the same delivery create one live agreement; concurrent manuscript/rights changes invalidate a stale offer; canonical agreement text cannot be substituted; staff changes cannot rewrite old terms; revoked files stop issuing new links. Rights declaration is immutable, only staff verifies, expiry badges reflect dates. A replacement release needs review before becoming public.

**Additional acceptance:** readiness and offer/contract uniqueness are per delivery, binding title/title-edition/language-edition metadata revisions and content release. Publish immutable publication revisions, including metadata-only updates referencing unchanged content. Enforce scoped grants/restrictions at each level and deny submitted identity reparenting. Publish ebook with audio still draft and audio with no ebook. Test format-specific and title-wide rights restrictions and independent withdrawal; shared metadata/cover revisions cannot mutate approved releases.

**Coverage:** C05–C07, A02/A08/A09, R09. Use source report/rights fixtures as Go golden cases, including applicability, score determinism and blocking-check parity. These records preserve product evidence; this plan does not make legal claims about enforceability.

## B8 — Delivery checkout, settlement, ledger and recovery

**Learn:** external HTTP clients, HMAC, idempotency, row locking and crash recovery.

**Read:** services/payments, shared purchase/transaction/revenue code, Flutter checkout/pending/history, webhook tests.

**Build:** separate checkout attempts, frozen terms and price, fake Paystack adapter followed by test-mode Paystack, signed durable inbox, owner verification, shared settlement transaction, entitlement, immutable sale and balanced ledger, scheduled reconciliation and full history. Include stale initializing/unknown provider outcomes and two-attempt recovery. Persist reference before calling provider.

**Done when:** opening checkout grants nothing; verified success grants once; webhook/client verify/reconcile races count once; wrong buyer/reference/amount/currency cannot settle; duplicate/out-of-order events cannot change historical terms; crash between provider success and DB commit recovers; a second successful attempt becomes a visible overpayment case. Confirm interrupted mobile-money checkout after app restart. Verify integer split fixtures and per-currency ledger balance, including negative platform margin.

**Additional acceptance:** buy ebook/audio independently; each payment creates an attributable grant; a refund invalidates only that purchase-backed grant, preserving independent valid grants and historical receipts. Freeze title/title-edition/language-edition/delivery/release and terms in sales; later publication of another format, language, editorial edition or series volume grants nothing automatically. Corrections within a delivery follow existing access policy; material new editions use new delivery IDs. Credits and advanced bundles remain deferred; eligible ebook/audio/web_text products join monthly packages in R7.

**Coverage:** R08–R09, C08 foundations, A10 payment inspection. Do not test with real money.

## B9 — Analytics, creator statements, refunds and real payouts

**Learn:** aggregates, immutable accounting adjustments, allocation locking and operator workflows.

**Read:** analytics/payout services, destination/settings UI, transaction snapshots and revenue settings.

**Build:** complete date-filtered sales/revenue/title/geography analytics with ebook/audio breakdowns, creator statements, liability balance, verified/masked payout destinations and payout schedule preferences; staff policy settings, refunds/disputes, payout batches/approval/allocations and actual confirmations. Start with documented manual-transfer evidence and reconciliation; add Paystack transfers only after capability/secret/failure validation. Account export/deletion honors retention and consent history.

**Done when:** failed/pending purchases do not inflate sales; old author/split remains correct after book transfer/settings change; mixed currencies stay separate; refund/chargeback is an appended adjustment; overlapping payout runs cannot allocate/pay the same liability twice; uncertain provider transfer never triggers a blind second transfer. Creator sees pending versus paid based on transfer evidence. A moderator cannot change revenue policies or approve transfers.

**Coverage:** C08–C09, A09–A10. No invented payout dates, no live-settings recomputation of earned money, no currency conversion inferred from a display preference.

## B10 — Unified editor titles, channels and public rendering

**Learn:** structured editor validation, immutable releases, typed profiles, rendering/access boundaries and compatible migration.

**Build:** `blog_post` as a title work type; original editorial/language defaults, canonical drafts/editor revisions and `web_text` delivery details. Upload/source ingestion follows B5–B6 (DOC/DOCX import, read-only PDF/EPUB), while start-in-editor creates a canonical draft without an upload. Safe HTML rendering, free excerpts, title scheduling and revision restore bind exact approved publication snapshots. Channels provide publication branding, placement, handles and RSS/sitemap routes over the same titles. Keep existing public URLs and navigation pages via adapters; do not create a second content writer or sellable titles for settings pages.

**Sequence:** define these identities in B1 and bring the source/editor/rendering slice forward into R1–R3. R3 cannot sell a web_text/blog_post product until its complete creator, reader and staff path passes. Complete legacy channel/community/newsletter parity in R7 and final migration in R8.

**Done when:** create a title by editor or supported upload, preview, save/reopen, review/publish, read anonymously when free, buy it through a lifetime offer when paid, and render it at its canonical/legacy channel URL without duplicating content. Unsafe markup/links, private drafts and stale scheduled revisions cannot leak through HTML/JSON/prefetch/RSS/cache. Typed book versus blog metadata uses applicable checks and immutable ancestry.

**Coverage:** C10–C11, R11, public rendering/SEO/RSS, A05; this revises the former isolated blog domain. Legacy paid/subscriber behavior stays authoritative until explicitly mapped and cut over.

Commercial-policy acceptance in B7–B8: validate the free/paid truth table, reject a free title with any live full-content paid route and reject new paid publication with neither ready paid route. Freeze classification/offer versions, test both paid routes independently in B11, and race policy transitions against checkout/package review. Preserve historical receipts and current-period obligations when policy changes. Before R7, subscription-only publication remains disabled; this never blocks R1–R2 free reading/listening.

## B11 — Monthly subscription packages and paid-period access

**Learn:** coverage snapshots, monthly periods, provider idempotency, state transitions and accountable revenue allocation.

**Build:** package identity/version, explicit product membership/participation authorization, monthly price/provider-plan versions, actor/buyer-account enrollment, initial and renewal expected charges, durable event inbox, immutable paid periods/coverage, cancellation/reactivation/failure and next-renewal plan changes, complimentary grants and subscriber administration. Each title is free or paid. Paid titles can have lifetime and package offers simultaneously; free and paid offers cannot coexist for the same title. Use one grant resolver for ebook/audio/web_text and independent household/member eligibility. Preserve any valid lifetime grant when a subscription expires.

**Done when:** two different packages cover deliberately different products; month-end/expiry/renewal and replay/races converge; cancellation preserves paid-through access; failed renewal does not erase already-paid time; historical coverage/price/beneficiary facts survive ordinary next-period edits. Takedowns are enforced with explicit support/refund handling. Subscribed-to-owned upgrade does not masquerade as a duplicate payment. Freeze allocations and reconcile per-currency charges, liability, refunds and payouts before participant packages are sold.

**Migration:** map legacy publication/tier/post content to channel/title/package scopes, preserving paid-through dates, provider mandates/identifiers, annual prepayments, archive/future-post promises, comps and consent. Conflicting legacy promises need a compatibility policy or agreed transition, not a silent new snapshot rule.

**Coverage:** full R7 programme across R11/C10/C12–C13/A10, beyond old blog subscriptions; see [unified title/offer contract](CONTENT_OFFERS_AND_SUBSCRIPTIONS.md) for provider limits, package change policy, entity constraints and cross-surface acceptance. Institutional multi-seat subscriptions remain an explicitly licensed variation, not implied by ordinary enrollment.

## B12 — Engagement, moderation, newsletters and delivery analytics

**Learn:** durable fan-out, consent, dedupe, projection repair and scoped operational tools.

**Read:** PostEngagement, comment/review rules, Backoffice moderation, counters, blog email/stats schema and BLOG_SPEC newsletter requirements.

**Build:** idempotent likes, policy-enforced comments/replies/edits/deletion, reports and queues, review/rating consistency, consent confirmation, welcome/newsletter delivery, personalized free/paid variants, suppression and unsubscribe handling, provider delivery callbacks, defined post/email analytics and notification preference handling. Extend admin job/event/delivery/audit views and creator newsletter statistics. Persist one recipient intent per send/version/recipient.

**Done when:** unauthorized users cannot comment on locked posts or forge author badges; moderation immediately updates visible counts/access; report queues include records beyond the first page/cap; duplicate events do not inflate counters. Unconfirmed/opted-out/suppressed addresses receive no newsletter; a free recipient receives no paid body; duplicate send requests do not fan out twice; failure/retry/dead-letter status is inspectable. Confirm unsubscribe/bounce/complaint callbacks, billing email separation and uncertain-send handling. Clear view/read metric definitions and do not present opens as exact readership.

**Coverage:** A03–A06/A11, C13, blog community and remaining notification features. No full Notes/social network or podcast system is implied.

## B13 — Client parity, imports and production cutover

**Learn:** reconciliation, compatibility contracts, recovery exercises and staged release decisions.

**Build:** every client adapter in the client plan, dry-run import command/exception report, legacy identifier mapping, identity transition, storage/token cleanup, provider callback ownership, backups/restore, monitoring and release flags. Rehearse migration with authorized sanitized exports before touching live traffic. Record API/client version support and old Android app retirement policy.

**Done when:** the reader, Creator Hub, admin and public blog complete the cross-surface walkthrough; no migrated client needs Firebase reads/writes; import/reconciliation matches users, parties/credits, managing accounts/memberships, typed book profiles, publication snapshots, purchase-backed grants and frozen beneficiaries, owned series/title/title-edition/language-edition/delivery/release assets, legacy book-to-ebook mappings, unsupported physical/audio exceptions, rights/consent, agreements, completed purchases, sale amounts by currency, subscription periods and payout allocations. New provider events are never processed by both systems. Demonstrate restart/retry, DB/object restore and rollback including writes after cutover. Obtain a concrete launch decision only after evidence is reviewable.

**Coverage:** all R/C/A IDs, public rendering/discovery, all entry points and platform responsibilities in API_MAP.

## Household profile acceptance within book release

Run the [profile acceptance scenarios](READER_PROFILES_AND_HOUSEHOLDS.md#milestones-and-acceptance): adult/minor state isolation, restricted session refresh and direct-link/profile-switch denial, age-appropriate samples/assets/caches, explicit household license coverage, organisation-seat isolation, one-payment/review attribution, independent-grant retention, safe offline behavior and repeatable default-profile import/transfer. Public social actions and privileged tools remain User-authorised, disabled for initial minor profiles. Household sharing of legacy purchases or blog subscriptions is never inferred.

## Organisation acceptance within book release

Before claiming B13 completion, run all scenarios in [accounts and user groups](ACCOUNTS_AND_USER_GROUPS.md#rebuild-dependencies-and-acceptance): one login across personal/two organisation contexts; separate creator enrollment; invite/role/last-owner races; organisation license capacity and settlement; member removal/expiry/refund preserving independent personal grants; editor/signer/finance separation; privacy and account-aware migration. The personal-only slice is useful progress, not completion of these requirements.

## Validation during implementation

Once the Go module exists, run `go test ./...` and `go vet ./...` for relevant changes; use race testing for shared in-process state. Use real PostgreSQL integration tests for concurrency/uniqueness, handler tests for HTTP/auth rules, fixtures/fuzzing for renderers and archives, provider sandbox tests for network contracts, and device/browser walkthroughs for end-to-end parity. Running only unit tests does not establish payment correctness, file quality or paid-content isolation.

Record milestone, smallest completed behavior, source reference, Go concept learned, command/request tried, test result and open questions. Do not mark a milestone done because all route stubs compile.
