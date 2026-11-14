# Wolly release execution plan

Proposed 14 November 2026. Operational companion to the [product roadmap](PRODUCT_ROADMAP.md). It defines how an outcome becomes a scoped, tested, supportable release across users and surfaces. It does not authorise a deployment, publish dates or claim live readiness. Assign the accountable people and operating thresholds before applying a production gate.

Scope revision: [unified titles, offers and subscriptions](CONTENT_OFFERS_AND_SUBSCRIPTIONS.md) defines blog posts as titles, source/editor authoring, mutually exclusive free/paid title classification, lifetime and/or subscription routes for paid titles, and independent grant provenance. Release order is R1 free ebooks → R2 free audio → R3 lifetime monetisation → R4 publisher teams → R5 households/minors → R6 sponsored consumption → R7 subscription programme → R8 full rollout. Earlier source inventories describe legacy behavior, not an exception to this target.

## Definition of a release

A release is an enabled capability for a named audience, surface and data domain, with evidence and recovery ownership. Code deployment and capability activation are separate events. A capability may be deployed dark, enabled for staff, exposed to invited customers and expanded later without changing its identity or declaring incomplete audiences supported.

Use a release manifest with: release/slice ID, commit and artifact digests, API/schema/profile versions, migration versions, enabled account/work/profile/delivery types, supported client versions, cohort/account allowlist, domain writer/callback owner, feature flags, acceptance evidence, decision owners, rollback artifact/method, known limitations and observation-window conditions. Never put secrets or personal roster data in public release notes.

## Scope every feature as a complete journey

Before implementation, complete this brief. A non-applicable surface must have an explicit reason and a user route through another supported surface; “API done” cannot stand in for a missing client.

| Brief field | Required answer |
| --- | --- |
| Outcome / problem | Which reader/creator/operator task improves, and what observed behavior proves it? |
| Audience and principal | Individual or organisation; owner/editor/member/finance; primary/adult/minor reader profile; authenticated User or restricted ProfileSession |
| Creator journey | Setup/draft/source/rights/terms/submission, publication or correction, reporting and withdrawal effects |
| Reader journey | Discovery, exact language/edition/production selection, access/purchase, consume/resume, denial/recovery and old-grant behavior |
| Staff journey | Review/decision, queue/diagnostics, suspension/refund/repair, audit and support visibility without unrestricted private-data access |
| Web channels | Consumer web, Creator Hub, customer organisation/household administration, Wolly Backoffice, public blog; which commands/states appear where? |
| Mobile | Android rendering/background/offline/deep-link/shared-device behavior; unsupported platforms and explicit version/update handling |
| API/worker | DTOs, authority checks, same-tree constraints, idempotency, transaction/job semantics, observability and capability versions |
| Access/commercial terms | Buyer, beneficiary, delivery/release/publication identity, organization seats or household coverage, rights/maturity/date/territory and refund/expiry policy |
| Migration / compatibility | New versus legacy mapping, backfill/reconciliation, accepted old clients, writer ownership and caches/files already issued |
| Evidence / exclusions | Positive and denied scenarios, relevant role/surface pairs, operating measurements, known limitations and feature-disabled combinations |
| Rollout / recovery | Cohort and sequence, support contact/owner, pause signals, safe rollback/fix-forward action and release decision authority |

Example: `R6-S1 assign an institution license` is complete when an authorised customer curator assigns paid capacity on web, the invited member reads on Android and supported browser, creator/staff can inspect the relevant licensed offer/terms and purchase without private notes, and API concurrency denies an excess/foreign assignment. Refund/removal/expiry and independent-personal-grant behavior are included. A seat table or assignment endpoint alone is incomplete.

## Release train and cohort progression

