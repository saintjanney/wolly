/**
 * The Publishing Journey Report.
 *
 * "Your book is 78% ready for readers." This file computes that number, and it
 * is the whole reason the number can be trusted: it is a deterministic weighted
 * function over named checks, not an impression. Every point is attached to a
 * check with an owner, a measured piece of evidence, and something the author
 * can do about it.
 *
 * WHAT THE PERCENTAGE MEANS. Not "how good is this book" (Wolly cannot know
 * that and should not pretend to). It is "how much of the work of turning this
 * manuscript into a sellable book is finished". That distinction is what keeps
 * the screen from reading as a grade.
 *
 * FOUR INVARIANTS, all enforced by test in publishing-report.test.js:
 *
 *   1. DETERMINISM. Same inputs, same integer, every time. `canonicalInputs()`
 *      exists so the server can hash exactly what was scored; the hash also
 *      guards the recompute trigger against self-triggering, which means the
 *      loop guard and the determinism proof are the same mechanism.
 *   2. MONOTONICITY. COMPLETING work never lowers the score. A screen that
 *      punishes you for touching it does not get touched twice.
 *
 *      Precisely: filling in a field never reduces the number. Changing SCOPE
 *      can move it either way and that is not a violation, because the
 *      denominator is "applicable work" rather than a fixed 100. Making a book
 *      free removes the payout check entirely, so a book at 90 becomes 89: the
 *      same outstanding Wolly points over a smaller total. The test names that
 *      case explicitly rather than leaving it to be discovered.
 *   3. SINGLE CAUSE, SINGLE COST. A dependent of a failed prerequisite becomes
 *      not-applicable rather than also scoring zero, so no cover costs 10 points
 *      once, not 16.
 *   4. NO FREE POINTS. A not-applicable check leaves the denominator entirely.
 *      Awarding credit for a check that could not fail is the purest theatre,
 *      and it is what makes a percentage meaningless.
 *
 * The engine is pure and has no Firestore or Node dependency, so it runs in the
 * browser, in a function, and in a test with no emulator.
 */

import type { CoverMetrics } from './epub';

/** Bump when weights or thresholds change. See `changeReason: 'engine_update'`. */
export const ENGINE_VERSION = 1;

export type CheckId =
  | 'manuscript_pressed'
  | 'chapter_structure'
  | 'clean_conversion'
  | 'images_intact'
  | 'text_volume'
  | 'glyph_coverage'
  | 'cover_present'
  | 'cover_quality'
  | 'description'
  | 'genre_language'
  | 'preview_defined'
  | 'title_author'
  | 'payout_destination'
  | 'price_set'
  | 'rights_declared'
  | 'author_profile'
  | 'edition_reviewed'
  | 'listing_approved';

export type CheckState = 'pass' | 'attention' | 'waiting_on_wolly' | 'not_applicable';
export type CheckGroup = 'text' | 'presentation' | 'commerce' | 'wolly';
export type ReportBand = 'taking_shape' | 'nearly_there' | 'ready_for_review' | 'ready_to_publish';

export interface CheckSpec {
  weight: number;
  owner: 'author' | 'wolly';
  group: CheckGroup;
  /** Fixed tie-break, so lists never reshuffle between renders. */
  order: number;
  /** Author-facing estimate. Also ranks the next three steps. */
  effortMinutes: number;
  /** The publish pre-flight is exactly the blocking subset. Two checklists is two truths. */
  blocking: boolean;
  /**
   * Prerequisites whose failure makes this check not-applicable.
   *
   * THERE IS A WEIGHT RULE, and breaking it breaks monotonicity. Excluding a
   * dependent removes its weight from the denominator, which inflates the
   * percentage; completing the prerequisite then puts that weight back at zero
   * credit and the number FALLS. Completing work must never do that.
   *
   * The condition is: a prerequisite's weight must be at least the total weight
   * of everything it gates. `payout_destination` (8) once depended on
   * `price_set` (6), and a fuzz over random completion paths caught it exactly
   * as predicted: setting a price dropped the score from 79 to 78. Setting up
   * payouts is separate work, not a property of having a price, so the
   * dependency was wrong as well as unsafe.
   *
   * `manuscript_pressed` gates 36 points against its own 12 and is the single
   * exemption, because the score is `null` until the first successful press, so
   * there is no earlier number for it to fall from. `checkGraphIsMonotone()`
   * asserts the rule and names that exemption.
   */
  dependsOn: CheckId[];
}

