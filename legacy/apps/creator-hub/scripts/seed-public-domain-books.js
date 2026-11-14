/**
 * Seed the reader catalog with public-domain books from Project Gutenberg.
 *
 * Context: Phase 0 unpublished 48 unowned books (see unpublish-unowned-epubs.js),
 * which was the right call but left the reader with one book. This refills the
 * shelves with genuinely public-domain titles while real creators are recruited.
 * Every book here is out of copyright and hosted by Project Gutenberg; the URLs
 * were verified to return `application/epub+zip` and `image/jpeg`.
 *
 * These are written in the FULL reader contract (unlike the 48 shells): title,
 * author, genre doc id, url, fileType, coverUrl, description, price, rating.
 *
 * Ownership: they are attributed to a sentinel owner, `wolly-public-domain`,
 * rather than left unowned. That satisfies the `publishedImpliesOwned` security
 * rule and keeps the catalog honest: these are the platform's curated
 * public-domain shelf, not a creator's work. No money flows to the sentinel
 * (the books are free, so there are no purchases and no payouts).
 *
 * Everything is tagged `seedTag: 'public-domain-gutenberg'`, so `--remove`
 * deletes exactly this set and nothing else.
 *
 * Usage (dry run, default):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json \
 *     node apps/creator-hub/scripts/seed-public-domain-books.js
 *   ... --apply     to write
 *   ... --remove --apply   to delete the seeded set
 */

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const APPLY = process.argv.includes('--apply');
const REMOVE = process.argv.includes('--remove');
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'wolly-1133d';
const SEED_TAG = 'public-domain-gutenberg';
const OWNER = 'wolly-public-domain';

// Genre document ids, read from the live `genres` collection on 2026-07-24.
const G = {
  fiction: 'UoitTv6G15VTpeeS0VA5',
  romance: 'yFJboJOayghCDDY4alZp',
  fantasy: 'YqaMAyceoMGHjim50j9E',
  horror: 'oYzzJnzpDGeydccidESC',
  mystery: '3DrVr5eZpfHuEGF1JCb0',
  scifi: 'ByzoxUA3P6twaaOiI42w',
  adventure: '7ATHpBWw7eAA2hhzX64H',
  nonfiction: 'V6T3zDILl16aqyR9kmqt',
  selfhelp: 'e6ttKr0g4lj8UK5yablt',
  business: 'EBU96EvmasMMqu679P7m',
  history: 'BFcE06W7e5PnlAG5mEB6',
};

