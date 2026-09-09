/**
 * The publishing contract.
 *
 * The product's words for the publish flow were "it will be like they are
 * creating a publishing contract with Wolly", and this is that record. What is
 * under test is mostly not arithmetic:
 *
 *   - the terms are frozen at signing, so changing what Wolly offers later
 *     cannot change what an author already agreed to;
 *   - the wording is stored verbatim, because "they accepted" is worth little
 *     without "to what words";
 *   - and nothing in that wording claims something Wolly cannot do. RIGHTS.md
 *     is explicit that Wolly cannot remove copies already downloaded, so an
 *     agreement promising otherwise would be a lie with a signature on it.
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

const C = load('contract.ts');
const R = load('revenue.ts');

test('the agreement never claims Wolly verified or registered anything', () => {
  const { text } = C.PUBLISHING_AGREEMENT_V1;
  // The same vocabulary ban RIGHTS.md applies to every rights surface. A
  // contract is the surface where such a claim would do the most damage,
  // because it would be a claim the author has signed their name under.
  for (const banned of ['registered', 'certified', 'protected', 'secured', 'ownership confirmed']) {
    assert.ok(
      !new RegExp(`\\b${banned}\\b`, 'i').test(text),
      `the agreement uses banned vocabulary: "${banned}"`,
    );
  }
  assert.match(text, /does not verify/i);
  assert.match(text, /not a copyright registration/i);
});

test('the agreement does not promise a takedown Wolly cannot perform', () => {
  // RIGHTS.md, section 3: revoking stops new download links and cannot touch
  // copies already downloaded. An agreement that said otherwise would be
  // promising, in writing, the one thing the platform is careful never to claim.
  const { text } = C.PUBLISHING_AGREEMENT_V1;
  for (const banned of ['destroy', 'destroyed', 'wipe', 'wiped', 'remotely erase', 'delete all copies']) {
    assert.ok(
      !new RegExp(banned, 'i').test(text),
      `the agreement promises "${banned}", which Wolly cannot do`,
    );
  }
  assert.match(text, /does not remove copies readers have already downloaded/i);
});

test('the agreement tells the author their rate is fixed', () => {
  // The single most important consequence of the terms being staff-editable.
  // An author who is not told this has no reason to believe the number.
  assert.match(C.PUBLISHING_AGREEMENT_V1.text, /does not change/i);
  assert.match(C.PUBLISHING_AGREEMENT_V1.text, /fixed for this agreement/i);
});

test('the agreement is versioned, so wording can change without rewriting history', () => {
  assert.match(C.PUBLISHING_AGREEMENT_V1.version, /^wolly-publishing-agreement-v\d+$/);
  // Contracts store the text they were signed against, not a pointer to it, so
  // an old record stays readable after the constant is replaced.
  assert.ok(C.PUBLISHING_AGREEMENT_V1.text.length > 200, 'the stored text is the whole agreement');
});

test('a contract describes itself in terms the author can check', () => {
  assert.equal(
    C.describeContract({ authorShare: 0.7, revenueBasis: 'gross', priceMinor: 5000, currency: 'GHS', isFree: false }),
    'GHS 50.00. You keep 70% of every sale.',
  );
  assert.match(
    C.describeContract({ authorShare: 0.7, revenueBasis: 'net', priceMinor: 5000, currency: 'GHS', isFree: false }),
    /after payment charges/,
  );
  assert.match(
    C.describeContract({ authorShare: 0.7, revenueBasis: 'gross', priceMinor: 0, currency: 'GHS', isFree: true }),
    /No money changes hands/,
  );
});

test('a rate that is not a round percentage is not displayed as one', () => {
  assert.match(
    C.describeContract({ authorShare: 0.655, revenueBasis: 'gross', priceMinor: 1000, currency: 'GHS', isFree: false }),
    /65\.5%/,
  );
});

test('an ended contract is kept, and stops governing the book', () => {
  // Contracts are not deleted: the record of what was agreed outlives the
  // agreement, which is the whole reason to store one.
  assert.equal(C.isLiveContract({ state: 'pending' }), true, 'signed, awaiting Wolly review');
  assert.equal(C.isLiveContract({ state: 'active' }), true);
  assert.equal(C.isLiveContract({ state: 'ended' }), false);
});

test('the contract freezes the terms rather than pointing at them', () => {
  // If a contract stored a reference to the platform settings instead of the
  // numbers, a staff edit would silently change what every author had signed.
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'contract.ts'), 'utf8');
  const shape = src.slice(src.indexOf('export interface PublishingContract'), src.indexOf('SERVER_OWNED_CONTRACT_FIELDS'));
  assert.match(shape, /authorShare: number/, 'the share is a number on the contract');
  assert.match(shape, /revenueBasis: RevenueBasis/);
  assert.ok(
    !/REVENUE_SETTINGS_PATH|settingsRef|termsRef/.test(shape),
    'a contract must not point at the editable settings document',
  );
});

test('the platform default is what a contract signed today would carry', () => {
  // Not a coupling, a sanity check: the publish screen shows the platform terms
  // and the contract records them, so if these ever disagreed the author would
  // be shown one number and signed to another.
  assert.deepEqual(R.DEFAULT_REVENUE_TERMS, { authorShare: 0.7, basis: 'gross' });
});

test('every field the contract freezes is one no client may write', () => {
  // Changing a price means signing a new contract, not editing an old one.
  for (const field of ['authorShare', 'revenueBasis', 'priceMinor', 'state', 'agreement']) {
    assert.ok(
      C.SERVER_OWNED_CONTRACT_FIELDS.includes(field),
      `${field} decides money or consent and must be server-owned`,
    );
  }
});
