# Proposed API and feature coverage map

These are proposed HTTP contracts, not routes that currently exist. All application routes use `/api/v1`; the table paths omit that prefix. Keep this map synchronized with OpenAPI as milestones are implemented. Feature IDs refer to [the inventory](CODEBASE_REVIEW.md).

The [title and digital-media specification](TITLES_AND_DIGITAL_MEDIA.md) defines the title/delivery/edition resources below. Supported delivery kinds are `ebook` and `audiobook` only. Routes are proposals; the legacy function mapping at the end retains historical names.

## Common contract

- JSON responses use `{ "data": ... }`; list responses add `page: { nextCursor }`. Errors use `{ "error": { "code", "message", "requestId", "details" } }`. Details may contain named validation/preflight problems, never private stack traces.
- Use `400` malformed input, `401` missing/expired authentication, `403` permission denial, `404` absent/non-disclosable resource, `409` state/version/idempotency conflict, `413` upload too large, `422` valid request failing domain checks, `429` rate limit and `503` temporary dependency failure. A paywall returns a safe body/access DTO, not a generic transport failure.
- IDs are opaque strings, timestamps RFC 3339 UTC, dates `YYYY-MM-DD`. Money is `{amountMinor: integer, currency: string}`; constrain values to the agreed cross-client safe range. New revenue shares use basis points; legacy snapshots are preserved with explicit import conversion.
- Paginate with a stable `(sort_value,id)` cursor, bounded `limit`, validated filters and consistent ordering. Scope rows to the viewer in SQL before pagination. Aggregate finance over the complete authorized date range, not the current page.
- Server derives actor IDs, owner IDs, staff privileges, author badges, prices, paid state, ratings, counters, ledger and payout status. Never accept a document-shaped unrestricted patch.
- Use `If-Match`/version on mutable drafts and settings. Use actor+operation-scoped `Idempotency-Key` with request-body digest and saved outcome for checkout, signing, grants, conversions, payouts and sends. Reuse with different input is `409`.
- Binary PDF/EPUB/asset responses are not JSON. Authorized download-link DTOs contain format, edition ID and expiry; owner preview streams `application/pdf`, replacing base64 transport.
- All private reads/writes require session or mobile token. Browser mutations also require CSRF/origin protection. Provider callbacks use their signature policy instead of browser sessions. Permission checks occur inside domain commands as well as at the HTTP boundary.

## Identity, profiles and reference data — B1–B3

| Routes | Actor/purpose | Coverage |
| --- | --- | --- |
| `GET /health/live`, `/health/ready`, `/capabilities` | Public safe status; no secrets or permission shortcuts | Outage UX |
| `POST /auth/registrations`, `/auth/login` | Register/email-password login | R01, C01, A01, public blog |
| `POST /auth/password-reset/requests`, `/auth/password-reset/confirmations` | Generic-response request and single-use completion | C01, account recovery |
| `POST /auth/email-verification/requests`, `/auth/email-verification/confirmations` | Verify email independently of profile text | R01, C01 |
| `POST /auth/phone/challenges`, `/auth/phone/verifications` | SMS OTP, throttled and consumed once | R01 |
| `POST /auth/magic-links`, `/auth/magic-link-completions` | Single-use email sign-in links with allowlisted redirects/deep links | R01 |
| `GET /auth/google/start`, `/auth/google/callback` | OAuth/OIDC authorization code, state/nonce and PKCE as applicable | Public blog Google sign-in |
| `GET /auth/session`; `POST /auth/logout`, `/auth/logout-all` | Restore safe account/permissions, revoke sessions | All clients |
| `POST /auth/mobile/refresh`; `GET /me/sessions`; `DELETE /me/sessions/{id}` | Device refresh rotation/session management | R01 |
| `POST /me/identities/link-challenges`, `/me/identities/link-confirmations` | Recently authenticated account linking with proof | Cross-surface identity |
| `POST /auth/staff/mfa/challenges`, `/auth/staff/mfa/verifications` | Step-up for staff-sensitive operations, backed by vetted MFA implementation | A07–A10 |
| `GET/PATCH /me`, `/me/preferences`, `/me/creator-profile` | Allowlisted private profile/onboarding/preferences | R02, R06, C01 |
| `GET /authors/{id}`, `/authors/{id}/titles` | Safe public author fields only | R03, R10, C01 |
| `GET /reference/countries`, `/currencies`, `/payment-methods`, `/payment-schedules` | Read-only configuration | C01, C09 |
| `POST /me/data-exports`, `/me/deletion-requests` | Controlled account export/deletion job with retention policy | Account lifecycle completion |

