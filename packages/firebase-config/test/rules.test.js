/**
 * Proves the book rules deny what they claim to.
 *
 * Uses the Firebase Rules test API, which evaluates the real ruleset source
 * server-side, so no emulator is needed. It needs credentials, so it is not
 * part of `npm test`; instead the deploy workflow runs it with the deploy
 * service account, against the ruleset it is about to publish, immediately
 * before the fatal rules-deploy step.
 *
 * Locally:
 *
 *   npm --workspace @wolly/firebase-config run test:rules -- "$(gcloud auth print-access-token)"
 *
 * It was a manual check for a while, which meant a rules change could reach
 * production having been verified only by whoever remembered to run it. For the
 * one step in the deploy that is fatal on purpose, that was the wrong way
 * round. The claims it
 * covers are the ones the product rests on: a takedown an author can undo is
 * not a takedown, and a pressing record an author can forge cannot identify a
 * leak. Both are enforced by rules alone, because the Admin SDK bypasses rules
 * and every client write goes through them.
 *
 * A note on writing cases: a field written with an UNCHANGED value is not in
 * `affectedKeys()`, so a rule keyed on that correctly ignores it. The first
 * version of the 'declares their own book ready' case started from a document
 * that was already `ready` and so reported a false failure. Start each case
 * from the state the attack actually begins in.
 */

const { readFileSync } = require('node:fs');

const { join } = require('node:path');

/**
 * Exit codes, because CI has to tell two different things apart.
 *
 *   0  the ruleset was evaluated and every expectation held
 *   1  the ruleset was evaluated and an expectation DID NOT hold
 *   2  the suite could not run at all (no token, or the API refused)
 *
 * Only 1 means the rules are wrong.
 */
const EXIT_COULD_NOT_RUN = 2;

const TOKEN = process.argv[2] || process.env.GCLOUD_ACCESS_TOKEN;
const PROJECT = process.env.FIREBASE_PROJECT || 'wolly-1133d';
const RULES = readFileSync(join(__dirname, '..', 'firestore.rules'), 'utf8');

if (!TOKEN) {
  console.error(
    'No access token. Pass one as the first argument, or set GCLOUD_ACCESS_TOKEN:\n' +
      '  npm --workspace @wolly/firebase-config run test:rules -- "$(gcloud auth print-access-token)"',
  );
  process.exit(EXIT_COULD_NOT_RUN);
}

const OWNER = 'author-uid';
const DOC = `/databases/(default)/documents/epubs/book1`;

/** The book as it exists before the write. */
const EXISTING = {
  ownerUserId: OWNER,
  title: 'A Book',
  isPublished: true,
  rightsStatus: 'revoked',
  conversionStatus: 'ready',
  conversion: { fingerprint: 'wolly-real' },
};

function testCase(name, expectation, data, uid = OWNER, existing = EXISTING) {
  return {
    __name: name,
    expectation,
    request: {
      auth: { uid, token: { sub: uid } },
      method: 'update',
      path: DOC,
      time: '2026-08-29T00:00:00Z',
      resource: { data },
    },
    resource: { data: existing },
  };
}

/** A book mid-pressing, which is the state the bypass attack starts from. */
const PRESSING = { ...EXISTING, conversionStatus: 'requested', rightsStatus: 'clear' };

