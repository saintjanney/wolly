import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PostCard } from '@/components/PostCard';
import {
  getPublicationBySlug,
  listPublishedPosts,
  normaliseHandle,
  publicationUrl,
} from '@/lib/blog-data';

// Revalidate hourly; a publish also purges via the post's own cache tag.
export const revalidate = 3600;

type Params = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const slug = normaliseHandle((await params).handle);
  if (!slug) return {};
  const publication = await getPublicationBySlug(slug);
  if (!publication) return {};

  return {
    title: publication.name,
    description: publication.tagline ?? publication.description ?? undefined,
    alternates: {
      canonical: publicationUrl(publication.slug),
      types: {
        'application/rss+xml': `${publicationUrl(publication.slug)}/rss.xml`,
      },
    },
    openGraph: {
      type: 'website',
      title: publication.name,
      description: publication.tagline ?? undefined,
      url: publicationUrl(publication.slug),
      images: publication.coverImageUrl ? [publication.coverImageUrl] : undefined,
    },
  };
}

export default async function PublicationHome({ params }: Params) {
  const slug = normaliseHandle((await params).handle);
  if (!slug) notFound();

  const publication = await getPublicationBySlug(slug);
  if (!publication) notFound();

  const posts = await listPublishedPosts(publication.id, 20);

  return (
    <div className="mx-auto max-w-3xl px-5">
      <header className="py-12 border-b border-[var(--wolly-rule)]">
        <h1 className="text-4xl font-bold tracking-tight">{publication.name}</h1>
        {publication.tagline ? (
          <p className="mt-3 text-lg text-[var(--wolly-muted)]">{publication.tagline}</p>
        ) : null}

        <div className="mt-6 flex items-center gap-3">
          <Link
            href={`/@${publication.slug}/subscribe`}
            className="rounded-lg bg-[var(--wolly-accent)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            Subscribe
          </Link>
          <Link
            href={`/@${publication.slug}/archive`}
            className="text-sm text-[var(--wolly-muted)] hover:text-[var(--wolly-ink)]"
          >
            Archive
          </Link>
        </div>
      </header>

      <section>
        {posts.length === 0 ? (
          <p className="py-16 text-center text-[var(--wolly-muted)]">
            No posts yet.
          </p>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </section>
    </div>
  );
}
