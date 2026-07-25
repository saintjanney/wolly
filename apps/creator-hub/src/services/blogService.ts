import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { auth, db, functions } from '@/lib/firebase';
import {
  COLLECTIONS,
  SUBCOLLECTIONS,
  type BlogPost,
  type Publication,
} from '@wolly/schema';

/**
 * Blog authoring for the creator-hub.
 *
 * Writes split in two, deliberately:
 *
 *  - DRAFTS go straight to Firestore under owner-scoped security rules. The
 *    composer autosaves constantly and should not need a round-trip.
 *  - PUBLISHING goes through the `publishPost` callable in services/api.
 *
 * That split exists because apps/blog injects a post's stored HTML with
 * dangerouslySetInnerHTML on an origin shared by every publication. Security
 * rules refuse any client write containing `html` or `plainText`, so this file
 * *cannot* write rendered HTML even if it tried; the callable is the only
 * writer. See BLOG_SPEC.md and services/api/src/render.ts.
 */

/** The composer's TipTap document. Opaque here; services/api renders it. */
export type ComposerDoc = Record<string, unknown>;

export interface PublishResult {
  ok: boolean;
  slug: string;
  hasPaywall: boolean;
  wordCount: number;
  status: 'published' | 'scheduled';
  url: string | null;
}

/** Draft body lives in its own segment, readable only by the post's owner. */
const DRAFT_SEGMENT = 'draft';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

export class BlogService {
  // ── Publications ─────────────────────────────────────────────────────────

