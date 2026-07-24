import type { FirestoreTimestamp } from './firestore';

/**
 * Blog document shapes. See BLOG_SPEC.md for the design rationale; the short
 * version is:
 *
 *  - The subscribable unit is a PUBLICATION, not a user. A creator may own
 *    several; the creator-hub currently exposes one.
 *  - A post's METADATA and its BODY live in different documents. Metadata is
 *    listed constantly (feeds, archives, email digests) and must stay cheap to
 *    read; bodies are large.
 *  - The body is split into a `free` and a `paid` segment at the author's
 *    paywall marker. Because the paid segment is its own document, Firestore
 *    security rules enforce the paywall directly, so the Flutter reader needs
 *    no server round-trip and a patched client cannot bypass it.
 */

// ── Publication ────────────────────────────────────────────────────────────

export type PublicationStatus = 'active' | 'suspended' | 'archived';

export type PublicationLayout = 'profile' | 'magazine' | 'newspaper';

/** Who may comment on a publication's posts. */
export type CommentAccess = 'everyone' | 'subscribers' | 'paid';

/** A document in the `publications` collection. */
export interface Publication {
  id: string;
  /**
   * Unique handle, rendered as `@slug` in URLs and shared with the creator's
   * profile identity so `@ama` is the same person's books and posts.
   * Immutable after first publish; uniqueness is held by a matching document
   * in `publication_slugs`.
   */
  slug: string;
  ownerUserId: string;
  name: string;
  tagline?: string;
  description?: string;

  logoUrl?: string | null;
  coverImageUrl?: string | null;
  faviconUrl?: string | null;
  theme?: {
    accentColor?: string;
    backgroundColor?: string;
    fontFamily?: string;
    layout?: PublicationLayout;
  };

  /** Genre **document id** into `genres`, same convention as `epubs.genre`. */
  primaryGenre?: string;
  tags?: string[];

  socialLinks?: {
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    website?: string;
  };

  // Monetisation
  paidEnabled: boolean;
  /** ISO 4217. Drawn from the creator's country, never hardcoded. */
  currency: string;
  paystackSubaccountCode?: string;

  // Email
  senderName?: string;
  senderReplyTo?: string;
  welcomeEmailBody?: string | null;

  commentAccess: CommentAccess;

  // Denormalised counters — maintained server-side, rejected on client writes.
  subscriberCount: number;
  paidSubscriberCount: number;
  postCount: number;

  status: PublicationStatus;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

/**
 * A document in `publication_slugs`, keyed by the slug itself. Exists only to
 * give Firestore the unique constraint it does not have natively: it is written
 * in the same transaction as the publication.
 */
export interface PublicationSlugReservation {
  publicationId: string;
  ownerUserId: string;
  createdAt: FirestoreTimestamp;
}

/** A document in `publications/{pubId}/tiers`. */
export interface Tier {
  id: string;
  name: string;
  description?: string;
  benefits?: string[];
  /** Minor units (e.g. pesewas for GHS), matching `Purchase.amountInPesewas`. */
  monthlyPrice: number;
  annualPrice?: number;
  currency: string;
  isDefault: boolean;
  isActive: boolean;
  paystackPlanCodeMonthly?: string;
  paystackPlanCodeAnnual?: string;
  sortOrder: number;
}

// ── Post ───────────────────────────────────────────────────────────────────

export type PostType = 'article' | 'page';

export type PostStatus =
  | 'draft'
  | 'scheduled'
  | 'published'
  | 'unlisted'
  | 'archived';

/** Who can read a post's body. Mirrors Ghost's model. */
export type PostVisibility = 'public' | 'subscribers' | 'paid' | 'tiers';

export type PostModerationStatus = 'ok' | 'flagged' | 'removed';

/** A document in the `posts` collection. Metadata only; the body lives below. */
export interface BlogPost {
  id: string;
  publicationId: string;
  /** Denormalised so a URL can be built without reading the publication. */
  publicationSlug: string;
  ownerUserId: string;
  /** Denormalised for rendering lists without an author join. */
  authorName: string;
  authorAvatarUrl?: string | null;

  type: PostType;
  title: string;
  subtitle?: string | null;
  /** Unique within the publication. */
  slug: string;
  /** Auto-derived, manually overridable. Meta description + email preheader. */
  excerpt: string;
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;

