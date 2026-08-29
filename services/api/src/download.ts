import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const REGION = 'europe-west2';
const EPUBS = 'epubs';
const PURCHASES = 'purchases';

/** How long an issued link stays valid. Long enough to download, short enough
 *  that a leaked link is not a permanent bypass. */
const LINK_TTL_MS = 15 * 60 * 1000;

/**
 * Issues a short-lived download link for a book, after checking entitlement.
 *
 * WHY THIS EXISTS: `epubs.url` held a Firebase Storage URL carrying a permanent
 * access token, on a document every authenticated user can read. Anyone who
 * could see the book could fetch the file, and an unauthenticated request
 * returned HTTP 200. Verifying the purchase record did nothing to protect the
 * actual content.
 *
 * Storage security rules cannot solve this here: files live at
 * `books/{ownerUid}/{timestamp}/...`, and that timestamp is not the book's
 * document id, so a rule has no way to correlate the path with a purchase.
 * Hence a signed URL issued by this function, which can consult Firestore.
 *
 * Free books are returned as stored. Many are external (Project Gutenberg) and
 * there is nothing to protect.
 */
export const getBookDownloadUrl = onCall(
  { region: REGION, cors: true, enforceAppCheck: false },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Sign in to read this book.');
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
      url?: string;
      epubUrl?: string;
      pdfUrl?: string;
      isFree?: boolean;
      price?: number;
      isPublished?: boolean;
      ownerUserId?: string;
      rightsStatus?: string;
    };

    // Which pressing to hand back. The press produces both an EPUB and a PDF,
    // and both live under `converted/`, which no client can read directly, so
    // asking for the PDF has to come through here too. Omitting `format` keeps
    // the original behaviour of serving whatever `url` points at, which is what
    // the reader does and what unpressed and external books still need.
    const format = (request.data?.format ?? '') as string;
    const storedUrl =
      format === 'pdf'
        ? (book.pdfUrl ?? book.url)
        : format === 'epub'
          ? (book.epubUrl ?? book.url)
          : book.url;

    if (!storedUrl) {
      throw new HttpsError(
        'failed-precondition',
        format === 'pdf'
          ? 'This book has no PDF edition.'
          : 'This book has no file.',
      );
    }

    const isOwner = book.ownerUserId === uid;
    if (book.isPublished !== true && !isOwner) {
      throw new HttpsError('permission-denied', 'This book is not available.');
    }

    // ── Rights ─────────────────────────────────────────────────────────────
    //
    // This is the whole of what "taking a book down" can enforce, and it is
    // worth being precise about its limits. Revoking stops this function
    // issuing any new signed link, so the book cannot be fetched or re-fetched
    // by anyone, the owner included. It does NOT reach copies already on
    // someone's device: an EPUB or PDF is an open format with no callback, and
    // any claim to delete one remotely would be false. Revocation closes the
    // tap; it does not empty the bucket. See RIGHTS.md.
    //
    // Checked AFTER the ownership check so the owner is told the real reason
    // rather than "not available", and BEFORE entitlement so a paying reader
    // is not told to buy a book that is frozen anyway.
    if (book.rightsStatus === 'revoked') {
      throw new HttpsError(
        'permission-denied',
        'This book has been withdrawn over a rights claim and cannot be downloaded.',
      );
    }
    if (book.rightsStatus === 'disputed' && !isOwner) {
      throw new HttpsError(
        'permission-denied',
        'This book is temporarily unavailable while a rights claim is reviewed.',
      );
    }

    // ── Entitlement ────────────────────────────────────────────────────────
    const isFree = book.isFree === true || !book.price || book.price <= 0;

    if (!isFree && !isOwner) {
      const purchase = await db
        .collection(PURCHASES)
        .doc(`${uid}_${bookId}`)
        .get();

      // Only a completed purchase counts. A `pending` document exists from the
      // moment checkout starts, before any money moves.
      if (!purchase.exists || purchase.data()?.status !== 'completed') {
        throw new HttpsError(
          'permission-denied',
          'Buy this book to read it.',
        );
      }
    }

    // ── Issue the link ─────────────────────────────────────────────────────
    const objectPath = storageObjectPath(storedUrl);
    if (!objectPath) {
      // Not a file we host (e.g. a Project Gutenberg URL). Nothing to sign, and
      // nothing to protect either.
      return { url: storedUrl, signed: false, expiresAt: null };
    }

    const expires = Date.now() + LINK_TTL_MS;
    try {
      const [url] = await getStorage()
        .bucket()
        .file(objectPath)
        .getSignedUrl({ action: 'read', version: 'v4', expires });
      return { url, signed: true, expiresAt: expires };
    } catch (error) {
      // Signing needs the runtime service account to be able to sign blobs.
      // Fail loudly rather than falling back to the permanently-tokened URL,
      // which would silently reopen the hole this function exists to close.
      console.error('getBookDownloadUrl: signing failed', error);
      throw new HttpsError(
        'internal',
        'Could not prepare the download. Please try again.',
      );
    }
  },
);

/**
 * Extracts the Storage object path from a Firebase download URL, or null when
 * the URL is not one of ours.
 *
 * Handles `firebasestorage.googleapis.com/v0/b/<bucket>/o/<encoded path>` and
 * `storage.googleapis.com/<bucket>/<path>`.
 */
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
    // /<bucket>/<object path>
    const parts = parsed.pathname.replace(/^\//, '').split('/');
    if (parts.length < 2) return null;
    return decodeURIComponent(parts.slice(1).join('/'));
  }

  return null;
}
