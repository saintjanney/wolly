const admin = require('firebase-admin');
const functions = require('firebase-functions/v1');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const PAYSTACK_API_BASE = 'https://api.paystack.co';
const PAYMENT_CALLBACK_URL = 'wolly://payment-callback';
const FUNCTIONS_SERVICE_ACCOUNT =
  'firebase-adminsdk-yc0s9@wolly-1133d.iam.gserviceaccount.com';

function setCors(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
}

/**
 * The Paystack secret, from Secret Manager.
 *
 * Bound via `runWith({ secrets: [...] })` on each function, which Firebase
 * surfaces as an ordinary environment variable at runtime. It used to come from
 * a deploy-time `.env` that existed on one machine and in the deployed function
 * environment and nowhere else, which is why this codebase was excluded from CI:
 * any deploy without that file would have replaced working functions with ones
 * that could not reach Paystack.
 */
function getPaystackSecret() {
  return process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET || '';
}

async function authenticateRequest(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new functions.https.HttpsError('unauthenticated', 'Missing bearer token');
  }

  const token = authHeader.replace('Bearer ', '').trim();
  return admin.auth().verifyIdToken(token);
}

async function callPaystack(path, options = {}) {
  const secret = getPaystackSecret();
  if (!secret) {
    throw new Error(
      'Missing Paystack secret key. Set PAYSTACK_SECRET_KEY in the Functions environment before using payment verification.'
    );
  }

  const response = await fetch(`${PAYSTACK_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const payload = await response.json();
  if (!response.ok || payload.status !== true) {
    const message =
      payload?.message || `Paystack request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload.data;
}

/**
 * The money split. DUPLICATED FROM `@wolly/schema` (`splitSale`,
 * `readRevenueTerms`, `termsFromPurchase`, `DEFAULT_REVENUE_TERMS`).
 *
 * Not imported, deliberately. This codebase is deployed by Firebase, which runs
 * `npm install` inside services/payments at deploy time; an unpublished
 * workspace dependency cannot resolve there. That is the same failure mode that
 * broke the blog's webframeworks deploy. `services/api/test/contract.test.js`
 * asserts these stay identical to the canonical versions BY BEHAVIOUR, running
 * both over a grid of sales rather than comparing text.
 *
 * All amounts are pesewas. Rounding is applied once, to the author, and the
 * platform takes the remainder, so the parts always sum back to net exactly.
 */
const DEFAULT_REVENUE_TERMS = { authorShare: 0.7, basis: 'gross' };
const MAX_AUTHOR_SHARE = 0.95;

/**
 * Validates terms read out of the staff-editable settings document.
 *
 * A safety boundary, not a habit: `authorShare: 70` typed instead of `0.7`
 * would pay an author seventy times the sale price, and it looks right in the
 * console.
 */
function readRevenueTerms(raw) {
  const source = raw || {};
  const share = Number(source.authorShare);
  const basis = source.basis === 'net' ? 'net' : 'gross';
  if (!Number.isFinite(share) || share <= 0 || share > MAX_AUTHOR_SHARE) {
    return { ...DEFAULT_REVENUE_TERMS };
  }
  return { authorShare: share, basis };
}

/**
 * The terms frozen on a purchase.
 *
 * A checkout begun before the terms became configurable carries the old
 * `royaltyRate` and no basis; those were all shares of gross. Without this, a
 * purchase started before a deploy and verified after it would fall back to the
 * platform default and pay the wrong amount.
 */
function termsFromPurchase(purchase) {
  const share = Number(
    purchase.authorShare !== undefined && purchase.authorShare !== null
      ? purchase.authorShare
      : purchase.royaltyRate
  );
  if (!Number.isFinite(share) || share <= 0 || share > 1) {
    return { ...DEFAULT_REVENUE_TERMS };
  }
  return { authorShare: share, basis: purchase.revenueBasis === 'net' ? 'net' : 'gross' };
}

function splitSale({ grossMinor, providerFeeMinor, terms }) {
  const gross = Math.round(grossMinor);
  const providerFee = Math.max(0, Math.round(providerFeeMinor));
  const net = gross - providerFee;
  const { authorShare, basis } = terms;
  const shareOf = basis === 'net' ? net : gross;
  const authorEarnings = Math.max(0, Math.round(shareOf * authorShare));
  return {
    grossMinor: gross,
    providerFeeMinor: providerFee,
    netMinor: net,
    authorShare,
    revenueBasis: basis,
    authorEarningsMinor: authorEarnings,
    platformNetMinor: net - authorEarnings,
  };
}

/**
 * The terms in force RIGHT NOW, for a checkout that is starting.
 *
 * Read once, at the moment the reader commits to a price, and frozen onto the
 * purchase. Never read again when the sale is verified or paid out: staff can
 * change what Wolly offers tomorrow, and it must not rewrite a sale agreed
 * today. A book may carry its own override, which staff set in the backoffice.
 */
async function currentTermsFor(book) {
  if (book && book.revenueTerms) return readRevenueTerms(book.revenueTerms);
  try {
    const snap = await db.collection('platform_settings').doc('revenue').get();
    return readRevenueTerms(snap.exists ? snap.data() : null);
  } catch (error) {
    // A settings read must never take checkout down.
    console.error('revenue settings unreadable, using platform default', error);
    return { ...DEFAULT_REVENUE_TERMS };
  }
}

/**
 * Paystack statuses that genuinely end a sale, mapped to Wolly's lifecycle.
 *
 * Anything absent from this table leaves the purchase `pending`. That includes
 * `ongoing` and `pending` themselves, which mean the reader is still paying.
 * Being wrong in this direction leaves a sale recoverable; being wrong in the
 * other direction loses it silently.
 */
const TERMINAL_PROVIDER_STATUS = {
  failed: 'failed',
  abandoned: 'abandoned',
  reversed: 'failed',
};

/**
 * Records a settled sale: the entitlement and the ledger row, together.
 *
 * EXTRACTED so the reconciler and the client-facing verify are the same code
 * rather than two implementations that agree today. The whole point of the
 * reconciler is that it settles sales the client never came back for, so a
 * second copy would be a second way to get money wrong, in the path nobody
 * watches.
 *
 * IDEMPOTENT. `purchases/{uid}_{bookId}` is merged and `transactions/{ref}` is
 * keyed by the provider reference, so settling the same sale twice overwrites
 * rather than double-counting. Callers still skip an already-completed purchase
 * first, because doing the work twice is wasteful even when it is harmless.
 */
async function settlePurchase({ purchaseRef, uid, bookId, reference, purchase, verification }) {
  const expectedAmount = Number(purchase.amountInPesewas || 0);
  const paidAmount = Number(verification.amount || 0);
  if (expectedAmount > 0 && paidAmount !== expectedAmount) {
    // Never settle a sale for a different amount than was agreed, whoever is
    // asking. Reported rather than thrown so a reconciler pass survives it.
    return { settled: false, reason: 'amount_mismatch', expected: expectedAmount, paid: paidAmount };
  }

  const paidAtDate =
    verification.paid_at || verification.paidAt
      ? admin.firestore.Timestamp.fromDate(new Date(verification.paid_at || verification.paidAt))
      : admin.firestore.FieldValue.serverTimestamp();

  const split = splitSale({
    grossMinor: Number(verification.amount || purchase.amountInPesewas || 0),
    // Paystack reports its own cut in minor units. Previously discarded, which
    // made Wolly's true margin unknowable.
    providerFeeMinor: Number(verification.fees || 0),
    // From the purchase, never from the settings document. This sale was agreed
    // at these terms.
    terms: termsFromPurchase(purchase),
  });

  const batch = db.batch();

  // `purchases/{uid}_{bookId}` keeps its shape exactly: it is what
  // getBookDownloadUrl and the Flutter reader check, and changing it would need
  // an app release.
  batch.set(
    purchaseRef,
    {
      status: 'completed',
      providerStatus: verification.status || 'success',
      purchasedAt: paidAtDate,
      gatewayResponse: verification.gateway_response || '',
      channel: verification.channel || '',
      paidAt: verification.paid_at || verification.paidAt || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // `transactions/{reference}` is the immutable money record, one row per
  // completed sale, carrying the split as it stood at this moment. Only
  // completed sales are ever written here, so the "pending counted as revenue"
  // defect cannot recur.
  batch.set(
    db.collection('transactions').doc(reference),
    {
      id: reference,
      bookId,
      bookTitle: purchase.bookTitle || '',
      buyerUserId: uid,
      authorUserId: purchase.ownerUserId || '',
      currency: purchase.currency || 'GHS',
      ...split,
      provider: 'paystack',
      providerReference: reference,
      channel: verification.channel || '',
      countryCode: (verification.authorization && verification.authorization.country_code) || '',
      occurredAt: paidAtDate,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();
  return { settled: true };
}

async function getPurchaseDoc(uid, bookId) {
  const ref = db.collection('purchases').doc(`${uid}_${bookId}`);
  const snap = await ref.get();
  return { ref, snap };
}

exports.initializePaystackCheckout = functions
  .region('us-central1')
  .runWith({ serviceAccount: FUNCTIONS_SERVICE_ACCOUNT, secrets: ['PAYSTACK_SECRET_KEY'] })
  .https.onRequest(async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const decodedToken = await authenticateRequest(req);
      const uid = decodedToken.uid;
      const email =
        decodedToken.email ||
        (await admin.auth().getUser(uid)).email ||
        '';

      if (!email) {
        return res.status(400).json({ error: 'Authenticated user has no email address' });
      }

      const bookId = String(req.body?.bookId || '').trim();
      if (!bookId) {
        return res.status(400).json({ error: 'bookId is required' });
      }

      const bookSnap = await db.collection('epubs').doc(bookId).get();
      if (!bookSnap.exists) {
        return res.status(404).json({ error: 'Book not found' });
      }

      const book = bookSnap.data() || {};
      if (book.isPublished !== true) {
        return res.status(400).json({ error: 'Book is not published' });
      }

      const price = typeof book.price === 'number' ? book.price : Number(book.price || 0);
      if (book.isFree === true || price <= 0) {
        return res.status(400).json({ error: 'Free books do not require checkout' });
      }

      const { ref: purchaseRef, snap: purchaseSnap } = await getPurchaseDoc(uid, bookId);
      const existingPurchase = purchaseSnap.exists ? purchaseSnap.data() || {} : {};

      if (existingPurchase.status === 'completed') {
        return res.status(409).json({ error: 'Book already purchased' });
      }

      const amountInPesewas = Math.round(price * 100);
      // Read ONCE, here, at the moment the reader commits to a price, and
      // frozen onto the purchase below. Never read again at verification or
      // payout.
      const checkoutTerms = await currentTermsFor(book);
      const reference = `WOLLY_${bookId}_${Date.now()}`;
      const callbackUrl = `${PAYMENT_CALLBACK_URL}?bookId=${encodeURIComponent(
        bookId
      )}&reference=${encodeURIComponent(reference)}`;

      const paystackData = await callPaystack('/transaction/initialize', {
        method: 'POST',
        body: JSON.stringify({
          email,
          amount: amountInPesewas,
          currency: 'GHS',
          reference,
          callback_url: callbackUrl,
          metadata: {
            // `kind` is the contract with services/api's webhook, which drops
            // book events with `if (meta.kind === 'book') return;` so the two do
            // not both write the same purchase. Nothing was setting it, so that
            // guard never fired and book events fell through to the
            // subscription handler, which discarded them for want of a
            // publicationId. The comment described an agreement only one side
            // had ever heard of.
            kind: 'book',
            userId: uid,
            bookId,
            bookTitle: typeof book.title === 'string' ? book.title : 'Unknown Book',
          },
        }),
      });

      await purchaseRef.set(
        {
          userId: uid,
          bookId,
          bookTitle: typeof book.title === 'string' ? book.title : 'Unknown Book',
          ownerUserId: typeof book.ownerUserId === 'string' ? book.ownerUserId : '',
          reference,
          amountInPesewas,
          currency: 'GHS',
          status: 'pending',
          // Frozen here, not read at report time. The reader is committing to a
          // price now, so the terms in force now are the ones that apply. Staff
          // changing the platform terms later must not rewrite this sale.
          authorShare: checkoutTerms.authorShare,
          revenueBasis: checkoutTerms.basis,
          launchedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return res.json({
        authorizationUrl: paystackData.authorization_url,
        accessCode: paystackData.access_code,
        reference,
      });
    } catch (error) {
      console.error('initializePaystackCheckout failed:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to initialize checkout',
      });
    }
  });

exports.verifyPaystackPayment = functions
  .region('us-central1')
  .runWith({ serviceAccount: FUNCTIONS_SERVICE_ACCOUNT, secrets: ['PAYSTACK_SECRET_KEY'] })
  .https.onRequest(async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const decodedToken = await authenticateRequest(req);
      const uid = decodedToken.uid;
      const bookId = String(req.body?.bookId || '').trim();
      const reference = String(req.body?.reference || '').trim();

      if (!bookId || !reference) {
        return res.status(400).json({ error: 'bookId and reference are required' });
      }

      const { ref: purchaseRef, snap: purchaseSnap } = await getPurchaseDoc(uid, bookId);
      if (!purchaseSnap.exists) {
        return res.status(404).json({ error: 'No pending purchase found' });
      }

      const purchase = purchaseSnap.data() || {};
      if (purchase.reference !== reference) {
        return res.status(400).json({ error: 'Reference does not match pending purchase' });
      }

      if (purchase.status === 'completed') {
        return res.json({ success: true, status: 'completed' });
      }

      const verification = await callPaystack(
        `/transaction/verify/${encodeURIComponent(reference)}`,
        { method: 'GET' }
      );

      if (verification.status !== 'success') {
        // PAYSTACK'S STATUS IS NOT WOLLY'S STATUS, and writing one onto the
        // other was a real defect: `ongoing` (the reader is still entering a
        // mobile-money OTP) became the purchase's own status, which is not even
        // a value PurchaseStatus contains. Worse, it moved a live sale out of
        // `pending` while the reader was still paying, and `pending` is the set
        // anything reconciling unfinished sales looks at. Checking on a purchase
        // could remove it from the only thing that would have completed it.
        //
        // So the lifecycle leaves `pending` ONLY for something terminal.
        // Everything else stays pending and gets looked at again, which is the
        // safe direction to be wrong in: a stuck sale is recoverable, a sale
        // nothing is watching is not.
        await purchaseRef.set(
          {
            status: TERMINAL_PROVIDER_STATUS[verification.status] || 'pending',
            providerStatus: verification.status || 'unknown',
            gatewayResponse: verification.gateway_response || '',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        return res.status(402).json({
          error: 'Payment has not been completed successfully',
          status: verification.status || 'unknown',
        });
      }

      const outcome = await settlePurchase({
        purchaseRef,
        uid,
        bookId,
        reference,
        purchase,
        verification,
      });
      if (!outcome.settled) {
        return res.status(400).json({ error: 'Verified amount does not match expected amount' });
      }

      return res.json({ success: true, status: 'completed' });
    } catch (error) {
      console.error('verifyPaystackPayment failed:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to verify payment',
      });
    }
  });

/**
 * Settles sales the reader never came back to confirm.
 *
 * WHY THIS EXISTS. Until now a book purchase completed in exactly one way: the
 * client returned from Paystack and called `verifyPaystackPayment`. Nothing
 * else ever finished a sale. So a reader who closed the tab, lost signal, or
 * whose app was killed on the way back had paid Paystack and had no book, and
 * nothing anywhere would ever notice. Zero purchases have completed on this
 * platform, which is the only reason that has not already happened to someone.
 *
 * It also unblocks the web. The Paystack callback is `wolly://payment-callback`,
 * a mobile deep link a browser cannot follow, so a web reader could never have
 * completed a purchase at all. With this running, coming back is an
 * optimisation rather than the mechanism.
 *
 * SCHEDULED, NOT A WEBHOOK, and deliberately. Paystack allows one webhook URL
 * per integration and `services/api` already owns it for subscriptions;
 * completing books there would mean a third copy of the money split in a
 * codebase that cannot import the schema. A schedule needs no metadata
 * contract, lives beside the settlement logic it calls, catches sales a missed
 * webhook would have dropped, and is self-healing: if a run fails, the next one
 * picks the same purchases up.
 *
 * us-central1 to sit with the rest of this codebase, which also keeps it off
 * the europe-west2 Cloud Run CPU quota that the other twelve services share.
 */

/** Give the reader time to finish paying and for the client to do its own verify. */
const RECONCILE_MIN_AGE_MS = 10 * 60 * 1000;
/**
 * Past this, a pending purchase is written off as abandoned.
 *
 * Not a guess about Paystack: it is how long Wolly keeps asking. A sale nobody
 * completed in a week is not going to complete, and leaving it pending for ever
 * means the query grows without bound and the real stuck sales get harder to
 * see.
 */
const RECONCILE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** Bounded so one run cannot become an unbounded Paystack fan-out. */
const RECONCILE_BATCH = 50;

exports.reconcilePendingPurchases = functions
  .region('us-central1')
  .runWith({ serviceAccount: FUNCTIONS_SERVICE_ACCOUNT, secrets: ['PAYSTACK_SECRET_KEY'] })
  .pubsub.schedule('every 15 minutes')
  .onRun(async () => {
    const now = Date.now();
    const olderThan = admin.firestore.Timestamp.fromMillis(now - RECONCILE_MIN_AGE_MS);

    const stuck = await db
      .collection('purchases')
      .where('status', '==', 'pending')
      .where('launchedAt', '<', olderThan)
      .orderBy('launchedAt')
      .limit(RECONCILE_BATCH)
      .get();

    if (stuck.empty) {
      console.log('reconcilePendingPurchases: nothing pending');
      return null;
    }

    let settled = 0;
    let abandoned = 0;
    let stillPending = 0;
    let failed = 0;

    for (const doc of stuck.docs) {
      const purchase = doc.data() || {};
      const reference = String(purchase.reference || '');
      const uid = String(purchase.userId || '');
      const bookId = String(purchase.bookId || '');

      try {
        if (!reference || !uid || !bookId) {
          // Nothing to verify against. Left alone rather than guessed at: a
          // malformed row is a bug to look at, not a sale to write off.
          console.warn(`reconcile: ${doc.id} has no reference/userId/bookId`);
          stillPending += 1;
          continue;
        }

        const launchedMs = purchase.launchedAt?.toMillis?.() ?? 0;
        if (launchedMs && now - launchedMs > RECONCILE_MAX_AGE_MS) {
          await doc.ref.set(
            {
              status: 'abandoned',
              providerStatus: purchase.providerStatus || 'unreconciled',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          abandoned += 1;
          continue;
        }

        const verification = await callPaystack(
          `/transaction/verify/${encodeURIComponent(reference)}`,
          { method: 'GET' }
        );

        if (verification.status === 'success') {
          const outcome = await settlePurchase({
            purchaseRef: doc.ref,
            uid,
            bookId,
            reference,
            purchase,
            verification,
          });
          if (outcome.settled) {
            settled += 1;
            // Loud on purpose: money arriving that the reader never confirmed
            // is the case this function exists for, and it should be visible in
            // the logs rather than inferred from a counter.
            console.log(
              `reconcile: settled ${doc.id} (${reference}) that the reader never confirmed`
            );
          } else {
            failed += 1;
            console.error(`reconcile: refused to settle ${doc.id}: ${JSON.stringify(outcome)}`);
          }
          continue;
        }

        const terminal = TERMINAL_PROVIDER_STATUS[verification.status];
        await doc.ref.set(
          {
            // Same rule as the client-facing verify: leave `pending` only for
            // something terminal, so a reader still paying is looked at again.
            status: terminal || 'pending',
            providerStatus: verification.status || 'unknown',
            gatewayResponse: verification.gateway_response || '',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        if (terminal) failed += 1;
        else stillPending += 1;
      } catch (error) {
        // One bad purchase must not end the run: the next one may be a reader
        // who paid and is waiting.
        failed += 1;
        console.error(`reconcile: ${doc.id} failed:`, error);
      }
    }

    console.log(
      `reconcilePendingPurchases: ${stuck.size} examined, ${settled} settled, ` +
        `${abandoned} abandoned, ${stillPending} still pending, ${failed} failed`
    );
    return null;
  });
