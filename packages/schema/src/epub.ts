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

/** Manuscript formats the press accepts. Anything else is refused on upload. */
export type ManuscriptFormat = 'docx' | 'markdown' | 'text';

/**
 * Where a book sits in the manuscript -> EPUB/PDF pipeline.
 *
 * The creator-hub writes `requested`; the converter owns every later value.
 * Writing `requested` again is how a failed conversion is retried.
 */
export type ConversionStatus = 'requested' | 'processing' | 'ready' | 'failed';

/**
 * Whether a published book may still be downloaded. A TAKEDOWN GATE.
 *
 * NOT the rights registry. This is the switch `getBookDownloadUrl` reads to
 * decide whether to issue a link at all; `RightsGrant` in `rights.ts` is the
 * record of who may do what with the work. Collapsing them would mean an author
 * editing a licence could revoke their own book.
 *
 * `revoked` does not and cannot delete copies already downloaded. What it does
 * is refuse to issue any new download link, which is the only enforcement point
 * that actually exists for an open format. See RIGHTS.md.
 *
 * The wire field stays `rightsStatus`: it is referenced in download.ts, in
 * firestore.rules and in the rules tests, so renaming it would buy a migration
 * for nothing.
 */
export type BookAvailabilityStatus = 'clear' | 'disputed' | 'revoked';

/** @deprecated Use {@link BookAvailabilityStatus}. Kept so existing imports compile. */
export type RightsStatus = BookAvailabilityStatus;

/**
 * The record of one pressing, written by @wolly/converter.
 *
 * `fingerprint` is the value stamped into the EPUB package metadata, the
 * colophon page and the PDF document info. A file found in the wild is matched
 * back to this record, and through it to the book.
 */
export interface BookConversion {
  /** Unique per pressing, e.g. `wolly-<uuid>`. */
  fingerprint: string;
  /** SHA-256 of the pressed EPUB and PDF, for tamper checking. */
  contentSha256: string;
  sourceFormat: ManuscriptFormat;
  wordCount: number;
  chapterCount: number;
  /** Non-fatal notes for the author (dropped image types, and so on). */
  warnings: string[];
  /** ISO 8601. */
  pressedAt: string;

  // ── Signals for the Publishing Journey Report ────────────────────────────
  //
  // All computed inside the pass the press already runs, from data it already
  // holds. None of them costs a second read of the manuscript.

  /**
   * The heading level the book was split on, or null when it carried none.
   *
   * The single most useful structural signal. It was computed and discarded
   * before this existed, which meant the report saw every book as one unmarked
   * block and would have told a properly chaptered novel to go and mark its
   * chapter titles.
   */
  headingLevel?: 'h1' | 'h2' | null;
  /** Whether content appeared before the first heading. */
  frontMatterChapter?: boolean;
  emptyChapters?: number;
  shortestChapterWords?: number;
  longestChapterWords?: number;
  /**
   * Paragraphs that look like chapter titles but carry no heading.
   *
   * The commonest defect in a manuscript typed in Word: the author bolded and
   * centred their chapter titles instead of applying Heading 1, so the file
   * looks right and carries no structure. Without this the report can only say
   * "this reads as one continuous piece", which tells the author nothing about
   * what to change.
   */
  headingShapedParagraphs?: number;
  imageCount?: number;
  droppedImageCount?: number;
  /**
   * Distinct characters the embedded fonts cannot draw.
   *
   * Non-empty means the author's own PDF contains empty boxes. In Ghana that is
   * a blocker rather than a nicety: Twi, Ewe, Ga and Dagbani all need
   * characters outside Latin-1. See services/converter/src/fonts.ts.
   */
  unsupportedGlyphs?: string[];
  /**
   * Warnings with machine-readable codes, so the report can score and show the
   * author-actionable ones and stay silent about engine noise.
   */
  warningCodes?: Array<{ code: string; count: number }>;
}

/**
 * What the press measured about a cover while it had the bytes in hand.
 *
 * `fetchedOk: false` is the important one: the press used to swallow a failed
 * cover download with a console warning and press the book anyway, so an author
 * could end up with a finished edition and no cover and nothing telling them.
 */
export interface CoverMetrics {
  width?: number;
  height?: number;
  bytes?: number;
  contentType?: string;
  fetchedOk: boolean;
}

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
 * A document in the `epubs` collection, the single book record shared by the
 * whole platform.
 *
 * It is split into two groups:
 *
 *  1. READER CONTRACT, the fields the Flutter reader actually reads. The
 *     creator-hub MUST populate every one of these when it publishes a book,
 *     or the book will not render correctly in the reader.
 *
 *  2. CREATOR METADATA, richer fields the creator-hub & backoffice use. The
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
  /** `pdf` or `epub`, drives which reader UI opens. */
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

  // ── The press (@wolly/converter) ─────────────────────────────────────────
  /**
   * Set to `requested` by the creator-hub to ask for a pressing. The converter
   * function is triggered by this field and owns every value after that.
   */
  conversionStatus?: ConversionStatus;
  /** Reader-facing reason a pressing failed. Present only when `failed`. */
  conversionError?: string;
  /** Details of the successful pressing. Present only when `ready`. */
  conversion?: BookConversion;
  /** Pressed EPUB. `url` also points here so the reader needs no change. */
  epubUrl?: string;
  /** Pressed PDF, offered alongside the EPUB. */
  pdfUrl?: string;
  /** Measured by the press when it fetched the cover. */
  coverMetrics?: CoverMetrics;
  /** Chapters offered as a free sample. Null means the press picks the first. */
  previewChapters?: number[] | null;

  // ── Rights ───────────────────────────────────────────────────────────────
  /** Absent means `clear`. `revoked` stops the delivery gate issuing links. */
  rightsStatus?: RightsStatus;
  /** Why the rights state changed, shown to staff in the backoffice. */
  rightsNote?: string;
  rightsUpdatedAt?: FirestoreTimestamp;
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
