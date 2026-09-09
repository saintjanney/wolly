import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const REGION = 'europe-west2';
const EPUBS = 'epubs';
const CONTRACTS = 'contracts';
const USERS = 'users';
const SETTINGS = 'platform_settings';

/**
 * Signing a publishing contract: the author asking Wolly to sell their book.
 *
 * WHY THIS IS A CALLABLE AND NOT A CLIENT WRITE. The document freezes the
 * revenue share, and an author who could write it would set their own. That is
 * not a hypothetical risk; the same defect reached production once through
 * `epubs.revenueTerms`.
 *
 * WHY IT DOES NOT RUN THE REPORT ENGINE. `blockingFailures()` is the author's
 * pre-flight and it is computed in the browser, which makes it a guide rather
 * than a gate: a gate that runs on the client is not a gate. This function
 * therefore re-derives the author-owned blocking conditions here, from
 * Firestore, and `contract.test.js` in this package asserts the list below
 * matches the schema's author-owned blocking checks exactly, so the guide and
 * the gate cannot drift apart. Importing the engine is not available:
 * services/api cannot depend on a workspace package (see publish.ts).
 *
 * WOLLY'S OWN CHECKS ARE NOT ENFORCED HERE, deliberately. `edition_reviewed`
 * and `listing_approved` are things Wolly does IN RESPONSE to being asked, so
 * requiring them before the asking would be a deadlock. A signed contract is
 * `pending`; staff review moves it to `active` and the book goes live.
 */

/**
 * The author-owned blocking checks, re-derived server-side.
 *
 * Kept as ids so the contract test can compare them against the schema's own
 * CHECKS table rather than against a comment.
 */
export const AUTHOR_BLOCKING_CHECKS = [
  'manuscript_pressed',
  'glyph_coverage',
  'cover_present',
  'description',
  'genre_language',
  'title_author',
  'payout_destination',
  'price_set',
] as const;

/**
 * NO COMMERCIAL PRICE FLOOR IS ENFORCED YET.
 *
 * Paystack's GHS fee has a fixed component, so below some price a sale loses
 * Wolly money at a 70% author share, and the floor moves with the share.
 * Paystack's published schedule is not in this repo and inventing a number
 * would mean enforcing a made-up rule against real authors. What IS enforced is
 * validity: a book offered for sale must have a positive price.
 */
const MIN_PRICE_MINOR: number | null = null;
/** A sanity ceiling, not a commercial judgement: GHS 10,000. */
const MAX_PRICE_MINOR = 1_000_000;

const words = (text: unknown): number =>
  typeof text === 'string' ? text.trim().split(/\s+/).filter(Boolean).length : 0;

interface Problem {
  check: string;
  message: string;
}

