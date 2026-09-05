# Wolly Firestore Schema — canonical contract

This is the human-readable source of truth for every Firestore document in the
Wolly platform. The TypeScript apps import the same shapes from
[`@wolly/schema`](./packages/schema/src); the Flutter reader mirrors them in Dart.

**Rule:** if you change a document shape, change it here and in `@wolly/schema`
in the same commit, and update the mirrored Dart model.

All apps share one Firebase project: `wolly-1133d`.

## Collections

| Collection | Written by | Read by | Purpose |
|---|---|---|---|
| `epubs` | creator-hub, backoffice, reader (rating) | reader, creator-hub, backoffice | The single book record |
| `users` | both | both | Creator / reader profiles |
| `genres` | backoffice, reader (counts) | all | Genre catalog |
| `reviews` | reader | backoffice (moderation), reader | Book reviews & ratings |
| `purchases` | reader | creator-hub, backoffice | Sales records → analytics |
| `reading_progress` | reader | reader | Per-user progress |
| `bookmarks` | reader | reader | Per-user bookmarks |
| `follows` | reader | reader, creator-hub | Author follows |

## `epubs` — the book contract (most important)

The Flutter reader reads the **reader-contract** fields below. Anything that
publishes a book (the creator-hub, the backoffice) MUST write all of them, in
exactly these names, or the book will not render in the reader.

### Reader contract (required)

| Field | Type | Notes |
|---|---|---|
| `title` | string | |
| `author` | string | **Not** `authorName` |
| `ownerUserId` | string | Creator uid |
| `genre` | string | **Document id** into `genres` — not a free-text name |
| `url` | string | Public download URL of the book file (**not** `manuscriptUrl`) |
| `fileType` | `'pdf' \| 'epub'` | Drives which reader opens |
| `coverUrl` | string \| null | **Not** `coverImageUrl` |
| `description` | string \| null | |
| `isPublished` | bool | Live in the reader |
| `isFree` | bool | |
| `price` | number | |
| `rating` | number | Avg approved rating; reader writes it back |
| `reviewCount` | number | Reader writes it back |

### Creator metadata (optional, carried on the same doc)

`authorName`, `subtitle`, `penName`, `shortDescription`, `type`, `language`,
`categories[]`, `keywords[]`, `tags[]`, `readingAge`, `hasExplicitContent`,
`isbn`/`isbn13`, `manuscriptUrl`, `coverImageUrl`, `aiGenerated` + AI details,
`ownsCopyright`/`copyrightYear`, `royaltyOption`, `distributionChannels`,
`status` (`draft|review|approved|published|suspended|archived`),
`publishingStatus`, `views`/`downloads`/`sales`/`revenue`, timestamps.

### The press (`@wolly/converter`)

An author uploads a manuscript (`.docx`, `.md`, `.txt`); the press typesets an
EPUB and a PDF from it. It runs as a Firestore trigger, not a callable, because
a long book takes minutes to press.

| Field | Type | Written by | Notes |
|---|---|---|---|
| `conversionStatus` | `requested \| processing \| ready \| failed` | client writes **only** `requested`; converter owns the rest | Writing `requested` again is how a retry is requested |
| `conversionError` | string | converter | Reader-facing reason, present only when `failed` |
| `conversion` | `BookConversion` | converter | `fingerprint`, `contentSha256`, `sourceFormat`, `wordCount`, `chapterCount`, `warnings[]`, `pressedAt` |
| `epubUrl` / `pdfUrl` | string | converter | Under `converted/`, which **no client can read**. Resolve via `getBookDownloadUrl({bookId, format})` |

On success the press also overwrites `url` and `fileType` so the reader needs no
change. Pressed files are **not** publicly readable: `storage.rules` denies
`converted/**` outright and the bucket has no public IAM binding.

### Publishing Journey Report

The hero screen's number. Computed by `computeReport()` in
`packages/schema/src/publishing-report.ts`: a deterministic weighted function
over 18 named checks summing to 100. Pure, so it runs in the browser, in a
function and in a test with no emulator.

The percentage means "how much of the work of turning this manuscript into a
sellable book is finished", **not** "how good is this book". Four invariants are
enforced by test:

| Invariant | What it prevents |
|---|---|
| Determinism | the same book scoring differently on two loads |
| Monotonicity | completing work lowering the number |
| Single cause, single cost | one missing cover costing 10 points and then 6 more |
| No free points | credit for a check that could not fail |

Two structural rules fall out of those, and both are asserted:

- **Weights are constants.** A weight that varies with progress is how a score
  stops being reproducible.
- **A prerequisite must weigh at least as much as everything it gates.**
  Excluding a dependent inflates the percentage, so completing the prerequisite
  puts that weight back at zero credit and the number falls. `unsafeGates()`
  reports violations; `manuscript_pressed` is the single documented exemption,
  safe only because the score is `null` until the first successful press.

The publish pre-flight is the **blocking subset of the same checks**
(`blockingFailures()`), never separate logic. Two checklists is two truths.

### Conversion signals

The press records these while it presses, from data it already holds. None
costs a second read of the manuscript, and the report scores against them.

| Field | Notes |
|---|---|
| `conversion.headingLevel` | `'h1' \| 'h2' \| null`. Was computed and discarded; without it the report sees every book as one unmarked block |
| `conversion.frontMatterChapter` | Content appeared before the first heading |
| `conversion.emptyChapters`, `shortestChapterWords`, `longestChapterWords` | Usually a stray page break |
| `conversion.headingShapedParagraphs` | Paragraphs that look like chapter titles but carry no heading. The commonest defect in a Word manuscript: titles bolded and centred instead of styled Heading 1, so the file looks right and carries no structure |
| `conversion.imageCount`, `droppedImageCount` | |
| `conversion.unsupportedGlyphs` | Characters the embedded fonts cannot draw. Non-empty means empty boxes in the author's own PDF, which is a **blocker** for a Ghanaian-language book |
| `conversion.warningCodes` | Classified, so author-actionable notes can be shown and engine noise stays hidden |

**Warning codes the press emits**, and who scores each:

| Code | Scored by | Meaning |
|---|---|---|
| `encoding_fallback` | `clean_conversion` | The file was not valid UTF-8, so it was read as Windows-1252. Accented and Ghanaian-language characters may be wrong |
| `mojibake` | `clean_conversion` | The text already contained replacement characters before upload. Only the author's original can fix it |
| `image_dropped` | `images_intact` | An unsupported image type was left out |
| `cover_fetch_failed` | `cover_present` | The press could not download the cover |
| `engine_note` | nobody | The press talking to itself about Word style names. Never shown to an author |

**Checks with no writer yet.** `rights_declared` and `preview_defined` are in
`AWAITING_WOLLY_TO_BUILD` and score `not_applicable`, because nothing on the
platform writes a `RightsGrant` or a `previewChapters`. Scoring them charged
authors for features Wolly has not built, and `rights_declared` is
`blocking: true`, so the publish pre-flight refused **every book on the
platform**: a finished, priced, pressed, staff-approved book scored 93 and could
not be published. Remove an id from that set in the same commit that ships its
writer; the weight returns on its own.

`AUTHOR_ACTIONABLE` in the report engine is the first two only. A code scored by
a dedicated check must not also be counted by `clean_conversion`, or one dropped
image costs points twice; the excluded codes are listed in `SCORED_ELSEWHERE`
next to the check that owns each.
| `coverMetrics` | `{ width, height, bytes, contentType, fetchedOk }`. `fetchedOk: false` used to be a silent `console.warn` |
| `previewChapters` | Chapters offered as a free sample |

### Rights

| Field | Type | Written by | Notes |
|---|---|---|---|
| `rightsStatus` | `clear \| disputed \| revoked` | **server / admin only** | Absent means `clear` |
| `rightsNote` | string | server / admin | Why the state changed |
| `rightsUpdatedAt` | timestamp | server / admin | |

`revoked` stops `getBookDownloadUrl` issuing any new link, to everyone including
the author. It cannot delete copies already downloaded; see
[RIGHTS.md](RIGHTS.md) for what is and is not enforceable.

Security rules deny clients every field in this section and in `conversion`. An
author who could write `rightsStatus` could clear their own takedown.

### `epubs/{bookId}/rights/{grantId}` — the rights registry

