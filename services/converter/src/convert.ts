import { toPlainText } from './book-html';
import { buildEpub, splitChaptersWithStats, type Chapter, type ChapterStats } from './epub';
import { ingest, type BookImage } from './ingest';
import { buildPdf } from './pdf';
import { contentHash, mintProvenance, type Provenance } from './provenance';
import { unsupportedGlyphsIn } from './fonts';

export interface ConversionRequest {
  bookId: string;
  title: string;
  author: string;
  language?: string;
  description?: string;
  manuscriptFileName: string;
  manuscript: Buffer;
  cover?: { data: Buffer; contentType: string } | null;
}

export interface ConversionResult {
  epub: Buffer;
  pdf: Buffer;
  provenance: Provenance;
  contentSha256: string;
  sourceFormat: string;
  wordCount: number;
  chapterCount: number;
  warnings: string[];

  /**
   * Signals the Publishing Journey Report scores against.
   *
   * Every one is a by-product of work this function already does. Computing
   * them here rather than later is what lets the report be honest about a book
   * without re-reading the manuscript.
   */
  headingLevel: ChapterStats['headingLevel'];
  frontMatterChapter: boolean;
  emptyChapters: number;
  shortestChapterWords: number;
  longestChapterWords: number;
  imageCount: number;
  droppedImageCount: number;
  unsupportedGlyphs: string[];
  warningCodes: Array<{ code: string; count: number }>;
}

export class EmptyManuscriptError extends Error {
  constructor() {
    super('The manuscript has no readable text. Check the file and upload again.');
    this.name = 'EmptyManuscriptError';
  }
}

/** Firestore documents cap at 1MiB, but Storage objects do not; this guards
 *  runaway inputs (a 300MB "manuscript") before Chromium sees them. */
const MAX_MANUSCRIPT_BYTES = 50 * 1024 * 1024;

export class ManuscriptTooLargeError extends Error {
  constructor() {
    super('The manuscript is larger than 50MB. Split it or remove embedded media.');
    this.name = 'ManuscriptTooLargeError';
  }
}

/**
 * The whole press, as a pure function: manuscript in, both formats out.
 *
 * No Firebase in here. That is what makes the conversion testable against a
 * corpus of fixture manuscripts without emulators, which is what "must work
 * flawlessly" has to mean in practice: every fixture presses to a valid EPUB
 * and a valid PDF on every CI run.
 */
export async function convertManuscript(
  request: ConversionRequest,
): Promise<ConversionResult> {
  if (request.manuscript.length > MAX_MANUSCRIPT_BYTES) {
    throw new ManuscriptTooLargeError();
  }

  const ingested = await ingest(request.manuscriptFileName, request.manuscript);

  const plainText = toPlainText(ingested.nodes);
  const wordCount = plainText ? plainText.split(/\s+/).length : 0;
  if (wordCount === 0) {
    throw new EmptyManuscriptError();
  }

  const provenance = mintProvenance({
    bookId: request.bookId,
    title: request.title,
    author: request.author,
  });

  const { chapters, stats } = splitChaptersWithStats(ingested.nodes, request.title);
  const chapterList: Chapter[] = chapters;

  const images: BookImage[] = ingested.images;

  const [epub, pdf] = await Promise.all([
    buildEpub({
      title: request.title,
      author: request.author,
      language: request.language ?? 'en',
      description: request.description,
      chapters: chapterList,
      images,
      cover: request.cover ?? null,
      provenance,
    }),
    buildPdf({
      title: request.title,
      author: request.author,
      chapters: chapterList,
      images,
      provenance,
    }),
  ]);

  return {
    epub,
    pdf,
    provenance,
    contentSha256: contentHash([epub, pdf]),
    sourceFormat: ingested.sourceFormat,
    wordCount,
    chapterCount: chapterList.length,
    warnings: ingested.warnings,

    headingLevel: stats.headingLevel,
    frontMatterChapter: stats.frontMatterChapter,
    emptyChapters: stats.emptyChapters,
    shortestChapterWords: stats.shortestChapterWords,
    longestChapterWords: stats.longestChapterWords,
    imageCount: ingested.imageCount,
    droppedImageCount: ingested.droppedImageCount,
    // Checked against the fonts actually embedded in the PDF, so this reports
    // what the author's own copy will look like rather than what Unicode allows.
    unsupportedGlyphs: unsupportedGlyphsIn(plainText),
    warningCodes: ingested.warningCodes,
  };
}
