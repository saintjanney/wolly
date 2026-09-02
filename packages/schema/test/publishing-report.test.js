/**
 * The four invariants that make the Publishing Journey Report trustworthy.
 *
 * This screen is shown to an author as a promise about their own book, and the
 * number is the product. If it can move for reasons the author cannot explain,
 * the screen is worse than not existing. So the properties below are asserted
 * rather than assumed:
 *
 *   1. DETERMINISM      same inputs, same integer, always
 *   2. MONOTONICITY     no author action ever lowers the score
 *   3. SINGLE COST      one missing thing is charged once, not once per dependent
 *   4. NO FREE POINTS   a check that could not fail leaves the denominator
 *
 * Plus the copy rules, which are a real constraint rather than a style note:
 * the spec says the report must not feel like an exam, and examiner vocabulary
 * is the fastest way to make it feel like one.
 *
 * The engine is TypeScript and pure, so it is transpiled in-process here rather
 * than requiring a build step.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function loadEngine() {
  const ts = require('typescript');
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'publishing-report.ts'),
    'utf8',
  );
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  new Function('exports', 'module', 'require', js)(mod.exports, mod, require);
  return mod.exports;
}

const E = loadEngine();
const NOW = '2026-09-02T00:00:00.000Z';

/** A book with nothing done: no manuscript, no cover, no metadata. */
function emptyInput() {
  return {
    book: { id: 'b1', conversionStatus: null, conversion: null },
    author: {},
    rights: [],
    review: {},
  };
}

/** A book with everything an author can do, done. Wolly's review is outstanding. */
function completeInput() {
  return {
    book: {
      id: 'b1',
      title: 'Nkrumah’s Daughters',
      author: 'Ama Mensah',
      description: Array.from({ length: 60 }, (_, i) => `word${i}`).join(' '),
      genre: 'literary-fiction',
      language: 'English',
      coverUrl: 'https://example.test/cover.jpg',
      coverMetrics: { width: 1600, height: 2400, bytes: 800000, fetchedOk: true },
      price: 15,
      isFree: false,
      isPublished: false,
      previewChapters: [1],
      conversionStatus: 'ready',
      conversion: {
        fingerprint: 'wolly-abc',
        wordCount: 42000,
        chapterCount: 12,
        headingLevel: 'h1',
        emptyChapters: 0,
        shortestChapterWords: 900,
        imageCount: 3,
        droppedImageCount: 0,
        headingShapedParagraphs: 0,
        unsupportedGlyphs: [],
        warningCodes: [],
        pressedAt: NOW,
      },
    },
    author: {
      displayName: 'Ama Mensah',
      bio: 'Ama writes literary fiction from Accra and has published three collections of short stories.',
      payoutMethod: 'mobile_money',
      payoutAccountRef: 'ref-1',
    },
    rights: [{ format: 'ebook', territory: 'WORLD', status: 'available', verificationState: 'self_declared' }],
    review: {},
  };
}

// ── 1. Determinism ─────────────────────────────────────────────────────────

test('same inputs produce the same score, every time', () => {
  const input = completeInput();
  const first = E.computeReport(input, { now: NOW });
  for (let i = 0; i < 25; i += 1) {
    const again = E.computeReport(completeInput(), { now: NOW });
    assert.equal(again.score, first.score);
    assert.deepEqual(again.nextSteps, first.nextSteps);
    assert.deepEqual(
      again.checks.map((c) => [c.id, c.state, c.credit]),
      first.checks.map((c) => [c.id, c.state, c.credit]),
    );
  }
});

test('canonicalInputs is stable regardless of key order', () => {
  const a = { book: { id: 'b', title: 'T', price: 1 }, author: {}, rights: [], review: {} };
  const b = { review: {}, rights: [], author: {}, book: { price: 1, title: 'T', id: 'b' } };
  assert.equal(E.canonicalInputs(a), E.canonicalInputs(b));
});

