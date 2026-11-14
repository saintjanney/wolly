# Wolly assessment and Go backend rebuild

Prepared 30 October 2026 from `main`, commit `236c8fd`. This is a source-based assessment and implementation outline. **A Go API/worker integration scaffold now exists; business persistence, authentication and roadmap features remain unimplemented. No production state was inspected.**

This follows the structure of the sibling Ripple assessment in `../Ripple/docs/rebuild/`. The target is a Go-owned backend without Firebase runtime dependencies. That is a proposed direction based on the Ripple precedent, not a change already made. Keep Flutter for the reader and Next.js/React for the existing web surfaces; replace their data and authentication integrations progressively.

Product refinement, 13 November 2026: **optional series group titles; titles have editorial editions, language editions and independent ebook/audiobook deliveries; immutable content releases track corrections; electronic content only**. The [title and digital-media specification](TITLES_AND_DIGITAL_MEDIA.md) defines the updated product model, creator flows, ebook editor/imports, audio proposal and acceptance cases. It governs the target design where the original book-centric assessment differs. These additions remain planned work.

The [account and user-group specification](ACCOUNTS_AND_USER_GROUPS.md) defines individual/organisation accounts, independent creator enrollment, organisation invitations/permissions and sponsored consumption. Organisation support is now required target scope, superseding earlier deferral notes.

Personal accounts also support [reader profiles and household access](READER_PROFILES_AND_HOUSEHOLDS.md): separate adult/minor consumption identities with explicit sharing rights, protected controls and no inherited creator/organisation authority.

Scope revision: [unified titles, offers and subscriptions](CONTENT_OFFERS_AND_SUBSCRIPTIONS.md) defines blog posts as titles, source/editor authoring, mutually exclusive free/paid title classification, lifetime and/or subscription routes for paid titles, and independent grant provenance. Release order is R1 free ebooks → R2 free audio → R3 lifetime monetisation → R4 publisher teams → R5 households/minors → R6 sponsored consumption → R7 subscription programme → R8 full rollout. Earlier source inventories describe legacy behavior, not an exception to this target.

## Implemented workspace foundation

The monorepo is now restructured as described in [the workspace guide](../development/WORKSPACE.md): independent active frontend apps, a modular Go runtime, executable OpenAPI/shared transport and CI. Pre-rebuild screens/backend/schema have moved to `legacy/` outside active builds. Old Firebase deployment/rules/configuration have been removed. Planning source links refer to archived code or immutable Git history; historical deployment descriptions are evidence, not active setup. R0 is partially implemented, not completed: the API truthfully exposes disabled capabilities and unavailable business readiness.

## Roadmap and release delivery

Start with the [outcome-led product roadmap](PRODUCT_ROADMAP.md) for R0–R8 full book/account/profile/audio/blog delivery and R9+ content expansion. The [release execution plan](RELEASE_PLAN.md) defines creator/reader/staff feature briefs, web/Android/API coverage, cohort rollout, migration, go/no-go and recovery. These are proposed sequences and gates, not promised dates or deployed features.

Book launch can begin with invited adult/free slices while retaining legacy domains. Full agreed completion still includes organisations, sponsored reading, adult/minor profiles, audio and existing blog parity. Consumer web storefront/online ebook reading is an explicit proposed addition in R3; Android APK distribution remains the established mobile channel. iOS/store distribution and a public external API require separate release decisions.

The [content offers and subscription specification](CONTENT_OFFERS_AND_SUBSCRIPTIONS.md) is the detailed contract for editor/upload authoring, blog_post titles, channel migration, free/lifetime/package offers, monthly billing and creator allocations. Read it with the roadmap before implementing paid access.

## Read in this order

1. [Codebase review and feature inventory](CODEBASE_REVIEW.md): evidence from the existing implementation; proposed structures are not credited as shipped features.
2. [Accounts and user groups](ACCOUNTS_AND_USER_GROUPS.md): personal identity, organisation membership, creator capability, buyer/beneficiary scopes and proposed named-member licensing.
3. [Content types and containers](CONTENT_TYPES_AND_CONTAINERS.md): books first, distinct series/serial/composition structures, researched platform examples and later E1–E4 gates.
4. [Entity relationships](ENTITY_RELATIONSHIPS.md): cardinalities, parties, management, rights, publication snapshots, access grants and integrity rules.
5. [Titles and digital media](TITLES_AND_DIGITAL_MEDIA.md): concrete editorial/language editions, delivery variants, source preparation, assets and acceptance cases.
6. [Target architecture](ARCHITECTURE.md): module boundaries, launch versus future SQL structures, identity and transaction invariants.
7. [API and feature coverage map](API_MAP.md): typed resources, capabilities, commands and legacy replacements.
8. [Go backend implementation plan](GO_BACKEND_PLAN.md): B0–B13 book-launch work and dependencies for later expansion.
9. [Client integration and migration](CLIENT_INTEGRATION_PLAN.md): type-specific UX, compatibility, legacy mappings and cutover gates.