Do not adopt Go OTP-only auth while claiming parity with existing passwords, Google and phone flows. Stage providers within B2, but all retained methods need explicit acceptance before production migration.

## Reader catalog and reading — B3–B4

| Routes | Rules and response | Coverage |
| --- | --- | --- |
| `GET /titles?q=&genreId=&authorId=&deliveryKind=&sort=&cursor=` | Only titles with eligible published deliveries; deduplicate titles; no manuscript/evidence/private object URL | R03 |
| `GET /titles/{id}`, `/genres`, `/genres/{id}/titles` | Approved title revision, eligible delivery summaries with individual prices/ownership, approved rating and distinct title genre counts | R03 |
| `GET /me/home`, `/me/recommendations` | Joined continue-reading and genre-based recommendations | R04 |
| `GET /me/library`, `/me/purchases`, `/me/purchases/{id}` | Purchased/started reading records and honest purchase status | R07–R08 |
| `POST /deliveries/{deliveryId}/download-links` | Requested EPUB/PDF, entitlement and availability checked; short TTL | R05, R09 |
| `GET /deliveries/{deliveryId}/sample` | Only deliberately generated public sample; never press preview | R03; completion of sample behavior |
| `GET/PUT /me/deliveries/{deliveryId}/reading-progress` | Edition/format/locator, page counts, last-read, server revision; stale writes handled explicitly | R04–R05 |
| `GET/POST /me/deliveries/{deliveryId}/bookmarks`; `PATCH/DELETE /me/bookmarks/{bookmarkId}` | Own records, edition/locator/page/note validation | R05 |
| `GET /titles/{id}/reviews`; `GET/PUT/DELETE /me/titles/{id}/review` | Public approved reviews; own submission pending/re-review, rating 1–5 | R10 |
| `PUT/DELETE /me/following/{authorId}`; `GET /me/following` | Idempotent follow/unfollow | R10 |

| Audio routes — B6–B8 | Rules and response | Coverage |
| --- | --- | --- |
| `POST /deliveries/{deliveryId}/playback-sessions` | Entitlement/rights checked; immutable edition manifest, ordered chapters, durations and bounded playback authorization; no source master URLs | New audio |
| `GET /playback-sessions/{sessionId}/chapters/{chapterId}/audio` | Owner session, chapter in frozen edition, recheck expiry/rights; authorized range/seek response or short-lived asset link; link refresh never bypasses policy | New audio |
| `POST /deliveries/{deliveryId}/offline-downloads` | Authorized audio manifest and derived assets/checksums; account/delivery/edition cache scope | New audio |
| `GET/PUT /me/deliveries/{deliveryId}/listening-progress`; `GET/POST .../audio-bookmarks` | Edition/chapter ID and bounded position milliseconds, independent from ebook locators; version conflicts and old-edition policy explicit | New audio |
| `PATCH/DELETE /me/audio-bookmarks/{bookmarkId}` | Own bookmark, stable ID, validated chapter/time/note | New audio |

Here `...` expands under `/me/deliveries/{deliveryId}`. Audio metadata does not imply playback support on old clients. Reading/bookmark commands reject audio mode, and listening commands reject ebook mode. Public title payloads omit draft siblings. Samples are separately approved public assets. `POST /deliveries/{deliveryId}/download-links` selects only renditions actually available for an ebook edition; it never grants a sibling delivery.

Offline rendering and file deletion are Flutter responsibilities. Go returns stable title/delivery/edition/asset identifiers, authoritative checksums and sync revisions. An expired signed URL must never become an offline cache identity.

## Creator titles, press and publishing — B5–B7