/**
 * Weights are CONSTANTS, never data-dependent.
 *
 * A weight that varies with the author's progress is how a score stops being
 * reproducible, and an author who cannot reconstruct the number will not
 * believe it. They sum to 100 so the denominator is legible; `weightsSumTo100`
 * asserts it rather than trusting arithmetic done by hand.
 */
export const CHECKS: Record<CheckId, CheckSpec> = {
  manuscript_pressed: { weight: 12, owner: 'author', group: 'text', order: 1, effortMinutes: 10, blocking: true, dependsOn: [] },
  chapter_structure: { weight: 9, owner: 'author', group: 'text', order: 2, effortMinutes: 25, blocking: false, dependsOn: ['manuscript_pressed'] },
  clean_conversion: { weight: 5, owner: 'author', group: 'text', order: 3, effortMinutes: 15, blocking: false, dependsOn: ['manuscript_pressed'] },
  images_intact: { weight: 5, owner: 'author', group: 'text', order: 4, effortMinutes: 15, blocking: false, dependsOn: ['manuscript_pressed'] },
  text_volume: { weight: 4, owner: 'author', group: 'text', order: 5, effortMinutes: 60, blocking: false, dependsOn: ['manuscript_pressed'] },
  glyph_coverage: { weight: 3, owner: 'author', group: 'text', order: 6, effortMinutes: 5, blocking: true, dependsOn: ['manuscript_pressed'] },
  cover_present: { weight: 10, owner: 'author', group: 'presentation', order: 7, effortMinutes: 20, blocking: true, dependsOn: [] },
  cover_quality: { weight: 6, owner: 'author', group: 'presentation', order: 8, effortMinutes: 20, blocking: false, dependsOn: ['cover_present'] },
  description: { weight: 6, owner: 'author', group: 'presentation', order: 9, effortMinutes: 10, blocking: true, dependsOn: [] },
  genre_language: { weight: 3, owner: 'author', group: 'presentation', order: 10, effortMinutes: 2, blocking: true, dependsOn: [] },
  preview_defined: { weight: 3, owner: 'author', group: 'presentation', order: 11, effortMinutes: 3, blocking: false, dependsOn: ['manuscript_pressed'] },
  title_author: { weight: 2, owner: 'author', group: 'presentation', order: 12, effortMinutes: 1, blocking: true, dependsOn: [] },
  payout_destination: { weight: 8, owner: 'author', group: 'commerce', order: 13, effortMinutes: 5, blocking: true, dependsOn: [] },
  price_set: { weight: 6, owner: 'author', group: 'commerce', order: 14, effortMinutes: 3, blocking: true, dependsOn: [] },
  rights_declared: { weight: 6, owner: 'author', group: 'commerce', order: 15, effortMinutes: 8, blocking: true, dependsOn: [] },
  author_profile: { weight: 2, owner: 'author', group: 'commerce', order: 16, effortMinutes: 5, blocking: false, dependsOn: [] },
  edition_reviewed: { weight: 7, owner: 'wolly', group: 'wolly', order: 17, effortMinutes: 0, blocking: true, dependsOn: ['manuscript_pressed'] },
  listing_approved: { weight: 3, owner: 'wolly', group: 'wolly', order: 18, effortMinutes: 0, blocking: true, dependsOn: ['cover_present', 'description'] },
};

export const CHECK_IDS = Object.keys(CHECKS) as CheckId[];

/** Exported so the test asserts it rather than a human adding the column up. */
export function weightsTotal(): number {
  return CHECK_IDS.reduce((sum, id) => sum + CHECKS[id].weight, 0);
}

/**
 * Prerequisites whose weight is smaller than the total they gate.
 *
 * Each one is a latent monotonicity bug: completing it would put more weight
 * back into the denominator than it adds to the numerator, so the score would
 * fall for doing the right thing. Empty except for the documented exemption.
 */
export function unsafeGates(): Array<{ prerequisite: CheckId; gates: CheckId[]; gatedWeight: number }> {
  const gates = new Map<CheckId, CheckId[]>();
  for (const id of CHECK_IDS) {
    for (const dep of CHECKS[id].dependsOn) {
      gates.set(dep, [...(gates.get(dep) ?? []), id]);
    }
  }
  const out: Array<{ prerequisite: CheckId; gates: CheckId[]; gatedWeight: number }> = [];
  for (const [prerequisite, gated] of gates) {
    const gatedWeight = gated.reduce((sum, id) => sum + CHECKS[id].weight, 0);
    if (CHECKS[prerequisite].weight < gatedWeight) {
      out.push({ prerequisite, gates: gated, gatedWeight });
    }
  }
  return out;
}

