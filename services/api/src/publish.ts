import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

import {
  countWords,
  deriveExcerpt,
  readingTimeMinutes,
  renderToHtml,
  renderToPlainText,
  slugify,
  splitAtPaywall,
  type ProseMirrorDoc,
} from './render';

const REGION = 'europe-west2';

const POSTS = 'posts';
const PUBLICATIONS = 'publications';
const CONTENT = 'content';

interface PublishRequest {
  postId: string;
  /** The composer's current document. Authoritative; the stored draft is not trusted. */
  doc: ProseMirrorDoc;
  /** Author-supplied excerpt. Derived from the free body when absent. */
  excerpt?: string;
  /** Defaults to a slug of the title, de-duplicated within the publication. */
  slug?: string;
  /** When set and in the future, the post is scheduled rather than published. */
  publishAt?: number | null;
}

/**
 * Publishes a post.
 *
 * This is the ONLY writer of `posts/{id}/content/{segment}.html`. Security
 * rules reject any client write containing `html` or `plainText`, so the HTML
 * the blog renders with `dangerouslySetInnerHTML` can only ever have come from
 * `renderToHtml()` and its allowlist. Drafts still write straight to Firestore
 * from the creator-hub; only publishing comes through here.
 *
 * A callable rather than an HTTP endpoint so that auth and CORS are handled by
 * the SDK: the creator-hub and this function are on different origins, and
 * hand-rolling token verification and preflight is where those go subtly wrong.
 */
export const publishPost = onCall(
  { region: REGION, cors: true, enforceAppCheck: false },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Sign in to publish.');
    }

    const { postId, doc, excerpt, slug, publishAt } = (request.data ?? {}) as PublishRequest;

    if (typeof postId !== 'string' || !postId) {
      throw new HttpsError('invalid-argument', 'postId is required.');
    }
    if (!doc || typeof doc !== 'object') {
      throw new HttpsError('invalid-argument', 'doc is required.');
    }

    const db = getFirestore();
    const postRef = db.collection(POSTS).doc(postId);
    const postSnap = await postRef.get();

    if (!postSnap.exists) {
      throw new HttpsError('not-found', 'Post not found.');
    }

    const post = postSnap.data() as {
      ownerUserId?: string;
      publicationId?: string;
      title?: string;
      slug?: string;
      contentVersion?: number;
    };

    // Ownership is checked here because the Admin SDK bypasses security rules.
    if (post.ownerUserId !== uid) {
      throw new HttpsError('permission-denied', 'You do not own this post.');
    }

    const publicationId = post.publicationId;
    if (!publicationId) {
      throw new HttpsError('failed-precondition', 'Post has no publication.');
    }

    const pubSnap = await db.collection(PUBLICATIONS).doc(publicationId).get();
    if (!pubSnap.exists || pubSnap.data()?.ownerUserId !== uid) {
      throw new HttpsError('permission-denied', 'You do not own this publication.');
    }
    const publicationSlug = pubSnap.data()?.slug as string | undefined;

    // ── Render ─────────────────────────────────────────────────────────────
    const { free, paid } = splitAtPaywall(doc);

    const freePlain = renderToPlainText(free);
    const freeHtml = renderToHtml(free);
    const paidPlain = paid ? renderToPlainText(paid) : '';
    const paidHtml = paid ? renderToHtml(paid) : '';

    // A post whose paid half renders to nothing has no paywall, whatever the
    // composer thought: an empty paid document would show readers a paywall
    // guarding nothing.
    const hasPaywall = Boolean(paid) && paidHtml.trim().length > 0;

    const wordCount = countWords(`${freePlain} ${paidPlain}`);

    if (!freeHtml.trim() && !paidHtml.trim()) {
      throw new HttpsError('invalid-argument', 'Cannot publish an empty post.');
    }

    // Firestore caps a document at 1 MiB. Fail loudly rather than write a
    // truncated post.
    for (const [label, html] of [['free', freeHtml], ['paid', paidHtml]] as const) {
      if (Buffer.byteLength(html, 'utf8') > 900_000) {
        throw new HttpsError(
          'invalid-argument',
          `The ${label} half of this post is too long to store. Split it into several posts.`,
        );
      }
    }

    // ── Slug ───────────────────────────────────────────────────────────────
    const desired = slugify(slug || post.slug || post.title || 'post');
    const finalSlug = await uniqueSlug(db, publicationId, postId, desired);

    // ── Status ─────────────────────────────────────────────────────────────
    const now = Date.now();
    const scheduled = typeof publishAt === 'number' && publishAt > now;

    const batch = db.batch();

    batch.set(
      postRef.collection(CONTENT).doc('free'),
      {
        segment: 'free',
        format: 'tiptap-json-v1',
        doc: free,
        html: freeHtml,
        plainText: freePlain,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: false },
    );

    if (hasPaywall) {
      batch.set(
        postRef.collection(CONTENT).doc('paid'),
        {
          segment: 'paid',
          format: 'tiptap-json-v1',
          doc: paid,
          html: paidHtml,
          plainText: paidPlain,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: false },
      );
    } else {
      // The author removed the paywall: delete the stale paid document rather
      // than leaving unreachable content behind.
      batch.delete(postRef.collection(CONTENT).doc('paid'));
    }

    batch.update(postRef, {
      slug: finalSlug,
      publicationSlug: publicationSlug ?? null,
      excerpt: (excerpt?.trim() || deriveExcerpt(freePlain)).slice(0, 300),
      hasPaywall,
      wordCount,
      readingTimeMinutes: readingTimeMinutes(wordCount),
      contentVersion: (post.contentVersion ?? 0) + 1,
      status: scheduled ? 'scheduled' : 'published',
      publishAt: scheduled ? new Date(publishAt as number) : null,
      publishedAt: scheduled ? null : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return {
      ok: true,
      slug: finalSlug,
      hasPaywall,
      wordCount,
      status: scheduled ? 'scheduled' : 'published',
      url: publicationSlug ? `/@${publicationSlug}/${finalSlug}` : null,
    };
  },
);

/**
 * Finds a slug unique within the publication, appending -2, -3 and so on.
 *
 * Firestore has no unique constraint, so this is a read-then-write and two
 * simultaneous publishes could in principle collide. At one author per
 * publication that is not a real race; if publications gain co-authors it wants
 * a reservation document like `publication_slugs`.
 */
async function uniqueSlug(
  db: FirebaseFirestore.Firestore,
  publicationId: string,
  postId: string,
  desired: string,
): Promise<string> {
  for (let suffix = 1; suffix <= 50; suffix += 1) {
    const candidate = suffix === 1 ? desired : `${desired}-${suffix}`;
    const clash = await db
      .collection(POSTS)
      .where('publicationId', '==', publicationId)
      .where('slug', '==', candidate)
      .limit(2)
      .get();

    const takenByAnother = clash.docs.some((d) => d.id !== postId);
    if (!takenByAnother) return candidate;
  }
  // Fall back to something guaranteed free rather than looping forever.
  return `${desired}-${postId.slice(0, 6).toLowerCase()}`;
}
