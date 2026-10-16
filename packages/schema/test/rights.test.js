/**
 * The rights registry's derived statuses.
 *
 * The spec lists six statuses. Only three are stored, because a stored
 * `expired` goes stale the moment the clock passes midnight and nobody runs a
 * job to fix it. Deriving the rest means no status can ever be wrong, which is
 * the entire reason for the design, so it is worth testing the derivation
 * rather than trusting it.
 *
 * The other thing under test here is restraint: a registry that demands
 * paperwork from every author is a registry nobody fills in.
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
  new Function('exports', 'module', 'require', js)(mod.exports, mod, require);
  return mod.exports;
}

const R = load('rights.ts');
const NOW = new Date('2026-09-02T12:00:00Z');
const day = 86_400_000;
const dateAfter = (ms) => new Date(NOW.getTime() + ms).toISOString().slice(0, 10);

const base = {
  disposition: 'available',
  holderKind: 'self',
  verificationState: 'unverified',
  endDate: null,
};

test('a perpetual grant shows the disposition the author chose', () => {
  assert.equal(R.deriveRightsBadge({ ...base }, NOW), 'available');
  assert.equal(R.deriveRightsBadge({ ...base, disposition: 'licensed' }, NOW), 'licensed');
  assert.equal(R.deriveRightsBadge({ ...base, disposition: 'restricted' }, NOW), 'restricted');
});

test('expiry is derived from the date, so it can never go stale', () => {
  assert.equal(R.deriveRightsBadge({ ...base, endDate: dateAfter(-day) }, NOW), 'expired');
  assert.equal(R.deriveRightsBadge({ ...base, endDate: dateAfter(30 * day) }, NOW), 'expiring');
  assert.equal(R.deriveRightsBadge({ ...base, endDate: dateAfter(200 * day) }, NOW), 'available');
});

test('a grant ending today has not expired yet', () => {
  // endDate is a calendar date off a contract, so it runs to the end of the day.
  // Treating it as midnight would expire a licence a day early.
  assert.equal(R.deriveRightsBadge({ ...base, endDate: dateAfter(0) }, NOW), 'expiring');
});

test('expired outranks needs-verification', () => {
  // An expired grant needs renewing, not checking. Showing the weaker flag
  // would send the author to do the wrong thing.
  const badge = R.deriveRightsBadge(
    { ...base, endDate: dateAfter(-day), holderKind: 'publisher', verificationState: 'unverified' },
    NOW,
  );
  assert.equal(badge, 'expired');
});

test('an author who holds everything themselves is asked for nothing', () => {
  assert.equal(R.needsVerification({ holderKind: 'self', verificationState: 'unverified' }), false);
  assert.equal(R.deriveRightsBadge({ ...base }, NOW), 'available');
});

test('an archived grant is history, and asks for nothing', () => {
  // deriveRightsBadge never read archivedAt, so a grant the author had put away
  // still showed as licensed and still chased them for paperwork.
  const archived = { ...base, archivedAt: '2026-01-01T00:00:00Z' };
  assert.equal(R.deriveRightsBadge({ ...archived, disposition: 'licensed' }, NOW), 'archived');
  assert.equal(
    R.deriveRightsBadge({ ...archived, endDate: dateAfter(-day), holderKind: 'publisher' }, NOW),
    'archived',
    'an archived grant does not need renewing or checking',
  );
});

test('a claim about a third party is asked for evidence', () => {
  assert.equal(
    R.needsVerification({ holderKind: 'publisher', verificationState: 'unverified' }),
    true,
    'if a publisher holds your print rights, Wolly asks for the agreement',
  );
  assert.equal(
    R.needsVerification({ holderKind: 'publisher', verificationState: 'unverified', evidenceRef: 'file-1' }),
    false,
    'once evidence is attached, stop asking',
  );
});

test('there is somewhere to actually put the evidence', () => {
  // Both derivations branched on evidenceRef while the field existed nowhere on
  // RightsGrant, so the whole third-party path was dead: an author who said a
  // publisher held their print rights was asked for an agreement forever, with
  // nothing anywhere to attach.
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'rights.ts'), 'utf8');
  const shape = src.slice(src.indexOf('export interface RightsGrant'), src.indexOf('SERVER_OWNED_RIGHTS_FIELDS'));
  assert.match(shape, /evidenceRef\?:/, 'RightsGrant must declare the field its own logic reads');

  // And attaching evidence must stop the nagging, without claiming anything.
  const publisher = { holderKind: 'publisher', verificationState: 'unverified' };
  assert.equal(R.needsVerification(publisher), true);
  assert.equal(R.needsVerification({ ...publisher, evidenceRef: 'rights/b1/g1/contract.pdf' }), false);
  assert.equal(
    R.deriveRightsBadge({ ...base, ...publisher, evidenceRef: 'rights/b1/g1/contract.pdf' }, NOW),
    'available',
    'evidence attached is not the same as verified, and must not be shown as it',
  );
});

test('a disputed grant always needs verification, whoever holds it', () => {
  assert.equal(R.needsVerification({ holderKind: 'self', verificationState: 'disputed' }), true);
  assert.equal(R.needsVerification({ holderKind: 'self', verificationState: 'needs_evidence' }), true);
});

test('the proposed default claims worldwide, not Ghana only', () => {
  // Narrowing an author's own claim on their behalf is the more harmful error.
  const grant = R.proposedDefaultGrant({ bookId: 'b1', ownerUserId: 'u1', authorName: 'Ama Mensah' });
  assert.deepEqual(grant.territories, ['WORLD']);
  assert.deepEqual(grant.languages, ['ALL']);
  assert.equal(grant.holderKind, 'self');
  assert.equal(grant.disposition, 'available');
  assert.equal(grant.exclusivity, 'unknown', 'never guess exclusivity');
  assert.equal(R.needsVerification(grant), false, 'the default must not nag');
});

test('the declaration never claims Wolly verified anything', () => {
  const { text } = R.RIGHTS_DECLARATION_V1;
  // RIGHTS.md bans this vocabulary across every rights surface.
  for (const banned of ['registered', 'certified', 'protected', 'secured', 'ownership confirmed']) {
    assert.ok(
      !new RegExp(banned, 'i').test(text),
      `the declaration uses banned vocabulary: "${banned}"`,
    );
  }
  assert.match(text, /does not verify/i);
  assert.match(text, /not .*prove ownership/i);
});

test('the banned vocabulary is written down where the code says it is', () => {
  // rights.ts and the test below both cite RIGHTS.md as the source of truth for
  // this list. It was not in RIGHTS.md at all, so anyone following the pointer
  // found nothing and the rule survived only as folklore in two comments.
  const doc = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'RIGHTS.md'), 'utf8');
  for (const banned of ['registered', 'certified', 'protected', 'secured', 'ownership confirmed']) {
    assert.ok(
      new RegExp(banned, 'i').test(doc),
      `RIGHTS.md does not mention "${banned}", so the rule it is cited for is not written down`,
    );
  }
  for (const permitted of ['recorded', 'you told us', 'checked']) {
    assert.ok(new RegExp(permitted, 'i').test(doc), `RIGHTS.md must name the permitted word "${permitted}"`);
  }
});

test('the server-owned field list matches what the rules protect', () => {
  // If these drift, an author can write a field the schema calls server-owned.
  const rules = fs.readFileSync(
    path.join(__dirname, '..', '..', 'firebase-config', 'firestore.rules'),
    'utf8',
  );
  const block = rules.match(/function serverOwnedRightsFields\(\) \{\s*return \[([^\]]+)\]/);
  assert.ok(block, 'serverOwnedRightsFields() not found in firestore.rules');
  const inRules = block[1].split(',').map((s) => s.trim().replace(/['\s]/g, '')).filter(Boolean);
  assert.deepEqual(inRules.sort(), [...R.SERVER_OWNED_RIGHTS_FIELDS].sort());
});
