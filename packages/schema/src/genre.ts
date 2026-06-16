/**
 * A document in the `genres` collection. The reader's `epubs.genre` field holds
 * the **document id** of one of these.
 */
export interface Genre {
  /** Firestore document id. */
  id: string;
  name: string;
  description?: string;
  slug?: string;
  /** Denormalised count of published books in this genre (maintained by the reader). */
  bookCount?: number;
  isActive?: boolean;
  sortOrder?: number;
}
