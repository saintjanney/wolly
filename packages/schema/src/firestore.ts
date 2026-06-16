/**
 * Canonical Firestore collection names. Import these everywhere instead of
 * hard-coding string literals — this is how we prevent the kind of drift that
 * caused the creator-hub to write a `books` collection the reader never read.
 */
export const COLLECTIONS = {
  /** Books. The reader app reads from here; the creator-hub writes here. */
  EPUBS: 'epubs',
  /** User / creator profiles. */
  USERS: 'users',
  /** Genres (the reader's `epubs.genre` field is a doc id into this collection). */
  GENRES: 'genres',
  /** Book reviews (written by the reader, moderated in the backoffice). */
  REVIEWS: 'reviews',
  /** Purchase / sales records (written by the reader on checkout). */
  PURCHASES: 'purchases',
  /** Per-user reading progress. */
  READING_PROGRESS: 'reading_progress',
  /** Per-user bookmarks. */
  BOOKMARKS: 'bookmarks',
  /** Author follows. */
  FOLLOWS: 'follows',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

/**
 * A stored Firestore timestamp value. On read this is a `Timestamp` (which has
 * `toDate()` / `toMillis()`); this structural alias is satisfied by both the
 * `firebase` and `firebase-admin` SDK Timestamp classes, as well as a `Date`.
 */
export type FirestoreTimestamp =
  | Date
  | { toDate(): Date; toMillis(): number; seconds: number; nanoseconds: number };
