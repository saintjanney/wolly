import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';

import {
  convertManuscript,
  EmptyManuscriptError,
  ManuscriptTooLargeError,
} from './convert';
import { UnsupportedManuscriptError } from './ingest';
import { imageSize } from './image-size';

initializeApp({ storageBucket: 'wolly-1133d.appspot.com' });

const REGION = 'europe-west2';
const BUCKET = 'wolly-1133d.appspot.com';

/**
 * The press, triggered by Firestore rather than called directly.
 *
 * Conversion runs for minutes on a large manuscript, far past a callable's
 * client timeout, so the contract is a field write: the creator-hub sets
 * `conversionStatus: 'requested'` on the book, this trigger flips it to
 * `'processing'`, presses both formats, and lands on `'ready'` or `'failed'`
 * with a reader-facing error. Retrying is writing 'requested' again.
 *
 * The transition guard matters: this function WRITES the document it is
 * triggered by, so it must act only on the 'requested' state or it would
 * re-trigger itself forever.
 */
export const onConversionRequested = onDocumentWritten(
  {
    document: 'epubs/{bookId}',
    region: REGION,
    memory: '2GiB',
    timeoutSeconds: 540,
    // One conversion at a time per instance: Chromium is not a good neighbour.
    concurrency: 1,
  },
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return;
    const book = after.data() as Record<string, unknown>;

    if (book.conversionStatus !== 'requested') return;

    const bookId = event.params.bookId;
    const db = getFirestore();
    const ref = db.collection('epubs').doc(bookId);

    // Claim the job. A transaction stops two trigger deliveries (Eventarc is
    // at-least-once) from pressing the same book twice.
    const claimed = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.data()?.conversionStatus !== 'requested') return false;
      tx.update(ref, {
        conversionStatus: 'processing',
        conversionError: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return true;
    });
    if (!claimed) return;

    try {
      const manuscriptUrl =
        (book.manuscriptUrl as string) || (book.url as string) || '';
      const objectPath = storageObjectPath(manuscriptUrl);
      if (!objectPath) {
        throw new UnsupportedManuscriptError(
          'No manuscript file is attached to this book.',
        );
      }

      const bucket = getStorage().bucket(BUCKET);
      const [manuscript] = await bucket.file(objectPath).download();
      const fileName = objectPath.split('/').pop() ?? 'manuscript';

      // The cover is nice-to-have: a failed cover fetch must not fail the book.
      //
      // But it must not be SILENT either. This used to be a console.warn and
      // nothing else, so an author could end up with a finished edition, no
      // cover, and no indication that anything had gone wrong. The outcome is
      // now recorded on the book, which is what the report reads.
      let cover: { data: Buffer; contentType: string } | null = null;
      let coverMetrics: Record<string, unknown> | null = null;
      const coverPath = storageObjectPath((book.coverUrl as string) ?? '');
      if (coverPath) {
        try {
          const file = bucket.file(coverPath);
          const [meta] = await file.getMetadata();
          const contentType = (meta.contentType as string) ?? 'image/jpeg';
          if (contentType.startsWith('image/')) {
            const [data] = await file.download();
            cover = { data, contentType };
            const size = imageSize(data);
            coverMetrics = {
              fetchedOk: true,
              contentType,
              bytes: data.length,
              ...(size ? { width: size.width, height: size.height } : {}),
            };
          } else {
            coverMetrics = { fetchedOk: false, contentType, bytes: 0 };
          }
        } catch (error) {
          console.warn(`cover fetch failed for ${bookId}:`, (error as Error).message);
          coverMetrics = { fetchedOk: false };
        }
      }

      const result = await convertManuscript({
        bookId,
        title: (book.title as string) || 'Untitled',
        author:
          (book.author as string) || (book.authorName as string) || 'Unknown',
        language: (book.language as string) === 'English' ? 'en' : undefined,
        description: (book.description as string) || undefined,
        manuscriptFileName: fileName,
        manuscript,
        cover,
      });

      // Converted files live under converted/, a path with NO storage rule and
      // NO download tokens: every read goes through getBookDownloadUrl, which
      // is where entitlement and rights revocation are enforced.
      const base = `converted/${bookId}/${result.provenance.fingerprint}`;
      const epubPath = `${base}/book.epub`;
      const pdfPath = `${base}/book.pdf`;
      await bucket.file(epubPath).save(result.epub, {
        contentType: 'application/epub+zip',
        resumable: false,
      });
      await bucket.file(pdfPath).save(result.pdf, {
        contentType: 'application/pdf',
        resumable: false,
      });

      const publicBase = `https://storage.googleapis.com/${BUCKET}`;
      await ref.update({
        conversionStatus: 'ready',
        // The reader contract: url + fileType drive which reader opens.
        url: `${publicBase}/${epubPath}`,
        fileType: 'epub',
        epubUrl: `${publicBase}/${epubPath}`,
        pdfUrl: `${publicBase}/${pdfPath}`,
        conversion: {
          fingerprint: result.provenance.fingerprint,
          contentSha256: result.contentSha256,
          sourceFormat: result.sourceFormat,
          wordCount: result.wordCount,
          chapterCount: result.chapterCount,
          warnings: result.warnings.slice(0, 20),
          pressedAt: result.provenance.pressedAt,

          // Signals the Publishing Journey Report scores against.
          headingLevel: result.headingLevel,
          frontMatterChapter: result.frontMatterChapter,
          emptyChapters: result.emptyChapters,
          shortestChapterWords: result.shortestChapterWords,
          longestChapterWords: result.longestChapterWords,
          imageCount: result.imageCount,
          droppedImageCount: result.droppedImageCount,
          unsupportedGlyphs: result.unsupportedGlyphs.slice(0, 20),
          warningCodes: [
            ...result.warningCodes,
            ...(coverMetrics && coverMetrics.fetchedOk === false
              ? [{ code: 'cover_fetch_failed', count: 1 }]
              : []),
          ],
        },
        ...(coverMetrics ? { coverMetrics } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log(
        `pressed ${bookId}: ${result.sourceFormat} -> epub+pdf, ` +
          `${result.wordCount} words, ${result.chapterCount} chapters, ` +
          `fingerprint ${result.provenance.fingerprint}`,
      );
    } catch (error) {
      const readerFacing =
        error instanceof UnsupportedManuscriptError ||
        error instanceof EmptyManuscriptError ||
        error instanceof ManuscriptTooLargeError;
      console.error(`conversion failed for ${bookId}:`, error);
      await ref.update({
        conversionStatus: 'failed',
        conversionError: readerFacing
          ? (error as Error).message
          : 'Conversion failed. Please try again, or contact Wolly if it keeps happening.',
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  },
);

/** Same parser as services/api/src/download.ts; kept in sync by a contract test. */
export function storageObjectPath(rawUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (parsed.hostname === 'firebasestorage.googleapis.com') {
    const match = parsed.pathname.match(/\/o\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  }
  if (parsed.hostname === 'storage.googleapis.com') {
    const parts = parsed.pathname.replace(/^\//, '').split('/');
    if (parts.length < 2) return null;
    return decodeURIComponent(parts.slice(1).join('/'));
  }
  return null;
}