const cases = [
  // The whole point of a takedown.
  testCase('author clears their own revocation', 'DENY', {
    ...EXISTING,
    rightsStatus: 'clear',
  }),
  testCase('author sets rightsStatus at all', 'DENY', {
    ...EXISTING,
    rightsStatus: 'disputed',
  }),
  // Forging the forensic record.
  testCase('author rewrites the pressing fingerprint', 'DENY', {
    ...EXISTING,
    conversion: { fingerprint: 'wolly-forged' },
  }),
  testCase('author points epubUrl anywhere they like', 'DENY', {
    ...EXISTING,
    epubUrl: 'https://attacker.example/x.epub',
  }),
  // Bypassing the press: the transition TO ready is what must be refused.
  // (An unchanged 'ready' is not a write to that field at all, so a rule keyed
  // on affectedKeys correctly ignores it. The first version of this test made
  // that mistake and reported a false failure.)
  testCase(
    'author declares their own book ready',
    'DENY',
    { ...PRESSING, conversionStatus: 'ready' },
    OWNER,
    PRESSING,
  ),
  testCase(
    'author marks their book processing',
    'DENY',
    { ...PRESSING, conversionStatus: 'processing' },
    OWNER,
    PRESSING,
  ),
  testCase(
    'author retries a pressing',
    'ALLOW',
    { ...PRESSING, conversionStatus: 'requested', title: 'Tweaked' },
    OWNER,
    PRESSING,
  ),
  // What an author legitimately does.
  testCase('author asks for a pressing', 'ALLOW', {
    ...EXISTING,
    conversionStatus: 'requested',
  }),
  testCase('author edits their own title', 'ALLOW', {
    ...EXISTING,
    title: 'A Better Title',
  }),
  // Someone else's book.
  testCase('a stranger edits the book', 'DENY', { ...EXISTING, title: 'Hijacked' }, 'someone-else'),

  // ── The rights registry ─────────────────────────────────────────────────
  //
  // These need get()/exists() mocked, because the rule reaches the parent book
  // to establish ownership. `bookOwnedBy` builds that pair.
  ...(() => {
    const BOOK = '/databases/(default)/documents/epubs/book1';
    const GRANT = '/databases/(default)/documents/epubs/book1/rights/g1';
    const bookOwnedBy = (uid) => [
      { function: 'exists', args: [{ exact_value: BOOK }], result: { value: true } },
      { function: 'get', args: [{ exact_value: BOOK }], result: { value: { data: { ownerUserId: uid } } } },
    ];
    const GRANT_DATA = {
      bookId: 'book1',
      ownerUserId: OWNER,
      format: 'ebook',
      territories: ['WORLD'],
      languages: ['ALL'],
      disposition: 'available',
      holderKind: 'self',
      holderName: 'Ama Mensah',
      declaration: { declaredBy: OWNER, declarationText: 'I hold the rights...', declarationVersion: 'v1' },
    };
    const rights = (name, expectation, method, data, existing, uid = OWNER) => ({
      __name: name,
      expectation,
      functionMocks: bookOwnedBy(OWNER),
      request: {
        auth: { uid, token: { sub: uid } },
        method,
        path: GRANT,
        time: '2026-09-02T00:00:00Z',
        ...(data ? { resource: { data } } : {}),
      },
      ...(existing ? { resource: { data: existing } } : {}),
    });

    return [
      // The declared-versus-verified boundary. The whole point of the registry.
      rights('author marks their own claim verified', 'DENY', 'create', {
        ...GRANT_DATA, verificationState: 'verified',
      }),
      rights('author edits the declaration after signing it', 'DENY', 'update', {
        ...GRANT_DATA,
        declaration: { declaredBy: OWNER, declarationText: 'Something else entirely', declarationVersion: 'v1' },
      }, GRANT_DATA),
      rights('author promotes their claim to verified later', 'DENY', 'update', {
        ...GRANT_DATA, verificationState: 'verified',
      }, GRANT_DATA),

      // What an author legitimately does.
      rights('author records a grant', 'ALLOW', 'create', GRANT_DATA),
      rights('author changes the disposition to licensed', 'ALLOW', 'update', {
        ...GRANT_DATA, disposition: 'licensed',
      }, GRANT_DATA),

      // Privacy: a grant names a counterparty and can carry commercial terms.
      rights('a stranger reads a grant', 'DENY', 'get', null, GRANT_DATA, 'nosy'),

      // Archived, never deleted.
      rights('author deletes a grant instead of archiving it', 'DENY', 'delete', null, GRANT_DATA),
    ];
  })(),

  // The press measures the cover. An author who could write coverMetrics could
  // claim a sharp cover they have not uploaded, and the report would believe it.
  testCase('author forges the cover measurements', 'DENY', {
    ...EXISTING,
    coverMetrics: { width: 4000, height: 6000, bytes: 900000, fetchedOk: true },
  }),

  // The ledger. Earnings a client could author are not earnings.
  {
    __name: 'author writes themselves a sale',
    expectation: 'DENY',
    request: {
      auth: { uid: OWNER, token: { sub: OWNER } },
      method: 'create',
      path: '/databases/(default)/documents/transactions/t1',
      time: '2026-09-02T00:00:00Z',
      resource: {
        data: {
          buyerUserId: 'someone', authorUserId: OWNER,
          grossMinor: 500000, authorEarningsMinor: 350000, royaltyRate: 0.7,
        },
      },
    },
  },
  {
    __name: 'author reads a sale of their own book',
    expectation: 'ALLOW',
    request: {
      auth: { uid: OWNER, token: { sub: OWNER } },
      method: 'get',
      path: '/databases/(default)/documents/transactions/t1',
      time: '2026-09-02T00:00:00Z',
    },
    resource: {
      data: { buyerUserId: 'a-reader', authorUserId: OWNER, grossMinor: 1500 },
    },
  },
  {
    __name: 'a stranger reads someone else\'s sale',
    expectation: 'DENY',
    request: {
      auth: { uid: 'nosy', token: { sub: 'nosy' } },
      method: 'get',
      path: '/databases/(default)/documents/transactions/t1',
      time: '2026-09-02T00:00:00Z',
    },
    resource: {
      data: { buyerUserId: 'a-reader', authorUserId: OWNER, grossMinor: 1500 },
    },
  },

  // Payouts: money owed. An author could previously invent one for themselves.
  {
    __name: 'author invents a payout for themselves',
    expectation: 'DENY',
    request: {
      auth: { uid: OWNER, token: { sub: OWNER } },
      method: 'create',
      path: '/databases/(default)/documents/payouts/p1',
      time: '2026-09-02T00:00:00Z',
      resource: { data: { userId: OWNER, amount: 999999, status: 'pending' } },
    },
  },
];