  /** The creator's publication, or null if they have not started one. */
  static async getMyPublication(userId: string): Promise<Publication | null> {
    const snap = await getDocs(
      query(
        collection(db, COLLECTIONS.PUBLICATIONS),
        where('ownerUserId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(1),
      ),
    );
    if (snap.empty) return null;
    return { ...(snap.docs[0].data() as Publication), id: snap.docs[0].id };
  }

  /** Whether a handle is free. Advisory only; the transaction is the real check. */
  static async isHandleAvailable(handle: string): Promise<boolean> {
    const slug = slugify(handle);
    if (slug.length < 3) return false;
    const reservation = await getDoc(doc(db, COLLECTIONS.PUBLICATION_SLUGS, slug));
    return !reservation.exists();
  }

  /**
   * Creates a publication and reserves its handle atomically.
   *
   * Firestore has no unique constraint, so uniqueness is a document in
   * `publication_slugs` keyed by the handle, written in the same transaction.
   * A second creator racing for the same handle loses at commit rather than
   * silently taking a duplicate.
   */
  static async createPublication(
    userId: string,
    input: { name: string; handle: string; tagline?: string; currency?: string },
  ): Promise<Publication> {
    const slug = slugify(input.handle);
    if (slug.length < 3) {
      throw new Error('Handle must be at least 3 characters (letters and numbers).');
    }

    const pubRef = doc(collection(db, COLLECTIONS.PUBLICATIONS));
    const slugRef = doc(db, COLLECTIONS.PUBLICATION_SLUGS, slug);

    await runTransaction(db, async (tx) => {
      if ((await tx.get(slugRef)).exists()) {
        throw new Error(`@${slug} is already taken.`);
      }

      tx.set(pubRef, {
        slug,
        ownerUserId: userId,
        name: input.name.trim(),
        tagline: input.tagline?.trim() ?? '',
        paidEnabled: false,
        currency: input.currency ?? 'GHS',
        commentAccess: 'subscribers',
        // Counters are server-maintained; rules require they start at zero.
        subscriberCount: 0,
        paidSubscriberCount: 0,
        postCount: 0,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      tx.set(slugRef, {
        publicationId: pubRef.id,
        ownerUserId: userId,
        createdAt: serverTimestamp(),
      });
    });

    const created = await getDoc(pubRef);
    return { ...(created.data() as Publication), id: pubRef.id };
  }

  /**
   * Updates publication settings.
   *
   * `slug`, `ownerUserId` and the three counters are stripped: security rules
   * reject writes that change them, so sending them would fail the whole
   * update rather than be ignored.
   */
  static async updatePublication(
    publicationId: string,
    updates: Partial<Publication>,
  ): Promise<void> {
    const IMMUTABLE = new Set([
      'id',
      'slug',
      'ownerUserId',
      'subscriberCount',
      'paidSubscriberCount',
      'postCount',
    ]);

    const safe = Object.fromEntries(
      Object.entries(updates).filter(([key]) => !IMMUTABLE.has(key)),
    );

    await updateDoc(doc(db, COLLECTIONS.PUBLICATIONS, publicationId), {
      ...safe,
      updatedAt: serverTimestamp(),
    });
  }

  // ── Posts ────────────────────────────────────────────────────────────────

  /**
   * The creator's posts, newest first.
   *
   * Filtered by `ownerUserId`, not `publicationId`. Firestore evaluates rules
   * for a `list` query against the query itself, so the query has to make one
   * of the `allow read` clauses provable. Filtering by owner matches the
   * `isOwner(resource.data.ownerUserId)` clause and so returns drafts too;
   * filtering only by publication proved nothing and was permission-denied.
   *
   * The publication filter is applied in memory. A creator has one publication
   * today, so this narrows nothing, and it stays correct if that changes.
   */
  static async listPosts(publicationId: string): Promise<BlogPost[]> {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    const snap = await getDocs(
      query(
        collection(db, COLLECTIONS.POSTS),
        where('ownerUserId', '==', userId),
        orderBy('updatedAt', 'desc'),
      ),
    );

    return snap.docs
      .map((d) => ({ ...(d.data() as BlogPost), id: d.id }))
      .filter((p) => p.publicationId === publicationId);
  }

  static async getPost(postId: string): Promise<BlogPost | null> {
    const snap = await getDoc(doc(db, COLLECTIONS.POSTS, postId));
    return snap.exists() ? { ...(snap.data() as BlogPost), id: snap.id } : null;
  }

  /** Creates an empty draft and returns its id. */
  static async createDraft(
    publication: Pick<Publication, 'id' | 'slug'>,
    author: { userId: string; name: string; avatarUrl?: string | null },
    title = 'Untitled',
  ): Promise<string> {
    const postRef = doc(collection(db, COLLECTIONS.POSTS));

    await setDoc(postRef, {
      publicationId: publication.id,
      publicationSlug: publication.slug,
      ownerUserId: author.userId,
      authorName: author.name,
      authorAvatarUrl: author.avatarUrl ?? null,
      type: 'article',
      title,
      subtitle: null,
      slug: slugify(title) || 'untitled',
      excerpt: '',
      coverImageUrl: null,
      visibility: 'public',
      hasPaywall: false,
      status: 'draft',
      // Rules require a new post to start not publicly readable; only the
      // publish callable may flip this.
      isPubliclyReadable: false,
      publishAt: null,
      publishedAt: null,
      tags: [],
      wordCount: 0,
      readingTimeMinutes: 0,
      contentVersion: 0,
      sendAsNewsletter: false,
      // Rules require these start at zero; they are server-maintained after.
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      reportCount: 0,
      moderationStatus: 'ok',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return postRef.id;
  }

  /**
   * Saves composer state. Called on autosave, so it is deliberately cheap.
   *
   * The body is written to a `draft` segment rather than `free`/`paid`: those
   * two are the published, server-rendered output, and the split between them
   * only happens at publish time. Only the post's owner can read `draft`.
   */
  static async saveDraft(
    postId: string,
    patch: {
      title?: string;
      subtitle?: string | null;
      excerpt?: string;
      coverImageUrl?: string | null;
      coverImageAlt?: string | null;
      genre?: string;
      tags?: string[];
      visibility?: BlogPost['visibility'];
      sendAsNewsletter?: boolean;
      doc?: ComposerDoc;
    },
  ): Promise<void> {
    const { doc: body, ...meta } = patch;

    if (Object.keys(meta).length > 0) {
      await updateDoc(doc(db, COLLECTIONS.POSTS, postId), {
        ...meta,
        updatedAt: serverTimestamp(),
      });
    }

    if (body) {
      await setDoc(
        doc(db, COLLECTIONS.POSTS, postId, SUBCOLLECTIONS.CONTENT, DRAFT_SEGMENT),
        {
          segment: DRAFT_SEGMENT,
          format: 'tiptap-json-v1',
          doc: body,
          updatedAt: serverTimestamp(),
        },
        // No `html` or `plainText`: security rules reject client writes that
        // include either, and only services/api may produce them.
        { merge: true },
      );
    }
  }

  /** Loads the saved composer document, or null for a post never edited. */
  static async getDraftDoc(postId: string): Promise<ComposerDoc | null> {
    const snap = await getDoc(
      doc(db, COLLECTIONS.POSTS, postId, SUBCOLLECTIONS.CONTENT, DRAFT_SEGMENT),
    );
    return snap.exists() ? ((snap.data().doc as ComposerDoc) ?? null) : null;
  }

  /**
   * Publishes, via the server.
   *
   * The document is sent with the call rather than read from the draft, so what
   * the author sees in the composer is exactly what gets rendered. The server
   * splits it at the paywall marker, renders and sanitises the HTML, derives
   * the excerpt, word count and reading time, and resolves slug uniqueness.
   */
  static async publish(
    postId: string,
    body: ComposerDoc,
    options: { excerpt?: string; slug?: string; publishAt?: Date | null } = {},
  ): Promise<PublishResult> {
    const call = httpsCallable<
      {
        postId: string;
        doc: ComposerDoc;
        excerpt?: string;
        slug?: string;
        publishAt?: number | null;
      },
      PublishResult
    >(functions, 'publishPost');

    const result = await call({
      postId,
      doc: body,
      excerpt: options.excerpt,
      slug: options.slug,
      publishAt: options.publishAt ? options.publishAt.getTime() : null,
    });

    return result.data;
  }

  /**
   * Takes a post off the site without deleting it.
   *
   * Content documents are left alone: republishing should not require the
   * author to re-render, and nothing reads them while status is `draft`.
   */
  static async unpublish(postId: string): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.POSTS, postId), {
      status: 'draft',
      updatedAt: serverTimestamp(),
    });
  }

  /** Deletes a post and its content segments. */
  static async deletePost(postId: string): Promise<void> {
    const segments = await getDocs(
      collection(db, COLLECTIONS.POSTS, postId, SUBCOLLECTIONS.CONTENT),
    );
    await Promise.all(segments.docs.map((s) => deleteDoc(s.ref)));
    await deleteDoc(doc(db, COLLECTIONS.POSTS, postId));
  }
}
