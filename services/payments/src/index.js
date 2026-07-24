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

async function getPurchaseDoc(uid, bookId) {
  const ref = db.collection('purchases').doc(`${uid}_${bookId}`);
  const snap = await ref.get();
  return { ref, snap };
}

exports.initializePaystackCheckout = functions
  .region('us-central1')
  .runWith({ serviceAccount: FUNCTIONS_SERVICE_ACCOUNT })
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
  .runWith({ serviceAccount: FUNCTIONS_SERVICE_ACCOUNT })
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

      await purchaseRef.set(
        {
          status: 'completed',
          purchasedAt:
            verification.paid_at || verification.paidAt
              ? admin.firestore.Timestamp.fromDate(
                  new Date(verification.paid_at || verification.paidAt)
                )
              : admin.firestore.FieldValue.serverTimestamp(),
          gatewayResponse: verification.gateway_response || '',
          channel: verification.channel || '',
          paidAt: verification.paid_at || verification.paidAt || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return res.json({ success: true, status: 'completed' });
    } catch (error) {
      console.error('verifyPaystackPayment failed:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to verify payment',
      });
    }
  });
