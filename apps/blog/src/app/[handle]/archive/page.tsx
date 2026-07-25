import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PostCard } from '@/components/PostCard';
import {
  getPublicationBySlug,
  listPublishedPosts,
  normaliseHandle,
  publicationUrl,
} from '@/lib/blog-data';

export const revalidate = 3600;

type Params = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const slug = normaliseHandle((await params).handle);
  if (!slug) return {};
  const publication = await getPublicationBySlug(slug);
  if (!publication) return {};

  return {
    title: `Archive | ${publication.name}`,
    alternates: { canonical: `${publicationUrl(publication.slug)}/archive` },
  };
}

export default async function ArchivePage({ params }: Params) {
  const slug = normaliseHandle((await params).handle);
  if (!slug) notFound();

  const publication = await getPublicationBySlug(slug);
  if (!publication) notFound();

  const posts = await listPublishedPosts(publication.id, 200);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Archive</h1>
      <p className="mt-2 text-[var(--wolly-muted)]">
        {posts.length} {posts.length === 1 ? 'post' : 'posts'} from {publication.name}
      </p>

      <section className="mt-8">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </section>
    </div>
  );
}