| Routes | Rules | Coverage |
| --- | --- | --- |
| `GET/POST /creator/titles`; `GET/PATCH /creator/titles/{id}` | Owner-scoped private titles; filters, versioned metadata autosave | C02–C03 |
| `POST /creator/titles/bulk-updates` | Bounded IDs, every book authorized; only explicitly allowed operations; return per-item outcomes | C03 |
| `DELETE /creator/titles/{id}` | Only remove empty/unreferenced drafts; otherwise archive via explicit workflow, checking all deliveries and preserving finance/evidence | C03 |
| `POST /creator/deliveries/{deliveryId}/uploads` | Asset role manuscript/cover/chapter/sample/supplement; validate intended type/size; return upload session | C02–C04 |
| `POST /creator/deliveries/{deliveryId}/uploads/{uploadId}/complete` | Verify actual bytes and owner; bind immutable validated source/cover/chapter version | C04 |
| `POST /creator/deliveries/{deliveryId}/conversions`; `GET /creator/deliveries/{deliveryId}/conversions/{jobId}` | Durable version-bound conversion and retry/status | C04 |
| `GET /creator/deliveries/{deliveryId}/editions`; `GET /creator/deliveries/{deliveryId}/editions/{editionId}/preview` | Own edition history and binary press preview | C04 |
| `GET /creator/deliveries/{deliveryId}/readiness?scope=title\|listing` | Authoritative title plus selected-delivery checks/blockers/next steps; select document/PDF/EPUB/audio rules without sibling blockers | C05 |
| `GET/POST /creator/titles/{id}/rights`; `PATCH /creator/titles/{id}/rights/{grantId}` | Declared scope and terms; immutable declaration; no verification privileges | C06 |
| `POST /creator/titles/{id}/rights/{grantId}/archive`; `POST /creator/titles/{id}/rights/{grantId}/evidence` | Archive history, private evidence upload, owner binding | C06 |
| `GET /creator/deliveries/{deliveryId}/publishing-offer` | Canonical agreement version/text/hash, delivery price/terms, title revision and edition/version | C07 |
| `POST /creator/deliveries/{deliveryId}/contracts`; `GET /creator/deliveries/{deliveryId}/contracts` | Accept offer ID/hash and chosen free/price; revalidate and freeze server facts | C07 |
| `POST /creator/deliveries/{deliveryId}/withdrawal-requests` | Owner asks to withdraw/end; reason and current version; staff-effective outcome | C03, C07 |

### Additional title and delivery contracts — B5–B7

All paths below also use `/api/v1`. IDs in nested commands must belong to the authorized title/delivery tree; a valid upload or asset ID alone grants no access.

| Routes | Rules |
| --- | --- |
| `GET/POST /creator/titles/{id}/deliveries`; `GET/PATCH /creator/deliveries/{deliveryId}` | Create ebook or audio first without files; unique title/kind; typed metadata patches, optimistic versions, no physical kind or creator self-publication |
| `POST /creator/deliveries/{deliveryId}/archive` | Validate pending jobs, agreements, buyer access and retention; independent of sibling delivery |
| `POST /creator/titles/{id}/uploads` plus upload completion; `PUT/DELETE /creator/titles/{id}/asset-bindings/{role}` | Shared artwork/promotional assets; validate role/ownership; changes create draft metadata revisions |
| `PUT/DELETE /creator/deliveries/{deliveryId}/asset-bindings/{role}` | Explicit delivery artwork/sample/supplement bindings; only eligible artwork inherits; freeze resolved versions at review |
| `POST /creator/deliveries/{deliveryId}/document-imports`; `GET .../document-imports/{jobId}` | DOC/DOCX to safe structured draft; isolated legacy conversion, immutable source and diagnostics |
| `GET/PATCH /creator/deliveries/{deliveryId}/manuscript-draft`; `POST .../manuscript-revisions` | Document sources only; schema-validated structured editor document, If-Match autosave and frozen revision for conversion |
| `GET/POST /creator/deliveries/{deliveryId}/chapters`; `PATCH/DELETE .../chapters/{chapterId}` | Audio only; stable chapter IDs, label/section kind, validated source asset; draft changes cannot mutate published manifests |
| `PUT /creator/deliveries/{deliveryId}/chapter-order` | Full bounded unique chapter-ID sequence, same delivery, optimistic version |
| `POST /creator/deliveries/{deliveryId}/audio-processing`; `GET .../audio-processing/{jobId}` | Idempotent frozen source/order/profile job, measured duration and per-chapter diagnostics |
| `POST /creator/deliveries/{deliveryId}/samples` | Generate a bounded public excerpt from approved selection or submit an uploaded excerpt for review; never expose private master |
| `GET /creator/deliveries/{deliveryId}/editions/{editionId}/manifest` | Owner audio preview manifest with protected playback; PDF/EPUB preview uses its consumption renderer |

