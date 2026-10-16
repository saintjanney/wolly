/**
 * Cross-workspace contract checks.
 *
 * Some invariants span the creator-hub and this service with no shared module
 * to hold them, because services/api deliberately avoids depending on
 * @wolly/schema (a workspace dependency breaks Cloud Functions packaging, which
 * installs from the public registry). Where that leaves a string agreement
 * between two files, assert it here rather than trusting a comment.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '../../..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(REPO, relativePath), 'utf8');
}

test('the paywall node name matches between the composer and the renderer', () => {
  // If these drift, the failure is SILENT and severe: the server's split looks
  // for a node the composer never emits, finds none, treats the whole post as
  // free, and publishes paid content to everyone. Nothing else would catch it.
  const renderer = readSource('services/api/src/render.ts');
  const composer = readSource('apps/creator-hub/src/components/blog/PaywallNode.ts');

  const serverName = renderer.match(/export const PAYWALL_NODE = '([^']+)'/)?.[1];
  const clientName = composer.match(/export const PAYWALL_NODE_NAME = '([^']+)'/)?.[1];

  assert.ok(serverName, 'could not find PAYWALL_NODE in services/api/src/render.ts');
  assert.ok(clientName, 'could not find PAYWALL_NODE_NAME in the composer');
  assert.equal(
    clientName,
    serverName,
    `paywall node name drift: composer emits "${clientName}", renderer splits on "${serverName}". ` +
      'Paid content would be published as free.',
  );
});

test('the composer declares the node under the same name it exports', () => {
  // The TipTap node's `name` is what actually lands in the document JSON, so
  // the exported constant has to be the value used there, not a parallel string.
  const composer = readSource('apps/creator-hub/src/components/blog/PaywallNode.ts');
  assert.match(
    composer,
    /name:\s*PAYWALL_NODE_NAME/,
    'the TipTap node must use PAYWALL_NODE_NAME as its name, not a literal',
  );
});

test('security rules refuse client writes of rendered HTML', () => {
  // The publish callable is the only writer of `html`. If this rule is ever
  // relaxed, a creator running a modified client can store script that the blog
  // injects with dangerouslySetInnerHTML on an origin shared by every
  // publication.
  const rules = readSource('packages/firebase-config/firestore.rules');
  assert.match(
    rules,
    /!\('html' in request\.resource\.data\)/,
    'firestore.rules must reject client writes containing `html`',
  );
  assert.match(
    rules,
    /!\('plainText' in request\.resource\.data\)/,
    'firestore.rules must reject client writes containing `plainText`',
  );
});

test('paid content is gated on an active paid subscription', () => {
  const rules = readSource('packages/firebase-config/firestore.rules');
  assert.match(rules, /segment == 'paid'/, 'rules must special-case the paid segment');
  assert.match(
    rules,
    /hasActivePaidSub\(post\(\)\.publicationId\)/,
    'the paid segment must require an active paid subscription',
  );
  assert.match(
    rules,
    /currentPeriodEnd > request\.time/,
    'an expired subscription must not grant access',
  );
});

test('derivePubliclyReadable is identical in the schema and the publish callable', () => {
  // publish.ts duplicates this function because services/api cannot depend on
  // @wolly/schema (workspace deps break Cloud Functions packaging). If the two
  // drift, posts become readable when they should not be, or invisible when
  // they should be. Compare the normalised function bodies.
  const schema = readSource('packages/schema/src/blog.ts');
  const callable = readSource('services/api/src/publish.ts');

  const grab = (src) => {
    const i = src.indexOf('function derivePubliclyReadable');
    assert.notEqual(i, -1, 'derivePubliclyReadable not found');
    const body = src.slice(src.indexOf('{', i), src.indexOf('\n}', i));
    return body.replace(/\s+/g, ' ').trim();
  };

  assert.equal(
    grab(callable),
    grab(schema),
    'derivePubliclyReadable has drifted between @wolly/schema and services/api',
  );
});

/**
 * The money split is implemented twice, and the two must agree exactly.
 *
 * `packages/schema/src/transaction.ts` is canonical. `services/payments`
 * carries a copy because Firebase runs `npm install` inside that directory at
 * deploy time and cannot resolve an unpublished workspace package.
 *
 * This compares them by BEHAVIOUR rather than by text: both are executed over a
 * grid of real sale shapes and every field of the result must match. A comment
 * saying "keep these in sync" is not a mechanism.
 */
