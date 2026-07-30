import {
  collection,
  collectionGroup,
  getDoc,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit as fsLimit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  COLLECTIONS,
  type EpubBook,
  type BookStatus,
  type Review,
  type ReviewStatus,
  type Genre,
  type BlogPost,
  derivePubliclyReadable,
} from '@wolly/schema';

const slugify = (name: string) =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export interface PlatformOverview {
  totalBooks: number;
  publishedBooks: number;
  pendingReviews: number;
  totalGenres: number;
}

/**
 * All Firestore operations for the staff backoffice: book publishing workflow,
 * review moderation and genre management — operating on the same collections
 * the reader and creator-hub use.
 */
export class BackofficeService {
  // ── Books ──────────────────────────────────────────────────────────────
  static async listBooks(): Promise<EpubBook[]> {
    const snap = await getDocs(collection(db, COLLECTIONS.EPUBS));
    return snap.docs.map((d) => ({ ...(d.data() as EpubBook), id: d.id }));
  }

  /**
   * Moves a book through the publishing workflow. Publishing/approving sets
   * `isPublished` so the book becomes visible in the reader; suspending or
   * archiving hides it.
   */
  static async setBookStatus(bookId: string, status: BookStatus): Promise<void> {
    const isPublished = status === 'published';
    await updateDoc(doc(db, COLLECTIONS.EPUBS, bookId), {
      status,
      isPublished,
      updatedAt: serverTimestamp(),
      lastReviewedAt: serverTimestamp(),
    });
  }

  // ── Reviews ────────────────────────────────────────────────────────────
  static async listReviews(status: ReviewStatus | 'all' = 'pending'): Promise<Review[]> {
    const base = collection(db, COLLECTIONS.REVIEWS);
    const snap = await getDocs(
      status === 'all' ? base : query(base, where('status', '==', status)),
    );
    const reviews = snap.docs.map((d) => ({ ...(d.data() as Review), id: d.id }));
    // Newest first (client-side to avoid an index requirement).
    return reviews.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  }

  static async moderateReview(
    reviewId: string,
    bookId: string,
    decision: Extract<ReviewStatus, 'approved' | 'rejected' | 'flagged'>,
  ): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.REVIEWS, reviewId), {
      status: decision,
      moderatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    // Approving/rejecting changes the set of approved reviews → recompute rating.
    await BackofficeService.recomputeBookRating(bookId);
  }

  /** Recomputes a book's average rating and review count from approved reviews. */
  static async recomputeBookRating(bookId: string): Promise<void> {
    const snap = await getDocs(
      query(
        collection(db, COLLECTIONS.REVIEWS),
        where('bookId', '==', bookId),
        where('status', '==', 'approved'),
      ),
    );
    const ratings = snap.docs.map((d) => (d.data() as Review).rating).filter((r) => typeof r === 'number');
    const reviewCount = ratings.length;
    const rating = reviewCount
      ? Number((ratings.reduce((a, b) => a + b, 0) / reviewCount).toFixed(1))
      : 0;
    await updateDoc(doc(db, COLLECTIONS.EPUBS, bookId), { rating, reviewCount });
  }

  // ── Genres ─────────────────────────────────────────────────────────────
  static async listGenres(): Promise<Genre[]> {
    const snap = await getDocs(query(collection(db, COLLECTIONS.GENRES), orderBy('name')));
    return snap.docs.map((d) => ({ ...(d.data() as Genre), id: d.id }));
  }

  static async addGenre(name: string, description = ''): Promise<void> {
    await addDoc(collection(db, COLLECTIONS.GENRES), {
      name: name.trim(),
      slug: slugify(name),
      description,
      isActive: true,
      bookCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  // ── Overview ───────────────────────────────────────────────────────────
  static async getOverview(): Promise<PlatformOverview> {
    const [books, pending, genres] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.EPUBS)),
      getDocs(query(collection(db, COLLECTIONS.REVIEWS), where('status', '==', 'pending'))),
      getDocs(collection(db, COLLECTIONS.GENRES)),
    ]);
    return {
      totalBooks: books.size,
      publishedBooks: books.docs.filter((d) => (d.data() as EpubBook).isPublished).length,
      pendingReviews: pending.size,
      totalGenres: genres.size,
    };
  }
}

function toMillis(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as { toMillis: unknown }).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
}


// ── Blog moderation ────────────────────────────────────────────────────────

/**
 * Blog posts for the staff console.
 *
 * `flagged` means anything a human should look at: explicitly flagged, already
 * removed, or carrying reader reports.
 */
export class BlogModeration {
  static async listPosts(filter: 'flagged' | 'all'): Promise<BlogPost[]> {
    const snap = await getDocs(collection(db, COLLECTIONS.POSTS));
    const posts = snap.docs.map((d) => ({ ...(d.data() as BlogPost), id: d.id }));

    const needsReview = (p: BlogPost) =>
      p.moderationStatus === 'flagged' ||
      p.moderationStatus === 'removed' ||
      (p.reportCount ?? 0) > 0;

    return (filter === 'all' ? posts : posts.filter(needsReview)).sort(
      (a, b) => toMillis(b.createdAt) - toMillis(a.createdAt),
    );
  }

  /**
   * Sets a post's moderation state.
   *
   * `isPubliclyReadable` is recomputed with the SAME function the publish
   * callable uses, because that single boolean is what security rules test.
   * Setting moderationStatus without it would leave a removed post readable.
   */
  static async moderatePost(
    postId: string,
    moderationStatus: 'ok' | 'flagged' | 'removed',
  ): Promise<void> {
    const ref = doc(db, COLLECTIONS.POSTS, postId);
    const snap = await getDoc(ref);
    const status = (snap.data()?.status as BlogPost['status']) ?? 'draft';

    await updateDoc(ref, {
      moderationStatus,
      isPubliclyReadable: derivePubliclyReadable(status, moderationStatus),
      updatedAt: serverTimestamp(),
    });
  }

  /** Reported or hidden comments across every post. */
  static async listReportedComments(): Promise<
    Array<{ id: string; path: string; postId: string; userName: string; body: string; status: string; reportCount: number }>
  > {
    const snap = await getDocs(
      query(collectionGroup(db, 'comments'), orderBy('reportCount', 'desc'), fsLimit(100)),
    );
    return snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          path: d.ref.path,
          postId: (data.postId as string) ?? '',
          userName: (data.userName as string) ?? 'Reader',
          body: (data.body as string) ?? '',
          status: (data.status as string) ?? 'visible',
          reportCount: (data.reportCount as number) ?? 0,
        };
      })
      .filter((c) => c.reportCount > 0 || c.status !== 'visible');
  }

  /** Hides or restores a comment. Never deletes it. */
  static async moderateComment(
    path: string,
    status: 'visible' | 'hidden' | 'removed',
  ): Promise<void> {
    await updateDoc(doc(db, path), { status, updatedAt: serverTimestamp() });
  }
}