| Stage | Audience / environment | Evidence before next stage |
| --- | --- | --- |
| Local contract slice | Engineers, synthetic/authorised fixtures, fake providers | Domain/handler and required PostgreSQL concurrency checks; smallest creator/reader/staff demo |
| Isolated integration / QA | QA accounts on staged web and QA APK; provider sandbox | Supported surface/role matrix, jobs/restart behavior, API compatibility and seeded deny cases |
| Staff dogfood | Explicit invited adult staff/creators/readers | Real task walkthroughs, support diagnostics and approved release notes; do not treat staff privileges as reader authorization |
| Closed capability pilot | Named invited creators/readers; organisations and minors only after their own controls pass | Verified scope/terms/support, controlled real operations, actual issue triage and observation-window report |
| Controlled beta | Explicit larger cohorts per surface/account capability | Measured service/support headroom, no unresolved integrity/privacy gate failures and demonstrated recovery |
| General availability | Supported audience/surfaces/version range only | Accountable product/engineering/operations go decision, claims matching functionality and documented exceptions |

Cohort sizes, observation windows, load targets, payment/payout limits and response thresholds are required release inputs, not invented constants here. Agree them before the pilot based on team support capacity and expected traffic. Absence of those inputs blocks expansion; time passing alone is not evidence. Roll out minor profiles after adult-profile isolation tests and a dedicated minor-control/terms gate; never use children to find basic privilege defects.

R1 personal/free pilots can run before later paid/package/organisation rebuild completion because existing domains stay on their verified legacy writer. Production release switches must be per capability/domain and supported client, not an independent dual-write arrangement. Full target GA and final rebuild completion still require the entire agreed scope in R8.

## Cross-surface acceptance matrix

| Outcome | Reader web | Reader Android | Creator/customer web | Staff web | API/worker and verification |
| --- | --- | --- | --- | --- | --- |
| R0 foundation | Architecture/proxy decision | Safe API fixture | Auth/capability shell | Staff admission/roles | Migrations, auth, profiles, jobs, environment isolation |
| R1 free books | Optional pilot discovery/landing; not web-reader completion | Full free ebook read/resume | Personal draft/rights/preview/submit/correct | Review/publish/rights/jobs/moderation | Complete ancestry, private assets, immutable publication and scope checks |
| R2 free audio | Minimal online title/chapter player, no checkout | Full listening/background/offline | Chapters/credits/quality/sample/terms | Manifest/audio rights review | Safe processing, playback auth, late jobs/range/link renewal |
| R3 lifetime sales | Catalog/checkout/library/ebook/web_text and audio | Paid ebook/audio/web_text and recovery | Unified upload/editor title and lifetime offer/statements | Attempts/refunds/ledger/payout | Settlement/reconciliation and paid-content/cache isolation |
| R4 publisher | Publisher attribution/purchase | Same attribution/access | Org invitations/roles/enrollment/catalog/signing/finance | Org support/authority/review | Tenant isolation, owner lifecycle, immutable beneficiary |
| R5 profiles | Profile reading/switching; guardian controls | Scoped profiles/devices/offline checks | Owner-managed household settings; creator suitability/terms | Classification/profile incident support | Restricted principals, policy checks on bytes/samples, no review/payment duplication |
| R6 sponsored | Assigned library/consume | Assigned library/consume/offline policy | Customer license purchase/assignment/roster | License/event/rights incident tooling | Capacity, member eligibility, grant independence and expiry |
| R7 monthly packages | Package comparison/enrollment/covered title reading | Packages across ebook/audio/web_text and independent ownership | Package/plan/membership/allocations and channel/newsletter management | Inclusion/rights/finance/period recovery | Versioned coverage/renewal/cancel/expiry, allocation and render/SSR/RSS/email privacy |
| R8 migration | Supported discovery/read/billing | Supported update/login/history | Full target workflows | Recovery/audit/import/finance | Single-writer cutover, reconciliation, restore and legacy retirement |

