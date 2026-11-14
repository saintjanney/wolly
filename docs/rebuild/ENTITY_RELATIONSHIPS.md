# Entity relationships and domain boundaries

Planning alignment reviewed 14 November 2026; external evidence retains its original checked date.
Proposed foundation, 13 November 2026. This is a design review for the Go rebuild, not an implemented SQL or Firestore schema. Read alongside [titles and digital media](TITLES_AND_DIGITAL_MEDIA.md), [architecture](ARCHITECTURE.md) and [API map](API_MAP.md). It refines the earlier hierarchy where noted below. Existing Firestore contracts remain documented in [SCHEMA.md](../../SCHEMA.md); no runtime models change in this planning step.

The [content-type and container plan](CONTENT_TYPES_AND_CONTAINERS.md) extends this review for book forms, standalone short works, serial publications/issues and revision-pinned composition. Launch is book-first; future type profiles do not enable products or purchases by themselves.

The [reader profiles and household access](READER_PROFILES_AND_HOUSEHOLDS.md) specification adds a consumption identity separate from authenticated User: additional adult/minor profiles live under an individual account. It supersedes User-only reading/access keys below; privileged membership, creator and billing actions still require a User.

Release sequencing and channel commitments are defined in the [product roadmap](PRODUCT_ROADMAP.md); the [release execution plan](RELEASE_PLAN.md) requires complete creator/reader/staff journeys, supported web/Android/API evidence and domain/cohort gates. Early limited pilots do not waive the full requirements in this specification.

Scope revision: [unified titles, offers and subscriptions](CONTENT_OFFERS_AND_SUBSCRIPTIONS.md) defines blog posts as titles, source/editor authoring, mutually exclusive free/paid title classification, lifetime and/or subscription routes for paid titles, and independent grant provenance. Release order is R1 free ebooks → R2 free audio → R3 lifetime monetisation → R4 publisher teams → R5 households/minors → R6 sponsored consumption → R7 subscription programme → R8 full rollout. Earlier source inventories describe legacy behavior, not an exception to this target.

## Findings that change the earlier plan

1. Series/title is many-to-many membership, not a mandatory ownership tree. A standalone title has zero memberships. Reading order belongs to the membership.
2. Account, credited contributor, catalog manager, rights holder, publisher and payment beneficiary are different identities/roles. An author can have no login; an uploader is not automatically the author or rights holder.
3. A language edition can have multiple delivery products of the same kind. Two narrations, an abridged recording and an unabridged recording must not share a purchased identity or be disguised as file corrections. Replace `UNIQUE(language_edition_id, kind)` with a stable variant key constraint.
4. A content release records exact content bytes/manifests. A publication revision binds that content to reviewed metadata, artwork and terms. Metadata-only changes should not manufacture new content or lose the old listing snapshot.
5. Payment, purchase, entitlement grant, reading progress and payout are distinct records. A refund cannot erase history or accidentally revoke an independent valid access grant.
6. Title editions remain useful for material editorial changes, but not every change needs a new title edition. A revised translation can be a new language edition of the same editorial edition; a new narrator is a new delivery; a file correction is a content release.

## Catalog and content relationships

The display hierarchy remains useful; the relationship model also includes memberships, credits and provenance links:

```text
Series <── SeriesMembership ──> Title
                                │
                                └── TitleEdition
                                     └── LanguageEdition
                                          ├── Ebook delivery variant(s)
                                          └── Audiobook delivery variant(s)
                                               └── ContentRelease
                                                    └── ReleaseAsset / AudioTrack
                                                         └── Asset

Party <── scoped credit ──> Title / TitleEdition / LanguageEdition / Delivery
PublicationRevision ──> Delivery + ContentRelease + approved metadata snapshots
```

`1:N` means one parent can have many children; draft parents may have none. `M:N` uses explicit join records. Each persisted child has exactly one parent unless the table explicitly describes membership instead. The content ancestry is structural; management permissions, credits and rights are explicit relationships and do not transfer merely because an object is a descendant.

