# Wolly product roadmap

Proposed 14 November 2026. Outcome-led sequencing for the requirements in this rebuild. Read with the [release plan](RELEASE_PLAN.md), [implementation milestones](GO_BACKEND_PLAN.md) and [product contracts](README.md#read-in-this-order). No release below is implemented or scheduled by this document. Release owners and dates must be assigned against actual capacity; no production systems were inspected.

Scope revision: [unified titles, offers and subscriptions](CONTENT_OFFERS_AND_SUBSCRIPTIONS.md) defines blog posts as titles, source/editor authoring, mutually exclusive free/paid title classification, lifetime and/or subscription routes for paid titles, and independent grant provenance. Release order is R1 free ebooks → R2 free audio → R3 lifetime monetisation → R4 publisher teams → R5 households/minors → R6 sponsored consumption → R7 subscription programme → R8 full rollout. Earlier source inventories describe legacy behavior, not an exception to this target.

## Product direction and sequencing strategy

Make Wolly a place where people discover, read and listen, where individuals and publishers distribute approved content and receive attributable earnings, and where organisations/households can fund access without losing reader identity or control of rights.

Build toward that outcome through complete, constrained journeys. First prove free reading and listening with creator/staff publication, then lifetime sales and payout, then publisher teams, households and sponsored reading. Free audio is validated in R2 before one-off monetisation in R3. Household/minor access precedes institution-funded consumption, and R7 introduces a general monthly subscription programme across explicitly included titles. Preserve existing production functionality during domain migration; a new release can support a smaller invited cohort without deleting legacy capabilities. The full agreed rebuild includes organisation accounts, sponsored consumption and adult/minor profiles, even where early releases deliberately expose only personal access.

Use one identity/account/Party foundation, explicit profile-level reading state and grant provenance, and a modular Go backend. Build the first useful form of each experience, observe actual failures, and improve before increasing audience. Do not start future periodicals or generalized composition before the book model and its operating processes work.

Five product tactics guide delivery:

1. Recruit creators/readers together around a small authorised catalog, including a novel, academic-book fixture, multiple languages and eventually audio. Validate rights and usable content before recruiting more demand.
2. Include the staff tool and recovery process with every customer feature: no paid release without settlement inspection/refunds, no creator release without review/withdrawal, no sponsored release without member/seat recovery.
3. Use explicit commercial offers: personal product, organisation license and household-sharing terms are different promises. Agree economics, coverage and support procedures before sale.
4. Preserve identity and content provenance through corrections and migration. Never ask readers to rebuy merely because storage/API architecture changes; unresolved ownership becomes a managed exception.
5. Treat web, Android and API as one product system with deliberate surface scope. A working handler or screen is evidence of a component, not an outcome.

## Surface and audience commitments

| Surface | Existing source / intended role | Roadmap commitment |
| --- | --- | --- |
| Reader Android | Existing Flutter/BLoC client; APK through Firebase App Distribution | Free ebook then free audio, lifetime offers, profiles, sponsored reading and general packages. QA cohort precedes production tester distribution; store publication is a separate channel decision |
| Consumer web | No standalone consumer bookstore/reader is deployed by the current workflow | Proposed new responsive discovery/storefront, account/library, checkout and online ebook reading in R3. Scope/navigation/hosting decision in R0; new work, not claimed legacy parity. Supported mobile browsers included in verification |
| Creator Hub web | Existing Next.js/React | Personal publishing first; then account switching, publisher teams, editions/translations/production variants, audio and blog controls |
| Organisation administration web | New customer workflow within account management/Creator Hub shell, never Wolly staff Backoffice | Invites/roles, license buying/assignment and billing; consuming-only organisations do not need creator enrollment to administer members |
| Wolly Backoffice web | Existing staff client, requiring new tools | Roles, publishing/rights, finance, jobs, account support, licensing/profile incidents and operational audit alongside customer releases |
| Public blog web | Existing SSR client, public URLs/SEO/RSS | Keep legacy writer until each verified cutover; blog_post titles/editor/channel rendering integrate by R3, with package subscriptions/newsletter parity in R7 |
| Go API + worker | New internal product backend | Versioned contracts, scoped access, immutable revisions, transactions/jobs and service operations in every release. Required for all clients; external developer API/keys/SDKs are not a public launch promise |
| iOS / other distribution | Not an established deployment path in the inspected workflow | Later explicit decision after device demand, build/signing/distribution, playback/offline and payment-channel requirements are validated; no implied Android parity |

R2 adds a minimal free web audio player; R3 browser ebook reading is a proposed addition to existing scope, included here to make web consumption concrete. If capacity cannot support it at that stage, record a deliberate scope change and later owner/release; do not label a discovery-only website a complete web reader. Android and supported web are both required before declaring full cross-surface R8 completion. Audio offline/background requirements apply to Android; web commitments are stated separately.

The [unified title/offer/subscription contract](CONTENT_OFFERS_AND_SUBSCRIPTIONS.md) governs this revised sequence, editor-authored blog titles and the three access modes. It supersedes the earlier separate-blog billing model.

## Outcome roadmap

| Release | Outcome / audience | Essential dependency | Technical mapping |
| --- | --- | --- | --- |
| R0 — Release foundation | Team can safely build, test and support a domain slice without risking existing users | Account/content decisions and environment inventory | B0–B2 foundations, B13 environment/import preparation |
| R1 — First reading loop | Invited adults can discover and finish a free ebook; one creator and staff can publish/correct it | R0 | B3–B4, ebook subset B5–B7 |
| R2 — Free listening | Adults can access reviewed audio before any payment framework | R1 plus audio processing/publication and mobile/web player | Audio B5–B7/B6 consumer slices; free access, no B8 dependency |
| R3 — Lifetime monetisation | Readers buy supported ebook/audio/editor-authored products once; creators reconcile earnings/payouts | R1–R2 plus offers/finance and supported web reading | B8–B9, early unified editor/title parts of B10, release-specific B13 |
| R4 — Publisher workspace | Organisation teams publish and monetise an authorised catalog | R3 and organisation identity/membership foundations | Organisation B2/B5–B7/B9 |
| R5 — Household readership | Adults/minors have separate eligible reading/listening under declared sharing | R3 and profile/suitability/session controls | Profile B2–B4/B7–B9 and B13 acceptance |
| R6 — Sponsored reading | A consuming institution funds licensed member reading/listening | R3/R4 account and license tools; household isolation from R5 | Organisation B3–B4/B8–B9 |
| R7 — Monthly subscription programme | Readers pay for packages of eligible titles across content types/formats | R3 shared commerce plus rights/coverage/allocation and compatible readers | B11–B12, unified title/channel B10 and B13 migration |
| R8 — Full rebuild rollout | Supported users and operators use Go-authoritative domains with reconciled history and recovery | R1–R7 gates and full B13 evidence | All B0–B13 requirements, actual existing parity and exceptions |
| R9+ — New publishing forms | Additional short works, periodicals, composition and advanced content offers become usable separately | Proven books/account/access foundation | E1–E4, each a distinct release gate |

This is release sequencing, not an instruction to finish one entire B milestone before touching another. Define full ancestry, profiles, account types and grant boundaries early; expose capabilities only when their end-to-end release is ready. Production migrations are per domain/cohort and happen through every release, not only R8.

## R0 — Establish a trustworthy delivery foundation

**Outcome:** an engineer can run the system locally, a product lead can inspect the first journey, and operations knows how to release/recover it.

Product tactics: appoint release/product, engineering and operations decision owners; confirm first market/currency, personal terms, reader-web scope and supported Android/browser matrix. Identify invited pilot creators/readers and usable novel/academic/multilingual fixtures. List rights/pricing/privacy/organisation/household decisions with accountable owners; defer only the features that depend on unanswered decisions.

Engineering tactics: B0 HTTP skeleton, PostgreSQL/migrations/OpenAPI/error/idempotency foundations; default reader profiles, individual/organisation account identity and Party separation; approved metadata/content ancestry and publication snapshots; provider fakes and controlled local outbox. Implement the identity subset needed by R1 and track every retained sign-in method before its users migrate. Separate API/worker configuration and readiness; begin CI, restore and sanitized import rehearsals. Inventory actual Firebase deployment/callback/identity dependencies before choosing cutover boundaries.

Surfaces: runnable API/worker; local Android API read; Creator Hub/Backoffice proxies and staff admission; consumer-web architecture decision. No public feature migration or live charging yet.

Gate: a clean local setup survives restart; invalid privilege escalation is denied; the first safe test environment is demonstrably isolated. Release engineering accounts for the current workflow's blog/shared-backend exceptions, as described in the release plan.

## R1 — Prove a free ebook publishing and reading loop

**Outcome:** an invited adult finds a reviewed free ebook, reads it on Android, returns to the right location and trusts that their state is private. A creator can correct it without breaking readers.

Creator: personal creator enrollment, resumable title drafts, book-form metadata/credits, first/revised editions, translations (including alternative same-language identity), series membership, default delivery variant, scoped artwork, supported document ingestion and honest read-only PDF/EPUB preview. Implement added DOC/editor routes in bounded slices; do not advertise unimplemented source formats. Staff-reviewed rights/free-distribution agreement/readiness and publication snapshots precede discovery; no price/payment prerequisite for a free delivery.

Reader: auth/recovery for the enabled cohort, default profile, exact language/format filters, author Party pages/follows, eligible free library, EPUB/PDF rendering, progress/bookmarks and deliberate samples. Android save/reopen is tested independently of merely having download utilities. Public reviews remain user-authorised/moderated with one work-level vote; avoid creating review votes per profile.

Staff/API: permission-protected catalog/review/rights decisions, suspend/withdraw/restore, jobs/retry diagnostics and audit. Conversion worker preserves provenance; stale jobs/drafts cannot switch approved content. Public title responses omit private siblings. Direct-file and cross-account substitution denial is part of the demo.

Gate: creator → review → publish → discover → read → resume → corrected release works; old locators remain usable or offer explicit tested mapping/restart. Novel/academic fixtures describe known rendering limits. Product sessions identify blockers before inviting paid users. Organisation consumption, dependent profiles and audio remain feature-disabled until their own releases.

## R2 — Prove free audio access early

**Outcome:** adults can discover an audio-only or ebook/audio title and listen for free on Android and supported web before checkout exists.

Creator web: ordered chapter uploads/retry, narrator/language/production identity, square artwork, samples and processing diagnostics. Staff reviews the exact audio manifest, rights and quality; publication/correction does not require a paid offer. Preserve independent narrations and stale-job protection.

Android: chapter player, seek/resume, speed, sleep timer, background/headset controls and validated offline behavior. Consumer web: bring forward the minimal approved title/sample and online chapter-player surface, with supported browser seeking/resume; full storefront/checkout/ebook web reading follows in R3. API/worker: measured/validated playback, short-lived authorization and renewal, range requests and private masters. Use an approved free offer; no payment dependency or zero-value fake sales.

Gate: publish → find → listen → interrupt → resume works on actual Android and supported browsers; audio-only titles require no ebook. Replacements/late jobs cannot mutate approved content. Rights revocation and source/privacy checks pass. Household/institution audiences activate later after their own access gates; read-along is not implied.

## R3 — Monetise titles with lifetime access

**Outcome:** an invited adult can buy one exact eligible ebook, audio or web_text product with lifetime access on Android or supported web, recover an interrupted checkout and access what they bought; a creator can explain their statement and receive a confirmed payout.

Reader web tactics: responsive approved catalog/detail/sample, personal authentication/default profile, library, online EPUB/PDF reading and progress sync, purchase status/history and account recovery. Implement browser format limitations explicitly. Offline web reading is not promised. Retain platform-appropriate Android reader behavior and verify mobile-money interrupted return/deep-link recovery.

Creator/staff tactics: configure supported personal offers/currency, freeze beneficiary/terms, reconcile statements; provide finance roles, attempt/provider-event inspection, charge verification, overpayment/refund handling and confirmed operator-managed payouts. Payout automation is not needed to establish a real payout; evidence and reconciliation are.

Engineering tactics: one settlement transaction/inbox/outbox and ledger per currency; account purchaser versus actor distinction; profile grant derivation, expiry/rights checks, current versus purchased publication facts; price/refund policy tests, browser CSRF/private caches and provider sandbox verification. Rehearse controlled live-payment operations before a funded pilot under explicitly approved limits.

Gate: retry/race/timeout cases grant once and reconcile exactly; paid EPUB/PDF/audio/web_text cannot leak via samples/direct URLs/cache. A pending payment never becomes ownership; refund follows defined access policy; sale/fees/beneficiary/ledger/payout balances reconcile. Support can resolve a failed purchase without editing arbitrary database fields. Expand only within the release plan's live operational controls.

Offer/editor scope: complete the unified title draft/editor workflow for sold blog_post/web_text products, source-specific DOC/PDF/EPUB validation and immutable publication. Creators choose either free access or paid access (lifetime purchase, subscription, or both) independently of source/work type; package enrollment comes in R7. The same title is rendered through its blog channel and catalog without duplicate content/payments. Lifetime grants survive ordinary offer withdrawal and future subscription expiry under published rights/service terms. Test purchasing previously free audio without inventing earlier ownership.

## R4 — Enable publishers and institutional creators

**Outcome:** a publisher can publish a catalog through invited employees, without sharing credentials or confusing author credit, contract authority and organisation earnings.

Creator web: organisation setup/profile, invitations/acceptance/expiry/revocation, account switcher, role templates, creator enrollment, catalog editor and signer flows, account-scoped analytics and finance. Bulk catalog import is a later bounded tool unless needed and verified for the pilot; manual upload is sufficient initially. Existing personal catalogs are not silently moved to the new organisation.

Reader web/mobile: clearly credit original author, translator/narrator and publisher; maintain stable product identity and accurate availability. Being published by an organisation does not require a reader to join it.

Staff/API: representative/beneficiary readiness, canonical agreements, audit, role/session support, last-owner protection and scoped staff rights review. Prove removing an employee does not destroy the catalog or rewrite receipts. A member can work in organisation Creator Hub without personal creator enrollment.

Gate: invited editor prepares, authorised signer submits, independent staff approves, buyer reads, organisation receives correct statement/payout. Editor cannot sign/change payout; signer cannot self-approve as staff; switching organisations exposes no foreign catalog/finance data. Public distribution is supported; internal-only institutional publishing needs separate audience-scope work.

## R5 — Support household readers and managed minors

**Outcome:** a payer enables separate reading experiences for adult dependents and minors, while preserving each profile's progress and declared access/privacy boundaries.

Product tactics: agree household-sharing coverage/profile/concurrent-device limits with rights holders; obtain content suitability policy and guardian visibility/consent decisions before minor access. Start invited adult-profile testing, then add managed minors only after their gate. Existing owner-only purchases do not silently expand.

Reader Android/web: profile picker distinct from workspace/account switch; separated home/preferences/recommendations/library/notes; locked adult profiles; owner-managed minor settings/blocked works and profile-bound device sessions. Restrict payments, creator/account tools and initial public engagement in dependent contexts. Parent controls work on web; paired mobile device need not hold owner credentials.

Creator/staff/API: eligibility and classification inputs, missing-classification review, household offer terms and support for profile locks/session revocation. Enforce profile policy on catalog metadata, samples, manifests, download links and bytes, including stale caches/refresh. Protect real principal attribution and avoid duplicate sale/royalty/review metrics.

Gate: adult/minor isolation, no escape via profile IDs/direct endpoints/refresh, no inherited organisation roles/seats, declared offline limits and independent-grant behavior pass. Document adult privacy limits honestly. Preserve the path to independence; guided audited profile transfer is acceptable initially if consent, target access and collisions are handled, with self-service later.

## R6 — Fund reading through organisations

**Outcome:** a consuming-only institution acquires permitted named-member licenses and members read without paying personally.

Product tactics: recruit a small institution and willing rights holders. Agree selected-product eligibility, capacity/term/reassignment/refund/retained access and offline policy before purchase; no assumed whole-catalog subscription. Support explicit administrator purchase first; no automatic member spending or wallet.

Organisation web: member onboarding, license offer/checkout, capacity assignment/revocation, receipts and utilisation at permitted granularity. Separate purchaser, curator and creator-finance permissions. Creator web shows organisational-offer eligibility/terms only when implemented; staff can inspect a license/member incident without exposing private annotations.

Reader Android/web: one identity, sponsored versus personal library labels, assigned-product reading and renewal/unavailable states. Member removal/expiry rechecks sponsored eligibility while preserving private progress and independent personal grants. Organisation admins do not receive a member's private reading history/notes by default.

Engineering/API: license/assignment provenance and concurrent seat locking, intentional extra-capacity actions distinct from duplicate settlement, same-account permissions, rights/availability integration, session/cache invalidation and scoped exports. Organisation accounts do not need creator enrollment to buy/assign licenses.

Gate: licensed assignment works on both reader surfaces; concurrent assignments cannot exceed capacity; member removal/refund/expiry has the contracted effect without affecting independent grants. Named seats cannot be used by household dependents. No institution rollout until offline behavior and reporting boundaries match the offered terms.

## R7 — Launch the monthly subscription programme

**Outcome:** readers pay monthly for an explicit package of titles and creators receive auditable subscription earnings, while lifetime purchases remain independent.

Creator/operator web: curate packages with approved delivery/language/production coverage, immutable membership/price versions, creator inclusion/royalty agreements, household/institution eligibility and clear current/next-period changes. A title is either free or paid. Paid titles can enable lifetime purchase, subscription inclusion, or both; free titles cannot have active paid offers. Platform multi-publisher packages require explicit participant and allocation agreements; no invented revenue split or implicit all-catalog inclusion.

Reader web/Android: browse/compare packages, enroll with supported recurring payment, view paid-through/pending/failed/cancelled state, consume included ebook/audio/web_text and distinguish subscribed from owned. Cancellation preserves the paid-through period; expiry removes only subscription-derived eligibility. Apply profile suitability, sharing/seat and offline-validity policy to every format. Packages are reusable content sets, not a user-wide paid flag.

Staff/API/finance: paid-period coverage snapshots, supported provider plans, durable charge inbox/reconciliation, renewal/cancellation/plan transitions, complimentary grants and per-currency allocations/refunds/payouts. Preserve existing legacy annual/prepaid promises and provider mappings. Blog posts migrate to titles, publications become channels; channel-following/email consent remain separate from paid coverage. Retain old public URLs/SEO/RSS and bounded free excerpts; maintain scheduling, subscriber administration, moderation and consent-aware newsletters as cross-title/channel engagement work.

Gate: two distinct packages and simultaneous lifetime ownership behave correctly; renew/expire/refund/replay and package-content/price changes preserve contracted period access and historic earnings. No paid body leaks through file links, HTML/JSON/prefetch/RSS/email/cache; no household reuse of a named organisation seat. Legacy post→title, tier→package and coverage/period transition reconcile before each domain cutover. Follow the [full offer/subscription specification](CONTENT_OFFERS_AND_SUBSCRIPTIONS.md) for provider constraints and all acceptance cases.

## R8 — Complete migration and widen the audience

**Outcome:** existing and new supported cohorts use the rebuilt product with reconciled access, financial history and dependable operations.

Complete all retained authentication paths and inventories R/C/A, generated client adapters, account/profile/type compatibility, live facts audit, rerunnable imports and explicit unresolved exceptions. Reconcile private objects/token URLs, default profiles, named Party follows, catalog ancestry/publication snapshots, personal grants, current licenses, payment/beneficiary/ledger facts, subscription periods and payouts. Train support/moderators/finance and rehearse restore and write-aware rollback. Retire old clients/writers/provider callbacks only at explicit cutover boundaries.

Audience widening proceeds from invited cohorts to controlled beta to general availability separately per capability; GA of personal ebooks does not certify audio, minors or institutions. Full rebuild completion requires all agreed R1–R7 target cohorts/surfaces and B13 evidence. Existing users are not forced into a feature-disabled replacement that loses purchases or paid subscriptions.

Gate: every release-specific gate and parity exception has a named disposition; no unresolved critical access/privacy/financial integrity defect, unexplained ledger/access reconciliation gap or missing on-call/restore capability. Measured load/cost supports the next cohort and rollout can pause without corrupting state. Decide release scope and evidence before public positioning.

## R9+ — Add publishing types through explicit outcomes

| Gate | Outcome and all-surface requirement |
| --- | --- |
| E1 short works | Creator publishes a standalone story/poem/essay without a dummy book; reader finds/reads or listens through an enabled product; staff can review rights/type/quality and reverse publication. Android/web/API/profile/organisation compatibility verified |
| E2 periodicals | Publisher creates a serial and distinct dated issues; reader browses archive and obtains a specific issue; staff resolves issue corrections/rights. Start supported whole-issue renditions; no automatic OCR/article extraction or archive subscription |
| E3 composition / scholarly features | Creator includes authorised, pinned article/chapter/story works; reader sees correct credits and content scope; staff reviews inclusion provenance/corrections/retractions. Independently enabled academic workflows require evidence for review claims and no component access to protected whole-container bytes |
| E4 recurring content offers | Creator sells a defined issue/archive/serialized/bundle promise; reader understands coverage/expiry/retained access; staff can reconcile allocations/refunds and recover billing. No generic membership-based grant expansion |

Internal/private institutional distribution, public developer APIs, iOS/store launches, wallets, campus SSO, multi-beneficiary royalties, external retail distribution, automated strict-Go conversion replacement and synchronized read-along each need their own decision, owner and release brief; no implied completion from an adjacent feature.

## Learning, outcomes and planning cadence

These are proposed measurements, not observed performance or approved business targets. Baseline during the appropriate pilot, choose numeric goals with product/operations before expansion, and record cohort/surface/grant source so aggregate growth cannot conceal failures.

| Outcome | Measurement and evidence | Decision informed |
| --- | --- | --- |
| Useful consumption | Eligible readers who successfully open entitled content and return to meaningful reading/listening in a defined period; exclude staff/demo events | Improve discovery/onboarding/reader quality before broad acquisition |
| Successful publishing | Submitted deliveries that reach reviewed publication; time blocked by creator versus staff versus processing | Remove dominant workflow friction and match moderation capacity |
| Trusted commerce | Settled attempts with correct access; unresolved provider events, refund cases and reconciled statement/payout outcomes | Stop paid expansion on unexplained money/access discrepancies |
| Organisation value | Invited members activated, valid assigned capacity used, assignment failures and sponsor renewal intent | Validate institutional offer and administration burden before adding sales volume |
| Household value | Active eligible profiles and repeat reading by type; lock/policy/isolation failures measured separately | Grow only with privacy/age-control gate intact; minors' instrumentation is minimal and policy-approved |
| Sustainable operation | Job queue age, support cases per active cohort, recovery time, delivery/storage/provider cost per activity unit | Staff and price the service before larger cohorts |

No financial integrity or private-data defect is traded against engagement. Track success and failure denominators, pending transactions separately, currency-separated revenue and account purchases separately from profile activity. Do not set a word/time threshold as proof of learning or completed reading without validation.

Plan in proposed two-week increments after R0: select one outcome slice, define cross-surface acceptance, demo it with real roles, review evidence, and adjust the next slice. Estimate earliest date ranges only after a measured R1 slice and assigned capacity; reforecast after each gate. R2 media validation and R4 membership exploration can proceed independently once foundations are stable, but launches retain their stated dependencies. An active dependency must have an owner and due decision, not an undocumented guess. The release plan defines execution and go/no-go mechanics.
