# Codebase review and feature inventory

Assessment baseline: `236c8fd`, 30 October 2026. “Implemented” means a code path exists; it does not establish that the deployed provider, credentials, rules, or workflow currently works. No app build, device walkthrough, payment, or live database audit was performed.

## What Wolly is

Target scope update (13 November 2026): Wolly supports electronic content only. The [title and digital-media specification](TITLES_AND_DIGITAL_MEDIA.md) adds parent titles, ebook/audio deliveries, editable document ingestion, read-only PDF/EPUB ingestion and audiobook processing/playback. This inventory remains evidence of the earlier checkout, not evidence those additions exist.

Wolly combines a digital bookstore/reader, an author publishing workspace, staff moderation, and a subscription-blog product. It is an npm/Turborepo monorepo with a separate Flutter toolchain.

| Area | Current implementation | Primary evidence |
| --- | --- | --- |
| Reader | Dart/Flutter, BLoC/Cubit, Firebase SDKs | [pubspec](../../apps/reader/pubspec.yaml), [main](../../apps/reader/lib/main.dart) |
| Creator Hub | TypeScript, Next.js 15, React 19, Tailwind 4, Tiptap, Zustand | [dependencies](../../apps/creator-hub/package.json), [routes](../../apps/creator-hub/src/app) |
| Backoffice | TypeScript, Next.js/React, Firebase client operations | [console](../../apps/backoffice/src/components/Console.tsx), [service](../../apps/backoffice/src/services/backofficeService.ts) |
| Public blog | Next.js server rendering plus browser Firebase engagement | [data/access layer](../../apps/blog/src/lib/blog-data.ts), [routes](../../apps/blog/src/app) |
| API | TypeScript, Node 20, Firebase Functions | [exports](../../services/api/src/index.ts) |
| Book payments | JavaScript, Node 22, Firebase Functions, Paystack | [implementation](../../services/payments/src/index.js) |
| Manuscript press | TypeScript, Mammoth, Marked, JSZip, Puppeteer/Chromium, pdf-lib | [converter](../../services/converter/src/convert.ts) |
| Persistence/platform | Firestore, Firebase Authentication, Cloud Storage, Hosting/Cloud Run | [configuration](../../firebase.json), [workflow](../../.github/workflows/deploy.yml) |

Most application behavior is not behind an API. Clients query/write Firestore directly, rely on security rules, upload directly to Storage, and observe snapshots. A Go rebuild must replace these responsibilities too.

## Reader capability inventory