// ── 2. Monotonicity ────────────────────────────────────────────────────────

test('no author action lowers the score', () => {
  // Each entry moves one field from absent to present, which is the only shape
  // an author action takes. None may reduce the number.
  const improvements = [
    (i) => { i.book.title = 'A Title'; i.book.author = 'An Author'; },
    (i) => { i.book.description = Array.from({ length: 60 }, (_, n) => `w${n}`).join(' '); },
    (i) => { i.book.genre = 'fiction'; i.book.language = 'English'; },
    (i) => { i.book.coverUrl = 'https://example.test/c.jpg'; i.book.coverMetrics = { width: 1600, height: 2400, bytes: 500000, fetchedOk: true }; },
    (i) => { i.book.price = 15; },
    (i) => { i.book.previewChapters = [1]; },
    (i) => { i.author.payoutMethod = 'mobile_money'; i.author.payoutAccountRef = 'r'; },
    (i) => { i.author.displayName = 'A'; i.author.bio = 'a b c d e f g h i j k'; },
    (i) => { i.rights.push({ format: 'ebook', territory: 'WORLD', status: 'available' }); },
  ];

  // From several starting points, not just the empty one: monotonicity has to
  // hold everywhere, and interactions between checks are where it would break.
  const starts = [
    () => emptyInput(),
    () => { const i = emptyInput(); i.book.conversionStatus = 'ready'; i.book.conversion = { fingerprint: 'f', wordCount: 40000, chapterCount: 10, headingLevel: 'h1', emptyChapters: 0, shortestChapterWords: 800, imageCount: 0, droppedImageCount: 0, unsupportedGlyphs: [], warningCodes: [] }; return i; },
    () => completeInput(),
  ];

  for (const start of starts) {
    for (const improve of improvements) {
      const before = E.computeReport(start(), { now: NOW });
      const after0 = start();
      improve(after0);
      const after = E.computeReport(after0, { now: NOW });
      if (before.score === null || after.score === null) continue;
      assert.ok(
        after.score >= before.score,
        `an author action lowered the score: ${before.score} -> ${after.score}`,
      );
    }
  }
});

test('making a book free changes the denominator, and that is not a punishment', () => {
  // Monotonicity is about COMPLETING work, not about changing what work applies.
  // A free book has no payout to arrange, so payout_destination leaves the
  // denominator entirely and the remaining Wolly points become a larger share of
  // a smaller total: 82/92 rather than 90/100. The number moves for a reason the
  // author can reconstruct, which is the actual requirement.
  const paid = E.computeReport(completeInput(), { now: NOW });
  const freeInput = completeInput();
  freeInput.book.isFree = true;
  const free = E.computeReport(freeInput, { now: NOW });

  assert.equal(paid.score, 90);
  assert.equal(free.score, 89);
  assert.equal(
    free.checks.find((c) => c.id === 'payout_destination').state,
    'not_applicable',
    'a free book has no payout work, so the check must leave the denominator',
  );
  // And it is auditable: both books still show zero author points outstanding.
  assert.equal(paid.pointsWithAuthor, 0);
  assert.equal(free.pointsWithAuthor, 0);
});

test('pressing the manuscript never lowers the score', () => {
  const before = E.computeReport(emptyInput(), { now: NOW });
  const pressedInput = emptyInput();
  pressedInput.book.conversionStatus = 'ready';
  pressedInput.book.conversion = {
    fingerprint: 'f', wordCount: 40000, chapterCount: 10, headingLevel: 'h1',
    emptyChapters: 0, shortestChapterWords: 800, imageCount: 0, droppedImageCount: 0,
    unsupportedGlyphs: [], warningCodes: [],
  };
  const after = E.computeReport(pressedInput, { now: NOW });
  assert.equal(before.score, null, 'an unpressed book should have no score at all');
  assert.ok(after.score > 0);
});

