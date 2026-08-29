import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const REGION = 'europe-west2';

/**
 * Denormalised counters, maintained server-side.
 *
 * Security rules forbid clients from changing `likeCount`, `commentCount`,
 * `subscriberCount` and friends, precisely so a client cannot inflate them. That
 * means something on the server has to keep them true, which is what these
 * triggers do.
 *
 * `FieldValue.increment` is used rather than a recount. At Wolly's scale a
 * single-document counter is fine; a distributed counter only becomes necessary
 * past roughly one write per second on the same document, which is a long way
 * off and not worth the complexity now.
 */

/** Whether a write created, deleted, or merely modified a document. */
function delta(before: boolean, after: boolean): number {
  if (!before && after) return 1;
  if (before && !after) return -1;
  return 0;
}

/** `posts/{postId}/likes/{userId}` -> `posts/{postId}.likeCount` */
export const onLikeWritten = onDocumentWritten(
  { document: 'posts/{postId}/likes/{userId}', region: REGION },
  async (event) => {
    const change = delta(
      event.data?.before.exists ?? false,
      event.data?.after.exists ?? false,
    );
    if (change === 0) return;

    await getFirestore()
      .collection('posts')
      .doc(event.params.postId)
      .update({ likeCount: FieldValue.increment(change) })
      .catch((error) => {
        // A like on a post deleted in the same breath is not worth retrying.
        console.warn('onLikeWritten: could not update likeCount', error.message);
      });
  },
);

/**
 * `posts/{postId}/comments/{id}` -> `posts/{postId}.commentCount`
 *
 * Counts only comments a reader can actually see. Hiding or removing a comment
 * in moderation decrements the count, so the number next to a post matches what
 * is displayed under it.
 */
export const onCommentWritten = onDocumentWritten(
  { document: 'posts/{postId}/comments/{commentId}', region: REGION },
  async (event) => {
    const visible = (snap: { exists: boolean; data?: () => Record<string, unknown> | undefined }) =>
      snap.exists && snap.data?.()?.status === 'visible';

    const change = delta(
      visible(event.data?.before ?? { exists: false }),
      visible(event.data?.after ?? { exists: false }),
    );
    if (change === 0) return;

    await getFirestore()
      .collection('posts')
      .doc(event.params.postId)
      .update({ commentCount: FieldValue.increment(change) })
      .catch((error) => {
        console.warn('onCommentWritten: could not update commentCount', error.message);
      });
  },
);

/**
 * `subscriptions/{id}` -> `publications/{pubId}` subscriber counts.
 *
 * Tracks total and paid separately, because a creator cares about both and the
 * difference between them is the conversion story.
 */
export const onSubscriptionWritten = onDocumentWritten(
  { document: 'subscriptions/{subId}', region: REGION },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    const publicationId = (after?.publicationId ?? before?.publicationId) as
      | string
      | undefined;
    if (!publicationId) return;

    const wasSubscriber = Boolean(before);
    const isSubscriber = Boolean(after);

    // "Paid" means paid AND not lapsed. A subscription whose period has ended
    // should not still be counted as a paying subscriber.
    const paid = (data: Record<string, unknown> | undefined) => {
      if (!data?.isPaid) return false;
      const end = data.currentPeriodEnd as { toMillis?: () => number } | undefined;
      return typeof end?.toMillis === 'function' ? end.toMillis() > Date.now() : false;
    };

    const subscriberChange = delta(wasSubscriber, isSubscriber);
    const paidChange = delta(paid(before), paid(after));
    if (subscriberChange === 0 && paidChange === 0) return;

    const update: Record<string, FieldValue> = {};
    if (subscriberChange !== 0) {
      update.subscriberCount = FieldValue.increment(subscriberChange);
    }
    if (paidChange !== 0) {
      update.paidSubscriberCount = FieldValue.increment(paidChange);
    }

    await getFirestore()
      .collection('publications')
      .doc(publicationId)
      .update(update)
      .catch((error) => {
        console.warn('onSubscriptionWritten: could not update counts', error.message);
      });
  },
);

/** `posts/{postId}` -> `publications/{pubId}.postCount` (published posts only). */
export const onPostWritten = onDocumentWritten(
  { document: 'posts/{postId}', region: REGION },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    const publicationId = (after?.publicationId ?? before?.publicationId) as
      | string
      | undefined;
    if (!publicationId) return;

    const counts = (data: Record<string, unknown> | undefined) =>
      data?.status === 'published';

    const change = delta(counts(before), counts(after));
    if (change === 0) return;

    await getFirestore()
      .collection('publications')
      .doc(publicationId)
      .update({ postCount: FieldValue.increment(change) })
      .catch((error) => {
        console.warn('onPostWritten: could not update postCount', error.message);
      });
  },
);