The profile specification refines the earlier User-only reading-state model: consumption state/access is profile-scoped, while login, creator and organisation authority remain User/account-scoped.

Commercial rule: content is **free or paid**, never both at once. Paid content may be lifetime-purchase-only, subscription-only, or both; each enabled paid route has its own terms. Samples and valid historical grants are distinct from current acquisition offers. See the [commercial configuration rules](CONTENT_OFFERS_AND_SUBSCRIPTIONS.md#free-versus-paid-then-paid-offer-selection).

## Agreed structural foundation

Planning consolidated 14 November 2026. These decisions apply throughout the documents:

| Concern | Foundation |
| --- | --- |
| Work identity | `Title` is one finite work; book is the enabled launch work type. Novel/textbook/monograph/reference/anthology are book forms; subject and audience remain separate |
| Grouping | Optional M:N series memberships carry order. Future serial publications have dated issue titles; composition pins included works to reviewed revisions. These are distinct relationships |
| Content hierarchy | Title → editorial edition → language edition → delivery variant → immutable content release; a publication revision freezes the approved customer-visible combination |
| Language and production | Multiple translations in the same language, bilingual metadata and independently identified narrations are supported by the proposed foundation; file corrections preserve product identity |
| Account types | Every person has an individual identity/personal account and may join organisation accounts. Each account independently enables creator capability; organisation licenses sponsor eligible members through explicit assignments |
| People and authority | Authenticated users, credited parties, managing accounts, rights holders and beneficiaries have explicit independent relationships |
| Access and money | Each launch purchase targets one delivery and creates an attributable grant; effective entitlement is derived. Series, language, container and contributor relationships confer no implicit access or earnings |
| Expansion | Same creator account and shared services, with explicit type-specific schema, commands, readiness, renderers and access coverage. Later profiles remain disabled until their end-to-end acceptance gates pass |

[Current Firestore shapes](../../SCHEMA.md) remain the runtime contract. The relationship/content plans define proposed domain semantics; architecture/API/client/milestone documents implement those decisions at their own level. If scope changes, update these linked contracts together rather than leaving an exception only in a specialist document.

## Recommendation

Build one Go application with domain packages, an API command, and a durable worker command. Use PostgreSQL for records, private object storage for ebook/audio sources, releases and evidence, and provider adapters for payments, email, and SMS. Begin with `net/http`, explicit SQL through `database/sql` and the pgx driver, and versioned migrations. Do not start by splitting each capability into a separate service.

| Concern | Target | Why it matters to Wolly |
| --- | --- | --- |
| Backend | Go HTTP API and Go worker | One place for authorization, publication rules, purchases, and entitlements |
| Database | PostgreSQL | Transactions and constraints for payment attempts, agreements, rights history, and payouts |
| Files | Filesystem adapter locally; private object storage in production | Large manuscripts and books stay outside SQL; delivery remains authorized |
| Authentication | Go-owned identities and sessions | Reader, creators, staff, and public-blog users share one account |
| Web apps | Existing Next.js/React apps | Preserve working screens and public server rendering |
| Mobile | Existing Flutter/BLoC app | Preserve reading experience and device storage; replace Firebase repositories |
| Payments | Paystack adapter plus deterministic local fake | Book purchases and subscriptions share one reliable event-processing path |
| Typesetting | Go-owned jobs; existing converter behind an isolated adapter initially | Avoid losing DOCX parsing, embedded fonts, EPUB validity, and provenance during the backend rewrite |
| Operations | Admin API, audit log, replayable jobs, reconciliation | Admin must support the whole publishing/payment lifecycle |

The transitional converter is the one deliberate Node.js exception. A strictly Go-only conversion implementation is a later, separately tested milestone; Chromium or another external rendering engine may still be needed for equivalent PDFs. Rewriting the business backend in Go does not require rewriting Flutter or the Next.js rendering layer.

## Coverage boundaries

The rebuild covers all implemented capabilities of the reader, Creator Hub, Backoffice, and public blog. It also assigns milestones to incomplete core workflows: scheduled publishing, newsletters, subscriber management, rights verification, contract activation/end, and real payouts. These are identified as completion work, not credited as existing production capabilities.

Physical book types and audiobook/channel switches exist in legacy metadata, but do not establish functioning products. The initial catalog release supports book ebook/audiobook products; blog posts become canonical titles presented through publication channels. Other finite work types, periodicals/issues, component publishing and new commercial models follow the staged content-type plan. Electronic-only scope continues: no paperback, hardcover, printing, shipping or inventory. Audio preparation, playback and commerce are explicit new work in B5–B8 and B13. Archive unsupported legacy physical metadata for reconciliation. External retailer distribution and a rights marketplace remain deferred.

Deferred blog ambitions remain deferred: podcast/private RSS, video/live, Notes/restacks, custom domains, DMs, group/gift subscriptions, referral programs, external CMS imports, A/B tests, drip campaigns, and recommendation networks. Per-buyer watermarking and remotely enforced offline revocation are not implemented either.

## Outcome release sequence

| Release | Customer/operator outcome |
| --- | --- |
| R0 | Safe delivery foundation, account/content contracts, isolated QA and operating ownership |
| R1 | Invited adults read free ebooks published and corrected through creator/staff review |
| R2 | Prove free audio discovery/listening on Android and supported web before monetisation |
| R3 | Lifetime-purchase ebook/audio/web_text on Android/web, recoverable checkout and reconciled payouts |
| R4 | Publisher teams publish and monetise authorised organisation catalogs |
| R5 | Adults/minors use isolated household profiles under declared sharing and suitability controls |
| R6 | Consuming-only organisations fund explicitly licensed member reading |
| R7 | General monthly subscription packages across included titles, with channel/newsletter/community parity |
| R8 | Supported legacy/new users migrate with reconciled access/finance and proven recovery |
| R9+ | E1 short works, E2 periodicals, E3 composition/scholarly features and E4 periodical/installment-specific offers beyond core R7 subscriptions, independently enabled |

The [roadmap](PRODUCT_ROADMAP.md) maps each release to B0–B13/E1–E4 engineering work and makes each surface/audience explicit. B milestones are implementation dependencies, not standalone releases. Each release migrates only ready domains through the [release plan](RELEASE_PLAN.md); R8 completes parity and retirement rather than postponing all migration until the end. Consumer web, organisation and household capabilities are not complete merely because the API supports their fields.

## Decisions to settle before the affected milestone

These do not block beginning B0. The proposed defaults let implementation proceed in small slices; resolve commercial and rollout policy before its production behavior is enabled.

| Decision | Proposed default / point of resolution |
| --- | --- |
| Firebase removal scope | Remove Auth/Firestore/Functions/Storage from business runtime; keep client hosting/distribution initially. Confirm during B1 architecture setup. |
| Strictly Go-only conversion | Retain a private Node conversion adapter first; evaluate a full port against the fixture corpus in B6. |
| Initial supported currency/country | Preserve GHS book commerce first; reference/display currencies do not imply provider support or FX. Decide multi-currency charging and settlement before B8/B9. |
| Contract end versus past-buyer access | Preserve purchased access after ordinary commercial withdrawal where policy permits; rights revocation remains a separate block. Finalize before B7 transitions. |
| Price floor, refund/chargeback and payout timing | Configure from approved commercial policy/provider costs, not guessed values. Resolve before B8/B9 production use. |
| Blog revenue split and payout basis | Define separately from book publishing contracts; hold automation until decided in B11. |
| Audio production policy | Version Wolly codec/quality/upload limits, narration/disclosure policy and sample rules in B6/B7; device-test background/offline playback before enabling audio sales. |
| Organisation sponsored access | Proposed named-member licenses per permitted delivery; agree offer coverage, capacity/term/reassignment, refund and offline policies before B8 sponsored sales. Internal-only distribution and institutional subscriptions need separate acceptance |
| Staff responsibilities | Separate moderation, rights, publishing, finance and permission administration; finalize approval authority in B2/B7/B9. |
| Identity continuity and old Android support | Prefer bounded verified migration bridge plus explicit sunset; rehearse recovery and update requirements before B13. |
| Data retention, newsletter delivery and metric definitions | Choose explicit retention/consent rules, providers and view/read definitions before B12/B13. |

## Working through a milestone

For each milestone: read the linked current code; identify actors, allowed states, and denied actions; implement one behavior; try it from the relevant existing screen; and test its most harmful failure. Learn packages, structs, interfaces, errors, HTTP, SQL, transactions, and concurrency as those milestones introduce them.

Starter prompt:

> Read docs/rebuild/README.md and B0 in GO_BACKEND_PLAN.md. Implement B0 only under backend/go. Explain the Go concepts as we use them. Keep the current applications available as references. Show the command to run the server and how to inspect its response. Do not introduce later milestones.

No source application behavior, provider configuration, or deployment was changed by this assessment.