// ── 3. Single cause, single cost ───────────────────────────────────────────

test('one missing thing is charged once, not once per dependent', () => {
  const input = completeInput();
  input.book.coverUrl = null;
  input.book.coverMetrics = null;
  const report = E.computeReport(input, { now: NOW });

  const cover = report.checks.find((c) => c.id === 'cover_present');
  const quality = report.checks.find((c) => c.id === 'cover_quality');
  const listing = report.checks.find((c) => c.id === 'listing_approved');

  assert.equal(cover.state, 'attention');
  assert.equal(quality.state, 'not_applicable', 'cover_quality depends on cover_present');
  assert.equal(listing.state, 'not_applicable', 'listing_approved depends on cover_present');
  assert.equal(quality.pointsAtStake, 0, 'a not-applicable check must cost nothing');
});

test('an unpressed manuscript makes its dependents not-applicable', () => {
  const report = E.computeReport(emptyInput(), { now: NOW });
  const dependents = ['chapter_structure', 'clean_conversion', 'images_intact', 'text_volume', 'glyph_coverage', 'preview_defined', 'edition_reviewed'];
  for (const id of dependents) {
    assert.equal(
      report.checks.find((c) => c.id === id).state,
      'not_applicable',
      `${id} should not be scored before the manuscript is pressed`,
    );
  }
});

// ── 4. No free points ──────────────────────────────────────────────────────

test('not-applicable checks leave the denominator entirely', () => {
  // A book with everything done EXCEPT that Wolly has not reviewed it should
  // land at exactly 90: the two Wolly checks are worth 10 of the 100.
  const report = E.computeReport(completeInput(), { now: NOW });
  assert.equal(report.score, 90, 'an author who has done everything should reach exactly 90');
  assert.equal(report.pointsWithAuthor, 0);
  assert.equal(report.pointsWithWolly, 10);
});

test('a fully reviewed book reaches 100', () => {
  const input = completeInput();
  input.review = { editionReviewedAt: NOW, listingApprovedAt: NOW, editionFindings: [] };
  const report = E.computeReport(input, { now: NOW });
  assert.equal(report.score, 100);
  assert.equal(report.band, 'ready_to_publish');
  assert.equal(E.blockingFailures(report).length, 0);
});

test('the weights sum to 100 and every check is specified', () => {
  assert.equal(E.weightsTotal(), 100);
  assert.equal(E.CHECK_IDS.length, 18);
});

// ── The cap, and never meeting a zero ──────────────────────────────────────

test('a book that will not press cannot read as nearly ready', () => {
  const input = completeInput();
  input.book.conversionStatus = 'failed';
  const report = E.computeReport(input, { now: NOW });
  assert.ok(report.score <= 45, `a failed press must cap the score, got ${report.score}`);
  assert.equal(report.band, 'taking_shape');
});

test('there is no score at all until the press has succeeded once', () => {
  const report = E.computeReport(emptyInput(), { now: NOW });
  assert.equal(report.score, null, 'nobody should ever meet a 0%');
});

// ── Next steps ─────────────────────────────────────────────────────────────

test('next steps are at most three, actionable, and stable', () => {
  const input = emptyInput();
  input.book.conversionStatus = 'ready';
  input.book.conversion = {
    fingerprint: 'f', wordCount: 40000, chapterCount: 1, headingLevel: null,
    emptyChapters: 0, shortestChapterWords: 40000, imageCount: 0, droppedImageCount: 0,
    unsupportedGlyphs: [], warningCodes: [],
  };
  const report = E.computeReport(input, { now: NOW });

  assert.ok(report.nextSteps.length > 0 && report.nextSteps.length <= 3);
  for (const id of report.nextSteps) {
    assert.equal(E.CHECKS[id].owner, 'author', 'a next step must be something the author can do');
    const check = report.checks.find((c) => c.id === id);
    assert.equal(check.state, 'attention');
  }
  // Deterministic ordering across repeated computation.
  const again = E.computeReport(input, { now: NOW });
  assert.deepEqual(again.nextSteps, report.nextSteps);
});