| ID | Capability and current evidence | Assessment and Go responsibility |
| --- | --- | --- |
| R01 | Email/password, phone OTP, email-link completion; [auth repository](../../apps/reader/lib/features/authentication/data/auth_repository.dart), [login](../../apps/reader/lib/features/authentication/presentation/screens/otp_login_screen.dart), [email-link screen](../../apps/reader/lib/features/authentication/presentation/screens/email_link_sent_screen.dart) | Multiple paths exist; inspect actual navigation/delivery before declaring each active. Go needs shared identities, credential/recovery/verification flows, SMS challenges, magic-link completion, logout, and device sessions. |
| R02 | Profile, birthday, country/phone, persona and content/genre preferences | Implemented across onboarding/profile code, with legacy field names. Normalize account data; persona never grants staff privileges. |
| R03 | Published catalog, genre browse/counts, search and detail; [library](../../apps/reader/lib/features/library/data/library_repository.dart), [search](../../apps/reader/lib/features/library/presentation/screens/search_screen.dart) | Existing search is client-oriented. Go supplies paginated filtering/search and safe catalog DTOs. |
| R04 | Continue-reading and recommendations; [dashboard](../../apps/reader/lib/features/dashboard/data/dashboard_repository.dart) | Recommendations are genre-based selection, not an ML recommender. Replace N+1 reads and silent empty results. |
| R05 | EPUB and PDF reading, navigation, progress, bookmarks/notes; [EPUB](../../apps/reader/lib/read_book.dart), [PDF](../../apps/reader/lib/read_pdf.dart) | Reader rendering stays Flutter. Go stores authorized user/book/edition progress and bookmarks. EPUB location needs a stable locator in addition to legacy page counts. |
| R06 | Theme, font size/family, line height; [settings](../../apps/reader/lib/core/models/reader_settings.dart) | Local reader preferences are real; cross-device settings sync is an enhancement, not a current guarantee. |
| R07 | Download and device-save utilities; [downloader](../../apps/reader/lib/features/library/data/file_downloader.dart) | File handling exists; a utility does not prove a complete offline library. Explicitly test save/reopen, expired URLs, account switching, and edition keys. |
| R08 | One-off checkout, confirmation/recovery, purchase history; [payment adapter](../../apps/reader/lib/features/store/data/paystack_service.dart), [purchase repository](../../apps/reader/lib/features/store/data/purchase_repository.dart) | Server-verified completion exists in current code. Pending references survive restart. Keep attempts separate from ownership. |
| R09 | Signed book delivery, legacy free-book outage fallback; [download gate](../../services/api/src/download.ts), [fallback](../../apps/reader/lib/features/store/data/free_book_fallback.dart) | Preserve free/owner/purchased access and dispute/revocation rules. Private books never gain a public outage bypass. |
| R10 | Review submission/prompts and follows; [reviews](../../apps/reader/lib/features/store/data/review_repository.dart), [follows](../../apps/reader/lib/features/store/data/follow_repository.dart) | Go validates rating/text, one review per user/book, ownership, and moderation state; follows are idempotent. |
| R11 | Blog discovery/publication feeds, rendered free/paid body, free/paid subscription checkout; [blog repository](../../apps/reader/lib/features/blog/data/blog_repository.dart), [subscription repository](../../apps/reader/lib/features/blog/data/subscription_repository.dart) | Implemented foundations. Feed is discovery-based, not a fully personalized followed-publication inbox. Preserve both surfaces' access outcomes. |

## Creator Hub capability inventory

| ID | Capability and current evidence | Assessment and Go responsibility |
| --- | --- | --- |
| C01 | Sign-up/login/password reset, onboarding, public author profile, genres, country/currency/payment configuration; [auth](../../apps/creator-hub/src/contexts/AuthContext.tsx), [creator service](../../apps/creator-hub/src/services/creatorService.ts) | Implemented client operations. Move validation, account lifecycle, profile allowlists and reference-data reads to Go. |
| C02 | Persist title immediately, autosave description/genre, cover upload, live title state; [title service](../../apps/creator-hub/src/services/titleService.ts) | Keep early persistence and saved/unsaved/error distinctions; add optimistic concurrency for tabs. |
| C03 | Legacy book wizard, metadata, pricing, formats, distribution fields, filters, bulk edits, delete; [book service](../../apps/creator-hub/src/services/bookService.ts), [wizard](../../apps/creator-hub/src/components/book-creation) | Coexists with newer title flow. Consolidate backend commands; never carry broad arbitrary patches or author self-publication into new policy. Format/channel fields do not establish external fulfillment. |
| C04 | DOCX/Markdown/text submission, retry, EPUB/PDF outputs, conversion status, owner preview; [manuscript service](../../apps/creator-hub/src/services/manuscriptService.ts), [press](../../services/converter/src/index.ts) | Substantial implementation. Limits include 50 MiB manuscript and 10 MiB cover in client services. Preserve measured quality signals, image handling, fonts, preview and page counts. |
| C05 | Deterministic weighted Publishing Journey Report, checks/next steps; [engine](../../packages/schema/src/publishing-report.ts), [title screen](../../apps/creator-hub/src/app/books/title/page.tsx) | Pure engine exists; current title screen uses `scope: title` with empty author/rights/review context. Do not describe it as a fully populated authoritative server report/history. Go computes authoritative publish scope from persisted facts. |
| C06 | Rights declarations, format/territory/language/channel grants, dates, counterparty, archive, evidence; [rights service](../../apps/creator-hub/src/services/rightsService.ts), [schema](../../packages/schema/src/rights.ts) | Declaration versus staff verification is explicit. Registry is separate from delivery takedown status. No rights marketplace is implemented. |
| C07 | Free/paid publishing terms, agreement text/version acceptance, history, preflight; [signing](../../services/api/src/contract.ts), [screen](../../apps/creator-hub/src/app/books/publish/page.tsx) | Signing freezes terms and creates a pending agreement. Staff activation/termination is not completed by the current book-status dropdown. Go needs full transactional lifecycle. |
| C08 | Sales/revenue/book/geographic analytics, date filters; [analytics](../../apps/creator-hub/src/services/analyticsService.ts) | Current analytics queries completed purchases through the creator's current book IDs; payout summaries separately read the transaction ledger. Move both to historical sale snapshots and complete SQL date ranges with currency separation. Geographic fields may be missing and are not verified residence. |
| C09 | Earnings/monthly payout summaries, bank/mobile-money destination, payout schedule; [payout service](../../apps/creator-hub/src/services/payoutService.ts), [settings](../../apps/creator-hub/src/app/settings/page.tsx) | Earnings are implemented; real settlement is not. Monthly buckets are pending liabilities, not proof money moved. Go must add payout runs, allocations, confirmation and reconciliation. |
| C10 | Publication creation/unique handle/settings/theme, tiers/retirement; [blog service](../../apps/creator-hub/src/services/blogService.ts) | Schema allows several publications; current UI selects one. Use publication-scoped APIs without assuming one per user forever. |
| C11 | Tiptap editor, draft autosave, paywall split, sanitized publishing, unpublish/delete; [editor](../../apps/creator-hub/src/app/blog/edit/page.tsx), [publish function](../../services/api/src/publish.ts) | Implemented. `publishAt` can save a scheduled state but no scheduled-post publisher is exported. Revisions have a schema/rules path; automatic revision history/restore is not established. |
| C12 | Complimentary subscription server function; [comp](../../services/api/src/comp.ts) | Implemented endpoint resolves an existing user by email; creator UI coverage is limited. Add controlled grant/revoke/list and prevent accidentally replacing paid billing state. |
| C13 | Newsletter settings/flags, subscriber and post analytics models | Partial/spec scope. No complete newsletter delivery, double opt-in, suppression webhook, subscriber management/export or post-stat ingestion pipeline found in API exports. Include explicit completion milestones. |

