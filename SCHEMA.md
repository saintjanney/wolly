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

### Creator-hub → reader field mapping

When the creator-hub publishes, it maps its internal fields to the reader
contract (see `apps/creator-hub/src/services/bookService.ts`):

| Creator-hub field | → `epubs` field |
|---|---|
| `authorName` | `author` (+ keep `authorName`) |
| `manuscriptUrl` | `url` (+ keep `manuscriptUrl`) |
| `coverImageUrl` | `coverUrl` (+ keep `coverImageUrl`) |
| `averageRating` | `rating` |
| first selected category → resolved genre id | `genre` |
| derived from manuscript file extension | `fileType` |

## Other collections

- **`genres`**: `{ name, description?, slug?, bookCount?, isActive?, sortOrder? }` — doc id referenced by `epubs.genre`.
- **`reviews`**: `{ bookId, userId, userName, rating(1–5), title?, content, isVerifiedPurchase, status: pending|approved|rejected|flagged, helpfulVotes, reportCount, createdAt, updatedAt }`.
- **`purchases`**: `{ userId, bookId, bookTitle, ownerUserId?, reference, amountInPesewas, currency, countryCode?, purchasedAt }`.
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