| Relationship | Cardinality and decision | Constraint / example |
| --- | --- | --- |
| Series ↔ Title | M:N through `series_memberships`; optional for titles | Unique `(series_id, title_id)`; order and volume label on membership. No automatic rights, access or owner inheritance |
| Title → typed work profile | One validated work type; book at launch | Book form/purpose, subject and delivery kind are separate. Future periodical issues reference a serial publication; a new issue is not a revised edition of yesterday's issue |
| Title → TitleEdition | 1:N | A first edition and revised second edition remain the same work. Predecessor links stay within one title and cannot cycle |
| TitleEdition → LanguageEdition | 1:N | Distinct translations into the same language get different IDs and labels. A corrected typo does not create a new translation identity |
| LanguageEdition ↔ Language | M:N through `language_edition_languages` | One primary language required before submission; optional additional languages for bilingual works. Original language is metadata, not the app interface locale. Do not fabricate a parent edition per language when one bilingual product is intended |
| LanguageEdition → translation source | Zero or more explicit source links | `translation_sources` links source and target language editions within the same title edition; prevent self-links/cycles. Optional source release must belong to that source. Support original/translation/bilingual labels without requiring an uploaded original ebook. A source-language declaration can exist when original files are unavailable |
| LanguageEdition → Delivery | 1:N | `kind` is ebook, audiobook or validated web_text; unique `(language_edition_id, kind, variant_key)`. Stable default key for ordinary setup; extra variants need distinct labels, content/production description and review |
| Delivery → ContentRelease | 1:N | Release sequence unique per delivery; submitted manifests immutable. The published release must belong to that delivery |
| Delivery → PublicationRevision | 1:N | Immutable reviewed snapshot of release, approved title/edition/language metadata, credits/artwork, price and agreement versions; at most one current publication revision per delivery. The current release pointer is derived from that publication revision or constrained to agree. Availability is evaluated separately |
| ContentRelease → ReleaseAsset | 1:N | Typed rendition/source/sample/supplement bindings; same authorized content tree, immutable asset versions. PDF/EPUB alternatives of one ebook are not two products |
| Audio delivery → logical chapters | 1:N | Stable chapter IDs within a delivery. Each release snapshots ordered tracks with unique positions, exact assets, labels and measured durations; chapter edits never alter a published manifest |
| Title ↔ Genre / tag | M:N | Canonical genre IDs through join tables. Optional primary category, no duplicated category strings across deliveries. Moderated tags stay separate from permission/rights fields |
| Title ↔ related Title | Optional typed links, later | Sequel, adaptation or omnibus relationships are not parent ownership. Add only supported relation types; no unconstrained graph that drives access |

### What creates a new identity?

| Change | Identity affected |
| --- | --- |
| Fix spelling, replace a damaged recording segment, regenerate a rendition | New content release of the same delivery, reviewed before switching publication |
| Change price, cover or description without changing content | New reviewed publication/metadata/price revision as applicable; retain content release |
| Publish a materially revised author text | New title edition and its own language editions/deliveries |
| Commission a distinct or materially revised translation | New language edition under the relevant title edition; record provenance |
| Record the same translation with another narrator or as a distinct abridged production | New delivery variant with explicit narration/abridgement, independent agreement and access |
| Produce a materially different editorial adaptation rather than a recording treatment | Staff classifies as a new title edition or distinct related title; do not hide it as a release |
| Publish the next volume of a trilogy | New title plus series membership |
| Reorder series membership | Membership revision only; title and purchase IDs remain stable |

Default creator actions create “First edition”, an original-language edition and `variant_key = default` behind a short form. Complexity is available when needed, not a six-step prerequisite for every author. Identity fields become immutable on submission; classification and any later correction use explicit audited commands. No automatic rule based on word-count percentage determines a new edition.

Series metadata may have localized display text, but translation does not create another work identity or automatically clone series. Store translated display names separately from content language. Editorial edition labels may also be localized without changing IDs.

## People, organizations and authority

The [account and user-group specification](ACCOUNTS_AND_USER_GROUPS.md) supersedes earlier individual-only launch assumptions. Organisation accounts, invitations/memberships, independent creator capability and paid sponsored access are required target flows. Creator enrollment belongs to the account; people act through their own logins.


Use `Party` as a proposed identity for a credited person or organization. An organization has no shared login; individual users act through explicit authorized memberships. Separate these relationships in the first domain contract for both individual and organisation publishing.

