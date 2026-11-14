/**
 * Reconcile snake_case (reader) and camelCase (creator-hub) field names on the
 * shared `users` collection.
 *
 * Context: the live Flutter reader reads snake_case keys (first_name, ...),
 * while the creator-hub reads camelCase (firstName, ...). A destructive rename
 * would break one app, so this migration is ADDITIVE and SYMMETRIC:
 *   - if only the snake_case key exists, copy its value to the camelCase key
 *   - if only the camelCase key exists, copy its value to the snake_case key
 *   - if both exist and differ, DO NOTHING and report it as a conflict
 * It never deletes a key and never overwrites an existing value, so it is safe
 * to run against production and is reversible.
 *
 * Usage (dry run, default — reads only, writes nothing):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json \
 *     node apps/creator-hub/scripts/reconcile-user-fields.js
 *
 * To actually write the additive changes:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json \
 *     node apps/creator-hub/scripts/reconcile-user-fields.js --apply
 *
 * Privacy: this script logs document ids and FIELD NAMES only — never field
 * values — so no PII is printed.
 *
 * NOTE: `dob` (reader, a string) and `dateOfBirth` (creator-hub, a Timestamp)
 * are intentionally NOT mapped here — they hold different value TYPES and need
 * a separate, typed conversion. Add them only after deciding the canonical type.
 */

const admin = require('firebase-admin');

// snake_case <-> camelCase pairs that hold the same value type (string).
const MAPPINGS = [
  ['first_name', 'firstName'],
  ['last_name', 'lastName'],
  ['phone_number', 'phoneNumber'],
  ['photoUrl', 'photoURL'],
];

const APPLY = process.argv.includes('--apply');
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'wolly-1133d';

function present(v) {
  return v !== undefined && v !== null && !(typeof v === 'string' && v.trim() === '');
}

async function main() {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: PROJECT_ID,
  });
  const db = admin.firestore();

  console.log(`\n${APPLY ? '⚠️  APPLY MODE — will write' : '🔍 DRY RUN — no writes'} · project ${PROJECT_ID}\n`);

  const snap = await db.collection('users').get();
  console.log(`Scanned ${snap.size} user documents.\n`);

  const addsByField = {}; // targetField -> count
  const conflictsByPair = {}; // "snake|camel" -> count
  let docsWithPlannedAdds = 0;
  const samples = [];

  let batch = db.batch();
  let batchCount = 0;
  let written = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const adds = {};

    for (const [snake, camel] of MAPPINGS) {
      const hasSnake = present(data[snake]);
      const hasCamel = present(data[camel]);
      if (hasSnake && !hasCamel) {
        adds[camel] = data[snake];
      } else if (hasCamel && !hasSnake) {
        adds[snake] = data[camel];
      } else if (hasSnake && hasCamel && data[snake] !== data[camel]) {
        const key = `${snake}|${camel}`;
        conflictsByPair[key] = (conflictsByPair[key] || 0) + 1;
      }
    }

    const addedKeys = Object.keys(adds);
    if (addedKeys.length === 0) continue;

    docsWithPlannedAdds += 1;
    for (const k of addedKeys) addsByField[k] = (addsByField[k] || 0) + 1;
    if (samples.length < 10) samples.push(`  ${doc.id}: + ${addedKeys.join(', ')}`);

    if (APPLY) {
      batch.set(doc.ref, adds, { merge: true });
      batchCount += 1;
      if (batchCount === 400) {
        await batch.commit();
        written += batchCount;
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  if (APPLY && batchCount > 0) {
    await batch.commit();
    written += batchCount;
  }

  console.log(`Documents needing additive normalization: ${docsWithPlannedAdds}`);
  console.log('Fields that would be added (name: count):');
  for (const [field, count] of Object.entries(addsByField).sort()) {
    console.log(`  + ${field}: ${count}`);
  }
  if (Object.keys(conflictsByPair).length) {
    console.log('\nConflicts (both keys present with different values — left untouched):');
    for (const [pair, count] of Object.entries(conflictsByPair)) {
      console.log(`  ! ${pair.replace('|', ' <> ')}: ${count}`);
    }
  } else {
    console.log('\nNo conflicts.');
  }
  if (samples.length) {
    console.log('\nSample docs (ids + field names only):');
    console.log(samples.join('\n'));
  }
  console.log(`\n${APPLY ? `✅ Wrote additive fields to ${written} documents.` : 'Dry run complete — no documents were modified. Re-run with --apply to write.'}\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
