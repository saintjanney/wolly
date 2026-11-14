/**
 * Revoke the permanent public download tokens on PAID book files.
 *
 * Firebase Storage `getDownloadURL()` returns a URL containing a
 * `firebaseStorageDownloadTokens` value. That token grants access to anyone who
 * holds the URL, bypassing Storage security rules entirely and never expiring.
 * Those URLs are stored on `epubs.url`, a document every authenticated user can
 * read, so a paid book could be downloaded by anyone. An unauthenticated fetch
 * returned HTTP 200.
 *
 * `getBookDownloadUrl` (services/api) now issues a short-lived signed URL after
 * checking entitlement, but that gate is pointless while the permanent token
 * still works. This script deletes the token metadata, which immediately
 * invalidates every previously-issued download URL for the file.
 *
 * Scope: only books where `isFree !== true` and `price > 0`, and only files
 * hosted in our own bucket. Free books are left alone (nothing to protect), and
 * external URLs (Project Gutenberg) cannot and need not be touched.
 *
 * AFTER RUNNING THIS, the reader MUST fetch URLs through getBookDownloadUrl.
 * A client still using the stored `epubs.url` will get 403.
 *
 * Usage (dry run, default):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json \
 *     node apps/creator-hub/scripts/revoke-paid-book-tokens.js
 *   ... --apply    to revoke
 */

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

const APPLY = process.argv.includes('--apply');
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'wolly-1133d';
const BUCKET = 'wolly-1133d.appspot.com';

/** Same parser as services/api/src/download.ts. */
function storageObjectPath(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (parsed.hostname === 'firebasestorage.googleapis.com') {
    const m = parsed.pathname.match(/\/o\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  }
  if (parsed.hostname === 'storage.googleapis.com') {
    const parts = parsed.pathname.replace(/^\//, '').split('/');
    return parts.length < 2 ? null : decodeURIComponent(parts.slice(1).join('/'));
  }
  return null;
}

async function main() {
  initializeApp({
    credential: applicationDefault(),
    projectId: PROJECT_ID,
    storageBucket: BUCKET,
  });
  const db = getFirestore();
  const bucket = getStorage().bucket();

  console.log(`\n${APPLY ? '⚠️  APPLY MODE, will revoke' : '🔍 DRY RUN, no changes'} · project ${PROJECT_ID}\n`);

  const snap = await db.collection('epubs').get();
  let revoked = 0;
  let skippedFree = 0;
  let skippedExternal = 0;
  let noToken = 0;

  for (const doc of snap.docs) {
    const book = doc.data();
    const isFree = book.isFree === true || !book.price || book.price <= 0;
    if (isFree) {
      skippedFree += 1;
      continue;
    }

    const path = storageObjectPath(book.url ?? '');
    if (!path) {
      console.log(`  external, cannot revoke: ${doc.id} "${String(book.title).trim()}"`);
      skippedExternal += 1;
      continue;
    }

    const file = bucket.file(path);
    const [exists] = await file.exists();
    if (!exists) {
      console.log(`  file missing: ${doc.id} -> ${path}`);
      continue;
    }

    const [meta] = await file.getMetadata();
    const hasToken = Boolean(meta.metadata?.firebaseStorageDownloadTokens);
    if (!hasToken) {
      noToken += 1;
      continue;
    }

    console.log(`  ${APPLY ? 'revoking' : 'would revoke'}: ${doc.id} "${String(book.title).trim()}"`);
    console.log(`    ${path}`);

    if (APPLY) {
      // Deleting the token metadata invalidates every URL already issued for
      // this object. Access then requires a signed URL or Storage rules.
      await file.setMetadata({ metadata: { firebaseStorageDownloadTokens: null } });
      revoked += 1;
    }
  }

  console.log(`\nFree books skipped:        ${skippedFree}`);
  console.log(`External URLs skipped:     ${skippedExternal}`);
  console.log(`Already had no token:      ${noToken}`);
  console.log(
    APPLY
      ? `✅ Revoked tokens on ${revoked} paid book file(s).\n`
      : '\nDry run complete. Re-run with --apply to revoke.\n',
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('Revoke failed:', err.message);
  process.exit(1);
});