| Relationship | Cardinality and decision | Boundary |
| --- | --- | --- |
| User → auth identities / sessions | 1:N | User is the authenticated actor, not the public author record |
| User ↔ Party | Explicit verified claims/memberships | Person-profile claims and organization memberships require verification/invitation; matching names/emails alone grant no control |
| Party ↔ scoped contributions | M:N | Typed `title_credits`, `title_edition_credits`, `language_edition_credits`, `delivery_credits`: role, display order, credited name and approved revision. Author at work scope, translator at language scope, narrator/producer at delivery scope; editor role at appropriate scope |
| Catalog object → managing account | One accountable manager at launch; users have scoped permissions | Account kind is individual or organisation; organisation catalog authority comes from active memberships/permissions, not founder identity alone; no assumption that all descendants always have the title's uploader as rights holder or payee |
| Managing account ↔ users | M:N memberships with roles | Catalog editing, submission, finance and account administration are separate capabilities. Seed personal ownership and support organisation invitations/active memberships; roles never confer Wolly staff powers |
| Party ↔ rights grants | M:N through grant parties/roles | Holder, grantor and grantee are recorded explicitly. A claim/declaration grants neither catalog edit access nor staff verification powers |
| Delivery → publisher / imprint credit | Explicit optional party/imprint association | A publishing credit is not an authorization membership. An imprint is a brand under a publisher, not another user account; full imprint management can follow later |
| Contract → beneficiary party / finance account | Explicit frozen beneficiary | Public contributor credit does not create a revenue share. Initially one approved beneficiary; multiple-payee splits require their own versioned allocation policy and acceptance before enablement |

Preserve existing `ownerUserId` as the legacy accountable actor during import. Create a personal managing account with that user's explicit membership; separately import unverified credited names as party records. Do not merge authors because names match or grant logins to named third parties. Catalog transfer requires an audited authority change; it never rewrites signed contracts, past sale beneficiaries, rights evidence or earlier credits.

For collaboration, derive authorization from the managing account and explicit grants, not from the public contribution joins. For reuse of files, validate authority and allowed bindings rather than assuming every file in a title tree has the same person as owner. No unscoped polymorphic `(type, id)` pointer may bypass foreign-key checks; use typed joins or a constrained resource registry with real subtype/ancestry checks.

## Rights, publication and availability

| Relationship | Cardinality and decision | Constraint |
| --- | --- | --- |
| Catalog scope → rights declarations/grants | 1:N with explicit scope rows | Target title, title edition, language edition or delivery using checked FKs; scope includes languages, formats, territories, channels and dates. Grant-party roles and evidence are separate |
| Rights grant → evidence / verification decisions | 1:N and append-only decisions | Private immutable evidence, exact declaration and verified scope. Creator statements do not toggle the staff availability gate |
| Delivery → offers / agreements / reviews | 1:N history | At most one pending/active publishing agreement per delivery initially; publication changes bind canonical current terms. Record exact signers, beneficiary, revisions and decisions |
| PublicationRevision → ContentRelease / metadata revisions | N:1 references | All belong to the same validated ancestry. Frozen asset/credit resolutions; no late draft edit changes a live listing |
| Availability case → affected scope | Explicit scoped restriction | A language-specific dispute does not block an unrelated translation; a whole-title restriction affects descendants. Permission revocation/withdrawal and prior-buyer access are separately evaluated |

Publication state alone is insufficient to authorize a request. One resolver combines published snapshot, rights, territory/date constraints, viewer entitlement and the separately defined prior-buyer access policy. Do not infer a buyer's permitted territory solely from an editable profile country. Establish and test the territory-evidence policy before enabling restricted sales/delivery. Broad grants do not override narrower restrictions automatically; ambiguous/conflicting scope is a review blocker.

Content releases store source and processing provenance; publication revisions supply the authoritative customer-visible combination. Multiple publication revisions may reference the same content release. A processing-ready release is not automatically approved or public. Restore an old publication only through a fresh authorized decision using still-valid rights/terms.

## Commerce, access and finance

