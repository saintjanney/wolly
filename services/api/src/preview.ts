import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const REGION = 'europe-west2';
const EPUBS = 'epubs';

/**
 * The opening pages of a pressed book, for its own author to look at.
 *
 * WHY BYTES AND NOT A SIGNED URL. Everything under `converted/` is served
 * through a callable precisely so entitlement is enforced in one place, and a
 * signed URL fetched cross-origin from the creator-hub would need bucket CORS.
 * That is three separate problems: the deploy service account can publish rules
 * but cannot set bucket CORS, `develop` is served from a hashed preview origin
 * that GCS cannot match with a wildcard, and `--cors-file` REPLACES the bucket
 * configuration rather than merging it, with nothing in this repo recording what
 * is currently set. Returning the bytes through the callable removes all three,
 * and the expiry problem with them, because there is no URL.
 *
 * The preview is a few hundred KB: eight pages of subset-embedded text, well
 * inside the callable response limit. The full edition is NOT served this way;
 * that is `getBookDownloadUrl`.
 *
 * OWNER ONLY. This is the author looking at their own conversion before they
 * decide to sell it, and it deliberately predates any entitlement. Serving it
 * to anyone else would be an eight-page extract of a paid book with no purchase
 * check, which is a way around the gate rather than a feature. The reader-facing
 * sample is a different thing and is `previewChapters`.
 */
export const getBookPreviewBytes = onCall({ region: REGION }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign in to see your preview.');
  }

  const bookId = (request.data?.bookId ?? '') as string;
  if (!bookId) {
    throw new HttpsError('invalid-argument', 'bookId is required.');
  }

  const db = getFirestore();
  const snap = await db.collection(EPUBS).doc(bookId).get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Book not found.');
  }

  const book = snap.data() as {
    ownerUserId?: string;
    previewPath?: string;
    pageCount?: number;
    conversionStatus?: string;
  };

  if (book.ownerUserId !== uid) {
    throw new HttpsError('permission-denied', 'The press preview is for the book’s author.');
  }

  if (!book.previewPath) {
    // Not an error the author can act on by retrying: either the press has not
    // finished, or it finished before previews existed. Say which, because
    // "try again" is wrong advice for the second one.
    throw new HttpsError(
      'failed-precondition',
      book.conversionStatus === 'ready'
        ? 'This edition was pressed before previews existed. Upload the manuscript again to make one.'
        : 'Your book is still being typeset.',
    );
  }

  const file = getStorage().bucket().file(book.previewPath);
  const [exists] = await file.exists();
  if (!exists) {
    throw new HttpsError('not-found', 'The preview file is missing. Press the book again.');
  }

  const [bytes] = await file.download();

  return {
    // base64 so it survives the callable's JSON transport intact.
    bytes: bytes.toString('base64'),
    contentType: 'application/pdf',
    /** Pages in the FULL edition, so the preview can say what it is showing. */
    pageCount: book.pageCount ?? null,
  };
});