test('the money split in services/payments matches @wolly/schema exactly', () => {
  const ts = require('typescript');

  // Canonical: transpile the TypeScript and pull the helpers out of it.
  // transaction.ts imports ./revenue, so the loader has to resolve that too.
  const load = (relPath) => {
    const compiled = ts.transpileModule(readSource(relPath), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const mod = { exports: {} };
    new Function('exports', 'module', 'require', compiled)(
      mod.exports,
      mod,
      (id) => (id === './revenue' ? load('packages/schema/src/revenue.ts') : require(id)),
    );
    return mod.exports;
  };
  const canonical = { ...load('packages/schema/src/transaction.ts'), ...load('packages/schema/src/revenue.ts') };

  // The deployed copy: evaluate the helpers out of the payments source. The
  // slice stops before currentTermsFor, which touches Firestore.
  const paymentsSource = readSource('services/payments/src/index.js');
  const start = paymentsSource.indexOf('const DEFAULT_REVENUE_TERMS');
  const end = paymentsSource.indexOf('/**\n * The terms in force RIGHT NOW');
  assert.ok(start > 0 && end > start, 'could not locate the split helpers in services/payments');
  const copy = new Function(
    `${paymentsSource.slice(start, end)}; return { splitSale, readRevenueTerms, termsFromPurchase, DEFAULT_REVENUE_TERMS };`,
  )();

  assert.deepEqual(
    copy.DEFAULT_REVENUE_TERMS,
    canonical.DEFAULT_REVENUE_TERMS,
    'the fallback terms have drifted, so a missing settings document would pay differently in each copy',
  );

  // The settings document is hand-edited by staff, so the validator is a safety
  // boundary and both copies must refuse the same nonsense. `authorShare: 70`
  // typed instead of 0.7 is the mistake that matters: it would pay an author
  // seventy times the sale price.
  const rawTerms = [
    { authorShare: 0.7, basis: 'gross' },
    { authorShare: 0.6, basis: 'net' },
    { authorShare: 70, basis: 'gross' },
    { authorShare: 0, basis: 'gross' },
    { authorShare: -0.5, basis: 'gross' },
    { authorShare: 0.99, basis: 'gross' },
    { authorShare: 'nonsense', basis: 'gross' },
    { authorShare: 0.7, basis: 'sideways' },
    { basis: 'net' },
    {},
    null,
  ];
  for (const raw of rawTerms) {
    assert.deepEqual(
      copy.readRevenueTerms(raw),
      canonical.readRevenueTerms(raw),
      `readRevenueTerms disagrees for ${JSON.stringify(raw)}`,
    );
  }

  // A purchase begun before the terms became configurable carries the old
  // `royaltyRate` and no basis. Both copies must read it the same way, or a
  // checkout started before a deploy and verified after it pays the wrong
  // amount.
  const purchases = [
    { authorShare: 0.6, revenueBasis: 'net' },
    { authorShare: 0.7, revenueBasis: 'gross' },
    { royaltyRate: 0.35 },
    { royaltyRate: 0.7 },
    { royaltyRate: null },
    { authorShare: null, royaltyRate: 0.35 },
    {},
  ];
  for (const purchase of purchases) {
    assert.deepEqual(
      copy.termsFromPurchase(purchase),
      canonical.termsFromPurchase(purchase),
      `termsFromPurchase disagrees for ${JSON.stringify(purchase)}`,
    );
  }

  // A grid of real sale shapes: typical, cheap, expensive, and the
  // rounding-sensitive odd amounts, across both bases.
  const grosses = [200, 999, 1500, 3000, 12345, 1];
  const fees = [0, 34, 49, 59, 200];
  const termsGrid = [
    { authorShare: 0.7, basis: 'gross' },
    { authorShare: 0.7, basis: 'net' },
    { authorShare: 0.35, basis: 'gross' },
    { authorShare: 0.5, basis: 'net' },
    { authorShare: 0.95, basis: 'gross' },
  ];
  for (const grossMinor of grosses) {
    for (const providerFeeMinor of fees) {
      for (const terms of termsGrid) {
        const input = { grossMinor, providerFeeMinor, terms };
        const a = canonical.splitSale(input);
        const b = copy.splitSale(input);
        assert.deepEqual(b, a, `split disagrees for ${JSON.stringify(input)}`);

        // The invariant that matters regardless of which is right: the parts
        // must reconstruct the gross exactly, with no lost pesewa.
        assert.equal(
          a.authorEarningsMinor + a.platformNetMinor + a.providerFeeMinor,
          a.grossMinor,
          `parts do not sum back to gross for ${JSON.stringify(input)}`,
        );
        // And nobody is ever paid a negative amount.
        assert.ok(a.authorEarningsMinor >= 0, 'author earnings went negative');
      }
    }
  }
});

test('the basis decides who carries the payment processor fee, and nothing else', () => {
  const ts = require('typescript');
  const load = (relPath) => {
    const compiled = ts.transpileModule(readSource(relPath), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const mod = { exports: {} };
    new Function('exports', 'module', 'require', compiled)(
      mod.exports, mod,
      (id) => (id === './revenue' ? load('packages/schema/src/revenue.ts') : require(id)),
    );
    return mod.exports;
  };
  const { splitSale } = load('packages/schema/src/transaction.ts');

  const sale = { grossMinor: 5000, providerFeeMinor: 100 };
  const gross = splitSale({ ...sale, terms: { authorShare: 0.7, basis: 'gross' } });
  const net = splitSale({ ...sale, terms: { authorShare: 0.7, basis: 'net' } });

  assert.equal(gross.authorEarningsMinor, 3500, 'on gross the author gets a clean share of the price');
  assert.equal(gross.platformNetMinor, 1400, 'and Wolly absorbs the whole fee');
  assert.equal(net.authorEarningsMinor, 3430, 'on net the fee comes off before the share');
  assert.equal(net.platformNetMinor, 1470);

  // The author earns MORE on the gross basis, which is the point of it being
  // the default: the fee is Wolly's cost of doing business, not the author's.
  assert.ok(gross.authorEarningsMinor > net.authorEarningsMinor);

  // On the gross basis, an identical sale pays the author identically whatever
  // the processor charged. That is the property an author can check against a
  // receipt, and the reason the default is gross.
  const cheapFee = splitSale({ grossMinor: 5000, providerFeeMinor: 20, terms: { authorShare: 0.7, basis: 'gross' } });
  assert.equal(cheapFee.authorEarningsMinor, gross.authorEarningsMinor);
});

/**
 * The publish gate and the publish pre-flight are two implementations of one
 * rule, and they must not drift.
 *
 * `blockingFailures()` runs in the browser, which makes it a guide rather than
 * a gate: a gate that runs on the client is not a gate. So
 * `signPublishingContract` re-derives the author-owned blocking conditions
 * server-side. If the schema gains a blocking check the callable does not
 * enforce, a book could be published without it; if the callable enforces one
 * the schema does not show, an author would be refused for a reason no screen
 * ever mentioned.
 */
test('the server-side publish gate covers exactly the author-owned blocking checks', () => {
  const ts = require('typescript');
  const load = (relPath) => {
    const compiled = ts.transpileModule(readSource(relPath), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const mod = { exports: {} };
    new Function('exports', 'module', 'require', compiled)(
      mod.exports, mod,
      (id) => (id === './revenue' ? load('packages/schema/src/revenue.ts') : require(id)),
    );
    return mod.exports;
  };
  const { CHECKS, CHECK_IDS, AWAITING_WOLLY_TO_BUILD } = load('packages/schema/src/publishing-report.ts');

  // What the schema says must block, that the author can actually do something
  // about. Wolly's own review gates are excluded on purpose: they happen in
  // response to the request, so requiring them before it would deadlock.
  // Checks with no writer yet are excluded because nothing can satisfy them.
  const expected = CHECK_IDS.filter(
    (id) => CHECKS[id].blocking
      && CHECKS[id].owner === 'author'
      && !AWAITING_WOLLY_TO_BUILD.has(id),
  ).sort();

  // What the callable enforces, read from its own declared list.
  const src = readSource('services/api/src/contract.ts');
  const block = src.match(/AUTHOR_BLOCKING_CHECKS = \[([\s\S]*?)\]/);
  assert.ok(block, 'AUTHOR_BLOCKING_CHECKS not found in services/api/src/contract.ts');
  const enforced = block[1]
    .split(',')
    .map((x) => x.trim().replace(/['\s]/g, ''))
    .filter(Boolean)
    .sort();

  assert.deepEqual(
    enforced,
    expected,
    'the publish gate and the publish pre-flight disagree about what blocks a book',
  );

  // And every id it claims to enforce is actually tested for in the body, so
  // the list cannot become decorative. Whitespace-normalised, because a long
  // failure message puts the call across several lines.
  const flat = src.replace(/\s+/g, ' ');
  for (const id of enforced) {
    assert.ok(
      flat.includes(`fail( '${id}'`) || flat.includes(`fail('${id}'`),
      `${id} is listed as enforced but nothing in the callable fails on it`,
    );
  }
});

test('the publish gate reads the revenue terms the same way the schema does', () => {
  // services/api cannot import @wolly/schema, so readTerms is a third copy of
  // the validator. `authorShare: 70` typed for 0.7 would sign an author to
  // seventy times the sale price, and the callable freezes it onto a contract.
  const ts = require('typescript');
  const compiled = ts.transpileModule(readSource('packages/schema/src/revenue.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const canonical = { exports: {} };
  new Function('exports', 'module', 'require', compiled)(canonical.exports, canonical, require);

  // Transpile the callable's own source rather than stripping types by hand:
  // a regex that almost understands TypeScript is how a contract test starts
  // passing for the wrong reason. The module is not executed (it imports
  // firebase-functions); only the compiled function is lifted out.
  const apiJs = ts.transpileModule(readSource('services/api/src/contract.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const start = apiJs.indexOf('function readTerms');
  assert.ok(start > 0, 'readTerms not found in the compiled callable');
  const end = apiJs.indexOf('\n}', start) + 2;
  const copy = new Function(`${apiJs.slice(start, end)}; return readTerms;`)();

  for (const raw of [
    { authorShare: 0.7, basis: 'gross' },
    { authorShare: 0.6, basis: 'net' },
    { authorShare: 70, basis: 'gross' },
    { authorShare: 0, basis: 'gross' },
    { authorShare: 1, basis: 'gross' },
    { authorShare: 'x' },
    {},
    null,
  ]) {
    assert.deepEqual(
      copy(raw),
      canonical.exports.readRevenueTerms(raw),
      `readTerms disagrees with readRevenueTerms for ${JSON.stringify(raw)}`,
    );
  }
});

/**
 * A live sale must never leave `pending`.
 *
 * `verifyPaystackPayment` wrote Paystack's own transaction status straight onto
 * `purchases.status`. Paystack reports `ongoing` while a reader is still
 * entering a mobile-money OTP, so checking on a purchase mid-payment moved it
 * out of `pending` and into a value PurchaseStatus does not even contain.
 * `pending` is the set anything reconciling unfinished sales looks at, so the
 * act of checking could remove a sale from the only thing that would complete
 * it. On Ghanaian mobile money, mid-payment is the normal case.
 */
test('checking on a purchase cannot move a live sale out of pending', () => {
  const src = readSource('services/payments/src/index.js');
  const start = src.indexOf('const TERMINAL_PROVIDER_STATUS');
  assert.ok(start > 0, 'TERMINAL_PROVIDER_STATUS not found in services/payments');
  const table = new Function(`${src.slice(start, src.indexOf('};', start) + 2)}; return TERMINAL_PROVIDER_STATUS;`)();

  // Everything Paystack can report while a reader is still paying must be
  // absent from the table, so the lookup falls through and leaves it pending.
  for (const live of ['ongoing', 'pending', 'processing', '', undefined, 'something_new_paystack_added']) {
    assert.equal(
      table[live] ?? 'pending',
      'pending',
      `${String(live)} is not terminal, so the sale must stay pending`,
    );
  }

  // And the terminal ones must map to values PurchaseStatus actually contains.
  const ts = require('typescript');
  const compiled = ts.transpileModule(readSource('packages/schema/src/purchase.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const purchaseSrc = readSource('packages/schema/src/purchase.ts');
  const union = purchaseSrc
    .slice(purchaseSrc.indexOf('export type PurchaseStatus'), purchaseSrc.indexOf(';', purchaseSrc.indexOf('export type PurchaseStatus')))
    .match(/'[a-z]+'/g)
    .map((x) => x.replace(/'/g, ''));
  assert.ok(compiled.length > 0);
  for (const [provider, wolly] of Object.entries(table)) {
    assert.ok(
      union.includes(wolly),
      `${provider} maps to "${wolly}", which is not a PurchaseStatus (${union.join(', ')})`,
    );
  }

  // The raw provider status is kept, just not in the field that decides the
  // lifecycle.
  assert.match(src, /providerStatus: verification\.status/, 'the provider status must still be recorded');
});

test('a book checkout tells the webhook what it is', () => {
  // services/api's webhook drops book events with `if (meta.kind === 'book')
  // return;` so the two do not both write the same purchase. Nothing set it, so
  // the guard never fired and book events fell through to the subscription
  // handler, which discarded them for want of a publicationId. The comment
  // described an agreement only one side had heard of.
  const payments = readSource('services/payments/src/index.js');
  const metaStart = payments.indexOf('metadata: {');
  assert.ok(metaStart > 0, 'no Paystack metadata block found');
  const meta = payments.slice(metaStart, payments.indexOf('}', metaStart));
  assert.match(meta, /kind: 'book'/, 'a book checkout must identify itself to the webhook');

  const webhook = readSource('services/api/src/paystack-webhook.ts');
  assert.match(
    webhook,
    /meta\.kind === 'book'/,
    'the webhook guard the metadata is written for has moved or changed',
  );
});

/**
 * The reconciler is the only thing that finishes a sale the reader never came
 * back to confirm, so the ways it can silently do nothing all matter.
 */
test('the reconciler settles through the same code the client-facing verify does', () => {
  // Two implementations of settlement would be two ways to get money wrong, in
  // the path nobody is watching. There must be exactly one batch commit for a
  // sale, and both callers must reach it.
  const src = readSource('services/payments/src/index.js');
  assert.equal(
    (src.match(/await batch\.commit\(\)/g) || []).length,
    1,
    'settlement is implemented more than once',
  );
  assert.ok(src.includes('async function settlePurchase('), 'settlePurchase not found');
  // Both the HTTP verify and the schedule call it.
  assert.equal(
    (src.match(/await settlePurchase\(/g) || []).length,
    2,
    'expected both verifyPaystackPayment and the reconciler to settle through it',
  );
});

test('the reconciler holds the same pending rule as the client verify', () => {
  // If the reconciler wrote Paystack's status raw, it would move a live sale
  // out of pending and then never look at it again, which is the exact defect
  // it exists to recover from.
  const src = readSource('services/payments/src/index.js');
  const fn = src.slice(src.indexOf('exports.reconcilePendingPurchases'));
  assert.match(
    fn,
    /status: terminal \|\| 'pending'/,
    'the reconciler must leave a non-terminal sale pending',
  );
  assert.match(fn, /providerStatus: verification\.status/);
});

test('the reconciler query has an index, or it fails on the first real run', () => {
  // A composite query without an index throws at runtime, not at deploy, so
  // this would look fine until the first stuck purchase existed.
  const src = readSource('services/payments/src/index.js');
  const fn = src.slice(src.indexOf('exports.reconcilePendingPurchases'));
  assert.match(fn, /where\('status', '==', 'pending'\)/);
  assert.match(fn, /where\('launchedAt', '<'/);

  const indexes = JSON.parse(readSource('packages/firebase-config/firestore.indexes.json'));
  const match = indexes.indexes.find(
    (i) =>
      i.collectionGroup === 'purchases' &&
      i.fields.map((f) => f.fieldPath).join(',') === 'status,launchedAt',
  );
  assert.ok(match, 'purchases(status, launchedAt) index is missing from firestore.indexes.json');
});

test('the reconciler is bounded and cannot fan out without limit', () => {
  const src = readSource('services/payments/src/index.js');
  const fn = src.slice(src.indexOf('exports.reconcilePendingPurchases'));
  assert.match(fn, /\.limit\(RECONCILE_BATCH\)/, 'the query must be bounded');
  // And one bad purchase must not end a run that has a paid reader behind it.
  assert.match(fn, /catch \(error\)/, 'the per-purchase loop must survive one failure');
});
