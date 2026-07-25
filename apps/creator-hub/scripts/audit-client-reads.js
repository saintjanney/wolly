/**
 * Audit every client-SDK read path against security rules, as a REAL signed-in
 * user.
 *
 * WHY THIS EXISTS: Admin SDK reads bypass security rules entirely, so testing
 * with a service account cannot reproduce a rules failure. That blind spot hid
 * three real bugs, all the same root cause (a query that cannot prove a rule
 * clause):
 *
 *   1. The creator-hub post list (filtered publicationId; proved nothing).
 *   2. The entire Flutter blog feed (the rule tested an inequality on
 *      moderationStatus, which no query filter can prove).
 *   3. The reader's Library screen, silently empty since March (read the whole
 *      epubs collection while the rule required isPublished == true).
 *
 * Firestore evaluates rules for a `list` query against the QUERY, not the
 * documents returned, so any clause the query cannot provably satisfy fails the
 * whole query. Run this whenever a query or a rule changes.
 *
 * Read-only: issues queries, writes nothing.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json \
 *     node apps/creator-hub/scripts/audit-client-reads.js
 */
const { initializeApp: adminInit, applicationDefault } = require('firebase-admin/app');
const { getAuth: adminAuth } = require('firebase-admin/auth');
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithCustomToken } = require('firebase/auth');
const {
  getFirestore, collection, doc, getDoc, getDocs, query, where, orderBy, limit,
} = require('firebase/firestore');

const READER = 'rules-probe-reader';
adminInit({ credential: applicationDefault(), projectId: 'wolly-1133d' });

(async () => {
  const token = await adminAuth().createCustomToken(READER);
  const app = initializeApp({
    apiKey: 'AIzaSyC2Y5LE3kfuv14Viz7pzcSbEZhdySOUbcM',
    authDomain: 'wolly-1133d.firebaseapp.com',
    projectId: 'wolly-1133d',
  });
  await signInWithCustomToken(getAuth(app), token);
  const db = getFirestore(app);
  console.log(`signed in as a plain reader (${READER})\n`);

  const cases = [
    // label, source, constraints (null = whole-collection get)
    ['epubs: fetchAllBooks (FIXED: isPublished)', 'library_repository.dart:24', 'epubs',
      [where('isPublished', '==', true)]],
    ['epubs: by genre + isPublished', 'genre_repository.dart:28', 'epubs',
      [where('genre', '==', 'yFJboJOayghCDDY4alZp'), where('isPublished', '==', true)]],
    ['epubs: isPublished only', 'search_screen.dart:59', 'epubs',
      [where('isPublished', '==', true)]],
    ['epubs: whereIn genres + isPublished', 'dashboard_repository.dart:98', 'epubs',
      [where('genre', 'in', ['yFJboJOayghCDDY4alZp']), where('isPublished', '==', true), limit(10)]],
    ['genres: whole collection', 'genre_repository.dart', 'genres', null],
    ['reading_progress: mine + orderBy', 'dashboard_repository.dart:20', 'reading_progress',
      [where('userId', '==', READER), orderBy('lastRead', 'desc'), limit(10)]],
    ['purchases: mine + orderBy', 'purchase_repository.dart:65', 'purchases',
      [where('userId', '==', READER), orderBy('purchasedAt', 'desc')]],
    ['purchases: mine (ids only)', 'purchase_repository.dart:82', 'purchases',
      [where('userId', '==', READER)]],
    ['bookmarks: mine for a book', 'bookmark_repository.dart:18', 'bookmarks',
      [where('userId', '==', READER), where('bookId', '==', 'x'), orderBy('createdAt', 'desc')]],
    ['reviews: approved for a book', 'review_repository.dart:52', 'reviews',
      [where('bookId', '==', 'x'), where('status', '==', 'approved')]],
    ['reviews: mine for a book', 'review_repository.dart:14', 'reviews',
      [where('bookId', '==', 'x'), where('userId', '==', READER), limit(1)]],
    ['follows: mine', 'follow_repository.dart:40', 'follows',
      [where('followerId', '==', READER)]],
  ];

  const failures = [];
  for (const [label, src, col, constraints] of cases) {
    try {
      const snap = constraints
        ? await getDocs(query(collection(db, col), ...constraints))
        : await getDocs(collection(db, col));
      console.log(`  ✅ ${label.padEnd(40)} ${snap.size} docs`);
    } catch (e) {
      console.log(`  ❌ ${label.padEnd(40)} ${e.code}`);
      failures.push([label, src, e.code]);
    }
  }

  // Single-doc gets used by the reader.
  console.log('\n  single-document reads:');
  for (const [label, path] of [
    ['users/{me}', `users/${READER}`],
    ['epubs/{published}', 'epubs/gutenberg-1342'],
  ]) {
    try {
      const s = await getDoc(doc(db, path));
      console.log(`  ✅ ${label.padEnd(38)} exists=${s.exists()}`);
    } catch (e) {
      console.log(`  ❌ ${label.padEnd(38)} ${e.code}`);
      failures.push([label, 'get', e.code]);
    }
  }

  console.log(`\n${'='.repeat(64)}`);
  if (!failures.length) {
    console.log('All reader read paths pass security rules.');
  } else {
    console.log(`${failures.length} BROKEN read path(s):\n`);
    for (const [label, src, code] of failures) {
      console.log(`  ${label}\n    source: ${src}\n    error:  ${code}\n`);
    }
  }
  process.exit(0);
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