test('next steps never contain a check whose prerequisite is unmet', () => {
  const report = E.computeReport(emptyInput(), { now: NOW });
  for (const id of report.nextSteps) {
    for (const dep of E.CHECKS[id].dependsOn) {
      const depResult = report.checks.find((c) => c.id === dep);
      assert.ok(depResult.credit >= 0.9, `${id} was suggested but ${dep} is not done`);
    }
  }
});

// ── Copy rules ─────────────────────────────────────────────────────────────

test('the report never uses examiner vocabulary', () => {
  // "Do not make the report feel like an exam" is a product requirement, and
  // these are the words that break it.
  const banned = [/\bscore\b/i, /\bincomplete\b/i, /\berror\b/i, /\binvalid\b/i, /\brequired\b/i, /\bmissing\b/i, /\bfail(ed|ure)?\b/i];
  const inputs = [emptyInput(), completeInput()];
  const broken = completeInput();
  broken.book.conversionStatus = 'failed';
  broken.book.conversion.unsupportedGlyphs = ['ɛ', 'ɔ'];
  broken.book.conversion.droppedImageCount = 2;
  broken.book.conversion.warningCodes = [{ code: 'image_dropped', count: 2 }];
  inputs.push(broken);

  for (const input of inputs) {
    const report = E.computeReport(input, { now: NOW });
    for (const check of report.checks) {
      for (const text of [check.headline, check.detail]) {
        for (const pattern of banned) {
          assert.ok(!pattern.test(text), `examiner vocabulary in "${text}" (${check.id})`);
        }
      }
    }
  }
});

test('a short work is never told it is too short', () => {
  const input = completeInput();
  input.book.conversion.wordCount = 300;
  input.book.conversion.headingLevel = null;
  input.book.conversion.chapterCount = 1;
  const report = E.computeReport(input, { now: NOW });
  const volume = report.checks.find((c) => c.id === 'text_volume');
  const structure = report.checks.find((c) => c.id === 'chapter_structure');
  assert.ok(volume.credit >= 0.6, 'a chapbook must not be penalised for being short');
  assert.ok(structure.credit >= 0.6, 'a short piece is allowed to be one continuous piece');
});

test('rights never claim verification Wolly has not performed', () => {
  const report = E.computeReport(completeInput(), { now: NOW });
  const rights = report.checks.find((c) => c.id === 'rights_declared');
  assert.match(rights.detail, /do not verify/i);
  for (const word of ['verified', 'certified', 'protected', 'proof of ownership', 'registered']) {
    // "not proof of ownership" is allowed; a bare claim is not.
    if (word === 'proof of ownership') continue;
    assert.ok(
      !new RegExp(`\\b${word}\\b`, 'i').test(rights.headline),
      `rights headline claims "${word}"`,
    );
  }
});

// ── Ghanaian orthography is a blocker, not a nicety ────────────────────────

test('a book with unrenderable characters cannot pass pre-flight', () => {
  const input = completeInput();
  input.review = { editionReviewedAt: NOW, listingApprovedAt: NOW };
  input.book.conversion.unsupportedGlyphs = ['ɛ', 'ɔ', 'ŋ'];
  const report = E.computeReport(input, { now: NOW });
  const glyphs = report.checks.find((c) => c.id === 'glyph_coverage');
  assert.equal(glyphs.credit, 0);
  assert.ok(
    E.blockingFailures(report).some((c) => c.id === 'glyph_coverage'),
    'tofu in a Ghanaian book must block publication',
  );
});

// ── Randomised monotonicity ────────────────────────────────────────────────

/**
 * The fixed-list monotonicity test above only walks paths someone thought of.
 * Violations hide in interactions, so this walks random ones: start from a
 * random partial state and fill one more field at a time, asserting the score
 * never falls. Seeded, so a failure is reproducible from its output.
 */
