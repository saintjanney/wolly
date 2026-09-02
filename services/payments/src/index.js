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
 * The money split. DUPLICATED FROM `@wolly/schema` (`splitSale`, `royaltyRateFor`).
 *
 * Not imported, deliberately. This codebase is deployed by Firebase, which runs
 * `npm install` inside services/payments at deploy time; an unpublished
 * workspace dependency cannot resolve there. That is the same failure mode that
 * broke the blog's webframeworks deploy. `services/api/test/contract.test.js`
 * asserts this stays identical to the canonical version.
 *
 * All amounts are pesewas. The author's share is of GROSS, because that is the
 * number the pricing screen showed them; Wolly absorbs the processor's fee out
 * of its own share. Rounding is applied once, to the author, and the platform
 * takes the remainder, so the parts always sum back to gross exactly.
 */
function royaltyRateFor(royaltyOption) {
  return royaltyOption === '35%' ? 0.35 : 0.7;
}

function splitSale({ grossMinor, providerFeeMinor, royaltyRate }) {
  const gross = Math.round(grossMinor);
  const providerFee = Math.max(0, Math.round(providerFeeMinor));
  const net = gross - providerFee;
  const authorEarnings = Math.round(gross * royaltyRate);
  return {
    grossMinor: gross,
    providerFeeMinor: providerFee,
    netMinor: net,
    royaltyRate,
    authorEarningsMinor: authorEarnings,
    platformNetMinor: net - authorEarnings,
  };
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
          // price now, so the terms in force now are the ones that apply. An
          // author changing royaltyOption later must not rewrite this sale.
          royaltyRate: royaltyRateFor(book.royaltyOption),
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
        await purchaseRef.set(
          {
            status: verification.status || 'failed',
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

      const expectedAmount = Number(purchase.amountInPesewas || 0);
      if (expectedAmount > 0 && Number(verification.amount || 0) !== expectedAmount) {
        return res.status(400).json({ error: 'Verified amount does not match expected amount' });
      }

      const paidAtDate =
        verification.paid_at || verification.paidAt
          ? admin.firestore.Timestamp.fromDate(
              new Date(verification.paid_at || verification.paidAt)
            )
          : admin.firestore.FieldValue.serverTimestamp();

      // The ledger row and the entitlement are written together.
      //
      // `purchases/{uid}_{bookId}` stays exactly as it was: it is what
      // getBookDownloadUrl and the Flutter reader check, and changing its shape
      // would need an app release. `transactions/{reference}` is the new
      // immutable money record, one row per completed sale, carrying the split
      // as it stood at this moment. Only completed sales are ever written to it,
      // so the "pending counted as revenue" defect cannot recur there.
      //
      // Keyed by the provider reference, which makes a repeated verification
      // idempotent: the same sale overwrites itself rather than double-counting.
      const split = splitSale({
        grossMinor: Number(verification.amount || purchase.amountInPesewas || 0),
        // Paystack reports its own cut in minor units. Previously discarded,
        // which made Wolly's true margin unknowable.
        providerFeeMinor: Number(verification.fees || 0),
        royaltyRate:
          typeof purchase.royaltyRate === 'number'
            ? purchase.royaltyRate
            : royaltyRateFor(undefined),
      });

      const batch = db.batch();

      batch.set(
        purchaseRef,
        {
          status: 'completed',
          purchasedAt: paidAtDate,
          gatewayResponse: verification.gateway_response || '',
          channel: verification.channel || '',
          paidAt: verification.paid_at || verification.paidAt || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

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
          countryCode:
            (verification.authorization && verification.authorization.country_code) || '',
          occurredAt: paidAtDate,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await batch.commit();

      return res.json({ success: true, status: 'completed' });
    } catch (error) {
      console.error('verifyPaystackPayment failed:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to verify payment',
      });
    }
  });
