# Client integration and migration

Keep existing Flutter/BLoC and Next.js/React presentations. Replace their persistence/authentication adapters one domain at a time. Unlike the Ripple learning frontend, Wolly already has three distinct product clients plus a public SSR blog; building an unrelated new web demo alone would not prove feature coverage.

The [title and digital-media specification](TITLES_AND_DIGITAL_MEDIA.md) adds explicit new work beyond legacy parity. Creator Hub is title-first with optional series membership, editorial editions, language editions and separate ebook/audio setup; Flutter needs a complete audiobook player. Wolly supports electronic content only.

The [content-type plan](CONTENT_TYPES_AND_CONTAINERS.md) keeps one creator account across supported outputs. At launch expose book forms such as novel/textbook/anthology and existing blog authoring; later use capability-gated create-story/create-publication/create-issue flows. Add work-type/profile discriminators to transport models and catalog cards, preserving legacy book routes/IDs. Old clients must filter unsupported types or receive explicit update-required behavior. Newspaper archives, article rendering and serial subscription access are later client work, not book parity.

Scope revision: [unified titles, offers and subscriptions](CONTENT_OFFERS_AND_SUBSCRIPTIONS.md) defines blog posts as titles, source/editor authoring, mutually exclusive free/paid title classification, lifetime and/or subscription routes for paid titles, and independent grant provenance. Release order is R1 free ebooks → R2 free audio → R3 lifetime monetisation → R4 publisher teams → R5 households/minors → R6 sponsored consumption → R7 subscription programme → R8 full rollout. Earlier source inventories describe legacy behavior, not an exception to this target.

## Surface rollout by outcome release