API tests exercise real User/account/profile scope combinations. Android-only capabilities such as lock-screen audio need device evidence; browser screenshots cannot satisfy them. Minimal consumer web audio starts R2; full storefront/ebook reading in R3 is a new product surface, not the Creator Hub preview or public blog masquerading as a reader.

## Traceability and definition of ready

Every release backlog item links to an outcome, source requirement, B/E milestone, actor/surface matrix and acceptance evidence. Split by observable behavior, not “backend sprint” followed by “frontend sprint”. A team may build components independently while the release stays unenabled until the journey works.

| Requirement set | Primary release evidence |
| --- | --- |
| R01–R02 / C01 / A01, A07 identity | R0/R1 basic cohort auth; R4 organisation roles; R5 scoped profiles; R8 all retained methods and imported identities |
| R03–R07, R09–R10 reader/catalog/community | R1 core reading; R3 web/paid; R6 sponsored and R5 profile variants; R2 audio; R8 full existing parity |
| R08 / C08–C09 / A09–A10 money | R3 personal settlement/payout; R4 organisation beneficiary; R6 licenses; R5 declared sharing; R7 subscription periods; R8 reconciled history |
| C02–C07 / A02, A08 publishing | R1 free ebook lifecycle; R3 paid; R4 publisher permissions; R2 audio; R8 every supported ingestion/edition/language/variant path |
| R11 / C10–C13 / A05–A06, A11 blog | R3 unified blog_post authoring/reading/lifetime offers; R7 general monthly packages/channel newsletters and operations; R8 preserved legacy URLs/periods |
| A03–A04 moderation/reference | R1 reviews/genres; R5 restricted profile participation; R7 post/comment reports |
| New accounts/profiles/relationships | R4 account teams; R6 licensed members; R5 households; all identities/constraints designed from R0, migration complete in R8 |
| E1–E4 new content families | Individually planned R9+ releases; not implied by book profile or generic schema fields |

Ready-to-build means the owning team can identify the current behavior, product scope, enabled cohorts, schema/API change, compatibility approach, risk-bearing scenarios, support intervention and smallest reviewable demonstration. Unresolved commercial/maturity/territory/offline terms block dependent selling, not unrelated free local implementation. Keep decisions with named owner, deadline needed by release and default only where already authorised/agreed.

## Engineering delivery and deployment tactics

**Contract first, then a vertical slice.** Keep `@wolly/schema`/`SCHEMA.md`/Dart coordinated if transitional Firestore shapes change. Proposed Go schemas use SQL migrations and versioned generated/verified TS/Dart DTOs. Place account, profile, content type, publication revision and grant provenance in the first contracts so subsequent features do not retrofit identity into user/book pairs.

**Expand, migrate, contract.** Add backward-compatible schema/API changes, backfill with idempotent maps, deploy compatible readers/writers, reconcile and only then remove obsolete interfaces/data. Do not rely on a client toggle to disable old Firestore writes. Public responses omit disabled types/private drafts; old clients use their mapped primary profile until profile capability negotiation is ready.

**Automate the meaningful checks.** Go domain/HTTP tests, real PostgreSQL uniqueness/concurrency, provider-sandbox event replay, schema/DTO compatibility and client builds precede activation. Renderer/import/archive fixtures and isolated processor limits protect content quality. Device/browser task walks verify actual behavior. Use representative title-edition/language/production combinations; negative identity/tenant/profile/asset cases are mandatory, not an exhaustive screenshot permutation exercise.

**Instrument before increasing audience.** Correlate requests, jobs, principal/account/profile (with appropriate privacy), provider reference, release and schema version. Expose safe operational queues and alerts for entitlement mismatches, unresolved charges, job age, publish backlog and delivery failures. Separate failure category from provider/network status. Never log secrets, private notes, OTPs or unrestricted payment data.

**Deploy independently where necessary.** Keep API, worker and versioned clients compatible; capability activation is server-authorised and documented. Current Firebase Hosting/Android distribution can remain while business runtime migrates. No new infrastructure choice or production deployment is made by this plan.