export const signPublishingContract = onCall({ region: REGION }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to publish.');

  const bookId = (request.data?.bookId ?? '') as string;
  if (!bookId) throw new HttpsError('invalid-argument', 'bookId is required.');

  const isFree = request.data?.isFree === true;
  const priceMinor = isFree ? 0 : Math.round(Number(request.data?.priceMinor ?? 0));
  const agreementVersion = (request.data?.agreementVersion ?? '') as string;
  const agreementText = (request.data?.agreementText ?? '') as string;

  // The author must have been shown the words they are agreeing to, and those
  // words are what gets stored. A client that sends a version without the text
  // is claiming consent to something nobody can read back later.
  if (!agreementVersion || agreementText.length < 100) {
    throw new HttpsError(
      'invalid-argument',
      'The agreement text and version must be sent with the signature.',
    );
  }

  const db = getFirestore();
  const bookRef = db.collection(EPUBS).doc(bookId);
  const snap = await bookRef.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Book not found.');

  const book = snap.data() as Record<string, unknown>;
  if (book.ownerUserId !== uid) {
    throw new HttpsError('permission-denied', 'Only the author can publish this book.');
  }

  if (book.activeContractId) {
    throw new HttpsError(
      'failed-precondition',
      'This book already has a publishing agreement. End it before signing a new one.',
    );
  }

  // ── The gate ─────────────────────────────────────────────────────────────
  const problems: Problem[] = [];
  const fail = (check: string, message: string) => problems.push({ check, message });

  const conversion = (book.conversion ?? {}) as Record<string, unknown>;
  if (book.conversionStatus !== 'ready') {
    fail('manuscript_pressed', 'Your manuscript has not been typeset yet.');
  }
  const glyphs = (conversion.unsupportedGlyphs ?? []) as unknown[];
  if (glyphs.length > 0) {
    fail(
      'glyph_coverage',
      `Some characters cannot be drawn in your book (${glyphs.slice(0, 6).join(' ')}). Readers would see empty boxes.`,
    );
  }
  const coverMetrics = (book.coverMetrics ?? {}) as { fetchedOk?: boolean };
  if (!book.coverUrl || coverMetrics.fetchedOk === false) {
    fail('cover_present', 'Your book needs a cover readers can see.');
  }
  if (words(book.description) < 20) {
    fail('description', 'Your book needs a description of at least twenty words.');
  }
  if (!book.genre || !book.language) {
    fail('genre_language', 'Your book needs a genre and a language.');
  }
  if (!book.title || !(book.author || book.authorName)) {
    fail('title_author', 'Your book needs a title and an author name.');
  }

  if (!isFree) {
    if (!Number.isFinite(priceMinor) || priceMinor <= 0) {
      fail('price_set', 'Set a price, or publish the book free.');
    } else if (priceMinor > MAX_PRICE_MINOR) {
      fail('price_set', 'That price looks like a mistake. Check the amount.');
    } else if (MIN_PRICE_MINOR !== null && priceMinor < MIN_PRICE_MINOR) {
      fail('price_set', `The lowest price Wolly can process is ${(MIN_PRICE_MINOR / 100).toFixed(2)}.`);
    }
  }

  // Payouts only matter when there is money to send.
  if (!isFree) {
    const userSnap = await db.collection(USERS).doc(uid).get();
    const payment = (userSnap.data()?.paymentInfo ?? {}) as {
      payment_option?: string;
      payment_details?: Record<string, unknown>;
    };
    const hasDetails = Object.keys(payment.payment_details ?? {}).length > 0;
    if (!payment.payment_option || !hasDetails) {
      fail('payout_destination', 'Tell us where to send your earnings before you sell.');
    }
  }

  if (problems.length > 0) {
    throw new HttpsError('failed-precondition', 'This book is not ready to publish.', { problems });
  }

  // ── The terms, read ONCE and frozen ──────────────────────────────────────
  const terms = await currentTerms(db, book);

  const contractRef = bookRef.collection(CONTRACTS).doc();
  const now = FieldValue.serverTimestamp();

  await db.runTransaction(async (tx) => {
    // Re-read inside the transaction: two tabs signing at once must not produce
    // two live contracts for one book.
    const fresh = await tx.get(bookRef);
    if (fresh.data()?.activeContractId) {
      throw new HttpsError('failed-precondition', 'This book already has a publishing agreement.');
    }

    tx.set(contractRef, {
      id: contractRef.id,
      bookId,
      authorUserId: uid,
      authorShare: terms.authorShare,
      revenueBasis: terms.basis,
      priceMinor,
      currency: (book.currency as string) || 'GHS',
      isFree,
      agreement: {
        acceptedBy: uid,
        acceptedAt: now,
        // Stored verbatim, as sent and as shown. A version pointer alone would
        // stop being readable the moment the wording changed.
        agreementText,
        agreementVersion,
      },
      state: 'pending',
      signedAt: now,
      activatedAt: null,
      endedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    tx.update(bookRef, {
      activeContractId: contractRef.id,
      // The commercial fields the rest of the platform reads. They mirror the
      // contract rather than replacing it: the contract is the record, these
      // are the working copy the reader and checkout use.
      price: isFree ? 0 : priceMinor / 100,
      isFree,
      revenueTerms: { authorShare: terms.authorShare, basis: terms.basis },
      status: 'review',
      updatedAt: now,
    });
  });

  return {
    contractId: contractRef.id,
    state: 'pending',
    authorShare: terms.authorShare,
    revenueBasis: terms.basis,
  };
});

/**
 * The terms in force RIGHT NOW, for a contract being signed.
 *
 * Read once, here, and copied onto the contract. Never read again: an author
 * who signed at 70% keeps 70% whatever staff change afterwards.
 */
async function currentTerms(
  db: FirebaseFirestore.Firestore,
  book: Record<string, unknown>,
): Promise<{ authorShare: number; basis: 'gross' | 'net' }> {
  if (book.revenueTerms) return readTerms(book.revenueTerms);
  try {
    const snap = await db.collection(SETTINGS).doc('revenue').get();
    return readTerms(snap.exists ? snap.data() : null);
  } catch {
    return { authorShare: 0.7, basis: 'gross' };
  }
}

/**
 * Mirrors `readRevenueTerms` in @wolly/schema, which this codebase cannot
 * import. A safety boundary: the settings document is hand-edited, and
 * `authorShare: 70` typed for `0.7` would sign an author to seventy times the
 * sale price. `contract.test.js` pins the two implementations together.
 */
function readTerms(raw: unknown): { authorShare: number; basis: 'gross' | 'net' } {
  const source = (raw ?? {}) as { authorShare?: unknown; basis?: unknown };
  const share = Number(source.authorShare);
  const basis: 'gross' | 'net' = source.basis === 'net' ? 'net' : 'gross';
  if (!Number.isFinite(share) || share <= 0 || share > 0.95) {
    return { authorShare: 0.7, basis: 'gross' };
  }
  return { authorShare: share, basis };
}
