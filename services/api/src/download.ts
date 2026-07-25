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
      isFree?: boolean;
      price?: number;
      isPublished?: boolean;
      ownerUserId?: string;
    };

    const storedUrl = book.url;
    if (!storedUrl) {
      throw new HttpsError('failed-precondition', 'This book has no file.');
    }

    const isOwner = book.ownerUserId === uid;
    if (book.isPublished !== true && !isOwner) {
      throw new HttpsError('permission-denied', 'This book is not available.');
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