The `...` paths expand under `/creator/deliveries/{deliveryId}`. Generic conversion endpoints apply to editable document revisions; direct PDF/EPUB use `POST /creator/deliveries/{deliveryId}/validations` and `GET .../validations/{jobId}` to validate immutable uploads instead. A PDF/EPUB delivery rejects content-editor commands. Title-level rights endpoints remain available for explicitly shared grants; add `GET/POST /creator/deliveries/{deliveryId}/rights` and `PATCH .../rights/{grantId}` with the same evidence/archive commands and immutable declaration rules for format-specific rights.

Uploads may use a direct signed upload to a quarantine object store in production or a bounded Go multipart upload locally. Completion and conversion commands are always Go-authorized; storage success alone does not publish a book.

Admin retains title-wide suspension/rights-case commands for explicit whole-work restrictions. Add `GET /admin/deliveries/{deliveryId}` and `POST /admin/deliveries/{deliveryId}/reviews`, `/suspension`, `/withdrawal`, `/restoration`, plus delivery-scoped rights cases. Staff signoff binds title revision and edition; contract activation publishes only its bound delivery. Inspect full audio manifests/quality/sample in review.

## Purchases, earnings and payouts — B8–B9

| Routes | Rules | Coverage |
| --- | --- | --- |
| `POST /deliveries/{deliveryId}/checkouts` | Server delivery price/currency/terms and edition, unique attempt; return URL/reference/attempt ID | R08 |
| `GET /me/checkouts/{attemptId}`; `POST /me/checkouts/{attemptId}/verification` | Owner-only status and bounded provider verification; cannot select another buyer's reference | R08 |
| `POST /webhooks/paystack` | Bounded signed raw body, persisted inbox, idempotent processing for books/subscriptions | R08, C09, paid blog |
| `GET /creator/analytics/overview`, `/revenue`, `/titles`, `/geography` | Date range, timezone, currency, page-independent aggregates; distinguish earnings and payout | C08 |
| `GET /creator/transactions`, `/creator/statements`, `/creator/payouts` | Frozen title/delivery/edition sale rows, period/currency statements, actual transfer history | C08–C09 |
| `GET/POST /me/payout-destinations`; `PATCH/DELETE /me/payout-destinations/{id}` | Masked/encrypted destination details, versioned verification/default; restrict deletion if in use | C01, C09 |
| `GET/PATCH /me/payout-preferences` | Supported currency/method/schedule selection; never a guarantee a payout occurred | C09 |

## Publications, blog authoring and subscribers — B10–B12

| Routes | Rules | Coverage |
| --- | --- | --- |
| `GET/POST /creator/publications`; `GET/PATCH /creator/publications/{id}` | Ownership, branding/theme/contact/comment policy and unique handle reservation | C10 |
| `GET /publications/handle-availability?slug=` | Advisory availability; creation still uses unique constraint | C10 |
| `POST /creator/publications/{id}/uploads` plus completion | Validated public branding/inline image assets; keep private files outside this path | C10–C11 |
| `GET/POST /creator/publications/{id}/tiers`; `PATCH /creator/publications/{id}/tiers/{tierId}` | Version prices/plans; retire instead of breaking old subscriptions | C10 |
| `GET/POST /creator/publications/{id}/posts`; `GET/PATCH /creator/posts/{id}/draft` | Owner-only editor, atomic metadata/body save and optimistic version | C11 |
| `POST /creator/posts/{id}/publish`, `/schedule`, `/unpublish`, `/archive` | Same allowlist renderer/access derivation; schedule frozen revision and cancel stale jobs | C11 |
| `DELETE /creator/posts/{id}` | Defined draft-delete versus published archive; retain needed moderation/delivery history | C11 |
| `GET /creator/posts/{id}/revisions`; `POST /creator/posts/{id}/revisions/{revisionId}/restore` | Versioned snapshot/restore, bounded history | C11 completion |
| `GET /creator/publications/{id}/subscribers`; `POST .../subscriber-exports` | Owner-scoped pagination/filter, consent-aware export, no billing secrets | C12–C13 |
| `POST /creator/publications/{id}/complimentary-grants`; `DELETE .../complimentary-grants/{grantId}` | Existing verified recipient, bounded duration/tier scope, separate paid billing | C12 |
| `GET /creator/publications/{id}/analytics`, `/creator/posts/{id}/analytics` | Defined view/read/subscription metrics and email outcomes; no invented statistics | C13 |
| `POST /creator/posts/{id}/newsletter-sends`; `GET /creator/publications/{id}/newsletter-sends` | Confirmed consent, controlled resend, paid/free variants and durable jobs | C13 |

