import Link from 'next/link';

import type { Publication } from '@wolly/schema';

/**
 * Shown in place of a post's paid segment.
 *
 * The paid HTML is never sent to the browser for a reader without access, so
 * this is not an overlay hiding content that is present in the DOM; there is
 * genuinely nothing underneath it. That is the point of splitting the body into
 * two documents.
 */
export function Paywall({ publication }: { publication: Publication }) {
  return (
    <aside className="my-12 rounded-xl border border-[var(--wolly-rule)] bg-gray-50 px-6 py-8 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--wolly-muted)]">
        This post is for paid subscribers
      </p>

      <h2 className="mt-3 text-xl font-semibold tracking-tight">
        Keep reading {publication.name}
      </h2>

      {publication.tagline ? (
        <p className="mt-2 text-sm text-[var(--wolly-muted)]">{publication.tagline}</p>
      ) : null}

      <Link
        href={`/@${publication.slug}/subscribe`}
        className="mt-6 inline-block rounded-lg bg-[var(--wolly-accent)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
      >
        Subscribe
      </Link>

      <p className="mt-4 text-xs text-[var(--wolly-muted)]">
        Already a subscriber?{' '}
        <Link href={`/@${publication.slug}/subscribe`} className="underline">
          Sign in
        </Link>
      </p>
    </aside>
  );
}
