/**
 * Seed a demo publication with one free and one paywalled post, for local
 * development and for verifying the paywall actually withholds paid content.
 *
 * Everything it writes is tagged `seedTag: 'demo-publication'`, and `--remove`
 * deletes exactly that and nothing else.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json \
 *     node apps/blog/scripts/seed-demo-publication.js
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json \
 *     node apps/blog/scripts/seed-demo-publication.js --remove
 */

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

const REMOVE = process.argv.includes('--remove');
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'wolly-1133d';
const SEED_TAG = 'demo-publication';

const HANDLE = 'test-kitchen';
const OWNER = 'demo-creator-uid';

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

const now = Timestamp.now();

async function remove() {
  let deleted = 0;

  const posts = await db.collection('posts').where('seedTag', '==', SEED_TAG).get();
  for (const doc of posts.docs) {
    const segments = await doc.ref.collection('content').get();
    for (const s of segments.docs) {
      await s.ref.delete();
      deleted++;
    }
    await doc.ref.delete();
    deleted++;
  }

  for (const col of ['publications', 'publication_slugs']) {
    const snap = await db.collection(col).where('seedTag', '==', SEED_TAG).get();
    for (const doc of snap.docs) {
      await doc.ref.delete();
      deleted++;
    }
  }

  console.log(`✅ removed ${deleted} seeded documents.`);
}

async function seed() {
  const pubRef = db.collection('publications').doc();

  await pubRef.set({
    seedTag: SEED_TAG,
    slug: HANDLE,
    ownerUserId: OWNER,
    name: 'The Test Kitchen',
    tagline: 'Notes on cooking, and on writing about cooking.',
    description: 'A demo publication seeded for local development.',
    paidEnabled: true,
    currency: 'GHS',
    commentAccess: 'subscribers',
    subscriberCount: 0,
    paidSubscriberCount: 0,
    postCount: 2,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });

  await db.collection('publication_slugs').doc(HANDLE).set({
    seedTag: SEED_TAG,
    publicationId: pubRef.id,
    ownerUserId: OWNER,
    createdAt: now,
  });

  const base = {
    seedTag: SEED_TAG,
    publicationId: pubRef.id,
    publicationSlug: HANDLE,
    ownerUserId: OWNER,
    authorName: 'Ama Serwaa',
    type: 'article',
    status: 'published',
    moderationStatus: 'ok',
    genre: null,
    tags: ['cooking'],
    sendAsNewsletter: false,
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    reportCount: 0,
    contentVersion: 1,
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  // 1. A fully free post.
  const freePost = db.collection('posts').doc();
  await freePost.set({
    ...base,
    title: 'What I learned salting everything twice',
    subtitle: 'A year of seasoning notes',
    slug: 'salting-everything-twice',
    excerpt: 'Seasoning early changes the texture, not just the taste. Here is what a year of notes taught me.',
    visibility: 'public',
    hasPaywall: false,
    wordCount: 120,
    readingTimeMinutes: 1,
  });
  await freePost.collection('content').doc('free').set({
    segment: 'free',
    format: 'tiptap-json-v1',
    doc: { type: 'doc', content: [] },
    html: '<p>Salt early. Salt again. The <strong>texture</strong> changes, not just the taste.</p><p>This paragraph is free for everyone to read.</p>',
    plainText: 'Salt early. Salt again.',
    updatedAt: now,
  });

  // 2. A paywalled post: free lede, paid body.
  const paidPost = db.collection('posts').doc();
  await paidPost.set({
    ...base,
    title: 'The stew recipe I do not give away',
    subtitle: 'For paid subscribers',
    slug: 'the-stew-recipe',
    excerpt: 'I have made this every Sunday for six years. The full method is below for paid subscribers.',
    visibility: 'public',
    hasPaywall: true,
    wordCount: 400,
    readingTimeMinutes: 3,
  });
  await paidPost.collection('content').doc('free').set({
    segment: 'free',
    format: 'tiptap-json-v1',
    doc: { type: 'doc', content: [] },
    html: '<p>I have made this stew every Sunday for six years, and it took most of those to get right.</p>',
    plainText: 'I have made this stew every Sunday for six years.',
    updatedAt: now,
  });
  await paidPost.collection('content').doc('paid').set({
    segment: 'paid',
    format: 'tiptap-json-v1',
    doc: { type: 'doc', content: [] },
    // Distinctive sentinel: the verification asserts this string never appears
    // in the HTML served to a reader without paid access.
    html: '<p>PAID_SEGMENT_SENTINEL_DO_NOT_LEAK: brown the onions for forty minutes, not ten.</p>',
    plainText: 'PAID_SEGMENT_SENTINEL_DO_NOT_LEAK',
    updatedAt: now,
  });

  console.log('✅ seeded:');
  console.log(`   publication  /@${HANDLE}  (${pubRef.id})`);
  console.log(`   free post    /@${HANDLE}/salting-everything-twice`);
  console.log(`   paid post    /@${HANDLE}/the-stew-recipe`);
}

(REMOVE ? remove() : seed())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('FAILED:', err.message);
    process.exit(1);
  });
