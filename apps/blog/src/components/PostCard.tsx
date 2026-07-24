import Link from 'next/link';

import type { BlogPost } from '@wolly/schema';

import { formatDate } from '@/lib/blog-data';

export function PostCard({
  post,
  showPublication = false,
}: {
  post: BlogPost;
  showPublication?: boolean;
}) {
  return (
    <article className="py-7 border-b border-[var(--wolly-rule)] last:border-0">
      {showPublication ? (
        <Link
          href={`/@${post.publicationSlug}`}
          className="text-xs font-medium text-[var(--wolly-accent)]"
        >
          @{post.publicationSlug}
        </Link>
      ) : null}

      <h2 className="mt-1 text-xl font-semibold tracking-tight leading-snug">
        <Link
          href={`/@${post.publicationSlug}/${post.slug}`}
          className="hover:underline underline-offset-4"
        >
          {post.title}
        </Link>
      </h2>

      {post.subtitle ? (
        <p className="mt-1 text-[var(--wolly-muted)]">{post.subtitle}</p>
      ) : null}

      <p className="mt-2 text-[15px] leading-relaxed text-gray-700 line-clamp-3">
        {post.excerpt}
      </p>

      <div className="mt-3 flex items-center gap-2 text-xs text-[var(--wolly-muted)]">
        <span>{formatDate(post.publishedAt)}</span>
        <span aria-hidden>·</span>
        <span>{post.readingTimeMinutes} min read</span>
        {post.hasPaywall ? (
          <>
            <span aria-hidden>·</span>
            <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">
              Paid
            </span>
          </>
        ) : null}
      </div>
    </article>
  );
}
