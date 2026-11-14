import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SubscribeOptions } from '@/components/SubscribeOptions';
import {
  getPublicationBySlug,
  listTiers,
  normaliseHandle,
  publicationUrl,
} from '@/lib/blog-data';

export const revalidate = 900;

type Params = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const slug = normaliseHandle((await params).handle);
  if (!slug) return {};
  const publication = await getPublicationBySlug(slug);
  if (!publication) return {};

  return {
    title: `Subscribe to ${publication.name}`,
    description: publication.tagline ?? undefined,
    alternates: { canonical: `${publicationUrl(publication.slug)}/subscribe` },
  };
}

export default async function SubscribePage({ params }: Params) {
  const slug = normaliseHandle((await params).handle);
  if (!slug) notFound();

  const publication = await getPublicationBySlug(slug);
  if (!publication) notFound();

  // Only active tiers are offered. A retired tier stays readable for existing
  // subscribers but must not be sold again.
  const tiers = (await listTiers(publication.id)).filter((t) => t.isActive !== false);

  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Subscribe to {publication.name}
        </h1>
        {publication.tagline ? (
          <p className="mt-3 text-lg text-[var(--wolly-muted)]">{publication.tagline}</p>
        ) : null}
        <p className="mt-2 text-sm text-[var(--wolly-muted)]">
          {publication.subscriberCount}{' '}
          {publication.subscriberCount === 1 ? 'subscriber' : 'subscribers'}
        </p>
      </header>

      <SubscribeOptions
        publicationId={publication.id}
        publicationName={publication.name}
        publicationSlug={publication.slug}
        paidEnabled={publication.paidEnabled === true}
        currency={publication.currency ?? 'GHS'}
        tiers={tiers.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description ?? '',
          benefits: t.benefits ?? [],
          monthlyPrice: t.monthlyPrice,
          annualPrice: t.annualPrice ?? null,
        }))}
      />
    </div>
  );
}
