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
