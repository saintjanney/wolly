import 'server-only';

import {
  COLLECTIONS,
  SUBCOLLECTIONS,
  resolvePostAccess,
  subscriptionId,
  type BlogPost,
  type PostAccess,
  type PostContent,
  type Publication,
  type Subscription,
} from '@wolly/schema';

import { adminDb } from './firebase-admin';

/** Strips the leading `@` from a URL handle. `/@ama` → `ama`. */
export function normaliseHandle(raw: string): string | null {
  const decoded = decodeURIComponent(raw);
  if (!decoded.startsWith('@')) return null;
  const slug = decoded.slice(1).toLowerCase();
  // Same shape the creator-hub enforces when reserving a slug.
  return /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug) ? slug : null;
}

/** Builds the canonical public URL for a post. */
export function postUrl(publicationSlug: string, postSlug: string): string {
  return `${siteOrigin()}/@${publicationSlug}/${postSlug}`;
}

export function publicationUrl(publicationSlug: string): string {
  return `${siteOrigin()}/@${publicationSlug}`;
}

export function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_ORIGIN ?? 'https://wolly-blog.web.app';
}

/**
 * Runs a listing query, tolerating failure ONLY during `next build`.
 *
 * Pages like the homepage and /discover are prerendered at build time, which
 * makes the build depend on Firestore being reachable and correctly indexed. A
 * deploy should not fail because of a transient database problem, so at build
 * time we log and fall back to an empty list; ISR replaces it with real data on
 * the first revalidation.
 *
 * At RUNTIME the error propagates untouched. Silently serving an empty page
 * forever would hide a real outage, and a missing index is exactly the kind of
 * fault that must be loud.
 */
async function listOrEmptyAtBuild<T>(
  label: string,
  run: () => Promise<T[]>,
): Promise<T[]> {
  try {
    return await run();
  } catch (error) {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      console.warn(
        `[blog] ${label} failed during build, falling back to empty list. ` +
          `This resolves on the first revalidation once Firestore is reachable ` +
          `and the composite indexes in packages/firebase-config/firestore.indexes.json ` +
          `are deployed. Cause: ${(error as Error).message}`,
      );
      return [];
    }
    throw error;
  }
}

// ── Publications ───────────────────────────────────────────────────────────

export async function getPublicationBySlug(slug: string): Promise<Publication | null> {
  const snap = await adminDb()
    .collection(COLLECTIONS.PUBLICATIONS)
    .where('slug', '==', slug)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (snap.empty) return null;
  return { ...(snap.docs[0].data() as Publication), id: snap.docs[0].id };
}

export async function listPublications(limit = 100): Promise<Publication[]> {
  return listOrEmptyAtBuild('listPublications', async () => {
    const snap = await adminDb()
      .collection(COLLECTIONS.PUBLICATIONS)
      .where('status', '==', 'active')
      .limit(limit)
      .get();
    return snap.docs.map((d) => ({ ...(d.data() as Publication), id: d.id }));
  });
}

// ── Posts ──────────────────────────────────────────────────────────────────

/**
 * Published posts for a publication, newest first.
 *
 * `unlisted` posts are reachable by direct link but deliberately excluded here,
 * so they stay out of the homepage, the archive, the RSS feed and the sitemap.
 */
export async function listPublishedPosts(
  publicationId: string,
  limit = 20,
): Promise<BlogPost[]> {
  return listOrEmptyAtBuild('listPublishedPosts', async () => {
    const snap = await adminDb()
      .collection(COLLECTIONS.POSTS)
      .where('publicationId', '==', publicationId)
      .where('status', '==', 'published')
      .orderBy('publishedAt', 'desc')
      .limit(limit)
      .get();

    return snap.docs
      .map((d) => ({ ...(d.data() as BlogPost), id: d.id }))
      .filter((p) => p.moderationStatus !== 'removed');
  });
}

export async function getPostBySlug(
  publicationId: string,
  slug: string,
): Promise<BlogPost | null> {
  const snap = await adminDb()
    .collection(COLLECTIONS.POSTS)
    .where('publicationId', '==', publicationId)
    .where('slug', '==', slug)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const post = { ...(snap.docs[0].data() as BlogPost), id: snap.docs[0].id };

  // Drafts, scheduled posts and removed posts are not public.
  if (post.status !== 'published' && post.status !== 'unlisted') return null;
  if (post.moderationStatus === 'removed') return null;
  return post;
}

/** Newest published posts across every publication, for /discover. */
export async function listRecentPosts(limit = 30): Promise<BlogPost[]> {
  return listOrEmptyAtBuild('listRecentPosts', async () => {
    const snap = await adminDb()
      .collection(COLLECTIONS.POSTS)
      .where('status', '==', 'published')
      .orderBy('publishedAt', 'desc')
      .limit(limit)
      .get();

    return snap.docs
      .map((d) => ({ ...(d.data() as BlogPost), id: d.id }))
      .filter((p) => p.moderationStatus !== 'removed');
  });
}

// ── Post body, and the paywall ─────────────────────────────────────────────

export interface RenderablePost {
  post: BlogPost;
  /** Always present for a readable post. */
  freeHtml: string;
  /** Present only when the viewer has paid access. Never sent otherwise. */
  paidHtml: string | null;
  access: PostAccess;
  /** True when a paid segment exists that this viewer may not read. */
  showPaywall: boolean;
}

async function getSubscription(
  viewerUserId: string | null,
  publicationId: string,
): Promise<Subscription | null> {
  if (!viewerUserId) return null;
  const doc = await adminDb()
    .collection(COLLECTIONS.SUBSCRIPTIONS)
    .doc(subscriptionId(viewerUserId, publicationId))
    .get();
  return doc.exists ? (doc.data() as Subscription) : null;
}

async function getSegment(
  postId: string,
  segment: 'free' | 'paid',
): Promise<PostContent | null> {
  const doc = await adminDb()
    .collection(COLLECTIONS.POSTS)
    .doc(postId)
    .collection(SUBCOLLECTIONS.CONTENT)
    .doc(segment)
    .get();
  return doc.exists ? (doc.data() as PostContent) : null;
}

/**
 * Loads a post's body for a specific viewer, applying the paywall.
 *
 * This is THE enforcement point for the website. Admin SDK reads bypass
 * security rules, so the decision is made here, by the same
 * `resolvePostAccess()` the rules mirror for the mobile app. The paid segment
 * is fetched only after access has been granted, so paid HTML cannot leak into
 * the response by accident.
 */
export async function loadPostForViewer(
  post: BlogPost,
  viewerUserId: string | null,
): Promise<RenderablePost> {
  const subscription = await getSubscription(viewerUserId, post.publicationId);
  const access = resolvePostAccess(post, subscription, viewerUserId);

  const free = access.canReadFree ? await getSegment(post.id, 'free') : null;
  const paid =
    post.hasPaywall && access.canReadPaid ? await getSegment(post.id, 'paid') : null;

  return {
    post,
    freeHtml: free?.html ?? '',
    paidHtml: paid?.html ?? null,
    access,
    showPaywall: post.hasPaywall && !access.canReadPaid,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Firestore Timestamps arrive as objects; normalise for rendering. */
export function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const fn = (value as { toDate: unknown }).toDate;
    if (typeof fn === 'function') return (value as { toDate(): Date }).toDate();
  }
  return null;
}

export function formatDate(value: unknown): string {
  const d = toDate(value);
  if (!d) return '';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
