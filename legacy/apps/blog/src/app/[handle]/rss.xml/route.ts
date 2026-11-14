import {
  getPublicationBySlug,
  listPublishedPosts,
  normaliseHandle,
  postUrl,
  publicationUrl,
  siteOrigin,
  toDate,
} from '@/lib/blog-data';
import { adminDb } from '@/lib/firebase-admin';
import { COLLECTIONS, SUBCOLLECTIONS, type BlogPost } from '@wolly/schema';

export const revalidate = 3600;

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Feed content for one post.
 *
 * A paywalled post carries ONLY its free segment plus a read-more link. A feed
 * is fetched by anonymous readers with no session, so there is no viewer to
 * check: shipping the paid segment here would hand it to every RSS scraper on
 * the internet. This mirrors Substack's own truncation convention.
 */
async function feedBody(post: BlogPost): Promise<string> {
  const doc = await adminDb()
    .collection(COLLECTIONS.POSTS)
    .doc(post.id)
    .collection(SUBCOLLECTIONS.CONTENT)
    .doc('free')
    .get();

  const html = doc.exists ? ((doc.data()?.html as string) ?? '') : '';
  if (!post.hasPaywall) return html;

  const link = postUrl(post.publicationSlug, post.slug);
  return `${html}<p><a href="${escapeXml(link)}">Read more</a>. This post is for paid subscribers.</p>`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const slug = normaliseHandle((await params).handle);
  if (!slug) return new Response('Not found', { status: 404 });

  const publication = await getPublicationBySlug(slug);
  if (!publication) return new Response('Not found', { status: 404 });

  const posts = await listPublishedPosts(publication.id, 50);
  const home = publicationUrl(publication.slug);

  const items = await Promise.all(
    posts.map(async (post) => {
      const published = toDate(post.publishedAt);
      return [
        '    <item>',
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(postUrl(publication.slug, post.slug))}</link>`,
        `      <guid isPermaLink="false">${escapeXml(post.id)}</guid>`,
        published ? `      <pubDate>${published.toUTCString()}</pubDate>` : '',
        `      <description>${escapeXml(post.excerpt)}</description>`,
        `      <content:encoded><![CDATA[${await feedBody(post)}]]></content:encoded>`,
        `      <dc:creator>${escapeXml(post.authorName)}</dc:creator>`,
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n');
    }),
  );

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(publication.name)}</title>`,
    `    <link>${escapeXml(home)}</link>`,
    `    <description>${escapeXml(publication.tagline ?? publication.description ?? publication.name)}</description>`,
    '    <language>en</language>',
    `    <atom:link href="${escapeXml(`${home}/rss.xml`)}" rel="self" type="application/rss+xml" />`,
    ...items,
    '  </channel>',
    '</rss>',
  ].join('\n');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
      'X-Site': siteOrigin(),
    },
  });
}
