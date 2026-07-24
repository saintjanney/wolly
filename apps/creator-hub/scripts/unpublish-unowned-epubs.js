/**
 * Unpublish `epubs` documents that no creator owns.
 *
 * Context: the live catalog contains 48 documents that predate the reader
 * contract. They carry only `title`, `url`, `isPublished` and `genre`, with no
 * `ownerUserId`, so no creator on the platform owns them, none of them earns
 * anyone a royalty, and a majority are commercial titles whose filenames carry
 * shadow-library markers (`z-lib.org` and friends). They are all
 * `isPublished: true` and are being served by the reader today.
 *
 * This script takes them out of circulation. It is deliberately NARROW and
 * REVERSIBLE:
 *   - it only touches documents with NO `ownerUserId` (so a real creator's book
 *     can never be caught by it, whatever else is wrong with the document)
 *   - it only touches documents that are currently `isPublished: true`
 *   - it sets `isPublished: false` and stamps why; it NEVER deletes a document,
 *     a file, or any other field
 *   - `--revert` puts back exactly what this script unpublished, and nothing else
 *
 * Usage (dry run, default: reads only, writes nothing):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json \
 *     node apps/creator-hub/scripts/unpublish-unowned-epubs.js
 *
 * To actually unpublish:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json \
 *     node apps/creator-hub/scripts/unpublish-unowned-epubs.js --apply
 *
 * To put back everything this script unpublished:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json \
 *     node apps/creator-hub/scripts/unpublish-unowned-epubs.js --revert --apply
 *
 * Note: uses the modular `firebase-admin/app` entrypoint rather than the
 * `admin.credential` namespace the sibling scripts use. Both work on the pinned
 * firebase-admin ^13; only this one survives the v14 bump, which removed the
 * legacy namespace.
 */

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const APPLY = process.argv.includes('--apply');
const REVERT = process.argv.includes('--revert');
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'wolly-1133d';

/** Marker this script stamps, so `--revert` can find exactly its own writes. */
const REASON = 'unowned-legacy-catalog';

/** Filename fragments that indicate a shadow-library origin. Reporting only. */
const SHADOW_LIBRARY = /z-lib|zlib|libgen|annas-archive|b-ok\b/i;

function present(v) {
  return v !== undefined && v !== null && !(typeof v === 'string' && v.trim() === '');
}

async function commitInChunks(db, docs, buildUpdate) {
  let batch = db.batch();
  let inBatch = 0;
  let written = 0;
  for (const doc of docs) {
    batch.set(doc.ref, buildUpdate(doc), { merge: true });
    inBatch += 1;
    if (inBatch === 400) {
      await batch.commit();
      written += inBatch;
      batch = db.batch();
      inBatch = 0;
    }
  }
  if (inBatch > 0) {
    await batch.commit();
    written += inBatch;
  }
  return written;
}

async function main() {
  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  const db = getFirestore();

  const mode = REVERT ? 'REVERT' : 'UNPUBLISH';
  console.log(
    `\n${APPLY ? `⚠️  APPLY MODE, will write (${mode})` : `🔍 DRY RUN, no writes (${mode})`} · project ${PROJECT_ID}\n`,
  );

  const snap = await db.collection('epubs').get();
  console.log(`Scanned ${snap.size} epubs documents.\n`);

  if (REVERT) {
    const targets = snap.docs.filter((d) => d.data().unpublishedReason === REASON);
    console.log(`Documents this script previously unpublished: ${targets.length}`);
    for (const d of targets.slice(0, 15)) {
      console.log(`  ↩ ${d.id}  ${String(d.data().title || '').slice(0, 64)}`);
    }
    if (targets.length > 15) console.log(`  … and ${targets.length - 15} more`);

    if (APPLY && targets.length) {
      const written = await commitInChunks(db, targets, () => ({
        isPublished: true,
        unpublishedReason: FieldValue.delete(),
        unpublishedAt: FieldValue.delete(),
      }));
      console.log(`\n✅ Restored ${written} documents to isPublished: true.\n`);
    } else {
      console.log(
        `\n${targets.length ? 'Dry run complete. Nothing restored; re-run with --apply.' : 'Nothing to restore.'}\n`,
      );
    }
    process.exit(0);
  }

  // ── Unpublish pass ───────────────────────────────────────────────────────
  const targets = [];
  let ownedPublished = 0;
  let alreadyUnpublished = 0;
  let shadowMarked = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const owned = present(data.ownerUserId);

    if (owned) {
      if (data.isPublished === true) ownedPublished += 1;
      continue; // never touch a document a creator owns
    }
    if (data.isPublished !== true) {
      alreadyUnpublished += 1;
      continue;
    }
    if (SHADOW_LIBRARY.test(`${data.title || ''} ${data.url || ''}`)) shadowMarked += 1;
    targets.push(doc);
  }

  console.log(`Owned + published (left untouched):        ${ownedPublished}`);
  console.log(`Unowned + already unpublished (skipped):   ${alreadyUnpublished}`);
  console.log(`Unowned + published (WILL BE UNPUBLISHED): ${targets.length}`);
  console.log(`  ...of which carry shadow-library markers: ${shadowMarked}\n`);

  if (targets.length) {
    console.log('Documents to unpublish (id · title):');
    for (const d of targets) {
      const t = String(d.data().title || '(untitled)').slice(0, 64);
      const flag = SHADOW_LIBRARY.test(`${d.data().title || ''} ${d.data().url || ''}`) ? ' ⚑' : '';
      console.log(`  - ${d.id}  ${t}${flag}`);
    }
  }

  if (APPLY && targets.length) {
    const written = await commitInChunks(db, targets, () => ({
      isPublished: false,
      unpublishedReason: REASON,
      unpublishedAt: FieldValue.serverTimestamp(),
    }));
    console.log(`\n✅ Unpublished ${written} documents. No documents or files were deleted.`);
    console.log('   To undo: re-run with --revert --apply\n');
  } else {
    console.log(
      `\n${targets.length ? 'Dry run complete. No documents were modified; re-run with --apply to unpublish.' : 'Nothing to do.'}\n`,
    );
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Unpublish failed:', err);
  process.exit(1);
});
