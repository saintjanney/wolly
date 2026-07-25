import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Paywall } from '@/components/Paywall';
import {
  formatDate,
  getPostBySlug,
  getPublicationBySlug,
  loadPostForViewer,
  normaliseHandle,
  postUrl,
  toDate,
} from '@/lib/blog-data';
import { getViewerUserId } from '@/lib/session';

/**
 * NEVER cache this route.
 *
 * This page renders per-viewer: a paying subscriber gets the paid segment, and
 * everyone else gets the paywall. Under ISR a copy rendered for a subscriber
 * could be served from the shared cache to anyone, which would leak paid content
 * to the whole internet.
 *
 * Reading cookies already forces dynamic rendering in Next 15, so this is
 * belt-and-braces, but a security property should not depend on a framework
 * implementation detail that could change on an upgrade. `force-dynamic` plus
 * `no-store` states the requirement outright.
 *
 * The publication home page and archive keep their ISR: they render only post
 * metadata, which is identical for every viewer.
 */
export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';

type Params = { params: Promise<{ handle: string; postSlug: string }> };

async function resolve(params: Params['params']) {
  const { handle, postSlug } = await params;
  const slug = normaliseHandle(handle);
  if (!slug) return null;
  const publication = await getPublicationBySlug(slug);
  if (!publication) return null;
  const post = await getPostBySlug(publication.id, postSlug);
  if (!post) return null;
  return { publication, post };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const found = await resolve(params);
  if (!found) return {};
  const { publication, post } = found;
  const url = postUrl(publication.slug, post.slug);

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: url },
    // Unlisted posts are reachable by link but should not be indexed.
    robots: post.status === 'unlisted' ? { index: false, follow: false } : undefined,
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      url,
      siteName: publication.name,
      publishedTime: toDate(post.publishedAt)?.toISOString(),
      authors: [post.authorName],
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    },
    twitter: {
      card: post.coverImageUrl ? 'summary_large_image' : 'summary',
      title: post.title,
      description: post.excerpt,
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    },
  };
}

export default async function PostPage({ params }: Params) {
  const found = await resolve(params);
  if (!found) notFound();

  const { publication, post } = found;
  const viewerUserId = await getViewerUserId();
  const { freeHtml, paidHtml, showPaywall } = await loadPostForViewer(post, viewerUserId);

  /**
   * Article JSON-LD. `isAccessibleForFree: false` plus a `hasPart` marking the
   * paywalled section is Google's supported way to declare a paywall. Without
   * it, serving crawlers different content than readers reads as cloaking and
   * risks a penalty.
   */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    datePublished: toDate(post.publishedAt)?.toISOString(),
    dateModified: toDate(post.updatedAt)?.toISOString(),
    author: { '@type': 'Person', name: post.authorName },
    publisher: { '@type': 'Organization', name: publication.name },
    mainEntityOfPage: postUrl(publication.slug, post.slug),
    image: post.coverImageUrl ?? undefined,
    isAccessibleForFree: !post.hasPaywall,
    ...(post.hasPaywall && {
      hasPart: {
        '@type': 'WebPageElement',
        isAccessibleForFree: false,
        cssSelector: '.paywalled-content',
      },
    }),
  };

  return (
    <article className="mx-auto max-w-2xl px-5 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header>
        <Link
          href={`/@${publication.slug}`}
          className="text-sm font-medium text-[var(--wolly-accent)]"
        >
          {publication.name}
        </Link>

        <h1 className="mt-3 text-4xl font-bold tracking-tight leading-[1.15]">
          {post.title}
        </h1>

        {post.subtitle ? (
          <p className="mt-3 text-xl text-[var(--wolly-muted)] leading-snug">
            {post.subtitle}
          </p>
        ) : null}

        <div className="mt-5 flex items-center gap-2 text-sm text-[var(--wolly-muted)]">
          <span>{post.authorName}</span>
          <span aria-hidden>·</span>
          <span>{formatDate(post.publishedAt)}</span>
          <span aria-hidden>·</span>
          <span>{post.readingTimeMinutes} min read</span>
        </div>
      </header>

      {/*
        Plain <img>, not next/image: covers are creator-uploaded Storage URLs of
        unpredictable dimensions, and next/image optimisation would route every
        one through the server for no benefit.
      */}
      {post.coverImageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={post.coverImageUrl}
          alt={post.coverImageAlt ?? ''}
          className="mt-8 w-full rounded-lg"
        />
      ) : null}

      {/*
        Post HTML is rendered and sanitised server-side from the composer's
        TipTap JSON against a closed tag allowlist, and is never accepted raw
        from a client. See BLOG_SPEC.md §5.4.
      */}
      <div
        className="post-body mt-10"
        dangerouslySetInnerHTML={{ __html: freeHtml }}
      />

      {showPaywall ? <Paywall publication={publication} /> : null}

      {paidHtml ? (
        <div
          className="post-body paywalled-content mt-8"
          dangerouslySetInnerHTML={{ __html: paidHtml }}
        />
      ) : null}
    </article>
  );
}
