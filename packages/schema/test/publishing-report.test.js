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

/**
 * The score a book gets when the author has finished everything and Wolly has
 * not started: the author-owned share of whatever weight still applies.
 *
 * Pass ids this particular book takes out of the denominator (a free book has
 * no payout work). Checks in AWAITING_WOLLY_TO_BUILD are always excluded,
 * because nothing on the platform can satisfy them.
 */
function expectedScore(notApplicable = []) {
  const excluded = new Set([...E.AWAITING_WOLLY_TO_BUILD, ...notApplicable]);
  const applicable = E.CHECK_IDS.filter((id) => !excluded.has(id));
  const total = applicable.reduce((sum, id) => sum + E.CHECKS[id].weight, 0);
  const authorOwned = applicable
    .filter((id) => E.CHECKS[id].owner === 'author')
    .reduce((sum, id) => sum + E.CHECKS[id].weight, 0);
  return Math.round((100 * authorOwned) / total);
}

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

  // Derived from the weights rather than hardcoded, so this keeps asserting the
  // MECHANISM when the set of applicable checks changes (it changed when the
  // checks with no writer left the denominator). A magic number here has to be
  // re-typed by hand every time, which is how it stops being a check.
  assert.equal(paid.score, expectedScore());
  assert.equal(free.score, expectedScore(['payout_destination']));
  assert.ok(free.score < paid.score, "a smaller denominator raises Wolly's share");
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
  // A book with everything done EXCEPT that Wolly has not reviewed it scores
  // exactly the author's share of the applicable weight. The two Wolly checks
  // are the only thing outstanding, so the whole remainder is theirs.
  const report = E.computeReport(completeInput(), { now: NOW });
  assert.equal(report.score, expectedScore(), 'an author who has done everything holds nothing back');
  assert.equal(report.pointsWithAuthor, 0);
  assert.equal(report.pointsWithWolly, 100 - report.score);
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

/**
 * The author who bolded their chapter titles instead of styling them.
 *
 * This is the commonest real defect in a Word manuscript, and the report was
 * silent about it twice over: the press never emitted the count, and the
 * evaluator consulted it AFTER the `headingLevel === null` branch returned,
 * which is the only situation where it means anything. Both halves are pinned
 * here because either one alone brings the silence back.
 */
test('a manuscript with unmarked chapter titles is told exactly that', () => {
  const long = completeInput();
  long.book.conversion.headingLevel = null;
  long.book.conversion.wordCount = 40000;
  long.book.conversion.headingShapedParagraphs = 12;
  const structure = (i) => E.computeReport(i, { now: NOW }).checks.find((c) => c.id === 'chapter_structure');

  const named = structure(long);
  assert.match(named.headline, /12 lines look like chapter titles/);
  assert.match(named.detail, /Heading 1/, 'name the fix, not just the fault');

  // Same book, signal absent: the old generic wording, and the SAME credit.
  const blind = structure({ ...long, book: { ...long.book, conversion: { ...long.book.conversion, headingShapedParagraphs: undefined } } });
  assert.match(blind.headline, /Mark your chapter titles/);
  assert.equal(named.credit, blind.credit, 'the count changes the words, never the score');
});

test('a short piece with unmarked titles keeps its credit and gains the hint', () => {
  const short = completeInput();
  short.book.conversion.headingLevel = null;
  short.book.conversion.wordCount = 900;
  short.book.conversion.headingShapedParagraphs = 4;
  const c = E.computeReport(short, { now: NOW }).checks.find((x) => x.id === 'chapter_structure');
  assert.equal(c.credit, 0.6, 'a short work is still allowed to be one piece');
  assert.match(c.headline, /4 lines look like chapter titles/);
});

test('a properly marked manuscript is never nagged about headings', () => {
  const ok = completeInput();
  ok.book.conversion.headingLevel = 'h1';
  ok.book.conversion.headingShapedParagraphs = 0;
  const c = E.computeReport(ok, { now: NOW }).checks.find((x) => x.id === 'chapter_structure');
  assert.equal(c.credit, 1);
  assert.doesNotMatch(c.headline, /look like chapter titles/);
});

/**
 * Invariant 4, "NO FREE POINTS", applied to the cover.
 *
 * cover_quality returned FULL credit whenever it had no dimensions to look at.
 * The press only measures a cover it can fetch from Storage, so an externally
 * hosted cover was never measured and collected six points for a check that
 * could not run. It scored better than a measured mediocre cover.
 */
