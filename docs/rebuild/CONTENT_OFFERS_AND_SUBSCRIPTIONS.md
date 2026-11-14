# Unified titles, access offers and subscription packages

Revised scope, 14 November 2026. This specification records the new product direction and supersedes the earlier separate-blog access model and deferral of general content subscriptions. It is proposed Go/API behavior, not a runtime Firestore change. Apply it with [the roadmap](PRODUCT_ROADMAP.md), [entity relationships](ENTITY_RELATIONSHIPS.md), [household profiles](READER_PROFILES_AND_HOUSEHOLDS.md) and [organisation accounts](ACCOUNTS_AND_USER_GROUPS.md).

## Product decisions

1. Prove free ebook reading in R1 and **free audio in R2**, before monetisation. R3 introduces one-off lifetime purchase for supported ebook/audio/editor-authored products. R4 introduces publisher teams, R5 household/minor support and R6 organisation-sponsored consumption. R7 introduces a full monthly subscription programme; R8 completes migration and rollout.
2. A blog **post** is a title/work type (`blog_post`), not an independent paid-content silo. A blog/publication remains a channel/brand/feed that groups titles. A whole blog is not one finite title, and a monthly package is neither a title nor a content format.
3. Creators can upload DOC/DOCX, PDF or EPUB, or start from Wolly's editor. Source, work type, delivery and commercial access are independent. Audio uses its own chapter preparation. Enable source/renderer combinations only when validated; PDF/EPUB are not magically editable documents.
4. Each content item/title has one commercial classification: **free or paid**, never both at the same time. Free content has no active paid offers. Paid content enables **lifetime purchase**, **subscription access**, or **both**, with separate required terms/details for each enabled route. Source, work type and delivery format do not determine this classification.
5. Eligibility continues to depend on rights, publication, profile suitability and the chosen offer/grant. Subscription access to one format/language does not imply every ebook, narration or translation. Household and institution coverage remain explicit.

## Identity and content structure

```text
Account → Title (book or blog_post; further types capability-gated)
           → EditorialEdition → LanguageEdition
              → Delivery variant (ebook / audiobook / web_text)
                 → ContentRelease (frozen files or canonical editor document)
                 → PublicationRevision (approved content + metadata/terms)
              ← Offer coverage links exact eligible deliveries

PublicationChannel → ordered/feed placement of title/publication references
SubscriptionPackage → PackageVersion → explicit eligible product memberships
                     → PlanPriceVersion (monthly currency price)
BuyerAccount → Subscription → paid periods → period coverage → profile access
BuyerAccount → lifetime purchase → durable grant
Free offer / household policy / org license → independent eligible grant source
```

`web_text` is a first-class delivery for sanitized online editor-authored reading, not an EPUB MIME label. Its immutable release stores structured editor-document revision and validated rendered output/provenance. Preserve the edition/language structure with sensible first-edition defaults so a short post does not require an elaborate wizard. Distinct audio narrations retain delivery identity. EPUB/PDF can be alternative renditions of an ebook; a web_text/ebook/audio combination requires explicit coverage, not inferred synchronization or duplicated purchases.

The same underlying title can appear on a creator's public blog channel and in catalog discovery without becoming two content records. Typed channel placements check ownership/publication eligibility and carry visibility/order/canonical-link policy. Channels manage branding, navigation, follow/email preferences and public URLs. Being a channel follower or email recipient grants no paid access. Preserve legacy `/@handle/postSlug`, RSS and sitemap through mapped channel routes; stable canonical title identity does not require breaking old URLs.

## Sources and authoring

| Input | Authoring and review | Eligible outputs |
| --- | --- | --- |
| Start in Wolly editor | Canonical structured draft, schema/optimistic autosave, revision freeze, owner preview; sanitize unsafe content | Validated web_text; ebook rendition only when conversion is implemented and accepted |
| DOCX / legacy DOC | Preserve original; import to structured draft with diagnostics; DOC via isolated legacy adapter | Supported editor/web_text output and EPUB/PDF conversion after fixture validation; do not claim Word layout fidelity |
| PDF | Immutable validation, replacement uploads, read-only paginated preview | Ebook PDF; optional explicit curated sample, no implicit extraction/editing/web article |
| EPUB | Package/navigation/security validation, read-only preview, immutable source | Ebook EPUB; no automatic editor import or PDF/HTML product promise |
| Audio chapters | Ordered validated sources, credits, probe/transcode/sample and manifest review | Audiobook; no automatic narration from text |