The `...` routes above expand under the same `/creator/publications/{id}` parent. Lists/export jobs must never expose another publication's subscribers.

## Public blog and reader blog — B10–B12

| Routes | Rules | Coverage |
| --- | --- | --- |
| `GET /publications`, `/publications/by-handle/{slug}`, `/publications/{id}/tiers` | Active publication safe summaries and available tiers | R11, public site |
| `GET /posts`, `/publications/{id}/posts` | Discovery/archive query: published and not removed, no unlisted/draft/paid body leakage | R11 |
| `GET /publications/{id}/posts/by-slug/{slug}`; `GET /posts/{id}/body` | Direct unlisted lookup permitted; viewer-aware access DTO and permitted segments only | R11, paywall |
| `GET /me/blog-feed`, `/me/subscriptions` | Discovery versus subscribed feed explicitly selectable | R11 completion |
| `GET/PUT /me/subscriptions/{publicationId}` | Get/free subscribe, email opt-in preference; cannot choose paid fields | R11 |
| `POST /publications/{id}/subscription-checkouts` | Persist tier/price/interval before provider call | R11, paid blog |
| `POST /me/subscriptions/{publicationId}/cancellation`, `/reactivation` | Provider-aware renewal control; access through paid period; reconciliation for ambiguous response | Subscription completion |
| `PUT/DELETE /posts/{id}/like`; `GET /posts/{id}/engagement` | Viewer state, idempotent unique like; access checked | Blog engagement |
| `GET/POST /posts/{id}/comments`; `PATCH/DELETE /comments/{id}` | Access policy, user ownership, safe text, one-level replies, moderation history | Blog engagement |
| `POST /posts/{id}/reports`, `/comments/{id}/reports` | Rate-limited reason/evidence; unique reporter/resource policy and queue | A05–A06 completion |
| `POST /analytics/events` | Bounded view/read event; server validates resource and dedupes; cannot set arbitrary totals | C13 |
| `POST /email/consents/confirmations`, `/email/unsubscriptions`; `POST /webhooks/email/{provider}` | Single-use consent; scoped unsubscribe token; signed delivery/bounce/complaint callbacks | Newsletter completion |

Next.js retains public URL routes, metadata, JSON-LD, OG tags, sitemap and RSS rendering. It obtains public data through Go. RSS/sitemaps expose only eligible public content; paid/subscriber content must not leak through free feed bodies or preview caches. Tokenized one-click email unsubscribe may additionally need a standards-compatible route/header shape for the selected provider; implement it in B12 without exposing session-dependent UI.

## Admin and operations — B2, B7, B9–B13