## Existing deployment constraints to resolve in R0

Restructure status: the workflow inspected below has now been removed from the active workspace. New CI builds/tests modules only and never deploys. The observations remain historical migration context; future release infrastructure must be explicitly implemented and reviewed. No existing external cloud deployment was modified.


Source evidence: [deploy workflow](https://github.com/saintjanney/wolly/blob/236c8fd/.github/workflows/deploy.yml), [Firebase targets](https://github.com/saintjanney/wolly/blob/236c8fd/firebase.json), repository [working agreement](../../AGENTS.md). This is a source inspection, not a live environment audit.

- `main` and `develop` trigger deployments. Intended destinations are production and mock; creator/backoffice use Hosting live versus mock preview channels; Android distributes APKs to production versus QA groups. No implemented iOS/store or standalone reader-web release is established by this workflow.
- The checked-in workflow deploys the public blog Cloud Run service and blog Hosting live site from both branches, and deploys shared rules/indexes/functions. A preview Hosting channel alone therefore does not isolate the backend/blog. Before any QA release, provision and verify separate data/storage/provider callback/secrets/runtime endpoints or another explicitly reviewed isolation mechanism; record where each artifact goes. Do not treat `develop` as a safe private backend by name alone.
- Current rules verification permits an “unable to run” exit path to continue. New release gates require a real verified authorization result, not a skipped check reported as successful. Address CI capability/permissions and fail-closed activation evidence as part of release-engineering work.
- Existing revision pruning retains minimal rollback targets. Do not assume a previous runnable revision exists; preserve known-good reproducible artifacts and rehearse the actual redeploy/restore path or deliberately change retention/capacity with approval.
- Go API/worker production deployment and the proposed consumer-web hosting target do not yet have release wiring in this workflow. Build/review those pipelines, migrations, health checks and origin/session settings before their first pilot. Never commit service credentials.

These are R0 engineering tasks; no workflow mutation is performed by authoring this roadmap. Continue on the user-authorised `Go-Rebuild` planning branch; any future release merge/deploy follows the repository's `develop`/`main` rules and actual user authorization. No new feature branch is required.

## Domain cutover checklist

For each migrated domain, attach a concrete runbook using the [client migration stages](CLIENT_INTEGRATION_PLAN.md#migration-strategy-one-authoritative-writer-per-domain):

1. Inventory authorised source facts, active clients/identities, pending jobs/charges/subscriptions and file token paths. Define scope, source checkpoint, backup and reconciliation queries.
2. Dry-run import into an isolated target with stable legacy→account/Party/title/edition/language/delivery/release/publication/profile/grant mappings. Report unknown languages/owners/beneficiaries/rights as exceptions; never fabricate approval or consent.
3. Deploy compatible API/worker and client versions with the capability disabled. Validate callback/inbox reachability, staff role admission and target health.
4. Announce/update supported clients and pause that domain's old writes using actual server/rules enforcement. Record/drain in-flight effects and final delta; one callback/scheduler owner processes each charge/time boundary.
5. Reconcile assets and historical access, money per currency, contracts/beneficiaries, profile state and subscription paid-through periods. Enable only scoped cohorts; old client behavior is explicit upgrade-required or bounded compatibility, not silent dual writing.
6. Observe through the agreed window with support staffed. Resume expansion only after queue/mismatch and real task evidence is reviewed. Keep legacy read-only evidence while needed; remove obsolete tokens/callbacks/triggers/SDK paths only after proven retirement.
7. Record completion, exceptions, operator procedures and next retirement date. Final whole-platform cleanup is R8; no domain stays permanently dual-authoritative because its replacement passed unit tests.

Commercial-mode release gate: exercise free, paid/lifetime-only, paid/subscription-only and paid/both on supported releases, and reject free-plus-paid and paid-with-no-ready-route at publication. Verify current-policy/offer/package races, bounded paid previews, old receipt/grant continuity and scheduled free↔paid transitions. R3 enables lifetime monetisation; R7 adds subscription-only/both after package readiness, without altering the mutual-exclusion rule.

## Go/no-go, pause and recovery

| Gate | Required evidence / decision role |
| --- | --- |
| Product readiness | Outcome demonstrated for enabled creators/readers/admin and supported surfaces; terms/support communications accurate. Product owner accepts exclusions |
| Engineering readiness | Relevant checks pass; API/schema/client compatibility, denied paths, jobs/idempotency, rollback artifact and migration result recorded. Engineering owner signs |
| Operational readiness | Finance/moderation/support tools and queues work, owners available, restore/callback/writer runbooks rehearsed, observation thresholds agreed. Operations owner signs |
| Cohort expansion | Pilot report shows actual usage/errors/reconciliation/support load within agreed limits; no unresolved cross-tenant/profile, paid-access, consent or money-integrity blockers. Named release decision owner authorises next cohort |

One person may hold several roles in a small team, but evidence and the independent staff/customer permission boundary still apply. If review/resource constraints prevent a required check, keep the capability unenabled; do not convert “not tested” into a passing result.

Immediately pause the affected capability/cohort on private cross-user/profile data exposure, unauthorised access/role escalation, lost/double-counted settlement/payout or unexplained reconciliation gaps. Other error/latency/queue/support signals use numeric thresholds agreed before the pilot. Pause should stop new grants/sales/publications as appropriate, preserve inbox/audit/jobs and honour verified unaffected existing access where possible; it is not a request to erase data or replay transfers.

Use three recovery paths deliberately:

- **Flag/cohort disable:** contain a presentation or new-operation defect while keeping authoritative history and ingestion intact. Confirm that no old client/backend bypass remains.
- **Compatible application rollback/redeploy:** restore a known-good artifact against an expanded compatible schema. Do not run destructive down-migrations after accepting writes.
- **Fix-forward or controlled writer reversal:** for money, membership/access and new post-cutover writes, pause affected mutations, reconcile buffered events and export/replay through a tested authoritative path. Restoring yesterday's DB without accounting for later charges/agreements is not a valid rollback.

After recovery, document cause, customer impact, reconciliation and repairs, then repeat the failed gate before resuming. Backups plus tested restore and object recovery are required; a checklist claiming a backup exists is insufficient.

## Release communications and support

Before a pilot, publish cohort-appropriate onboarding/known limitations, supported devices/browser versions, account/profile versus organisation context, exact license promise, pending-payment expectations, contact route and data/consent disclosures. Explain update-required behavior before an old client loses write access. Give creators a source/format-quality guide, rights/review expectations and payout statement explanation; give organisation owners invite/seat/privacy procedures; give guardians accurate controls and offline limits.

For each activation record release notes distinguishing new, migrated, disabled and limited behavior. Preserve existing receipts/URLs/customer reference IDs; use internal request IDs for support without requesting passwords or raw private documents. Staff training includes the full deny/recovery scenario, not just the successful demo. Announcements of GA must name the actual audience/surfaces rather than “Wolly rebuilt” when only one capability has shipped.

## Working backlog and release packet

Use release IDs R0–R9+ and slice IDs such as R3-S1 with status planned/ready/building/validation/pilot/expanding/complete. Assign accountable owners and capacity before adding committed dates; forecast from observed throughput, not the number of route stubs. Maintain a decision log, acceptance evidence register, migration exception register and risks/actions alongside the chosen project tracker. This plan does not create external tasks or assign people without their involvement.

Each release packet contains the feature briefs, surface/actor scope, linked requirements/B milestones, artifact/capability manifest, test/device demonstrations, pilot outcome report, financial/access reconciliation, operational runbooks, known limitations and named go/no-go decision. Completion is the verified customer/operator outcome for the enabled scope, not deployment success alone.