Create-title flow: choose supported work type → upload or write → choose enabled delivery outputs → preview → set one or more offers/declare package eligibility → rights/terms/readiness → staff review → publish. Work type does not dictate payment mode or file input. A blog_post may be a long document; a book may originate in the editor. Capability-specific rules select applicable quality checks and truthful preview controls.

Free/editor-authored support can be introduced as an R1 contract/authoring slice where capacity allows; it must be complete by R3 before that product is sold. Existing public-blog production remains on its verified writer until the unified title/channel cutover passes; R7 is subscription expansion, not the first architecture discussion of blog identity.

## Free versus paid, then paid offer selection

A title has one approved `commercialClass: free | paid`, versioned with its commercial/publication policy. Its deliveries/languages inherit that classification; they may have different paid prices/coverage but cannot independently override a free title into a paid product or offer full free access alongside paid access. Private drafts may be unconfigured; publication requires a valid approved classification. This is separate from household/institution grant sources and from the reader's current access reason.

| Title classification | Lifetime purchase enabled | Subscription enabled | Valid published configuration |
| --- | --- | --- | --- |
| Free | No | No | Free full-content access only |
| Paid | Yes | No | Lifetime purchase only |
| Paid | No | Yes | Subscription/library package access only |
| Paid | Yes | Yes | Both paid routes, each with its own terms |
| Free | Yes or subscription Yes | Any | Invalid: free and paid cannot coexist |
| Paid | No | No | Invalid for new publication; may be withdrawn from new acquisition while historical grants are honoured |

Free samples/excerpts of paid content are previews, not a competing free full-content offer. Existing purchasers, paid-period subscribers, sponsored members and explicitly permitted household profiles can access without paying again; that does not reclassify paid content as free. A free account/profile is unrelated to a title's commercial classification.

| Mode | Customer promise | Access mechanics and limits |
| --- | --- | --- |
| Free | Read/listen without payment while eligible free content is offered | Free eligibility and optional library-save/grant record; no fake zero-value purchase. Public samples remain separate from full free content |
| Lifetime purchase | One verified payment for durable access to the selected covered product, without recurring charges | Frozen covered deliveries, release-update and sharing policy; no subscription expiry. Taking an offer off sale or removing it from a package does not erase purchased access. New editorial editions/other languages/productions are excluded unless explicitly covered |
| Subscription / paid period | Pay monthly for access to the stated package while a paid period/coverage is valid | Paid periods and versioned included-product coverage; cancellation stops future renewal and retains paid-through coverage. Expiry ends only subscription-derived eligibility; independent purchases remain |

“Lifetime” is the product's durable one-off access category, not transfer of copyright, a promise of all future editions or an unconditional guarantee against rights takedown/service closure. Product/terms owners must define service continuity, lawful unavailability, refunds and permitted offline access before R3 selling. The implementation must never expire a purchase simply because a subscription ended. Public copy should describe the actual covered products and limits clearly.

Price versions and creator/Wolly revenue terms freeze in offer/checkout/sale records. An Offer records publisher/account, mode, exact coverage, amount/currency when applicable, validity, household/institution eligibility and agreement revision. Free/lifetime/subscription paths converge in one access resolver; UI labels do not grant access. Creators choose free versus paid, then paid purchase/subscription routes and consent to their separate terms; staff cannot silently convert individually sold content into a subscription royalty programme.

Multiple valid sources combine with OR for access, then apply global rights and profile restrictions. Resolver returns useful reasons such as free, purchased, subscribed, household or sponsored without leaking private other-account data. A subscription user buying an included product gains durable access; disclose overlap before checkout rather than refusing a legitimate purchase as a duplicate subscription grant.

### Configuration, validation and changes