## Admin capability inventory

The actual Backoffice has six tabs: overview, books, reviews, genres, posts, comments. Its [service](../../apps/backoffice/src/services/backofficeService.ts) uses browser Firestore operations.

| ID | Existing capability | Rebuild coverage |
| --- | --- | --- |
| A01 | Login and platform counts | Staff-only admission, scoped overview and audit events |
| A02 | All-book list and arbitrary status dropdown | Validated review/approve/publish/suspend/archive transitions and reasons |
| A03 | Approve/reject/flag reviews and recompute ratings | One transaction or reconcilable projection; no partial moderation success |
| A04 | Genre list/create | Unique normalized name/slug; activate/retire and handle linked books |
| A05 | Flagged/all blog posts; set ok/flagged/removed | Enforce visibility, record decisions, invalidate public caches |
| A06 | Reported/hidden comments; hide/restore/remove | Persist reader reports, paginate whole queue, preserve evidence/history |
| A07 | No complete user/role management console | Add permission assignments, suspensions, session revocation; bootstrap staff separately |
| A08 | No complete contract/edition/rights review console | Add edition signoff, agreement activation/end, evidence review, disputes and takedowns |
| A09 | Revenue settings schema/rules, no corresponding tab | Add versioned settings UI/API; affect future agreements only |
| A10 | No complete finance console | Add purchase attempts, provider events/replay, refunds, reconciliation, payout approval/history |
| A11 | No job/email/import audit console | Add bounded job retry, delivery failures, suppressions, migration exceptions and audit search |

A07–A11 are required operational completion for this rebuild, not existing UI features. Preserve the implemented six tabs while extending the console to support the workflows it is expected to govern.

## Public blog is a fourth client

Do not lose [discovery](../../apps/blog/src/app/discover/page.tsx), publication home/archive, `/@handle/postSlug`, subscription pages, RSS, sitemap, SEO/server rendering, email/password/Google login, and likes/comments when rebuilding the backend. Paid content is resolved server-side in [blog-data.ts](../../apps/blog/src/lib/blog-data.ts); hidden paid HTML must stay absent from HTML, JSON, prefetch responses and shared caches.