test('monotonicity holds along random completion paths', () => {
  let seed = 20260902;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  // Each step is (label, apply). Applying a step only ever adds information.
  const steps = [
    ['title', (i) => { i.book.title = 'T'; i.book.author = 'A'; }],
    ['description', (i) => { i.book.description = Array.from({ length: 60 }, (_, n) => `w${n}`).join(' '); }],
    ['genre', (i) => { i.book.genre = 'fiction'; i.book.language = 'English'; }],
    ['cover', (i) => { i.book.coverUrl = 'https://e.test/c.jpg'; i.book.coverMetrics = { width: 1600, height: 2400, bytes: 500000, fetchedOk: true }; }],
    ['price', (i) => { i.book.price = 15; i.book.isFree = false; }],
    ['payout', (i) => { i.author.payoutMethod = 'mobile_money'; i.author.payoutAccountRef = 'r'; }],
    ['profile', (i) => { i.author.displayName = 'A'; i.author.bio = 'a b c d e f g h i j k l'; }],
    ['rights', (i) => { i.rights = [{ format: 'ebook', territory: 'WORLD', status: 'available' }]; }],
    ['preview', (i) => { i.book.previewChapters = [1]; }],
    ['press', (i) => {
      i.book.conversionStatus = 'ready';
      i.book.conversion = {
        fingerprint: 'f', wordCount: 40000, chapterCount: 12, headingLevel: 'h1',
        emptyChapters: 0, shortestChapterWords: 800, imageCount: 2, droppedImageCount: 0,
        headingShapedParagraphs: 0, unsupportedGlyphs: [], warningCodes: [],
      };
    }],
    ['review', (i) => { i.review = { editionReviewedAt: NOW, listingApprovedAt: NOW }; }],
  ];

  for (let run = 0; run < 300; run += 1) {
    const order = [...steps].sort(() => rnd() - 0.5);
    const input = emptyInput();
    let previous = E.computeReport(input, { now: NOW });
    const applied = [];

    for (const [label, apply] of order) {
      apply(input);
      applied.push(label);
      const next = E.computeReport(input, { now: NOW });
      if (previous.score !== null && next.score !== null) {
        assert.ok(
          next.score >= previous.score,
          `score fell from ${previous.score} to ${next.score} after "${label}" ` +
            `(path: ${applied.join(' -> ')})`,
        );
      }
      previous = next;
    }
    assert.equal(previous.score, 100, `a fully completed book should reach 100, got ${previous.score}`);
  }
});

// ── The structural rule behind monotonicity ────────────────────────────────

test('no prerequisite gates more weight than it carries', () => {
  // This is the structural cause of the 79 -> 78 drop the fuzz found: excluding
  // a dependent inflates the percentage, so completing the prerequisite puts
  // that weight back at zero credit and the number falls. Asserting the graph
  // catches the next one at edit time rather than after 300 random paths.
  const unsafe = E.unsafeGates().filter((g) => g.prerequisite !== E.EXEMPT_GATE);
  assert.deepEqual(
    unsafe,
    [],
    `these prerequisites gate more weight than they carry, so completing them ` +
      `would lower the score: ${unsafe.map((g) => `${g.prerequisite} gates ${g.gatedWeight}`).join(', ')}`,
  );
});

test('the one exemption is exempt only because there is no earlier number', () => {
  // manuscript_pressed gates 36 against its own 12. Safe solely because the
  // score is null until it passes. If that ever changes, this breaks first.
  const exempt = E.unsafeGates().find((g) => g.prerequisite === E.EXEMPT_GATE);
  assert.ok(exempt, 'the exemption is no longer needed; remove it');
  const before = E.computeReport(emptyInput(), { now: NOW });
  assert.equal(before.score, null, 'the exemption depends on there being no score before the first press');
});