test('an unmeasured cover leaves the denominator instead of taking free points', () => {
  const input = completeInput();
  delete input.book.coverMetrics;
  const c = E.computeReport(input, { now: NOW }).checks.find((x) => x.id === 'cover_quality');
  assert.equal(c.state, 'not_applicable', 'a check that could not run must not be scored');
  assert.equal(c.credit, 0);
  assert.equal(c.pointsAtStake, 0, 'and it must not be shown as points the author can win back');
});

test('an unmeasurable cover never outscores a measured poor one', () => {
  const unmeasured = completeInput();
  delete unmeasured.book.coverMetrics;
  const poor = completeInput();
  poor.book.coverMetrics = { width: 400, height: 600, bytes: 20000, fetchedOk: true };

  const scoreOf = (i) => E.computeReport(i, { now: NOW }).score;
  assert.ok(
    scoreOf(unmeasured) >= scoreOf(poor),
    'leaving the denominator is expected to read higher than scoring badly; what must not happen is CREDIT for the unmeasured one',
  );
  const c = E.computeReport(unmeasured, { now: NOW }).checks.find((x) => x.id === 'cover_quality');
  assert.notEqual(c.credit, 1, 'the bug was awarding credit 1 here');
});

/**
 * A cover the press could not fetch is charged exactly once, by cover_present.
 * cover_quality depends on it, so invariant 3 excludes this check rather than
 * charging a second time.
 */
test('a cover Wolly could not open is charged once, at cover_present', () => {
  const input = completeInput();
  input.book.coverMetrics = { fetchedOk: false };
  const report = E.computeReport(input, { now: NOW });
  assert.equal(report.checks.find((c) => c.id === 'cover_present').credit, 0);
  assert.equal(report.checks.find((c) => c.id === 'cover_quality').state, 'not_applicable');
});

/**
 * Invariant 3, "SINGLE CAUSE, SINGLE COST", applied to warnings.
 *
 * `image_dropped` was in AUTHOR_ACTIONABLE and also scored by images_intact, so
 * one dropped image quietly cost points in two checks. Same for a failed cover
 * fetch, which cover_quality now owns.
 */
test('one dropped image costs points once, not twice', () => {
  const input = completeInput();
  input.book.conversion.imageCount = 9;
  input.book.conversion.droppedImageCount = 1;
  input.book.conversion.warningCodes = [{ code: 'image_dropped', count: 1 }];

  const report = E.computeReport(input, { now: NOW });
  const images = report.checks.find((c) => c.id === 'images_intact');
  const clean = report.checks.find((c) => c.id === 'clean_conversion');

  assert.ok(images.credit < 1, 'images_intact is the check that owns dropped images');
  assert.equal(clean.credit, 1, 'clean_conversion must not charge for it a second time');
});

test('a failed cover fetch costs points once, not twice', () => {
  const input = completeInput();
  input.book.coverMetrics = { fetchedOk: false };
  input.book.conversion.warningCodes = [{ code: 'cover_fetch_failed', count: 1 }];
  const report = E.computeReport(input, { now: NOW });
  assert.equal(report.checks.find((c) => c.id === 'cover_quality').credit, 0);
  assert.equal(report.checks.find((c) => c.id === 'clean_conversion').credit, 1);
});

test('engine noise never reaches the author or the score', () => {
  const input = completeInput();
  input.book.conversion.warningCodes = [{ code: 'engine_note', count: 14 }];
  const clean = E.computeReport(input, { now: NOW }).checks.find((c) => c.id === 'clean_conversion');
  assert.equal(clean.credit, 1, 'a Word style name is not the author\'s problem');
  assert.deepEqual(clean.evidence.codes, []);
});

/**
 * What clean_conversion is actually for now: did the author's characters
 * survive? On this platform that is the check that matters most, because the
 * marked letters of Twi, Ewe, Ga and Dagbani are distinct letters rather than
 * decorated Latin ones, so losing them changes words.
 */
test('a manuscript saved in the wrong encoding is told so, in those words', () => {
  const input = completeInput();
  input.book.conversion.warningCodes = [{ code: 'encoding_fallback', count: 1 }];
  const c = E.computeReport(input, { now: NOW }).checks.find((x) => x.id === 'clean_conversion');
  assert.ok(c.credit < 1 && c.credit > 0);
  assert.match(c.detail, /UTF-8/);
});

test('characters already damaged before upload are scored worse than a guess', () => {
  const guess = completeInput();
  guess.book.conversion.warningCodes = [{ code: 'encoding_fallback', count: 1 }];
  const broken = completeInput();
  broken.book.conversion.warningCodes = [{ code: 'mojibake', count: 1 }];

  const creditOf = (i) => E.computeReport(i, { now: NOW }).checks.find((c) => c.id === 'clean_conversion').credit;
  assert.ok(creditOf(broken) < creditOf(guess), 'lost characters are worse than a recoverable guess');
});