| Relationship | Cardinality and decision | Constraint |
| --- | --- | --- |
| Delivery → price versions | 1:N | Current launch model is one free/paid currency price at a time; store immutable historical versions. Future regional offers need explicit eligibility, not duplicate deliveries |
| User → CheckoutAttempt | 1:N | Each attempt has actor user, purchaser account and immutable approved delivery/publication/price/terms. Personal purchase and organisation license/quantity actions are distinct. Attempt exists before external call |
| CheckoutAttempt → provider reference | One reserved reference per attempt; many observed events | Unknown provider outcomes remain recoverable. Duplicate/out-of-order events converge through settlement |
| Successful settlement → Purchase / sale / ledger | One effective settlement per attempt | Separate durable records share transaction identity; a second payment for the same intended personal purchase/license action remains an overpayment/refund case; an intentional approved capacity expansion is a different action |
| Purchase → EntitlementGrant / OrganisationLicense | Explicit provenance | Preserve personal purchase-backed grant identity; organisation purchases create licenses and eligible member assignments as explicit grant provenance. Additional manual/free promotional grants use distinct authorized origins, not a forged purchase |
| ReaderProfile + Delivery → effective entitlement | One derived/materialized access result over grants | Unique projection per reader-profile/delivery with explicit grant/household eligibility and authenticated named-member checks for organisation licenses; immutable grant/revocation history beneath it. Refund invalidates only that purchase's grant; another valid grant can still authorize access |
| Purchase → refunds | 1:N | Provider idempotency, total bounded by captured amount; partial refund/access effect is a defined policy, not proportional guessing |
| Sale → revenue allocation / ledger entries | 1:N immutable entries | Freeze beneficiary, contract and integer currency amounts. Corrections append reversals/adjustments; public author-name changes do not redirect money |
| Payout → allocations → liabilities | Payout has many allocations; liabilities may be partially allocated over time | Lock and enforce total allocated/paid does not exceed eligible amount; account/currency match. Failed/ambiguous transfer retains explicit allocation state, not blind retry |
| Beneficiary account → payout destinations | 1:N versioned verified destinations | Snapshot destination identity/version when approving a payout; mask data and prohibit foreign-account substitution |

Entitlements grant access to a delivery and allowed corrected releases; the purchased publication revision remains preserved. They do not cover sibling narrations, languages, editorial editions or series volumes. Future bundle products should expand into explicit line items/grants so constituent rights, refunds and creator allocations stay attributable. A series or curated collection is not itself a bundle purchase.

Library is a query/projection of valid grants, started items and explicit saves, not proof of purchase. Starting a free sample does not grant the full delivery. Deferred free-item save/collection features need explicit user relationships when introduced, not fake payment records.

## Reader, community and blog relationships

| Relationship | Cardinality and decision | Constraint |
| --- | --- | --- |
| ReaderProfile + Delivery + ContentRelease → progress | One progress record per locator/format scheme | EPUB and PDF locators can differ for the same release. Audio references release-bound logical chapter/time; never derive it from ebook pages. Unique `(reader_profile, delivery, release, locator_kind)`; conflict-aware versions |
| ReaderProfile → bookmarks | 1:N | Every locator binds delivery, content release and format/chapter; preserve old locators. New release needs explicit mapping or restart choice; never map across translation/narration by page number |
| User ↔ author Party | M:N follows | Unique follower/party. Following a public author grants no account or content access; do not require the author to have a login |
| User + Title → work review | One active review per user/title initially | Optional checked language-edition/delivery/release context. Display context and derive verified purchase from qualifying ownership. A review of one translation is not evidence of another narrator's quality; default aggregates remain explicitly work-level |
| Managing account → Publication | 1:N | PublicationChannel has branding/placements; a channel/feed over canonical titles, not a title edition or series |
| PublicationChannel → placements / Package → versions | 1:N each | Placements reference canonical title publications; package versions explicitly cover approved products rather than inheriting channel membership |
| BuyerAccount + SubscriptionPackage → subscription | Many packages per buyer; one active enrollment per buyer/package by default | Plan/paid-period coverage versions bind exact included products; free/lifetime/subscription grants, comps and email preferences remain distinct |
| User → comments / likes / reports | Scoped records per target | Typed FK-backed targets, own-edit rules and moderation history. Post replies stay within the same post; no generic target pointer that bypasses access |
| Send → recipients / delivery attempts | 1:N | Recipient consent/suppression checked independently of paid access; provider retries have explicit dedupe identity |

Blog posts now use the canonical title/edition/language/delivery/release model, with `web_text` for validated editor content. A publication is a channel with placements/feed/branding, not a separate paid-content identity. Offers attach free/lifetime/package access to explicit deliveries. SubscriptionPackage → PackageVersion → memberships, and Subscription → paid periods → coverage, are separate from both title ancestry and channel membership. Preserve legacy IDs, bodies, access promises and URLs through the migration in [unified titles, offers and subscriptions](CONTENT_OFFERS_AND_SUBSCRIPTIONS.md). Future SerialPublication/issue relationships remain distinct and do not automatically join packages.

