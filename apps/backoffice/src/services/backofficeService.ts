import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
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