/**
 * The one prerequisite allowed to gate more weight than it carries.
 *
 * Safe only because `score` is null until the press first succeeds, so no
 * earlier number exists to fall from.
 */
export const EXEMPT_GATE: CheckId = 'manuscript_pressed';

// ── Inputs ─────────────────────────────────────────────────────────────────

/** Everything the engine is allowed to look at. Nothing else may influence the score. */
export interface ScoreInput {
  book: ScoredBook;
  author: ScoredAuthor;
  rights: ScoredRight[];
  review: ScoredReview;
}

export interface ScoredBook {
  id: string;
  title?: string | null;
  author?: string | null;
  description?: string | null;
  genre?: string | null;
  language?: string | null;
  coverUrl?: string | null;
  price?: number | null;
  isFree?: boolean | null;
  isPublished?: boolean | null;
  conversionStatus?: string | null;
  conversion?: ScoredConversion | null;
  coverMetrics?: CoverMetrics | null;
  previewChapters?: number[] | null;
}

export interface ScoredConversion {
  fingerprint?: string | null;
  wordCount?: number | null;
  chapterCount?: number | null;
  /** 'h1' | 'h2' | null. Null means the manuscript carried no headings at all. */
  headingLevel?: string | null;
  emptyChapters?: number | null;
  shortestChapterWords?: number | null;
  imageCount?: number | null;
  droppedImageCount?: number | null;
  headingShapedParagraphs?: number | null;
  /** Codepoints the embedded fonts cannot render. Non-empty means tofu in the PDF. */
  unsupportedGlyphs?: string[] | null;
  warningCodes?: Array<{ code: string; count: number }> | null;
  pressedAt?: string | null;
}

export interface ScoredAuthor {
  displayName?: string | null;
  bio?: string | null;
  payoutMethod?: string | null;
  payoutAccountRef?: string | null;
}

export interface ScoredRight {
  format?: string | null;
  territory?: string | null;
  status?: string | null;
  verificationState?: 'self_declared' | 'verified' | null;
}

export interface ScoredReview {
  editionReviewedAt?: string | null;
  /** A reviewer may fail the edition, but never without naming what to change. */
  editionFindings?: string[] | null;
  listingApprovedAt?: string | null;
}

// ── Results ────────────────────────────────────────────────────────────────

export interface CheckResult {
  id: CheckId;
  state: CheckState;
  /** 0..1. */
  credit: number;
  /** The measured values, verbatim, so the number is auditable. */
  evidence: Record<string, unknown>;
  /** One line, author-facing. An action, never a defect. */
  headline: string;
  /** Why it matters, in terms of a reader rather than a rule. */
  detail: string;
  pointsAtStake: number;
}

export interface PublishingReport {
  bookId: string;
  mode: 'preparing' | 'live';
  /** Null until the press has succeeded once, so nobody ever meets a 0%. */
  score: number | null;
  band: ReportBand;
  previousScore: number | null;
  changeReason: 'author' | 'press' | 'review' | 'engine_update' | null;
  pointsWithAuthor: number;
  pointsWithWolly: number;
  checks: CheckResult[];
  nextSteps: CheckId[];
  pressingFingerprint: string | null;
  engineVersion: number;
  computedAt: string;
}

// ── Evaluators ─────────────────────────────────────────────────────────────

const words = (text: string | null | undefined): number =>
  text ? text.trim().split(/\s+/).filter(Boolean).length : 0;

function result(
  id: CheckId,
  credit: number,
  headline: string,
  detail: string,
  evidence: Record<string, unknown>,
): CheckResult {
  const spec = CHECKS[id];
  const clamped = Math.max(0, Math.min(1, credit));
  return {
    id,
    state:
      spec.owner === 'wolly' && clamped < 0.9
        ? 'waiting_on_wolly'
        : clamped >= 0.9
          ? 'pass'
          : 'attention',
    credit: clamped,
    evidence,
    headline,
    detail,
    pointsAtStake: Math.round(spec.weight * (1 - clamped)),
  };
}

