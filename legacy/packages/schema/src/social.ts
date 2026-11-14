import type { FirestoreTimestamp } from './firestore';

/** A document in the `reading_progress` collection (id: `${uid}_${bookId}`). */
export interface ReadingProgress {
  userId: string;
  bookId: string;
  pagesRead: number;
  totalPages: number;
  percentageComplete: number;
  lastRead: FirestoreTimestamp;
}

/** A document in the `bookmarks` collection. */
export interface Bookmark {
  id: string;
  userId: string;
  bookId: string;
  bookTitle: string;
  page: number;
  chapterTitle?: string;
  note?: string;
  createdAt: FirestoreTimestamp;
}

/** A document in the `follows` collection (reader follows an author). */
export interface Follow {
  followerId: string;
  authorId: string;
  authorName: string;
  followedAt: FirestoreTimestamp;
}
