import type { FirestoreTimestamp } from './firestore';

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

/**
 * A document in the `reviews` collection. Written by the reader with
 * `status: 'pending'`; moderated (approved/rejected) in the backoffice. When a
 * review is approved the reader recomputes `epubs.rating` / `epubs.reviewCount`.
 */
export interface Review {
  id: string;
  bookId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  /** 1–5. */
  rating: number;
  title?: string | null;
  content: string;
  isVerifiedPurchase: boolean;
  status: ReviewStatus;
  moderatedBy?: string;
  moderatedAt?: FirestoreTimestamp;
  moderationNotes?: string;
  helpfulVotes: number;
  reportCount: number;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}