async function main() {
  const res = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT}:test`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'x-goog-user-project': PROJECT,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: { files: [{ name: 'firestore.rules', content: RULES }] },
        testSuite: {
          testCases: cases.map(({ __name, ...c }) => c),
        },
      }),
    },
  );

  const body = await res.json();
  if (!res.ok) {
    // COULD NOT RUN is not the same as FAILED, and the exit code has to say
    // which. A caller that cannot reach the Rules API has learned nothing about
    // the ruleset; a caller whose expectations came back wrong has learned that
    // the rules are broken. Collapsing both into 1 means CI must either block
    // every deploy on a credential problem or ignore genuine rule failures.
    console.error(`HTTP ${res.status} - could not evaluate the ruleset.`);
    console.error(JSON.stringify(body, null, 2).slice(0, 1500));
    if (res.status === 403) {
      console.error(
        '\nThe caller needs BOTH of these on this project:\n' +
          '  roles/firebaserules.admin              compile and test the ruleset\n' +
          '  roles/serviceusage.serviceUsageConsumer  use the project for quota\n' +
          'A service account needs the second one explicitly; a user account\n' +
          'usually has it through its own quota project, which is why this can\n' +
          'pass locally and fail in CI.',
      );
    }
    process.exit(EXIT_COULD_NOT_RUN);
  }

  if (body.issues?.length) {
    console.error('Ruleset issues:', JSON.stringify(body.issues, null, 2).slice(0, 1200));
    process.exit(1);
  }

  const results = body.testResults ?? [];
  let failed = 0;
  console.log('');
  results.forEach((r, i) => {
    const c = cases[i];
    const ok = r.state === 'SUCCESS';
    if (!ok) failed += 1;
    const mark = ok ? 'PASS' : 'FAIL';
    console.log(`  ${mark}  ${c.expectation.padEnd(5)}  ${c.__name}`);
    if (!ok && r.debugMessages) {
      console.log(`        ${r.debugMessages.join('\n        ').slice(0, 300)}`);
    }
  });
  console.log(`\n  ${results.length - failed}/${results.length} rule expectations hold.\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  // A thrown error is a harness problem (network, DNS, a bad JSON body), not a
  // verdict on the rules.
  console.error(e);
  process.exit(EXIT_COULD_NOT_RUN);
});