A per-book ledger of who may do what with a work. **Not the same thing as
`epubs.rightsStatus`**, which is a takedown gate read by `getBookDownloadUrl`.
Collapsing them would mean an author editing a licence could revoke their own
book, so the registry **never touches the delivery gate**: a self-declared field
cannot disable a book and cannot enable one.

Private to the book's owner and to staff. Never public, never readable by other
authenticated users, because a grant names a counterparty and can carry
commercial terms. **No Dart mirror**: the reader does not read grants.

| Field | Notes |
|---|---|
| `format` | `print \| ebook \| audio \| translation \| adaptation \| educational \| library \| serialization \| merchandising` |
| `territories[]`, `languages[]` | ISO codes, with sentinels `WORLD` and `ALL` |
| `channels[]`, `exclusivity` | `exclusivity` defaults to `unknown` rather than guessing |
| `holderKind`, `holderName`, `holderUserId?` | `holderUserId` is stored for future linkage and grants **no permission today** |
| `startDate`, `endDate` | `YYYY-MM-DD` calendar dates, not Timestamps: these come off a contract, and timezone drift on a licence expiry is a real bug. Null `endDate` means perpetual |
| `terms?` | Structured fields for the minority with real deals; most authors fill only `summary` |
| `disposition` | `available \| licensed \| restricted`. The **only** status axis the author sets |
| `declaration` | What the author signed, stored **verbatim**, immutable after create |
| `verificationState` + 4 fields | **Server-owned.** Flat, not nested, because `affectedKeys()` enumerates top-level keys only |
| `archivedAt` | Grants are archived, never deleted |

**Three of the six spec statuses are derived, not stored.** A stored `expired`
goes stale the moment the clock passes midnight and nobody runs a job.
`deriveRightsBadge()` computes expired, expiring (90 days) and
needs-verification from the dates and the verification state, in that
precedence: expired outranks needs-verification because an expired grant needs
renewing rather than checking.

