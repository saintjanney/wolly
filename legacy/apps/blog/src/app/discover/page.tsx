import type { Metadata } from 'next';

import { PostCard } from '@/components/PostCard';
import { listRecentPosts, siteOrigin } from '@/lib/blog-data';

export const revalidate = 900;

export const metadata: Metadata = {
  title: 'Discover',
  description: 'Recent writing from Wolly creators.',
  alternates: { canonical: `${siteOrigin()}/discover` },
};

export default async function DiscoverPage() {
  const posts = await listRecentPosts(30);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Discover</h1>
      <p className="mt-2 text-[var(--wolly-muted)]">
        Recent writing from Wolly creators.
      </p>

      <section className="mt-8">
        {posts.length === 0 ? (
          <p className="py-16 text-center text-[var(--wolly-muted)]">
            Nothing published yet.
          </p>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} showPublication />
          ))
        )}
      </section>
    </div>
  );
}
