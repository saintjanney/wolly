import {
  listPublications,
  listPublishedPosts,
  postUrl,
  publicationUrl,
  siteOrigin,
  toDate,
} from '@/lib/blog-data';

export const revalidate = 3600;

function escapeXml(unsafe: string): string {
  return unsafe.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function urlEntry(loc: string, lastmod?: Date | null, priority?: string): string {
  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod.toISOString()}</lastmod>` : '',
    priority ? `    <priority>${priority}</priority>` : '',
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function GET() {
  const publications = await listPublications(500);

  const entries: string[] = [
    urlEntry(siteOrigin(), null, '1.0'),
    urlEntry(`${siteOrigin()}/discover`, null, '0.8'),
  ];

  for (const publication of publications) {
    entries.push(urlEntry(publicationUrl(publication.slug), null, '0.9'));
    entries.push(urlEntry(`${publicationUrl(publication.slug)}/archive`, null, '0.5'));

    // `listPublishedPosts` excludes unlisted and removed posts, so nothing that
    // should stay out of search can reach the sitemap.
    const posts = await listPublishedPosts(publication.id, 500);
    for (const post of posts) {
      entries.push(
        urlEntry(
          postUrl(publication.slug, post.slug),
          toDate(post.updatedAt) ?? toDate(post.publishedAt),
          '0.7',
        ),
      );
    }
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
  ].join('\n');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
}