  // Access control
  visibility: PostVisibility;
  /** Only meaningful when `visibility === 'tiers'`. */
  allowedTierIds?: string[];
  /** True when a `paid` content segment exists. */
  hasPaywall: boolean;

  // Lifecycle
  status: PostStatus;
  publishAt?: FirestoreTimestamp | null;
  publishedAt?: FirestoreTimestamp | null;

  // Discovery — `genre` is a `genres` doc id, shared with the book catalog so
  // one browse surface returns a creator's books and their posts.
  genre?: string;
  tags?: string[];

  // Derived server-side on publish
  wordCount: number;
  readingTimeMinutes: number;
  /** Bumped on every body write. Used as the ISR cache key. */
  contentVersion: number;

  // Email
  sendAsNewsletter: boolean;
  emailSendId?: string | null;

  // Denormalised counters — maintained server-side.
  viewCount: number;
  likeCount: number;
  commentCount: number;

  // Moderation
  moderationStatus: PostModerationStatus;
  moderationNotes?: string[];
  reportCount: number;

  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

/** The two segment ids under `posts/{postId}/content`. */
export type PostContentSegment = 'free' | 'paid';

/**
 * A document in `posts/{postId}/content`, id `free` or `paid`.
 *
 * Both a canonical JSON form and a rendered HTML form are stored: JSON is what
 * the composer round-trips and what stays safely transformable, HTML is what
 * both the website and the Flutter reader display. The HTML is rendered and
 * sanitised server-side on save and is never accepted from a client.
 */
export interface PostContent {
  segment: PostContentSegment;
  format: 'tiptap-json-v1';
  /** TipTap/ProseMirror document. */
  doc: Record<string, unknown>;
  /** Sanitised, render-ready. */
  html: string;
  /** Drives word count, reading time and search indexing. */
  plainText: string;
  updatedAt: FirestoreTimestamp;
}

/** A document in `posts/{postId}/revisions`. Capped at 25 per post. */
export interface PostRevision {
  id: string;
  title: string;
  segments: Record<PostContentSegment, Record<string, unknown> | null>;
  savedBy: string;
  createdAt: FirestoreTimestamp;
}

// ── Subscription ───────────────────────────────────────────────────────────

export type SubscriptionStatus =
  | 'free'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'expired';

export type SubscriptionPlan = 'monthly' | 'annual' | 'founding';

/**
 * A document in `subscriptions`, id **`${userId}_${publicationId}`**.
 *
 * The deterministic id is load-bearing: it lets a security rule resolve the
 * subscription with a single `get()` and no query, which is what makes the
 * rules-level paywall possible. Same convention as `reading_progress`,
 * `purchases` and `follows`.
 *
 * `isPaid` and `currentPeriodEnd` are writable ONLY by the Admin SDK, from the
 * Paystack webhook. Rules deny every client write to them.
 */
export interface Subscription {
  userId: string;
  publicationId: string;
  /** Denormalised creator uid, so a creator can query their own subscribers. */
  ownerUserId: string;

  status: SubscriptionStatus;
  /** The single flag security rules check. Server-written. */
  isPaid: boolean;
  tierId?: string | null;
  plan?: SubscriptionPlan | null;

  /** Rules compare this against `request.time`. Server-written. */
  currentPeriodEnd?: FirestoreTimestamp | null;
  cancelAtPeriodEnd: boolean;

  // Paystack linkage — written only by the webhook handler.
  paystackCustomerCode?: string;
  paystackSubscriptionCode?: string;
  paystackEmailToken?: string;
  lastPaymentAt?: FirestoreTimestamp | null;
  lastPaymentReference?: string;

  // Email preferences — the only fields a subscriber may change themselves.
  emailOptIn: boolean;
  /** Set when double opt-in completes. Unconfirmed addresses are not sent to. */
  emailConfirmedAt?: FirestoreTimestamp | null;
  unsubscribedAt?: FirestoreTimestamp | null;

