/**
 * Backfill `isPubliclyReadable` on existing `posts` documents.
 *
 * Security rules gate reader access on this single boolean. It was introduced
 * after the first posts were written, so those documents lack the field and are
 * invisible to readers until it is set.
 *
 * The value is derived, never invented:
 *
 *     (status === 'published' || status === 'unlisted') &&
 *     moderationStatus !== 'removed'
 *
 * which is derivePubliclyReadable() in @wolly/schema. A drafted post correctly
 * ends up `false`.
 *
 * Usage (dry run, default):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json \
 *     node apps/creator-hub/scripts/backfill-post-public-readable.js
 *   ... --apply    to write
 */

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const APPLY = process.argv.includes('--apply');
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'wolly-1133d';

/** Mirror of derivePubliclyReadable() in @wolly/schema. */
function derivePubliclyReadable(status, moderationStatus) {
  const visibleStatus = status === 'published' || status === 'unlisted';
  return visibleStatus && moderationStatus !== 'removed';
}

async function main() {
  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  const db = getFirestore();

  console.log(`\n${APPLY ? '⚠️  APPLY MODE, will write' : '🔍 DRY RUN, no writes'} · project ${PROJECT_ID}\n`);

  const snap = await db.collection('posts').get();
  console.log(`Scanned ${snap.size} posts.\n`);

  let batch = db.batch();
  let pending = 0;
  let written = 0;
  let alreadyCorrect = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const want = derivePubliclyReadable(data.status, data.moderationStatus ?? 'ok');
    const has = data.isPubliclyReadable;

    if (has === want) {
      alreadyCorrect += 1;
      continue;
    }

    console.log(
      `  ${doc.id}  status=${String(data.status).padEnd(9)} ` +
        `moderation=${String(data.moderationStatus ?? 'ok').padEnd(7)} ` +
        `${has === undefined ? 'missing' : String(has)} -> ${want}   "${String(data.title || '').slice(0, 40)}"`,
    );

    if (APPLY) {
      batch.update(doc.ref, { isPubliclyReadable: want });
      pending += 1;
      if (pending === 400) {
        await batch.commit();
        written += pending;
        batch = db.batch();
        pending = 0;
      }
    }
  }

  if (APPLY && pending > 0) {
    await batch.commit();
    written += pending;
  }

  console.log(`\nAlready correct: ${alreadyCorrect}`);
  console.log(
    APPLY
      ? `✅ Updated ${written} posts.\n`
      : 'Dry run complete. Re-run with --apply to write.\n',
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('Backfill failed:', err.message);
  process.exit(1);
});