// Project Gutenberg id, title, author, genre, one-line description.
const BOOKS = [
  [1342, 'Pride and Prejudice', 'Jane Austen', G.romance, 'Elizabeth Bennet and Mr Darcy spar their way toward love in Regency England.'],
  [11, "Alice's Adventures in Wonderland", 'Lewis Carroll', G.fantasy, 'A girl falls down a rabbit hole into a world of riddles and impossible logic.'],
  [84, 'Frankenstein', 'Mary Shelley', G.horror, 'A young scientist creates life and is destroyed by what he refuses to love.'],
  [345, 'Dracula', 'Bram Stoker', G.horror, 'A count from the Carpathians brings an ancient hunger to Victorian London.'],
  [1661, 'The Adventures of Sherlock Holmes', 'Arthur Conan Doyle', G.mystery, 'Twelve cases that made the world believe in the science of deduction.'],
  [98, 'A Tale of Two Cities', 'Charles Dickens', G.fiction, 'Love and sacrifice set against the terror of the French Revolution.'],
  [35, 'The Time Machine', 'H. G. Wells', G.scifi, 'A traveller journeys to the year 802,701 and finds humanity split in two.'],
  [36, 'The War of the Worlds', 'H. G. Wells', G.scifi, 'Martian machines march on England and civilisation buckles overnight.'],
  [2701, 'Moby Dick', 'Herman Melville', G.adventure, "Captain Ahab hunts the white whale that took his leg, and much more."],
  [76, 'Adventures of Huckleberry Finn', 'Mark Twain', G.adventure, 'A boy and a runaway man raft down the Mississippi toward an uneasy freedom.'],
  [1260, 'Jane Eyre', 'Charlotte Brontë', G.romance, 'An orphaned governess refuses to trade her conscience for love.'],
  [174, 'The Picture of Dorian Gray', 'Oscar Wilde', G.fiction, 'A portrait ages while its beautiful subject sinks into corruption.'],
  [1400, 'Great Expectations', 'Charles Dickens', G.fiction, 'A blacksmith’s boy comes into money and learns what it costs.'],
  [55, 'The Wonderful Wizard of Oz', 'L. Frank Baum', G.fantasy, 'A Kansas girl and three companions walk a yellow road to ask a wizard for what they already have.'],
  [2680, 'Meditations', 'Marcus Aurelius', G.selfhelp, 'The private notes of a Roman emperor on how to live and how to die.'],
  [132, 'The Art of War', 'Sun Tzu', G.business, 'The oldest treatise on strategy, still read by generals and founders alike.'],
  [1727, 'The Odyssey', 'Homer', G.fiction, 'A soldier spends ten years trying to sail home from a war he helped win.'],
  [2591, "Grimms' Fairy Tales", 'Jacob and Wilhelm Grimm', G.fantasy, 'The dark originals behind the stories you were told as a child.'],
  [768, 'Wuthering Heights', 'Emily Brontë', G.romance, 'A love fierce enough to outlast death, and cruel enough to deserve it.'],
  [514, 'Little Women', 'Louisa May Alcott', G.fiction, 'Four sisters grow up in wartime New England, each chasing a different life.'],
];

function epubUrl(id) {
  return `https://www.gutenberg.org/cache/epub/${id}/pg${id}.epub`;
}
function coverUrl(id) {
  return `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`;
}
/** Deterministic doc id, so re-running updates rather than duplicating. */
function docId(id) {
  return `gutenberg-${id}`;
}

async function main() {
  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  const db = getFirestore();

  console.log(
    `\n${APPLY ? '⚠️  APPLY MODE, will write' : '🔍 DRY RUN, no writes'} · ${REMOVE ? 'REMOVE' : 'SEED'} · project ${PROJECT_ID}\n`,
  );

  if (REMOVE) {
    const snap = await db.collection('epubs').where('seedTag', '==', SEED_TAG).get();
    console.log(`Seeded public-domain books present: ${snap.size}`);
    if (APPLY && snap.size) {
      let batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      console.log(`✅ Removed ${snap.size} seeded books.\n`);
    } else {
      console.log(snap.size ? '\nDry run. Re-run with --apply to remove.\n' : '\nNothing to remove.\n');
    }
    process.exit(0);
  }

  console.log(`Seeding ${BOOKS.length} public-domain books, owner "${OWNER}":\n`);

  let batch = db.batch();
  let count = 0;
  for (const [gid, title, author, genre, description] of BOOKS) {
    const ref = db.collection('epubs').doc(docId(gid));
    const data = {
      seedTag: SEED_TAG,
      // Reader contract
      title,
      author,
      authorName: author,
      ownerUserId: OWNER,
      genre,
      url: epubUrl(gid),
      fileType: 'epub',
      coverUrl: coverUrl(gid),
      description,
      isPublished: true,
      isFree: true,
      price: 0,
      currency: 'GHS',
      rating: 0,
      reviewCount: 0,
      // Provenance
      source: 'project-gutenberg',
      sourceUrl: `https://www.gutenberg.org/ebooks/${gid}`,
      status: 'published',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      publishedAt: FieldValue.serverTimestamp(),
    };
    console.log(`  ${docId(gid).padEnd(18)} ${title} — ${author}`);
    if (APPLY) {
      batch.set(ref, data, { merge: true });
      count += 1;
      if (count === 400) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }
  }

  if (APPLY) {
    if (count > 0) await batch.commit();
    console.log(`\n✅ Seeded ${BOOKS.length} books into the catalog.\n`);
  } else {
    console.log('\nDry run. Re-run with --apply to write.\n');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
