# Wolly assessment and Go backend rebuild

Prepared 30 October 2026 from `main`, commit `236c8fd`. This is a source-based assessment and implementation outline. **No Go backend has been implemented, and no production state was inspected.**

This follows the structure of the sibling Ripple assessment in `../Ripple/docs/rebuild/`. The target is a Go-owned backend without Firebase runtime dependencies. That is a proposed direction based on the Ripple precedent, not a change already made. Keep Flutter for the reader and Next.js/React for the existing web surfaces; replace their data and authentication integrations progressively.

Product refinement, 13 November 2026: **titles are parent works with independent ebook and audiobook deliveries; electronic content only**. The [title and digital-media specification](TITLES_AND_DIGITAL_MEDIA.md) defines the updated product model, creator flows, ebook editor/imports, audio proposal and acceptance cases. It governs the target design where the original book-centric assessment differs. These additions remain planned work.

## Read in this order

1. [Codebase review and feature inventory](CODEBASE_REVIEW.md): capabilities, source evidence, incomplete features, and risks.
2. [Titles and digital media](TITLES_AND_DIGITAL_MEDIA.md): parent titles, ebook/audio entities, assets, researched audio workflow and electronic-only scope.
3. [Target architecture](ARCHITECTURE.md): Go modules, SQL model, identity, files, jobs, and business invariants.
4. [API and feature coverage map](API_MAP.md): proposed endpoints for reader, Creator Hub, admin, and public blog; replacements for existing functions/triggers.
5. [Go backend implementation plan](GO_BACKEND_PLAN.md): learning-sized milestones with observable completion checks.
6. [Client integration and migration](CLIENT_INTEGRATION_PLAN.md): changes to Flutter/Next.js, migration sequence, compatibility, and cutover gates.

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

Physical book types and audiobook/channel switches exist in legacy metadata, but do not establish functioning products. The rebuild supports ebooks and audiobooks only: no paperback, hardcover, printing, shipping or inventory. Audio preparation, playback and commerce are explicit new work in B5–B8 and B13. Archive unsupported legacy physical metadata for reconciliation. External retailer distribution and a rights marketplace remain deferred.

Deferred blog ambitions remain deferred: podcast/private RSS, video/live, Notes/restacks, custom domains, DMs, group/gift subscriptions, referral programs, external CMS imports, A/B tests, drip campaigns, and recommendation networks. Per-buyer watermarking and remotely enforced offline revocation are not implemented either.

## Suggested delivery slices

| Slice | Milestones | Demonstrable result |
| --- | --- | --- |
| Foundation | B0–B2 | Go starts, SQL persists, users sign in with the correct permissions |
| Reader | B3–B4 | Browse, read a free book, restore progress, bookmark, follow, submit a review |
| Publishing | B5–B7 | Save a title, prepare/edit/preview an ebook or ordered audiobook chapters, inspect per-delivery readiness, declare rights, sign and obtain staff approval |
| Commerce | B8–B9 | Buy once, recover a missed confirmation, report frozen earnings, record an actual payout |
| Blog | B10–B12 | Author, schedule, render, subscribe, enforce a paywall, interact, and deliver newsletters |
| Production | B13 | Complete client migrations and rehearse import, recovery, and reversible cutover |

A useful local first release is B0–B4 with seeded free books. A complete local book-publishing loop reaches B8 using fake payments. Audio requires the new B6 audio pipeline and Flutter listening checks; the early ebook slice alone does not establish it. Full scope requires the remaining milestones and client checks, not just a list of Go handlers.

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
| Staff responsibilities | Separate moderation, rights, publishing, finance and permission administration; finalize approval authority in B2/B7/B9. |
| Identity continuity and old Android support | Prefer bounded verified migration bridge plus explicit sunset; rehearse recovery and update requirements before B13. |
| Data retention, newsletter delivery and metric definitions | Choose explicit retention/consent rules, providers and view/read definitions before B12/B13. |

## Working through a milestone

For each milestone: read the linked current code; identify actors, allowed states, and denied actions; implement one behavior; try it from the relevant existing screen; and test its most harmful failure. Learn packages, structs, interfaces, errors, HTTP, SQL, transactions, and concurrency as those milestones introduce them.

Starter prompt:

> Read docs/rebuild/README.md and B0 in GO_BACKEND_PLAN.md. Implement B0 only under backend/go. Explain the Go concepts as we use them. Keep the current applications available as references. Show the command to run the server and how to inspect its response. Do not introduce later milestones.

No source application behavior, provider configuration, or deployment was changed by this assessment.