function notApplicable(id: CheckId, detail: string, evidence: Record<string, unknown>): CheckResult {
  return { id, state: 'not_applicable', credit: 0, evidence, headline: '', detail, pointsAtStake: 0 };
}

type Evaluator = (input: ScoreInput) => CheckResult;

const EVALUATORS: Record<CheckId, Evaluator> = {
  manuscript_pressed: ({ book }) => {
    const ready = book.conversionStatus === 'ready';
    return result(
      'manuscript_pressed',
      ready ? 1 : 0,
      ready ? 'Your manuscript is typeset' : 'Upload your manuscript',
      ready
        ? 'Wolly has made an EPUB and a print-ready PDF from your file.'
        : 'Wolly turns your Word, Markdown or text file into a book readers can open on any device.',
      { conversionStatus: book.conversionStatus ?? null },
    );
  },

  chapter_structure: ({ book }) => {
    const c = book.conversion ?? {};
    const level = c.headingLevel ?? null;
    const wordCount = c.wordCount ?? 0;
    const empty = c.emptyChapters ?? 0;
    const shortest = c.shortestChapterWords ?? null;
    const headingShaped = c.headingShapedParagraphs ?? 0;
    const evidence = { headingLevel: level, wordCount, emptyChapters: empty, shortestChapterWords: shortest, headingShapedParagraphs: headingShaped };

    if (level === null && wordCount >= 8000) {
      return result('chapter_structure', 0, 'Mark your chapter titles as headings',
        'Readers cannot jump between chapters yet, and a long book without chapter marks is hard to come back to.', evidence);
    }
    if (level === null) {
      // A short story is allowed to be one piece. This is never a failure.
      return result('chapter_structure', 0.6, 'This reads as one continuous piece',
        'That is fine for a short work. Marking headings would let readers jump around.', evidence);
    }
    if (headingShaped >= 3) {
      return result('chapter_structure', 0.7, `${headingShaped} lines look like chapter titles but are not marked as headings`,
        'Marking them lets readers jump straight to a chapter.', evidence);
    }
    if (empty > 0 || (shortest !== null && shortest < 120)) {
      return result('chapter_structure', 0.6, 'Some chapters came through very short or empty',
        'Usually a stray page break. Worth a look before readers see it.', evidence);
    }
    return result('chapter_structure', 1, `${c.chapterCount ?? 0} chapters, ready to navigate`,
      'Readers can jump straight to any chapter.', evidence);
  },

  clean_conversion: ({ book }) => {
    // Only author-actionable codes count. Showing someone a Word style name is
    // how a report starts feeling like an exam it wrote itself.
    const codes = (book.conversion?.warningCodes ?? []).filter((w) => AUTHOR_ACTIONABLE.has(w.code));
    const n = codes.reduce((sum, w) => sum + (w.count || 1), 0);
    const credit = n === 0 ? 1 : n <= 2 ? 0.7 : n <= 5 ? 0.4 : 0.1;
    return result('clean_conversion', credit,
      n === 0 ? 'Your manuscript converted cleanly' : `${n} thing${n === 1 ? '' : 's'} to look at in the conversion`,
      n === 0 ? 'Nothing was dropped or changed.' : 'These are parts of your file Wolly could not carry across exactly.',
      { actionableWarnings: n, codes: codes.map((c) => c.code) });
  },

  images_intact: ({ book }) => {
    const c = book.conversion ?? {};
    const total = c.imageCount ?? 0;
    const dropped = c.droppedImageCount ?? 0;
    if (total === 0 && dropped === 0) {
      return result('images_intact', 1, 'No images to carry across',
        'Your book is text only.', { imageCount: 0, droppedImageCount: 0 });
    }
    const credit = dropped === 0 ? 1 : Math.max(0.1, 1 - dropped / Math.max(1, total + dropped));
    return result('images_intact', credit,
      dropped === 0 ? `All ${total} images came through` : `${dropped} image${dropped === 1 ? '' : 's'} could not be used`,
      dropped === 0 ? 'Every picture in your manuscript is in the book.' : 'Usually an unsupported format. PNG and JPEG always work.',
      { imageCount: total, droppedImageCount: dropped });
  },

  text_volume: ({ book }) => {
    const wordCount = book.conversion?.wordCount ?? 0;
    // Never below 0.6: telling a poet their chapbook is too short is the worst
    // first impression this screen could make.
    const credit = wordCount < 500 ? 0.6 : wordCount < 5000 ? 0.8 : 1;
    return result('text_volume', credit, `${wordCount.toLocaleString()} words`,
      wordCount < 500 ? 'A short piece. Readers will expect a price to match.' : 'A full-length read.',
      { wordCount });
  },

  glyph_coverage: ({ book }) => {
    const missing = book.conversion?.unsupportedGlyphs ?? [];
    if (missing.length === 0) {
      return result('glyph_coverage', 1, 'Every character in your book renders',
        'Including any Twi, Ewe, Ga or Dagbani spelling.', { unsupportedGlyphs: [] });
    }
    return result('glyph_coverage', 0, `${missing.length} character${missing.length === 1 ? '' : 's'} cannot be printed`,
      `Your readers would see empty boxes where ${missing.slice(0, 4).join(' ')} should be. Tell us and we will add them.`,
      { unsupportedGlyphs: missing });
  },

  cover_present: ({ book }) => {
    const has = Boolean(book.coverUrl) && book.coverMetrics?.fetchedOk !== false;
    return result('cover_present', has ? 1 : 0,
      has ? 'Your cover is in place' : 'Add a cover',
      has ? 'It is the first thing a reader sees.' : 'A cover is the single biggest thing that decides whether someone opens your book.',
      { coverUrl: Boolean(book.coverUrl), fetchedOk: book.coverMetrics?.fetchedOk ?? null });
  },

  cover_quality: ({ book }) => {
    const m = book.coverMetrics;
    if (!m || !m.width || !m.height) {
      return result('cover_quality', 1, 'Cover looks fine', 'Nothing to change.', { measured: false });
    }
    const shortest = Math.min(m.width, m.height);
    const ratio = m.height / m.width;
    let credit = shortest < 1000 ? 0.2 : shortest < 1400 ? 0.6 : 1;
    if (ratio < 1.4 || ratio > 1.75) credit = Math.min(credit, 0.5);
    if ((m.bytes ?? 0) > 5_000_000) credit = Math.min(credit, 0.8);
    return result('cover_quality', credit,
      credit >= 0.9 ? 'Your cover is sharp at every size' : 'Your cover could be sharper',
      'Readers browsing on a phone see your cover at about the size of a stamp.',
      { width: m.width, height: m.height, bytes: m.bytes ?? null });
  },

  description: ({ book }) => {
    const n = words(book.description);
    const credit = n < 1 ? 0 : n < 25 ? 0.4 : n < 40 ? 0.7 : n > 400 ? 0.8 : 1;
    return result('description', credit,
      n < 1 ? 'Write a short description' : credit >= 0.9 ? 'Your description is ready' : 'Your description could say a little more',
      'This is what a reader reads before deciding to buy.', { descriptionWords: n });
  },

  genre_language: ({ book }) => {
    const has = Boolean(book.genre) && Boolean(book.language);
    return result('genre_language', has ? 1 : 0,
      has ? 'Genre and language set' : 'Choose a genre and language',
      'This is how readers find your book when they are browsing.',
      { genre: Boolean(book.genre), language: Boolean(book.language) });
  },

  preview_defined: ({ book }) => {
    const has = (book.previewChapters?.length ?? 0) > 0;
    return result('preview_defined', has ? 1 : 0.5,
      has ? 'Your free preview is set' : 'Choose what readers can preview',
      'A preview is how a stranger decides to buy. Wolly uses your first chapter unless you pick.',
      { previewChapters: book.previewChapters ?? null });
  },

  title_author: ({ book }) => {
    const has = Boolean(book.title?.trim()) && Boolean(book.author?.trim());
    return result('title_author', has ? 1 : 0,
      has ? 'Title and author name set' : 'Add your title and name',
      'These appear on the cover page of the book Wolly typesets.',
      { title: Boolean(book.title), author: Boolean(book.author) });
  },

  payout_destination: ({ book, author }) => {
    if (book.isFree === true) {
      // Not-applicable rather than a free point: a free book has no payout work,
      // so the check leaves the denominator instead of inflating the score.
      return notApplicable('payout_destination', 'Your book is free, so there is nothing to pay out.', { isFree: true });
    }
    const has = Boolean(author.payoutMethod) && Boolean(author.payoutAccountRef);
    return result('payout_destination', has ? 1 : 0,
      has ? 'We know where to send your earnings' : 'Tell us where to send your earnings',
      'Mobile money or a bank account. Wolly cannot pay you without it.',
      { payoutMethod: Boolean(author.payoutMethod) });
  },

  price_set: ({ book }) => {
    const free = book.isFree === true;
    const priced = typeof book.price === 'number' && book.price > 0;
    return result('price_set', free || priced ? 1 : 0,
      free ? 'Your book is free' : priced ? 'Your price is set' : 'Set a price',
      'You can change it whenever you like.', { isFree: free, price: book.price ?? null });
  },

  rights_declared: ({ rights }) => {
    const has = rights.length > 0;
    return result('rights_declared', has ? 1 : 0,
      has ? 'You have told us which rights you hold' : 'Tell us which rights you hold',
      // Never a shield, a badge, or the word verified. See RIGHTS.md.
      has
        ? 'We record what you tell us. We do not verify it, and this record is not proof of ownership.'
        : 'Which formats and countries you control. We record what you tell us; we do not verify it.',
      { grants: rights.length, selfDeclared: rights.filter((r) => r.verificationState !== 'verified').length });
  },

  author_profile: ({ author }) => {
    const has = Boolean(author.displayName?.trim()) && words(author.bio) >= 10;
    return result('author_profile', has ? 1 : 0.4,
      has ? 'Your author profile is ready' : 'Add a short note about yourself',
      'Readers deciding on an unfamiliar book often read the author first.',
      { displayName: Boolean(author.displayName), bioWords: words(author.bio) });
  },

  edition_reviewed: ({ review }) => {
    const findings = review.editionFindings ?? [];
    if (findings.length > 0) {
      return result('edition_reviewed', 0, 'We found something to fix in your edition',
        findings[0], { findings });
    }
    const done = Boolean(review.editionReviewedAt);
    return result('edition_reviewed', done ? 1 : 0,
      done ? 'We have read through your edition' : 'Wolly reads through your edition',
      'Someone at Wolly opens the book and checks it reads properly before it goes out.',
      { editionReviewedAt: review.editionReviewedAt ?? null });
  },

  listing_approved: ({ review }) => {
    const done = Boolean(review.listingApprovedAt);
    return result('listing_approved', done ? 1 : 0,
      done ? 'Your listing is approved' : 'Wolly checks your book page',
      'A last look at the cover, description and price before readers see them.',
      { listingApprovedAt: review.listingApprovedAt ?? null });
  },
};