  /** Attribution: 'web' | 'reader' | 'import' | a referrer. */
  source?: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

/** Builds the deterministic `subscriptions` document id. */
export function subscriptionId(userId: string, publicationId: string): string {
  return `${userId}_${publicationId}`;
}

// ── Comments ───────────────────────────────────────────────────────────────

export type CommentStatus = 'visible' | 'hidden' | 'removed';

/** A document in `posts/{postId}/comments`. */
export interface PostComment {
  id: string;
  postId: string;
  publicationId: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string | null;
  /** One level of threading; null for a top-level comment. */
  parentId?: string | null;
  /** Plain text with safe inline links, not rich HTML. */
  body: string;
  likeCount: number;
  status: CommentStatus;
  reportCount: number;
  /** True when the author is the publication owner, for the badge. */
  isAuthorReply: boolean;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

/** A document in `posts/{postId}/likes`, id = the liking user's uid. */
export interface PostLike {
  createdAt: FirestoreTimestamp;
}

// ── Email ──────────────────────────────────────────────────────────────────

export type EmailSendStatus = 'queued' | 'sending' | 'sent' | 'failed';

/** A document in `publications/{pubId}/email_sends`. */
export interface EmailSend {
  id: string;
  postId: string;
  subject: string;
  status: EmailSendStatus;
  recipientCount: number;
  deliveredCount: number;
  openCount: number;
  clickCount: number;
  bounceCount: number;
  complaintCount: number;
  unsubscribeCount: number;
  startedAt?: FirestoreTimestamp | null;
  completedAt?: FirestoreTimestamp | null;
}

export type SuppressionReason = 'bounce' | 'complaint' | 'unsubscribe' | 'manual';

/**
 * A document in `email_suppressions`, keyed by the sha256 of the lowercased
 * address so the collection is not a harvestable list of addresses. Checked
 * before every send.
 */
export interface EmailSuppression {
  reason: SuppressionReason;
  createdAt: FirestoreTimestamp;
}

// ── Analytics ──────────────────────────────────────────────────────────────

/** A document in `posts/{postId}/stats`, id `YYYY-MM-DD`. Server-written. */
export interface PostDailyStats {
  views: number;
  uniqueViews: number;
  reads: number;
  emailOpens: number;
  emailClicks: number;
  subscribesAttributed: number;
}

// ── Access resolution ──────────────────────────────────────────────────────

export interface PostAccess {
  /** Whether the free segment may be read. */
  canReadFree: boolean;
  /** Whether the paid segment may be read. */
  canReadPaid: boolean;
  /** Why access was limited, for the paywall card's copy. */
  reason: 'owner' | 'public' | 'subscriber' | 'paid' | 'locked';
}

/**
 * The single source of truth for "can this reader see this post's body".
 *
 * The blog website reads posts server-side with the Admin SDK, which bypasses
 * security rules, so the server must enforce the paywall itself. The Flutter
 * reader goes through rules. Both must agree, so both derive from this
 * function: the server calls it directly, and the rules mirror it under test.
 */
export function resolvePostAccess(
  post: Pick<BlogPost, 'ownerUserId' | 'visibility' | 'allowedTierIds'>,
  subscription: Pick<
    Subscription,
    'isPaid' | 'currentPeriodEnd' | 'tierId'
  > | null,
  viewerUserId: string | null,
  now: Date = new Date(),
): PostAccess {
  if (viewerUserId && viewerUserId === post.ownerUserId) {
    return { canReadFree: true, canReadPaid: true, reason: 'owner' };
  }

  const periodEnd = toDate(subscription?.currentPeriodEnd);
  const hasPaid =
    !!subscription?.isPaid && !!periodEnd && periodEnd.getTime() > now.getTime();
  const hasAny = !!subscription;

  // `tiers` visibility additionally requires the subscriber's tier to be listed.
  const tierAllowed =
    post.visibility !== 'tiers' ||
    (!!subscription?.tierId &&
      (post.allowedTierIds ?? []).includes(subscription.tierId));

  switch (post.visibility) {
    case 'public':
      return {
        canReadFree: true,
        canReadPaid: hasPaid,
        reason: hasPaid ? 'paid' : 'public',
      };
    case 'subscribers':
      return {
        canReadFree: hasAny || hasPaid,
        canReadPaid: hasPaid,
        reason: hasPaid ? 'paid' : hasAny ? 'subscriber' : 'locked',
      };
    case 'paid':
    case 'tiers':
      return {
        canReadFree: hasAny || hasPaid,
        canReadPaid: hasPaid && tierAllowed,
        reason: hasPaid && tierAllowed ? 'paid' : hasAny ? 'subscriber' : 'locked',
      };
  }
}

function toDate(value: FirestoreTimestamp | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate(): Date }).toDate();
  }
  return null;
}