About/page post types, layout options, threading, reports, newsletters, and detailed engagement analytics have differing degrees of schema/spec support. Treat them as explicit feature acceptance items, not automatic consequences of having a field.

## Material findings to address

These are findings from checked-in source, not claims about the deployed ruleset or an exhaustive security audit.

| Priority | Finding and evidence | Rebuild requirement |
| --- | --- | --- |
| Critical | [Rules](../../packages/firebase-config/firestore.rules) `isAdmin()` reads `users/{uid}.isAdmin`; the users rule allows unrestricted own-document create/update. Taken together, a user could set the value the rules trust for admin access. | Store staff permission grants outside profile writes. Test self-escalation denial. Audit/import trusted staff from an independent approved roster. |
| High | Book rules permit owner updates to `status`/`isPublished`; [BookService](../../apps/creator-hub/src/services/bookService.ts) exposes publication updates. Neither field is in the server-owned list. | Authors request publication; staff approval plus active agreement and approved edition determine public availability. |
| High | [Backoffice status change](../../apps/backoffice/src/services/backofficeService.ts) only changes book fields, not pending/active agreements. [Contract signing](../../services/api/src/contract.ts) validates much of preflight before its transaction and accepts arbitrary supplied agreement wording/version subject to minimal length. | Lock/revalidate authoritative version, edition, rights and payout facts; sign only a server-issued immutable agreement offer. Activation must update agreement and listing atomically. |
| High | [Subscription webhook](../../services/api/src/paystack-webhook.ts) acknowledges handler failure with 200, refers to a nightly recovery job not present in API exports, and lacks a durable event inbox/dedup ledger. Replayed annual charges compute expiry from processing time. | Persist signed events before acknowledgment; idempotent charge periods, retries, reconciliation and ordering rules. |
| High | Subscription grants use metadata without matching a persisted expected amount/currency/attempt. [Book settlement](../../services/payments/src/index.js) checks amount, but does not compare verified currency, and pending state is one mutable user/book record. | Bind provider reference, subject, expected amount, currency, customer and frozen terms to distinct checkout attempts. |
| Medium | [Counters](../../services/api/src/counters.ts) increment from triggers without a durable event marker; time expiry alone does not invoke a subscription write. | SQL-derived counts first; idempotent projections/expiry repair where needed. |
| Medium | Several reader repositories convert failures into empty lists/false; admin lists fetch entire collections or filter after caps. | Distinguish empty, denied and unavailable; paginate/filter in SQL and surface truthful errors. |
| Medium | [Unpublish](../../apps/creator-hub/src/services/blogService.ts) changes status without updating `isPubliclyReadable`, although access rules depend on that flag. | Derive lifecycle/access server-side in one transaction and invalidate caches. |
| Medium | Public profile flag exposes the whole user document under current rules, including fields used for payment/settings data. | Separate public-author DTOs from private account/payment information. |
| Medium | Progress/review/comment rules rely on broad document writes rather than strict field allowlists; UI checks are stronger than some server boundaries. | Validate ownership, related resources, allowed fields, text limits, rating ranges, comment policy and badge attribution in Go. |

## Preserve the valuable parts

Preserve shared schema intent, frozen commercial terms, integer minor-unit accounting, the distinction between pending purchase and entitlement, author-declared versus staff-verified rights, deterministic readiness checks, provenance and quality signals, and honest outage handling. Current tests in [schema](../../packages/schema/test), [API](../../services/api/test), and [converter](../../services/converter/test) provide fixtures and invariants to carry across languages.

Documentation is not uniformly current. `README.md` omits the blog in its tree; `services/payments/README.md` says the reader still records purchases client-side and that payment deploys are excluded, but current Dart calls the server and the deployment workflow includes payments. `BLOG_SPEC.md` contains historical database claims and forward plans. Use those as historical/spec evidence, and current implementation as evidence of current code. Reconcile live facts through a separately authorized read-only export before migration.