/**
 * Warning codes an author can actually do something about.
 *
 * Everything else is engine noise (mammoth reporting an unrecognised Word
 * style, for instance) and never enters the score or the screen.
 */
export const AUTHOR_ACTIONABLE = new Set([
  'image_dropped',
  'image_unreadable',
  'cover_fetch_failed',
  'mojibake',
  'encoding_fallback',
  'remote_image_dropped',
]);

// ── The computation ────────────────────────────────────────────────────────

export function computeReport(
  input: ScoreInput,
  options: { previous?: PublishingReport | null; now?: string } = {},
): PublishingReport {
  const results = CHECK_IDS.map((id) => EVALUATORS[id](input));
  const byId = new Map(results.map((r) => [r.id, r]));

  // Single cause, single cost. A dependent of a zeroed prerequisite is not
  // scored at all, so one missing thing is charged once.
  for (const r of results) {
    const unmet = CHECKS[r.id].dependsOn.some((d) => (byId.get(d)?.credit ?? 0) === 0);
    if (unmet) {
      r.state = 'not_applicable';
      r.credit = 0;
      r.pointsAtStake = 0;
    }
  }

  const scored = results.filter((r) => r.state !== 'not_applicable');
  const denom = scored.reduce((s, r) => s + CHECKS[r.id].weight, 0);
  const numer = scored.reduce((s, r) => s + CHECKS[r.id].weight * r.credit, 0);
  const raw = denom === 0 ? 0 : (100 * numer) / denom;

  const pressed = input.book.conversionStatus === 'ready';
  const everPressed = pressed || Boolean(input.book.conversion?.fingerprint);

  // Capped at 45 until the press succeeds, so a book that cannot be converted
  // can never read as nearly ready. Null before the first press, so nobody
  // ever meets a 0%.
  const score = !everPressed ? null : Math.round(pressed ? raw : Math.min(raw, 45));

  const remaining = (owner: 'author' | 'wolly') =>
    denom === 0
      ? 0
      : Math.round(
          (scored
            .filter((r) => CHECKS[r.id].owner === owner)
            .reduce((s, r) => s + CHECKS[r.id].weight * (1 - r.credit), 0) *
            100) /
            denom,
        );

  return {
    bookId: input.book.id,
    mode: input.book.isPublished ? 'live' : 'preparing',
    score,
    band: bandFor(score),
    previousScore: options.previous?.score ?? null,
    changeReason: changeReasonFor(options.previous ?? null, score),
    pointsWithAuthor: remaining('author'),
    pointsWithWolly: remaining('wolly'),
    checks: results,
    nextSteps: selectNextSteps(results),
    pressingFingerprint: input.book.conversion?.fingerprint ?? null,
    engineVersion: ENGINE_VERSION,
    computedAt: options.now ?? new Date().toISOString(),
  };
}