**The declared-versus-verified boundary is the point of the registry**, and it
is enforced in rules rather than described in UI. An author cannot mark their
own claim verified, and cannot edit the declaration after signing it. Both are
asserted in `packages/firebase-config/test/rules.test.js`. `verifiedScope`
records what was actually checked ("Saw a signed 2024 agreement naming
Sub-Saharan Africa print rights"), never "Wolly confirms this author owns this
work".

The registry deliberately does not nag: if you say you hold everything
yourself, Wolly asks for nothing. It asks for evidence only when you name a
third party. A registry that demands paperwork from every author is a registry
nobody fills in.

### Creator-hub → reader field mapping

When the creator-hub publishes, it maps its internal fields to the reader
contract (see `apps/creator-hub/src/services/bookService.ts`):

| Creator-hub field | → `epubs` field |
|---|---|
| `authorName` | `author` (+ keep `authorName`) |
| `manuscriptUrl` | `url` (+ keep `manuscriptUrl`), then **overwritten by the press** |
| `coverImageUrl` | `coverUrl` (+ keep `coverImageUrl`) |
| `averageRating` | `rating` |
| first selected category → resolved genre id | `genre` |
| derived from manuscript file extension | `fileType`, then **overwritten by the press** |

## Other collections

- **`genres`**: `{ name, description?, slug?, bookCount?, isActive?, sortOrder? }` — doc id referenced by `epubs.genre`.
- **`reviews`**: `{ bookId, userId, userName, rating(1–5), title?, content, isVerifiedPurchase, status: pending|approved|rejected|flagged, helpfulVotes, reportCount, createdAt, updatedAt }`.
- **`purchases`**: `{ userId, bookId, bookTitle, ownerUserId?, reference,
  amountInPesewas, currency, countryCode?, status, launchedAt, purchasedAt?,
  gatewayResponse?, channel? }`. **Server-written only**; rules deny every
  client write. `initializePaystackCheckout` creates it as `status: 'pending'`
  and `verifyPaystackPayment` promotes it to `'completed'` after confirming the
  transaction with Paystack and checking the amount (see `services/payments`).
  **Only `'completed'` is ownership**: a pending document means checkout was
  started, not paid.
- **`reading_progress`** (id `${uid}_${bookId}`): `{ userId, bookId, pagesRead, totalPages, percentageComplete, lastRead }`.
- **`bookmarks`**: `{ userId, bookId, bookTitle, page, chapterTitle?, note?, createdAt }`.
- **`follows`**: `{ followerId, authorId, authorName, followedAt }`.

## The `users` divergence (audited 2026-07-24)

The two apps disagree about the shared `users` document in four ways. All are
captured in `@wolly/schema`'s `WollyUser`; read both keys, prefer camelCase when
writing.

| Concept | Reader writes | Creator-hub writes | Reconciled by |
|---|---|---|---|
| Given/family name, phone | `first_name`, `last_name`, `phone_number` | `firstName`, `lastName`, `phoneNumber` | `scripts/reconcile-user-fields.js` (additive, symmetric) |
| Topic interests | `genre_prefs` | `selectedGenres` | reader reads both via `genrePrefsFrom()`; onboarding writes both |
| Date of birth | `date_of_birth` (ISO **string**) | `dateOfBirth` (**Timestamp**) | not reconciled — different types, needs a typed conversion |
| Country | `country_code` | `country`, `countryOfResidence` | not reconciled — different meanings |

Two corrections came out of the audit:

- **`content_preferences` is written by nothing.** The reader's
  `WollyUser.fromMap` read it for topic interests, so that list was always
  empty. It now reads `genre_prefs`/`selectedGenres`.
- **The topic-interest split was a live bug.** The reader's auth gate keys
  onboarding off `genre_prefs`, so a user who onboarded in the creator-hub was
  sent back through onboarding in the reader despite having already chosen
  genres. Both keys are now read everywhere and written together.

`dob`, `genre_prefs` as a *creator-hub* field, `photoUrl`, and
`contentPreferences` were declared in `@wolly/schema` but written by neither
app; they have been removed.

---

## Blog

Blog document shapes live in [`@wolly/schema`](./packages/schema/src/blog.ts)
and are specified in full, with rationale, in [BLOG_SPEC.md](./BLOG_SPEC.md).
The three load-bearing decisions:

- **The subscribable unit is a `publications` document**, not a user. A creator
  may own several; the creator-hub exposes one. The `slug` is the `@handle` in
  public URLs and is reserved by a matching `publication_slugs` document,
  because Firestore has no unique constraint.
- **Post metadata and post body are separate documents.** `posts/{id}` holds
  everything that gets listed (title, excerpt, cover, counters) and stays cheap
  to read; the body lives in `posts/{id}/content/{free|paid}`.
- **The paywall is enforced by the database.** Because the paid body is its own
  document, security rules gate it on
  `subscriptions/{uid}_{pubId}.isPaid && currentPeriodEnd > request.time`. The
  deterministic subscription id is what lets a rule resolve it with one `get()`
  and no query, matching the convention already used by `reading_progress`,
  `purchases` and `follows`.

| Collection | Written by | Read by | Purpose |
|---|---|---|---|
| `publications` | creator-hub | all | A creator's blog: branding, tiers, counters |
| `publication_slugs` | creator-hub | server | Unique-handle reservation |
| `posts` | creator-hub, API | all | Post metadata (the teaser) |
| `posts/{id}/content` | API | reader, blog site | Body, split `free`/`paid` at the paywall |
| `posts/{id}/comments` | reader, blog site | all | Threaded comments |
| `posts/{id}/likes` | reader, blog site | all | Doc id is the liking uid |
| `subscriptions` | **API only** for paid | reader, creator-hub | Free and paid subscriptions |
| `email_suppressions` | API | API | Global bounce/complaint/unsubscribe list |

`posts.genre` holds a **`genres` document id**, exactly like `epubs.genre`, so
one browse surface returns a creator's books and their posts.

`Subscription.isPaid` and `currentPeriodEnd` are writable **only by the Admin
SDK**, from the Paystack webhook. Rules deny every client write to them; a
reader may create a free subscription for themselves and change their own email
preferences, and nothing else.

The Flutter reader mirrors the read-relevant subset of these shapes in Dart at
[`apps/reader/lib/features/blog/domain/models`](./apps/reader/lib/features/blog/domain/models)
(`Publication`, `BlogPost`, `PostContent`). Per the contract rule, a change to
the blog shapes in `@wolly/schema` must update those Dart models too. The reader
renders `posts/{id}/content.html`; the paywall shows when the `paid` segment
read is denied by rules, which the reader treats as an expected state, not an
error.