Creator UI is a two-step decision: **Free / Paid**, then, for paid content, **Lifetime purchase / Subscription / Both**. Lifetime terms include exact product coverage, price/currency, beneficiary, corrections/continuity, refund and sharing conditions. Subscription terms include approved package participation, included deliveries/languages, monthly package price and term, current/next-period coverage, cancellation, sharing and allocation policy. Subscription-only content must be linked to a valid published package before readers are told they can subscribe; package and title review resolve readiness together.

Store `TitleCommercialPolicyRevision` with classification and the allowed paid routes, plus separate offer/package revisions. Review/activate changes transactionally: enforce no live full-content free offer with paid routes, at least one eligible paid acquisition route for paid publication, and no new paid-package inclusion for free titles. Lock the relevant title policy and validate descendant offers/coverage on publication, checkout and package-version approval; generic PATCH cannot race around the invariant. Preserve immutable historical rows, not just a mutable boolean.

A free→paid change ends future free full-content acquisition and activates only reviewed paid routes at the declared effective time. Do not retroactively charge readers or fabricate purchases; previously downloaded unprotected files cannot be recalled. A paid→free change closes future paid acquisition, resolves package transition/customer obligations and follows the disclosed terms; it must not erase lifetime receipts or revoke previously valid paid-period facts. Mid-period package changes need a scheduled effective transition or explicit reviewed customer remedy, not silent shrinkage of contracted coverage or continued new charges for a now-free title. History may contain both classifications at different times; one current classification remains authoritative. Historical grants retained under prior terms are not simultaneous new free and paid offers.

## Package and subscription entities

| Entity | Key relationships / invariants |
| --- | --- |
| `Offer` / `OfferVersion` | Account/publisher and mode; typed coverage join to same approved product tree; immutable price/terms, no arbitrary target pointer. Lifetime checkout is not a recurring provider plan |
| `SubscriptionPackage` | Stable identity, owning/operating account, public description, enrollment status and current version. Creator/organisation packages and Wolly-curated multi-publisher packages use explicit contributor distribution/settlement agreements |
| `PackageVersion` / `PackageMembership` | Immutable declared product set, eligibility, coverage/sharing and change-policy revision. Membership pins permitted delivery identities and release-update policy; per-product participation/rights evidence. Series/tag/channel membership is not automatic package coverage |
| `PlanPriceVersion` | Package/version, monthly interval, currency/price and provider-plan mapping; changes do not rewrite existing receipts or paid periods. Multiple packages and prices are independent |
| `Subscription` | Buyer account, authenticated payer, package, selected plan/terms, provider mapping, lifecycle/renewal preference. One active enrollment per buyer/package by default; different packages can coexist. Recipient/profile rules are explicit, not a shared user-wide paid flag |
| `SubscriptionPeriod` | Specific paid charge identity and original effective start/end with frozen plan and period coverage references; unique provider charge/period, never extend from webhook replay time |
| `PeriodCoverage` | Contracted included products/change policy for that paid period, with grant provenance. Use constrained membership/coverage references and bounded projections, not untracked dynamic tag queries |
| `SubscriptionAllocation` / ledger | Charge/currency, frozen contractual distribution policy, creator beneficiaries and adjustments. Membership/engagement analytics never retroactively determine already-earned royalties without the agreed policy |

Recommend starting with curated explicit sets and monthly periods. For ordinary package edits, honour the paid period's snapshot through its end; apply agreed changes at next renewal with notice. Adding content mid-period needs an explicit supplemental coverage version; removing it cannot silently shrink the current contracted set. Rights/safety restrictions still take effect through the resolver with support/refund policy. Do not promise perpetual archive access after subscription expiry unless the offer deliberately grants it.

Prevent arbitrary inclusion of foreign/private/draft content. Platform-curated packages across publishers need each participant's authorization and approved revenue allocation policy before sale. Start those with fixed, auditable allocation terms if chosen; usage-based pools require anti-fraud, attribution/privacy, counting, rounding and dispute rules first. No invented royalty split or unlimited all-Wolly plan is decided here. Package tiers may differ in included content, profile/seat coverage and price, but each difference is explicit and testable.

