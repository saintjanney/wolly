/**
 * Canonical Firestore collection names. Import these everywhere instead of
 * hard-coding string literals, this is how we prevent the kind of drift that
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

  // ── Blog (see BLOG_SPEC.md) ──────────────────────────────────────────────
  /** Creator blogs. The subscribable unit; posts belong to one. */
  PUBLICATIONS: 'publications',
  /** Slug reservations, keyed by slug, Firestore has no unique constraint. */
  PUBLICATION_SLUGS: 'publication_slugs',
  /** Blog post metadata. Bodies live in the `content` subcollection. */
  POSTS: 'posts',
  /** Free and paid subscriptions to a publication. */
  SUBSCRIPTIONS: 'subscriptions',
  /** Global email suppression list, keyed by sha256 of the address. */
  EMAIL_SUPPRESSIONS: 'email_suppressions',
} as const;

/**
 * Subcollection names, which are not addressable from `COLLECTIONS` because
 * they hang off a parent document path.
 */
export const SUBCOLLECTIONS = {
  /** `publications/{pubId}/tiers` */
  TIERS: 'tiers',
  /** `publications/{pubId}/email_sends` */
  EMAIL_SENDS: 'email_sends',
  /** `posts/{postId}/content`, ids are `free` and `paid`. */
  CONTENT: 'content',
  /** `posts/{postId}/revisions` */
  REVISIONS: 'revisions',
  /** `posts/{postId}/likes`, id is the liking user's uid. */
  LIKES: 'likes',
  /** `posts/{postId}/comments` */
  COMMENTS: 'comments',
  /** `posts/{postId}/stats`, ids are `YYYY-MM-DD`. */
  STATS: 'stats',
} as const;

export type SubcollectionName =
  (typeof SUBCOLLECTIONS)[keyof typeof SUBCOLLECTIONS];

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

/**
 * A stored Firestore timestamp value. On read this is a `Timestamp` (which has
 * `toDate()` / `toMillis()`); this structural alias is satisfied by both the
 * `firebase` and `firebase-admin` SDK Timestamp classes, as well as a `Date`.
 */
export type FirestoreTimestamp =
  | Date
  | { toDate(): Date; toMillis(): number; seconds: number; nanoseconds: number };