| Routes | Permission and behavior | Coverage |
| --- | --- | --- |
| `GET /admin/overview`, `/admin/titles`, `/admin/titles/{id}` | Scoped staff views and counts, server filters/pagination | A01–A02 |
| `POST /admin/titles/{id}/reviews` | Approve a shared metadata revision or request changes; content signoff uses delivery review | A02, A08 |
| `POST /admin/contracts/{id}/activation`, `/termination`; `POST /admin/titles/{id}/suspension`, `/archive`, `/restoration` | Publishing approval permission, reason, atomic state changes | A02, A08 |
| `GET /admin/rights/cases`, `/admin/titles/{id}/rights`; `POST /admin/rights/{grantId}/verification`, `/admin/titles/{id}/rights-cases` | Rights reviewer; evidence viewing audited, decision scope and delivery state | A08 |
| `GET /admin/reviews`; `POST /admin/reviews/{id}/decisions` | Moderator, approved-rating consistency | A03 |
| `GET/POST /admin/genres`; `PATCH /admin/genres/{id}` | Taxonomy permission, unique slugs and retirement | A04 |
| `GET/POST /admin/reference/{kind}`; `PATCH /admin/reference/{kind}/{id}` | Configuration permission; allowlisted countries/currencies/payment methods/schedules, preserve referenced historical values | C01/C09 operational completion |
| `GET /admin/posts`, `/admin/comments`, `/admin/reports`; `POST /admin/posts/{id}/decisions`, `/admin/comments/{id}/decisions` | Moderation permission, report resolution, cache/access consistency | A05–A06 |
| `POST /admin/publications/{id}/suspension`, `/restoration` | Moderation permission; prevent public discovery and protect content access consistently | A05 completion |
| `GET /admin/users`; `POST /admin/users/{id}/suspension`, `/restoration`; `PUT/DELETE /admin/users/{id}/permissions/{permission}` | Separate permission administration; revoke sessions and prohibit self-escalation | A07 |
| `GET/POST /admin/revenue-policies` | Finance policy permission, version/reason; affect future offers only | A09 |
| `GET /admin/checkouts`, `/admin/transactions`, `/admin/provider-events`; `POST /admin/reconciliation-runs`, `/admin/provider-events/{id}/replay` | Finance operations, durable recovery, audit and bounded replay | A10 |
| `POST /admin/purchases/{id}/refunds`; `GET /admin/refunds` | Finance permission, provider-confirmed refund/reversal workflow | A10 completion |
| `GET/POST /admin/payout-runs`; `POST /admin/payout-runs/{id}/approval`, `/execution`; `POST /admin/payouts/{id}/confirmation` | Distinct approval/execution, locked allocation, actual transfer evidence | A10 |
| `GET /admin/jobs`, `/admin/notification-deliveries`, `/admin/audit-events`, `/admin/import-exceptions`; `POST /admin/jobs/{id}/retry` | Operational permission, bounded retries, no arbitrary payload execution | A11 |
| `GET/POST /admin/email-suppressions`; `POST /admin/email-suppressions/{id}/review` | Delivery operator, consent-aware changes, attributable decisions | A11 |

## Every current server entry point and trigger

| Existing export/source | Go replacement | Milestone |
| --- | --- | --- |
| `publishPost` — `services/api/src/publish.ts` | Publish/schedule commands and safe renderer | B10 |
| `getBookDownloadUrl` — `download.ts` | `POST /deliveries/{deliveryId}/download-links` (resolve legacy book ID to ebook delivery) | B3/B8 |
| `getBookPreviewBytes` — `preview.ts` | Owner edition preview stream | B6 |
| `signPublishingContract` — `contract.ts` | Server offer acceptance and transactional preflight | B7 |
| `initializeSubscription` — `subscribe.ts` | Subscription checkout attempts and versioned provider plans | B11 |
| `grantComplimentarySubscription` — `comp.ts` | Separate complimentary grant command | B11 |
| `paystackWebhook` — `paystack-webhook.ts` | Unified signed event inbox + worker | B8/B11 |
| `onLikeWritten` — `counters.ts` | Unique like command + SQL count/projection | B12 |
| `onCommentWritten` — `counters.ts` | Visible-comment count from canonical rows | B12 |
| `onSubscriptionWritten` — `counters.ts` | Time-aware subscriber/paid-period query; expiry repair | B11 |
| `onPostWritten` — `counters.ts` | Published-post count query/projection | B10 |
| `onConversionRequested` — `services/converter/src/index.ts` | Explicit durable conversion job tied to manuscript version | B6 |
| `initializePaystackCheckout` — `services/payments/src/index.js` | Book checkout attempt endpoint | B8 |
| `verifyPaystackPayment` — same | Owner verification command through shared settlement | B8 |
| `reconcilePendingPurchases` — same | Go reconciliation job using same settlement | B8 |
| Blog `POST/DELETE /api/session` — `apps/blog/src/app/api/session/route.ts` | Go session/proxy contract; remove Firebase token-to-cookie exchange | B2/client migration |

All direct SDK data operations are additionally replaced by the domain tables above: reader repositories, Creator Hub service classes and auth context, Backoffice service, public-blog server data/session modules and browser engagement/auth components. Replacing only the fifteen function exports would leave most of Wolly on Firebase.
