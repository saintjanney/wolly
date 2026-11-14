import Link from 'next/link';

import { listPublications } from '@/lib/blog-data';

export const revalidate = 900;

export default async function HomePage() {
  const publications = await listPublications(50);

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Wolly</h1>
      <p className="mt-3 text-lg text-[var(--wolly-muted)]">
        Writing from Wolly creators.
      </p>

      <Link
        href="/discover"
        className="mt-6 inline-block rounded-lg bg-[var(--wolly-accent)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
      >
        Browse recent posts
      </Link>

      {publications.length > 0 ? (
        <section className="mt-14">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--wolly-muted)]">
            Publications
          </h2>
          <ul className="mt-4 divide-y divide-[var(--wolly-rule)]">
            {publications.map((publication) => (
              <li key={publication.id} className="py-4">
                <Link
                  href={`/@${publication.slug}`}
                  className="font-medium hover:underline underline-offset-4"
                >
                  {publication.name}
                </Link>
                {publication.tagline ? (
                  <p className="mt-0.5 text-sm text-[var(--wolly-muted)]">
                    {publication.tagline}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
