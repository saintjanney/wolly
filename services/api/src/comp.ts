import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const REGION = 'europe-west2';
const PUBLICATIONS = 'publications';
const SUBSCRIPTIONS = 'subscriptions';

/**
 * Grants a complimentary paid subscription.
 *
 * A real feature, not a test hatch: creators comp reviewers, collaborators and
 * friends, and Substack has the same thing. It is also the honest way to
 * demonstrate paid content without processing a payment, which matters because
 * the alternative, letting a client mark itself paid, is exactly the hole that
 * security rules exist to close.
 *
 * Only the publication's owner may grant one, and only the server writes
 * `isPaid`. From the reader's side a comp is indistinguishable from a purchase,
 * so it exercises the real paywall rather than bypassing it.
 */
export const grantComplimentarySubscription = onCall(
  { region: REGION, cors: true },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.');

    const { publicationId, email, months } = (request.data ?? {}) as {
      publicationId?: string;
      email?: string;
      months?: number;
    };

    if (!publicationId || !email) {
      throw new HttpsError('invalid-argument', 'publicationId and email are required.');
    }

    const monthsGranted = Math.min(Math.max(Math.round(months ?? 12), 1), 24);

    const db = getFirestore();
    const pubSnap = await db.collection(PUBLICATIONS).doc(publicationId).get();
    if (!pubSnap.exists) throw new HttpsError('not-found', 'Publication not found.');

    // Ownership is checked here because the Admin SDK bypasses security rules.
    if (pubSnap.data()?.ownerUserId !== uid) {
      throw new HttpsError('permission-denied', 'You do not own this publication.');
    }

    // Resolve the recipient. They must already have a Wolly account: inventing
    // one from an email would create an account nobody controls.
    let recipient;
    try {
      recipient = await getAuth().getUserByEmail(email.trim().toLowerCase());
    } catch {
      throw new HttpsError(
        'not-found',
        'No Wolly account uses that email. Ask them to sign up first.',
      );
    }

    if (recipient.uid === uid) {
      throw new HttpsError(
        'failed-precondition',
        'You already have full access to your own publication.',
      );
    }

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + monthsGranted);

    await db
      .collection(SUBSCRIPTIONS)
      .doc(`${recipient.uid}_${publicationId}`)
      .set(
        {
          userId: recipient.uid,
          publicationId,
          ownerUserId: uid,
          status: 'active',
          isPaid: true,
          plan: 'complimentary',
          currentPeriodEnd: Timestamp.fromDate(periodEnd),
          // A comp does not renew; it simply lapses.
          cancelAtPeriodEnd: true,
          emailOptIn: true,
          source: 'complimentary',
          grantedBy: uid,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    return {
      ok: true,
      userId: recipient.uid,
      email: recipient.email,
      months: monthsGranted,
      expiresAt: periodEnd.toISOString(),
    };
  },
);
