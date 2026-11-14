/**
 * The revenue terms, which staff can now edit.
 *
 * Two things are under test, and only one of them is arithmetic.
 *
 * The first is that a hand-edited settings document cannot pay someone the
 * wrong amount. `authorShare: 70` typed instead of `0.7` is the single most
 * likely mistake anyone will make here, it looks correct in a console, and it
 * would pay an author seventy times the sale price.
 *
 * The second is that configurability never reaches backwards. Terms are frozen
 * on the purchase and on the transaction, so changing what Wolly offers must
 * not rewrite a sale already agreed, and must not rewrite a contract already
 * signed. That property is the whole reason the ledger exists, and it would be
 * quietly destroyed by any code path that reads the settings document at payout
 * time.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function load(file) {
  const ts = require('typescript');
  const js = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  const mod = { exports: {} };
  new Function('exports', 'module', 'require', js)(
    mod.exports,
    mod,
    (id) => (id === './revenue' ? load('revenue.ts') : require(id)),
  );
  return mod.exports;
}

const R = load('revenue.ts');
const T = load('transaction.ts');

test('a percentage typed as a percentage does not pay seventy times the sale', () => {
  // The mistake this validator exists for. 70 is not 0.7, and it looks fine.
  assert.deepEqual(R.readRevenueTerms({ authorShare: 70, basis: 'gross' }), R.DEFAULT_REVENUE_TERMS);
  assert.match(
    R.revenueTermsProblem({ authorShare: 70, basis: 'gross' }),
    /fraction, not a percentage/i,
    'and the backoffice must say what is wrong, not just refuse',
  );
});

test('nonsense in the settings document falls back rather than throwing', () => {
  // A config typo must not take checkout down. There is always an answer.
  for (const raw of [null, undefined, {}, { basis: 'net' }, { authorShare: 'x' }, { authorShare: 0 }, { authorShare: -1 }]) {
    assert.deepEqual(
      R.readRevenueTerms(raw),
      R.DEFAULT_REVENUE_TERMS,
      `expected the default for ${JSON.stringify(raw)}`,
    );
  }
});

test('the fallback is what the platform offered before the terms were editable', () => {
  // So a missing settings document changes nothing for anyone.
  assert.deepEqual(R.DEFAULT_REVENUE_TERMS, { authorShare: 0.7, basis: 'gross' });
});

test('an author share of 100% is refused, because Wolly still pays the processor', () => {
  assert.equal(R.readRevenueTerms({ authorShare: 1, basis: 'gross' }).authorShare, 0.7);
  assert.match(R.revenueTermsProblem({ authorShare: 1, basis: 'gross' }), /cannot exceed/i);
  // But a genuinely generous share is allowed.
  assert.equal(R.readRevenueTerms({ authorShare: 0.9, basis: 'gross' }).authorShare, 0.9);
  assert.equal(R.revenueTermsProblem({ authorShare: 0.9, basis: 'gross' }), null);
});

test('an unrecognised basis reads as gross, never as something in between', () => {
  assert.equal(R.readRevenueTerms({ authorShare: 0.6, basis: 'sideways' }).basis, 'gross');
  assert.equal(R.readRevenueTerms({ authorShare: 0.6 }).basis, 'gross');
});

test('the terms shown to an author say what they will actually get', () => {
  assert.equal(R.describeTerms({ authorShare: 0.7, basis: 'gross' }), 'You keep 70% of every sale.');
  assert.match(R.describeTerms({ authorShare: 0.7, basis: 'net' }), /after payment charges/);
  // A rate that is not a round percentage must not be rendered as one.
  assert.match(R.describeTerms({ authorShare: 0.655, basis: 'gross' }), /65\.5%/);
});

test('changing the platform terms cannot rewrite a sale already agreed', () => {
  // The property the whole design exists for. A purchase carries its own terms,
  // and the split reads THOSE, so what the settings document says today is
  // irrelevant to a sale agreed yesterday.
  const agreedYesterday = { authorShare: 0.7, revenueBasis: 'gross' };
  const split = T.splitSale({
    grossMinor: 5000,
    providerFeeMinor: 100,
    terms: T.termsFromPurchase(agreedYesterday),
  });
  assert.equal(split.authorShare, 0.7);
  assert.equal(split.authorEarningsMinor, 3500);
  // Even if staff have since moved the platform to a different deal entirely.
  assert.notDeepEqual(R.readRevenueTerms({ authorShare: 0.5, basis: 'net' }), agreedYesterday);
});

test('a checkout begun before the terms were configurable still pays what it promised', () => {
  // Those purchases carry royaltyRate and no basis, and they were shares of
  // gross. Reading them as the platform default would pay the wrong amount on
  // any sale that straddled the deploy.
  assert.deepEqual(T.termsFromPurchase({ royaltyRate: 0.35 }), { authorShare: 0.35, basis: 'gross' });
  assert.deepEqual(T.termsFromPurchase({ royaltyRate: 0.7 }), { authorShare: 0.7, basis: 'gross' });
  // And a purchase carrying nothing usable falls back rather than paying zero.
  assert.deepEqual(T.termsFromPurchase({}), R.DEFAULT_REVENUE_TERMS);
  assert.deepEqual(T.termsFromPurchase({ royaltyRate: null }), R.DEFAULT_REVENUE_TERMS);
});

test('the parts of a sale always sum back to the gross exactly', () => {
  // No pesewa may appear or vanish, on either basis, at any rounding.
  for (const grossMinor of [1, 199, 999, 5000, 12345]) {
    for (const providerFeeMinor of [0, 1, 49, 137]) {
      for (const basis of ['gross', 'net']) {
        for (const authorShare of [0.35, 0.5, 0.7, 0.95]) {
          const s = T.splitSale({ grossMinor, providerFeeMinor, terms: { authorShare, basis } });
          assert.equal(
            s.authorEarningsMinor + s.platformNetMinor + s.providerFeeMinor,
            s.grossMinor,
            `parts do not sum back for ${grossMinor}/${providerFeeMinor}/${basis}/${authorShare}`,
          );
          assert.ok(s.authorEarningsMinor >= 0, 'an author is never paid a negative amount');
        }
      }
    }
  }
});

test('a cheap sale can leave Wolly out of pocket, and records it rather than hiding it', () => {
  // Paystack's fee has a fixed component, so a low enough price loses money.
  // That is a pricing-floor question, and it has to be visible to be answered.
  const s = T.splitSale({ grossMinor: 100, providerFeeMinor: 60, terms: { authorShare: 0.7, basis: 'gross' } });
  assert.equal(s.authorEarningsMinor, 70, 'the author is still paid what they were promised');
  assert.ok(s.platformNetMinor < 0, 'and the loss is recorded, not clamped to zero');
});

test('on the gross basis an author earns the same however the reader paid', () => {
  // The property that makes a payout statement checkable against a receipt, and
  // the reason gross is the default.
  const terms = { authorShare: 0.7, basis: 'gross' };
  const momo = T.splitSale({ grossMinor: 5000, providerFeeMinor: 20, terms });
  const card = T.splitSale({ grossMinor: 5000, providerFeeMinor: 195, terms });
  assert.equal(momo.authorEarningsMinor, card.authorEarningsMinor);

  // On the net basis it does not, which is the cost of that choice.
  const net = { authorShare: 0.7, basis: 'net' };
  assert.notEqual(
    T.splitSale({ grossMinor: 5000, providerFeeMinor: 20, terms: net }).authorEarningsMinor,
    T.splitSale({ grossMinor: 5000, providerFeeMinor: 195, terms: net }).authorEarningsMinor,
  );
});

test('a per-book override is server-owned, or an author sets their own share', () => {
  // currentTermsFor() in services/payments prefers a book's own revenueTerms
  // over the platform settings document, so this field decides money. It was
  // shipped without being added to the rules' server-owned list, which let an
  // author write it on their own book and take up to the maximum share of every
  // sale. This asserts the two lists agree, the same way the rights registry
  // pins its own.
  const rules = fs.readFileSync(
    path.join(__dirname, '..', '..', 'firebase-config', 'firestore.rules'),
    'utf8',
  );
  const block = rules.match(/function serverOwnedBookFields\(\) \{\s*return \[([\s\S]*?)\]/);
  assert.ok(block, 'serverOwnedBookFields() not found in firestore.rules');
  const listed = block[1]
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, '').trim())
    .join('')
    .split(',')
    .map((s) => s.trim().replace(/['\s]/g, ''))
    .filter(Boolean);
  assert.ok(
    listed.includes('revenueTerms'),
    `revenueTerms must be server-owned or an author can set their own share; rules list: ${listed.join(', ')}`,
  );
});