export function bandFor(score: number | null): ReportBand {
  if (score === null || score < 55) return 'taking_shape';
  if (score < 80) return 'nearly_there';
  if (score < 100) return 'ready_for_review';
  return 'ready_to_publish';
}

function changeReasonFor(
  previous: PublishingReport | null,
  score: number | null,
): PublishingReport['changeReason'] {
  if (!previous || previous.score === null || score === null) return null;
  if (previous.engineVersion !== ENGINE_VERSION) return 'engine_update';
  if (score === previous.score) return null;
  return 'author';
}

/**
 * The next three steps.
 *
 * Ranked by blocking first, then points per unit of effort (square-rooted, so
 * an eight-point twenty-five-minute fix is not beaten forever by a two-point
 * one-minute one), then a fixed order as a deterministic tie-break.
 *
 * Two constraints keep the list humane: at most one long task, so it never
 * reads as a wall, and at most two from the same group, so it is never three
 * metadata fields in a row. Relaxed on a second pass if fewer than three
 * qualify, because showing two real steps beats padding with invented work.
 */
export function selectNextSteps(results: CheckResult[]): CheckId[] {
  const byId = new Map(results.map((r) => [r.id, r]));
  const open = results.filter(
    (r) =>
      CHECKS[r.id].owner === 'author' &&
      r.state === 'attention' &&
      CHECKS[r.id].dependsOn.every((d) => (byId.get(d)?.credit ?? 0) >= 0.9),
  );

  const ranked = [...open].sort(
    (a, b) =>
      Number(CHECKS[b.id].blocking) - Number(CHECKS[a.id].blocking) ||
      b.pointsAtStake / Math.sqrt(CHECKS[b.id].effortMinutes || 1) -
        a.pointsAtStake / Math.sqrt(CHECKS[a.id].effortMinutes || 1) ||
      CHECKS[a.id].order - CHECKS[b.id].order,
  );

  const out: CheckId[] = [];
  const pick = (strict: boolean) => {
    const groups = new Map<CheckGroup, number>();
    let longTasks = 0;
    for (const id of out) {
      const s = CHECKS[id];
      if (s.effortMinutes > 20) longTasks += 1;
      groups.set(s.group, (groups.get(s.group) ?? 0) + 1);
    }
    for (const r of ranked) {
      if (out.length === 3) break;
      if (out.includes(r.id)) continue;
      const spec = CHECKS[r.id];
      if (strict && spec.effortMinutes > 20 && longTasks >= 1) continue;
      if (strict && (groups.get(spec.group) ?? 0) >= 2) continue;
      if (spec.effortMinutes > 20) longTasks += 1;
      groups.set(spec.group, (groups.get(spec.group) ?? 0) + 1);
      out.push(r.id);
    }
  };
  pick(true);
  pick(false);
  return out;
}

/**
 * A stable string of exactly what was scored.
 *
 * The server hashes this to guard the recompute trigger against re-triggering
 * itself on its own write. That the same value also proves determinism is a
 * pleasant coincidence worth keeping: if the hash matches, the score must.
 *
 * Hashing is left to the caller so this module stays free of `node:crypto` and
 * runs unchanged in a browser.
 */
export function canonicalInputs(input: ScoreInput): string {
  return JSON.stringify(sortDeep(input));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortDeep((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

/** The publish pre-flight is the blocking subset of the same checks, never separate logic. */
export function blockingFailures(report: PublishingReport): CheckResult[] {
  return report.checks.filter((r) => CHECKS[r.id].blocking && r.state !== 'pass');
}