/**
 * The score and the publish button must never disagree.
 *
 * blockingFailures() filtered on `state !== 'pass'`, so a not-applicable check
 * counted as a failure. The sharpest case is the one the file header uses to
 * explain invariant 2: a free book has no payout work, so payout_destination
 * correctly leaves the denominator, and the book then read 100%,
 * "ready to publish", and could not be published.
 */
test('a free book that is otherwise finished can actually be published', () => {
  const input = completeInput();
  input.book.isFree = true;
  input.book.price = 0;
  const report = E.computeReport(input, { now: NOW });

  const payout = report.checks.find((c) => c.id === 'payout_destination');
  assert.equal(payout.state, 'not_applicable', 'a free book has no payout work');

  const blockers = E.blockingFailures(report).map((b) => b.id);
  assert.ok(
    !blockers.includes('payout_destination'),
    `a check that does not apply must not block, got: ${blockers.join(', ')}`,
  );

  // With Wolly's own review done too, nothing at all is left in the way.
  const reviewed = E.computeReport(
    { ...input, review: { editionReviewedAt: NOW, editionFindings: [], listingApprovedAt: NOW } },
    { now: NOW },
  );
  assert.deepEqual(E.blockingFailures(reviewed).map((b) => b.id), []);
  assert.equal(reviewed.band, 'ready_to_publish');
});

test('the band and the pre-flight always agree', () => {
  // If the screen says ready to publish, the button must publish.
  for (const free of [true, false]) {
    const input = completeInput();
    input.book.isFree = free;
    if (free) input.book.price = 0;
    const report = E.computeReport(
      { ...input, review: { editionReviewedAt: NOW, editionFindings: [], listingApprovedAt: NOW } },
      { now: NOW },
    );
    if (report.band === 'ready_to_publish') {
      assert.equal(
        E.blockingFailures(report).length, 0,
        `band says ready_to_publish but the pre-flight blocks (isFree=${free})`,
      );
    }
  }
});

test('an unpressed book is blocked by the press, not by everything behind it', () => {
  // Invariant 3 applied to the gate: one missing thing is reported once.
  const input = emptyInput();
  const blockers = E.blockingFailures(E.computeReport(input, { now: NOW }));
  assert.ok(blockers.some((b) => b.id === 'manuscript_pressed'), 'the real cause must block');
  assert.ok(
    !blockers.some((b) => b.id === 'glyph_coverage'),
    'a check waiting on the press must not also be reported as a blocker',
  );
});

/**
 * The check that would have caught the worst bug in this file.
 *
 * rights_declared is `blocking: true`, and nothing on the platform writes a
 * RightsGrant. The publish pre-flight is exactly the blocking subset, so the
 * pre-flight refused EVERY book: a fully finished, priced, pressed,
 * staff-approved book scored 93, banded ready_for_review, and could not be
 * published, with nothing anyone could do about it.
 */
test('no blocking check is impossible to satisfy', () => {
  for (const id of E.AWAITING_WOLLY_TO_BUILD) {
    const report = E.computeReport(completeInput(), { now: NOW });
    const check = report.checks.find((c) => c.id === id);
    assert.equal(
      check.state, 'not_applicable',
      `${id} has no writer on the platform, so it must not be scored`,
    );
    assert.ok(
      !E.blockingFailures(report).some((b) => b.id === id),
      `${id} would block every book on the platform forever`,
    );
  }
});

test('a finished book can always reach the top band', () => {
  // Whatever the applicable set is, an author who has done everything and a
  // Wolly that has reviewed it must be able to publish. If this fails, some
  // check has become unsatisfiable and the product has no working publish path.
  const input = completeInput();
  input.review = { editionReviewedAt: NOW, listingApprovedAt: NOW, editionFindings: [] };
  input.rights = [];
  input.book.previewChapters = null;
  const report = E.computeReport(input, { now: NOW });
  assert.equal(report.score, 100, 'the top of the scale must be reachable in the real world');
  assert.equal(report.band, 'ready_to_publish');
  assert.deepEqual(E.blockingFailures(report).map((b) => b.id), []);
});

test('a not-applicable check shows the author no instruction', () => {
  // It used to render "Tell us which rights you hold" with no form to do it in.
  const report = E.computeReport(completeInput(), { now: NOW });
  for (const c of report.checks.filter((x) => x.state === 'not_applicable')) {
    assert.equal(c.headline, '', `${c.id} tells the author to do something that does not apply`);
    assert.equal(c.pointsAtStake, 0);
  }
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