Plan upgrades/downgrades can initially take effect at the next renewal; immediate proration/trials/promotions are separate contracts to implement deliberately. Failed renewal does not delete an already-paid period; a grace period exists only when explicitly configured. Retired plans retain current paid access and a supported renewal/migration decision. Complimentary periods remain distinct from paid billing and cannot overwrite it.

## Monthly billing and finance

Use the shared expected-checkout + durable signed inbox + settlement + reconciliation pipeline for initial/renewal charges. A provider subscription-created event alone is not payment. Verify persisted buyer/package/plan, currency/amount and original effective period. Replays, simultaneous return/webhook and out-of-order cancellation/renewal events converge. Cancellation and provider timeout are inspectable states; do not grant another month from a retry timestamp or automatically charge again on an ambiguous outcome.

Paystack documentation checked 14 November 2026 supports recurring Card and Nigerian Direct Debit and describes subscription events. Do not promise automatic monthly mobile-money billing in Ghana. Validate supported provider/channel behavior before enrollment; if manual period renewal/prepayment is offered, label it accurately and implement a separate idempotent paid-period flow, not a fictional recurring mandate. Preserve imported legitimate annual/prepaid periods even though new programme default is monthly. [Provider subscription documentation](https://paystack.com/docs/payments/subscriptions/).

Each charge is reconciled per currency into customer payment, provider fees, creator liabilities and platform revenue under frozen allocation terms. Payouts stay permission-protected and auditable; no cross-currency display conversion becomes settlement. Refund/chargeback reverses only applicable grants/period/allocation entries and retains a valid independent lifetime grant. Cancellation must not erase invoices, reading history or past beneficiary facts.

## Reader, creator, household, organisation and staff surfaces

**Creator Hub web:** upload/write in one title workspace; preview source-specific outputs; choose free or paid, then configure lifetime purchase and/or package participation for paid content; see single-sale versus subscription statements and eligibility. Manage publication/channel appearance, packages, monthly plan versions and scheduled title publication. Package operators manage explicit covered products and participant approvals, not rights by tag. Organisation editor/signer/finance authority applies.

**Consumer web and Android:** browse titles/channels/packages; choose edition/language/production; see free/read, buy lifetime and subscribe paths with exact coverage; explain “included in your package” versus “owned”. Library and resume state remain profile-scoped. Display paid-through date/cancel/pending renewal and purchase fallback. Web_text uses safe accessible online rendering and canonical routes; EPUB/PDF/audio retain their own readers. Offline access is format/offer-specific; expiring subscription rights cannot rely on an indefinitely valid cached URL.

**Households and institutions:** only a plan's declared profile/seat sharing applies. Minor suitability restrictions still apply to subscribed content. Named institution assignments do not flow to dependents. An organisation buying a consumer package is not automatically an institutional multi-seat license; explicit sponsor terms and quantities remain necessary. Reader mode, commercial mode and audience scope are separate.

**Backoffice/API:** review title revisions, content rights/suitability, offers/package inclusion and allocation contracts; inspect subscription charges/periods/coverage and independent grants; support cancellation/refund/reconciliation, paid-content caching, correction/takedown, job/email failures and cohort rollout. Disallow private whole-body leakage through feed/SSR/RSS/search/prefetch/newsletter; deliberately free excerpts are separately bounded public outputs.

## Migration and compatibility

Keep runtime Firestore `posts`, `publications`, tiers, content segments and subscription records as historical input, not target canonical entities. Map each validated post to a `blog_post` title with default editorial/language edition, appropriate web_text delivery/release and publication snapshot; preserve sanitized body, free excerpt/paywall boundary, version history, metadata, source path and stable public routes. A publication maps to channel identity; legacy post/channel routes can be compatibility adapters over canonical commands, never duplicate writers.

Map each legacy tier/subscription to an explicitly scoped compatible package/plan/paid period with documented coverage; preserve provider IDs, paid-through dates, cancellations/comps and authorised legacy dynamic-publication benefits. Do not reinterpret old recurring mandates or annual periods as new agreements, nor narrow/broaden existing rights by silently freezing a different product set. Where legacy future-post or archive promises cannot be represented by the new default snapshot rule, retain a documented compatibility coverage policy until a consented transition; hold ambiguous records as exceptions.

Separate public navigation pages (about/contact) from substantive post works; do not invent sellable titles for every site setting. Preserve comments/report targets through mapped title identities and historical context; no duplicate reviews/votes. Profile scopes, consent/suppression history, receipts and financial beneficiary facts survive. Old clients either use validated adapters/primary profiles or explicit upgrade behavior; they do not gain universal paid access from `isPaid`.

## Release and milestone dependencies

| Release | Required capability |
| --- | --- |
| R0–R1 | Define book/blog_post identity, editor source/web_text contract and three-mode offer/grant schema; default free ebook loop and bounded editor publishing slice |
| R2 | Publish and consume free audio on Android plus supported online web playback; no checkout required to prove listening, no fake zero-price sales |
| R3 | Monetise supported ebook/audio/web_text titles with lifetime offers, exact coverage/beneficiary and reconciled payouts; complete advertised upload/editor/reader paths before selling each |
| R4–R6 | Publisher accounts manage titles/offers and programme participation; consuming organisations buy explicit permitted licenses; package billing/creator-finance permissions remain separate |
| R5 | Apply declared household offers and suitability controls consistently to every enabled content/format; package/profile coverage prepared, no assumption of unlimited sharing |
| R7 | Monthly package enrollment, charge/renewal/cancel/expiry/plan changes, snapshots, multi-creator allocations where offered, web/mobile access and support/finance gates; channel/newsletter/community parity through unified titles |
| R8 | Verified post→title and tier→package migration, historical access/paid periods/mandates/URLs and full compatibility/recovery evidence |

B0–B13 are work packages, not chronological mandates: bring audio B6/B7 slices forward, define title/editor parts of B10 early, use B8–B9 for lifetime sales and B11–B12 for general package subscriptions/delivery. E4 no longer contains generic content subscriptions; only future installment, periodical/archive-specific coverage, advanced bundles and their extra policies remain there.

## Acceptance scenarios

1. Upload DOC/DOCX/PDF/EPUB or start in editor, save/resume privately, preview supported outputs and publish a free eligible title through staff review. Unsafe input/foreign assets/stale jobs cannot expose a private body.
2. Publish an audio-only free title in R2, listen/seek/resume on mobile and supported web, then later change its reviewed classification to paid and activate a lifetime offer, ending new free full-content access at the declared effective time. Do not charge earlier free sessions or invent a historical purchase. No live free offer remains alongside the paid offer.
3. Offer the same exact product for lifetime sale and inclusion in two distinct packages. Purchase persists after subscription expiry/package removal; a subscription alone never becomes lifetime ownership.
4. Select monthly package A then also B; different covered languages/formats remain explicit. Cancellation retains paid-through access; failed/duplicate/out-of-order charges do not add/remove unexplained periods. Future dated cutoff uses authoritative timestamps.
5. Change package membership/price with an existing paid period; old receipts/current-period coverage remain correct, next renewal follows approved transition. Takedown blocks affected content and opens the appropriate support/refund path without erasing independent histories.
6. Race checkout/renewal/webhook/reconciliation; settle one charge once. Freeze allocations, reconcile mixed currencies separately and avoid twice paying an included creator. Profile activity does not multiply royalty/vote events.
7. Reject organisation-dependent seat reuse, minor suitability bypass, foreign-account package inclusion and restricted profile checkout. Samples/SSR/RSS/email/offline caches do not expose unpaid or age-restricted bodies.
8. Migrate/reimport legacy posts/subscriptions with stable URLs, correct content/period coverage and approved compatibility exceptions, preserving annual/prepaid periods, cancellation/consent and original beneficiaries.

9. Reject free plus lifetime/subscription, and paid with no acquisition route on publication. Race policy activation, checkout and package inclusion: at most one current classification governs the title and all descendants. Verify previews remain bounded, both paid routes work independently, and free↔paid transitions preserve historical receipts/obligations without concurrent free full-content offers.
