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

## Known divergence (tracked, not yet reconciled)

The `users` collection was historically written with two key conventions:
the reader used snake_case (`first_name`, `dob`, `content_preferences`), the
creator-hub uses camelCase (`firstName`, `displayName`, …). `@wolly/schema`'s
`WollyUser` captures both; new writes should prefer camelCase. Migrating
existing user docs is out of scope for the book-contract work.