Use the [product roadmap](PRODUCT_ROADMAP.md#surface-and-audience-commitments) and [cross-surface acceptance matrix](RELEASE_PLAN.md#cross-surface-acceptance-matrix) for release-level scope. Existing reader distribution is Android APK; existing Creator Hub/Backoffice/public blog are web. R3 proposes a new responsive consumer storefront/library/online EPUB/PDF reader with compatible auth/checkout/progress contracts. It is additional delivery work, not an existing deployed web reader. Choose application/hosting boundaries in R0; retain safe same-origin sessions and typed APIs. iOS, offline browser reading and external API onboarding are not implicit.

R1 proves free ebook reading; R2 brings free audio forward with Android playback and minimal consumer web chapter-player support before checkout. R3 adds lifetime offers, full supported web ebook reading and paid audio/web_text. R4 publisher teams precede R5 households, followed by R6 organisation-funded consumption. R7 expands general monthly packages across eligible title products and migrates channels/newsletters; R8 verifies all supported versions. Restricted/minor contexts cannot enter billing even when subscription products are displayed.

Every feature brief identifies creator, reader, staff and applicable web/mobile/API actions, including support/denial/recovery and any intentionally deferred surface. Server feature flags alone cannot establish supported UX. Migrate each ready domain through M0–M6; no release silently leaves two payment writers or replaces a working paid cohort with a feature-disabled client.

## Client changes paired with Go milestones

| Go milestone | Flutter reader | Creator Hub | Admin | Public blog |
| --- | --- | --- | --- | --- |
| B0–B1 | Configure API origin and error DTO parsing | Same-origin dev proxy and readiness/capability view | Same proxy | API server adapter and explicit cache policy |
| B2 | Go auth repository, secure tokens, deep links, session restore/logout | Replace AuthContext Firebase methods; keep onboarding | Staff admission, current permissions and step-up | Replace Firebase AuthProvider/session exchange; SSR sees same viewer |
| B3–B4 | Replace library/genre/dashboard/bookmark/review/follow repositories; test reading/download state | Safe author/profile/reference reads | Genre/review controls as available | Safe author links if exposed |
| B5–B6 | Use title/title-edition/language-edition/delivery/release IDs and optional series membership; add chapter player, background controls, speed/timer, listening sync, authorized seeking and offline audio | Title overview grouped by editorial edition, language and delivery; optional series/order controls; separate add-edition/add-language/add-production/correct-content actions; primary/additional languages and typed contributor credits; ebook/audio setup; DOC/DOCX editor import; read-only PDF/EPUB preview; chapter uploads/order/listening preview; scoped artwork and job polling | Inspect ebook renditions and full audio manifest/sample/quality | No private source access |
| B7 | Respect unavailable/disputed/revoked states | Replace readiness/rights/publish services and agreement offers | Add contract, release, rights-case controls and reasons | Reflect author/publication availability consistently |
| B8 | Replace hardcoded payment-function URLs; persist attempt ID; resume verification | Show actual verified sales when available | Attempts/events/reconcile operations | Use same checkout auth foundation |
| B9 | Correct purchase/refund history | Replace analytics/payout/currency/settings services; show real payout outcomes | Finance roles, statements, refunds and payout approvals | Subscription revenue views added after B11 |
| B10 | Replace BlogRepository feed/body/publication reads | Replace BlogService and draft/publish interactions | Posts/publication moderation | Replace firebase-admin blog-data reads; retain public URLs, SEO, RSS and sitemap |
| B11 | Replace SubscriptionRepository, paid checkout/status/feed | Subscriber/tier/comp controls | Billing/recovery controls | Free/paid subscribe and cancel/renewal UX through Go |
| B12 | Comments/likes where offered; truthful feed errors | Newsletter/analytics/preferences | Full report/delivery/job/audit queues | Replace PostEngagement Firebase writes; consent/unsubscribe flows |
| B13 | Release support matrix and forced-update/deprecation path | Remove remaining direct SDK data calls | Audit all privileged paths | Test raw responses and cache safety under different viewers |

The TypeScript `@wolly/schema` currently describes Firestore documents, while Go should expose stable API DTOs. Maintain a versioned OpenAPI contract and generate/verify TypeScript and Dart transport models during implementation. Keep domain/renderer fixture contracts across languages. Do not recreate Firestore Timestamp objects in API payloads.

## Unified title, offer and subscription client migration

Creator Hub has one title workflow: choose work type → upload DOC/DOCX/PDF/EPUB or start in editor → prepare validated output → choose free or paid → configure lifetime purchase and/or package participation if paid → submit/review. Show read-only PDF/EPUB controls, structured editor autosave for editor/imported documents and separate audio chapter tooling. Blogs/channels list the same canonical blog_post title; no duplicate paid post object.

Creator setup first selects Free or Paid. Paid setup requires lifetime-only, subscription-only or both with separate terms. Consumer web/Android shows “Read free” for free content; for paid content it shows enabled “Buy lifetime” and/or “Included in/Subscribe to package” routes. Never show free full-content access as a competing acquisition offer on a paid title; previews and already-authorised access have separate labels. Library distinguishes owned versus subscribed; losing a subscription does not remove purchase access or profile progress. Package screens state included products, monthly price, paid-through date, cancellation and current/next-period coverage. Use suitable safe web_text readers in both clients, preserve public handles/RSS/SEO through channel routes and deny restricted material in raw bodies/caches/email.

Migration maps legacy posts/body segments/revisions to title/edition/language/web_text/publication identities; publications to channels; tiers/subscriptions to approved package/plan/coverage/period and compatibility policies. Preserve annual periods, provider mandates, free excerpts, comments/consent and archive/future-post promises; compare old/new access outcomes rather than assuming the new default means the same thing. Legacy APIs adapt to canonical commands; one writer at cutover. Follow [unified title/offer contract](CONTENT_OFFERS_AND_SUBSCRIPTIONS.md) for acceptance and independent grants.

## Adapter and UX rules

- Add one central API adapter per client for auth, CSRF, refresh, request IDs, retry rules and error mapping. Automatic retries are safe only for idempotent requests or commands carrying a stable idempotency key.
- Keep BLoC/Cubit and current React components. A successful write updates from the server DTO/version; optimistic UI rolls back on failure. Store unsaved drafts locally when appropriate, but do not label a failed save as saved.
- Replace snapshots with bounded polling for conversion/status/queues. Poll only visible active work, back off on error, and stop on terminal state. SSE can be added later with per-resource authorization and reconnect cursors.
- Separate empty lists, signed-out state, permission denial, paid lock, stale version and service outage. Replace the current function-401 probe with a real capability/readiness response. Preserve explicit upload/purchase outage messaging.
- Flutter offline caches use user/session principal + reader-profile ID + policy revision + title ID + title-edition ID + language-edition ID + delivery ID + release ID/asset hash, never signed URLs or filename alone. Secure credentials use device secure storage. Progress/bookmark sync needs client operation IDs and server versions; a delayed offline write must not overwrite a newer session silently.
- Local reading preferences can remain local. Paid file bytes already delivered cannot be revoked remotely. Recheck authorization for new downloads; document behavior of already stored files. Do not claim a complete offline library until device walkthroughs pass.
- Web paid body responses and personalized SSR data must be private/no-store, and browser/query caches must clear on logout/account switch. Cache public metadata separately; moderation/withdrawal invalidates public listings/feeds and any public rendered-body cache. Reader, SSR, RSS, email and samples all use the Go access policy.
- Account roles and public-profile fields come from safe DTOs. Never send payout account data or provider subscription-management tokens to public HTML or generic profile components.

## Household profiles and shared devices

Follow [reader profiles and household access](READER_PROFILES_AND_HOUSEHOLDS.md): add reader-profile selection separately from account/workspace switching. Each profile has its own home, library view, interests, recommendations, progress, bookmarks, reading theme/settings and listening history. Create the owner's default profile during migration; legacy clients use only that profile until explicit capability negotiation permits others. Key private caches/offline indexes by profile, policy revision and content identity, not User alone.

Owner-authorised adult/minor setup and paired reading-device sessions must not place owner administrative credentials on dependent devices. Locking/switching profiles requires server checks; child-restricted contexts cannot open an adult profile or stale cached adult content. Keep account/creator/org controls in privileged User sessions, with reauthentication for leaving restricted context. Household sharing terms and named organisation-seat eligibility must be reflected in library labels and content access.

Additional profiles do not create purchases, review votes or organisation memberships. Minor profiles initially have no public engagement, self-checkout or direct marketing. Disclose guardian visibility separately from adult privacy; stronger adult independence uses explicit account claim/transfer without copying the sponsor's licenses. Complete shared-device/logout/account/profile-switch, cache invalidation, offline validity and default-profile import tests before declaring support.

## Structure-aware client and import contract

| Concern | Required behavior |
| --- | --- |
| Creator identity | One user can create books and blog content through a personal managing account; contributor Party IDs and credits do not grant editing permissions. Organisation invites, memberships and independent creator enrollment are target requirements |
| Book setup | Choose supported book form, then default first edition/original language/default production. Offer explicit add-edition/add-language/add-production/correct-content actions; show each branch's price, status and next action |
| Reader detail/library | Display work type, editorial edition, translation/primary languages and production label before purchase. Distinguish current eligible publication from historical purchased snapshot and access-grant state |
| Catalog filters | Work type/form/subject are separate; language/format/edition predicates match one eligible product. Standalone titles need no series; series order is unrelated to release date |
| Version compatibility | Default to book-only responses until versioned client capability exchange exists. Omit unsupported types from discovery; deep links show explicit update-required states, never instantiate unknown content as an ebook |
| Later periodicals | E2 serial detail uses dated/numbered issue archives, not book-series order. New issue and corrected issue are separate creator actions. E3 adds article/composition previews and included-credit context |
| Access promises | Clearly identify single product versus future issue/archive/collection coverage. Series membership, an anthology listing and channel following does not imply paid access; package coverage grants period access, not lifetime ownership |

Follow the [account and user-group specification](ACCOUNTS_AND_USER_GROUPS.md): show a personal/organisation account switcher in Creator Hub and organisation administration, check current permissions server-side, and clear stale account-scoped views on switch. Member library shows sponsored versus personal access without presenting organisation licenses as personal purchases. Progress/notes remain private to the person. Add consuming-only, publishing-only and dual-purpose organisation walkthroughs, explicit purchaser confirmation, license assignment/capacity and membership removal with independent-grant retention. Organisation administration is separate from Wolly staff Backoffice.

The legacy import must build the full book hierarchy and its publication snapshot, not just rename `bookId`. Each mapping records source path/ID/version → target managing account, party/credit, title, title edition, language edition, delivery variant, content release, publication revision and historical terms as applicable. A verified legacy owner maps to a personal managing account/membership; credited names become unverified Party identities, never new authenticated accounts. Do not guess missing language, authorship, review approval, beneficiary or rights facts.

Completed legacy purchases map to attributable purchase-backed grants; pending attempts do not. Preserve known historical snapshots/provenance and flag missing evidence explicitly. Map follows to verified Party identities or unresolved exceptions rather than assuming old author IDs are login IDs. Preserve separate EPUB/PDF locator schemes and old releases. Reconcile work types, grants, publication facts and frozen beneficiaries as well as financial totals. Do not manufacture serials, translations, placements or corrected-edition relationships from matching names, covers or file types.

## Migration strategy: one authoritative writer per domain

Do not let Go/PostgreSQL and clients/Firestore independently write the same domain. The default safest sequence is local/staging development first, then a controlled domain cutover with a brief write pause and reconciliation. Use feature flags for routing, not independent dual writes. Reads can be shadow-compared using authorized sanitized data; payments cannot be shadow-executed.

### M0 — Inventory live facts without modifying them

With authorized access, inventory actual deployed functions/schedules, runtime/secrets bindings, published rules, Firestore collections/subcollections, Auth providers, object metadata/download tokens, external assets, Paystack callback URLs/plans, and Android versions in circulation. This assessment did not access those systems.

The repository's old reports include historical ownership/rights problems. Verify them afresh. Do not automatically republish imported unowned works, infer copyright from possession of a file, or treat editable legacy `isAdmin` fields as trusted staff authority. Confirm staff through an approved independent roster.

Produce counts, schema deviations, missing assets, unknown owners, duplicate identities and finance/subscription exceptions. Establish a protected export/backup and dry-run environment; never check personal data or provider secrets into Git.

### M1 — Repeatable import and identity mapping

| Source | Target and validation |
| --- | --- |
| Auth users/provider links | Stable legacy UID mapping, verified email/phone/provider subject, disabled state; duplicate identity review |
| `users` and creator profile variants | Canonical private/public profiles; explicit mapping of snake_case/camelCase, `dob`/date fields and genre preferences; retain original source snapshot privately |
| `epubs`, genres, reference collections | One title, first title edition, verified original-language edition and validated ebook delivery/release; map legacy IDs explicitly, preserve genre references and historical prices. Audio requires verified audio sources. Physical-only entries become exceptions, with private source snapshots and preserved financial history |
| Manuscripts, `converted/`, covers, rights evidence | Asset manifest with source key, checksum, size, MIME, owner and visibility; preserve provenance/fingerprints; quarantine untrusted external links |
| Rights and contract subcollections | Immutable declarations/agreement text, terms, dates/states and evidence linkage; record missing proof rather than inventing consent |
| `purchases`, `transactions`, `payouts` | Distinguish completed, pending and failed; preserve exact references/amounts/fees/snapshots; reconcile sale totals and liabilities by currency; review duplicates and missing ledger rows |
| Reading progress, bookmarks, follows, reviews | Map book IDs to title + first title edition + verified language edition + ebook delivery + exact release for progress/bookmarks; retain title-scoped review context and explicitly mapped author-Party follows. New audio state uses chapter/time locators; never infer it from ebook pages |
| Publications, tiers, posts and content/draft/revision subcollections | Preserve slugs/public URLs, body schema, status, rendered output and revision history; validate sanitization and safe assets |
| Subscriptions and provider codes | Preserve current paid period/cancel state/tier/customer and plan mapping; replay-safe initial history; do not restart periods at import time |
| Comments, likes, reports/stats, email sends/suppressions | Import evidence/consent where present, recompute counts; absent consent is not opt-in; preserve suppressions before enabling email |

Unknown language is an import exception, never inferred from UI language. Series/translation grouping needs verified evidence and authority; do not auto-merge by title text. Map old purchases/contracts to their verified ebook delivery and historical release/terms; they grant no audiobook access. Preserve EPUB/PDF alternatives as assets of one ebook delivery. Quarantine ambiguous audiobook metadata or physical records; do not fabricate playable files, cross-mode consent or physical fulfillment.

Use import batch IDs, source document paths/versions, mapping records and exception rows. Re-running the same batch must not duplicate accounts, payments, periods, declarations or jobs. Compare full sums and important per-resource samples, not just row counts. Recompute derived ratings/counters, but preserve historical money/consent.

### M2 — Authentication transition

Choose and rehearse an identity route before client release. Preferred staged route: verify a recent legacy Firebase credential through a narrowly scoped temporary server bridge, resolve its imported UID and issue a Go session, then enroll/link Go credentials. This bridge is a temporary migration dependency and is removed at the agreed sunset.

If compatible password-hash import cannot be independently verified with the selected Go implementation, use verified password reset/account activation; do not assume existing passwords will work automatically. Phone and Google identities require provider linkage proof; a matching editable profile email is insufficient. Provide recovery for phone-only users and test deep links on supported Android devices.

Current Firebase sessions do not become Go sessions by copying cookies or IDs. When removing the bridge, revoke old paths and confirm all supported clients sign in through Go.

### M3 — Read and workflow cutovers

Start with public/reference reads, then private reading state, then Creator Hub drafts/uploads/press and staff review. Migrate a domain only when its Go authorization and client adapters are ready together. For each domain:

1. Record a source checkpoint and pause its old writes (client feature controls plus actual server/rules enforcement).
2. Drain or record in-flight work, import a final delta, reconcile and route the supported clients to Go.
3. Keep old data read-only for investigation. Disable the old trigger/schedule for that domain so it cannot process mirrored state.
4. Watch meaningful errors/correctness metrics, then close the domain checkpoint.

Old Android versions cannot be made to use Go by changing server source. Release the updated reader before enforcing cutover; either define a bounded compatibility gateway for old routes/auth, or require an upgrade and communicate a sunset. Clients with hardcoded Firestore access still need old rules tightened and a supported transition; do not leave writes enabled indefinitely.

### M4 — Money and subscription cutover

Pause new checkout creation briefly, inventory all pending/initializing attempts and provider references, settle/reconcile them under a chosen single owner, then import with their exact terms. Define how events arriving during the pause are durably buffered/routed. Change provider callbacks only when the Go inbox is live and replay-tested; record a reference/time ownership boundary so old and new systems never grant the same charge independently.

Include subscriptions created before cutover: retain provider subscription/plan/customer mapping, period end and cancellation flags. Test a renewal arriving without original metadata and a delayed annual payment. Existing billing mandates are provider state, not records Go can recreate by inserting rows.

Only one scheduler may reconcile each attempt range or execute payouts. Freeze payout allocations and reconcile pending/uncertain transfers before re-enabling execution. Email delivery likewise needs one sender and preserved suppression/recipient dedupe state.

### M5 — Files and access cutover

Copy/verify objects and exact asset ownership. Remove permanent public tokens/ACLs for paid book files and private evidence after checking legacy access requirements; a new Go gate cannot protect bytes still accessible through an old token. Public covers and deliberate samples remain separate. Do not remove the only good source before backup and checksum validation. Third-party external URLs require an explicit allowlist and licensing/availability review, not a blind fetch/proxy.

### M6 — Rollback and retirement

Before each cutover, state the rollback deadline and write policy. A traffic toggle alone is insufficient once Go accepts new payments, agreements or progress. Prefer fix-forward for money; if reverting, pause writes, replay/export the new authoritative records into a tested compatibility path, reconcile provider events and resume only one writer. Retain inbox events during outages. Never replay a payout/send blindly.

Retire legacy runtime functions, triggers/schedules, SDK reads, service-account dependencies and token URLs only after supported clients and reconciliations prove they are unused. Keeping Firebase Hosting or Android App Distribution temporarily is compatible with removing Firebase as the business backend; moving hosting can be a separate project.

## Release acceptance walkthrough

Use separate reader, creator, moderator, rights reviewer and finance accounts. The same person may hold reader/creator capabilities; staff grants remain explicit.

1. Sign up/login/recover via every retained method; restart app/browser, link identity safely, revoke device session and deny a suspended user.
2. Creator onboards, saves an unfinished title, uploads manuscript/cover, sees conversion fail/retry/recover, previews EPUB/PDF and a truthful readiness report.
3. Creator declares rights and submits evidence, accepts canonical price/agreement; staff checks the release and activates the contract. Title appears in catalog only after approval.
4. Reader browses/searches/filters, follows author, opens a free book, starts paid checkout, abandons and resumes, then receives ownership only after verified payment. Retry/replay never doubles money.
5. Reader opens EPUB/PDF, saves/reopens where supported, changes theme/font, resumes progress, bookmarks with notes, and submits a review. Moderator approval changes public rating consistently.
6. Rights reviewer disputes/revokes a book; reader and owner delivery behave as specified; issuance of new links stops without claiming already downloaded copies were erased.
7. Creator sees correct sales/date/currency statements. Finance records a refund and a real payout; no old sale changes when new revenue policy is set.
8. Creator publishes/schedules/unpublishes free/paid/tier posts, manages subscribers/comps, and sends a consent-aware newsletter. Reader/web test monthly, annual, cancellation, expiry, tier retirement and renewal failure.
9. Inspect direct public URLs, RSS, sitemap, HTML/JSON/cache and email as anonymous/free/paid/other-tier users. Protected bytes never leak. Publication suspension and post removal invalidate discovery/access.
10. Create audio first without ebook, then add ebook; publish ebook while audio is draft and add audio later. Test all document/PDF/EPUB routes, scoped artwork, separate prices/purchases/refunds, per-mode rights and independent withdrawal.
11. Upload/reorder/replace audio chapters, retry interrupted jobs, review a complete manifest/sample, listen with background controls/speed/timer, seek after link expiry, resume/sync and reopen downloaded audio after account switches. Resolve old-release bookmarks explicitly.
12. Create a three-title series and standalone title; add revised editions and multiple translations, including two in one language. Confirm edition/language/format selectors, exact combined search filters, independent prices/rights/purchases, translation review notices and same-delivery correction access. New editions/languages/narration variants never inherit purchases. Different EPUB/PDF locator schemes remain distinct. A metadata-only publication update keeps the content identity. Contributor credits never imply account permissions. See the [relationship acceptance cases](ENTITY_RELATIONSHIPS.md#delivery-sequence-and-acceptance).
13. Use one account to publish a novel, academic book and existing blog post with correct typed forms. Reject disabled content types and check unsupported deep links on old clients; academic labels do not imply peer review. Verify publication-only metadata updates preserve content locators, and independent grants survive a refund of another grant source.
14. Report/moderate comments/posts, inspect complete paginated queues, retry a failed job, restart workers, restore a backup, and rehearse one cutover rollback with post-cutover writes included.

A release is complete only when observed results, reconciliation outputs, limitations and operator procedures are recorded. Route stubs, matching screenshots, or a passing build alone do not establish parity.
