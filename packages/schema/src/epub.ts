import type { FirestoreTimestamp } from './firestore';

/** File formats the reader can open. */
export type FileType = 'pdf' | 'epub';

/** Publishing lifecycle state (managed by the creator-hub + backoffice). */
export type BookStatus =
  | 'draft'
  | 'review'
  | 'approved'
  | 'published'
  | 'suspended'
  | 'archived';

export type RoyaltyOption = '35%' | '70%';

export type BookType = 'ebook' | 'paperback' | 'hardcover' | 'audiobook';

export interface DistributionChannels {
  amazon: boolean;
  apple: boolean;
  google: boolean;
  kobo: boolean;
  barnesNoble: boolean;
  direct: boolean;
}

/**
 * A document in the `epubs` collection — the single book record shared by the
 * whole platform.
 *
 * It is split into two groups:
 *
 *  1. READER CONTRACT — the fields the Flutter reader actually reads. The
 *     creator-hub MUST populate every one of these when it publishes a book,
 *     or the book will not render correctly in the reader.
 *
 *  2. CREATOR METADATA — richer fields the creator-hub & backoffice use. The
 *     reader ignores them today, but they live on the same document so there is
 *     one source of truth per book.
 */
export interface EpubBook {
  // ── Reader contract ──────────────────────────────────────────────────────
  /** Firestore document id (also stored in the body for convenience). */
  id: string;
  title: string;
  /** Display author name. The reader reads `author` (not `authorName`). */
  author: string;
  /** Owning creator's uid. */
  ownerUserId: string;
  /** Genre **document id** into the `genres` collection (NOT a free-text name). */
  genre: string;
  /** Public download URL of the book file. The reader reads `url`. */
  url: string;
  /** `pdf` or `epub` — drives which reader UI opens. */
  fileType: FileType;
  /** Public URL of the cover image. The reader reads `coverUrl`. */
  coverUrl: string | null;
  description: string | null;
  /** Whether the book is live in the reader. */
  isPublished: boolean;
  isFree: boolean;
  price: number;
  /** Average approved-review rating (the reader recomputes & writes this back). */
  rating: number;
  /** Count of approved reviews (written back by the reader). */
  reviewCount: number;

  // ── Creator metadata (creator-hub / backoffice) ──────────────────────────
  /** Same value as `author`; kept for the hub's own forms. */
  authorName?: string;
  subtitle?: string;
  penName?: string;
  shortDescription?: string;
  type?: BookType;
  language?: string;
  /** Free-text categories chosen in the wizard; `genre` is the resolved id. */
  categories?: string[];
  keywords?: string[];
  tags?: string[];
  subcategories?: string[];
  readingAge?: string;
  hasExplicitContent?: boolean;
  contentWarnings?: string[];
  targetAudience?: string[];
  isbn?: string;
  isbn13?: string;
  editionNumber?: string;
  pageCount?: number;
  wordCount?: number;
  trimSize?: string;
  paperType?: 'white' | 'cream';
  coverFinish?: 'matte' | 'glossy';
  bindingType?: 'perfect' | 'case';
  /** Raw uploaded file URLs (the reader uses `url`/`coverUrl`, these mirror them). */
  manuscriptUrl?: string;
  coverImageUrl?: string;
  sampleUrl?: string;
  aiGenerated?: boolean;
  aiUsageDescription?: string;
  aiToolUsed?: string;
  ownsCopyright?: boolean;
  copyrightYear?: number;
  currency?: string;
  royaltyOption?: RoyaltyOption;
  customerPaysProcessingFee?: boolean;
  wollyRevenueShare?: number;
  distributionChannels?: DistributionChannels;

  // ── Workflow & moderation (backoffice) ───────────────────────────────────
  status: BookStatus;
  publishingStatus?: {
    manuscriptSubmitted: boolean;
    coverApproved: boolean;
    metadataComplete: boolean;
    pricingSet: boolean;
    distributionEnabled: boolean;
  };
  qualityScore?: number;
  reviewNotes?: string[];
  lastReviewedAt?: FirestoreTimestamp;
  reviewedBy?: string;

  // ── Metrics ──────────────────────────────────────────────────────────────
  views?: number;
  downloads?: number;
  sales?: number;
  revenue?: number;

  // ── Timestamps ───────────────────────────────────────────────────────────
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
  publishedAt?: FirestoreTimestamp;
  lastModifiedAt?: FirestoreTimestamp;
}

/** The subset of fields the reader strictly requires to render a book. */
export type EpubReaderContract = Pick<
  EpubBook,
  | 'title'
  | 'author'
  | 'ownerUserId'
  | 'genre'
  | 'url'
  | 'fileType'
  | 'coverUrl'
  | 'description'
  | 'isPublished'
  | 'isFree'
  | 'price'
  | 'rating'
  | 'reviewCount'
>;