## Database and command invariants

- Use opaque stable IDs, explicit foreign keys and constrained join tables. Composite foreign keys or transactional checks enforce denormalized ancestor identity and same-resource revision bindings. Do not put ownership/authorization/money relationships in arbitrary JSON.
- Use check constraints for allowed kinds, bounded money, role/status vocabulary and valid date ranges; unique/partial indexes for membership, variants, current pointers and idempotency. Cross-row rules such as provenance cycles, rights conflicts and allocation totals require transaction-safe service logic, not a claim that a CHECK constraint can query the whole graph.
- Lock affected parent/version rows consistently for publication, identity changes, settlement and allocation. Test concurrent commands against real PostgreSQL. Validate authority inside the transaction where state changes matter.
- Draft metadata is editable with optimistic versions. Submitted snapshots and approved releases are immutable. Keep operational workflow, processing readiness, publication and effective availability separate.
- Archive referenced catalog identities; never cascade-delete purchases, contracts, ledger, rights evidence, releases needed by buyers or existing locators. Removing series membership is not deleting a title. Deleting an account follows retention/anonymization policy, not destructive cascade.
- A catalog merge/transfer/reparent is an audited migration with explicit legacy mapping and customer-access reconciliation; not an ordinary PATCH. Titles/series are never merged by name, language or shared cover hash.
- Asset reuse uses explicit role/access bindings. Identical hashes allow storage optimization only within policy; they are not evidence of ownership or grounds to share private evidence across accounts.

## Delivery sequence and acceptance

| Milestone | Foundation required |
| --- | --- |
| B1 | Schema/DTO design for individual/organisation accounts, invitations/memberships, party identity, catalog hierarchy, variant keys, publication snapshots and access-grant provenance; constraints documented before feature handlers |
| B3–B4 | Seed full identities, authorized combined catalog filters, party follows, review context and format/release-scoped locators |
| B5–B6 | Personal/organisation membership and creator-capability authorization, typed credits, standalone/series setup, multiple editions/translations, bilingual metadata and distinct delivery variants; content releases remain immutable |
| B7 | Exact publication revisions, scoped rights, signers/beneficiary and immutable approval/terms; translation source notices and clear correction/new-product classification |
| B8–B9 | Settlement/access provenance, exact refund effects, immutable beneficiary/ledger and bounded payout allocations |
| B10–B13 | Post-to-title/channel and tier-to-package migration, generated client types and import mapping; unknown owners/languages/beneficiaries become explicit exceptions |

Multi-beneficiary payouts, imprints UI, sellable bundles, curated collections, omnibus composition, arbitrary title relations and synchronized read-along remain later features. Their boundaries are recorded here; do not create empty frameworks or imply these features are launch-complete. The first learning slice uses a personal account and one beneficiary; full target acceptance includes organisation accounts and scoped teams as defined in the account plan.

Required demonstrations in addition to existing milestone checks:

1. Coauthor two titles using one Party with no login; link one verified account later without changing credits or granting rights to unrelated accounts. Narrator credit never grants draft access.
2. Keep a title standalone; put another in two series with different orders. Deny unauthorized cross-account membership and demonstrate no purchase inheritance.
3. Publish two translations into the same language, a bilingual edition, and two narrations of one language edition. IDs, labels, prices, rights, sample access and purchase scope remain distinct.
4. Approve a new cover/price with unchanged content; the old receipt/listing snapshot and release locators remain valid. Replacing audio creates a candidate release, not an instant live mutation.
5. Refund a purchase while a separate valid authorized grant exists; derived entitlement retains access through the independent grant. Replay cannot create a second sale or grant.
6. Transfer catalog management without moving historical beneficiaries or signed terms. Reject a payout destination from another beneficiary and concurrent over-allocation.
7. Apply a scope-specific rights case and exercise both new-sale and prior-buyer policy. Unrelated editions/languages stay unaffected; a broader case affects exactly its declared descendants.
8. Import and re-import legacy records with immutable ID mappings and reconciled finance. Do not invent author logins, translation relationships, missing rights or purchase-backed grants.
