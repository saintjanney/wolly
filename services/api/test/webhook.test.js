/**
 * Adversarial tests for the Paystack webhook's signature check.
 *
 * This is the boundary that stops anyone on the internet granting themselves a
 * paid subscription. Security rules deny every client write to
 * `subscriptions.isPaid`, so a forged webhook is the remaining way in. Treat a
 * failure here as a security incident.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');

const {
  verifySignature,
  periodEndFrom,
  addMonths,
} = require('../lib/paystack-webhook.js');

const SECRET = 'sk_test_pretend_secret';
const sign = (body, secret = SECRET) =>
  createHmac('sha512', secret).update(body).digest('hex');

test('accepts a correctly signed body', () => {
  const body = Buffer.from(JSON.stringify({ event: 'charge.success' }));
  assert.equal(verifySignature(body, sign(body), SECRET), true);
});

test('rejects a missing signature', () => {
  const body = Buffer.from('{}');
  assert.equal(verifySignature(body, undefined, SECRET), false);
  assert.equal(verifySignature(body, '', SECRET), false);
});

test('rejects a signature made with the wrong secret', () => {
  const body = Buffer.from(JSON.stringify({ event: 'charge.success' }));
  assert.equal(verifySignature(body, sign(body, 'sk_test_attacker'), SECRET), false);
});

test('rejects a tampered body under a valid old signature', () => {
  // The exact attack that matters: take a real event, change the amount or the
  // target user, keep the signature.
  const original = Buffer.from(JSON.stringify({
    event: 'charge.success',
    data: { metadata: { userId: 'victim' } },
  }));
  const signature = sign(original);
  const tampered = Buffer.from(JSON.stringify({
    event: 'charge.success',
    data: { metadata: { userId: 'attacker' } },
  }));
  assert.equal(verifySignature(tampered, signature, SECRET), false);
});

test('rejects a truncated or padded signature', () => {
  const body = Buffer.from('{}');
  const good = sign(body);
  assert.equal(verifySignature(body, good.slice(0, -2), SECRET), false);
  assert.equal(verifySignature(body, `${good}00`, SECRET), false);
});

test('is not fooled by a re-serialised body with different key order', () => {
  // Why the HMAC must be over the RAW bytes. These two JSON strings are
  // semantically equal but byte-different, so a signature over one must not
  // validate the other.
  const a = Buffer.from('{"event":"charge.success","data":{"amount":100}}');
  const b = Buffer.from('{"data":{"amount":100},"event":"charge.success"}');
  assert.equal(verifySignature(a, sign(a), SECRET), true);
  assert.equal(verifySignature(b, sign(a), SECRET), false);
});

test('empty body with a valid signature over empty body is accepted', () => {
  // Not a vulnerability, just confirming no special-casing of empty input.
  const empty = Buffer.from('');
  assert.equal(verifySignature(empty, sign(empty), SECRET), true);
});

// ── Period arithmetic ──────────────────────────────────────────────────────

test('addMonths does not roll 31 Jan into March', () => {
  assert.equal(addMonths(new Date('2026-01-31T00:00:00Z'), 1).getMonth(), 1); // Feb
});

test('addMonths handles a year boundary', () => {
  const d = addMonths(new Date('2026-12-15T00:00:00Z'), 1);
  assert.equal(d.getFullYear(), 2027);
  assert.equal(d.getMonth(), 0);
});

test('periodEndFrom prefers Paystack next_payment_date', () => {
  const end = periodEndFrom('2026-09-01T00:00:00Z', 'monthly');
  // Includes the grace period, so it lands after the stated date.
  assert.ok(end.getTime() > new Date('2026-09-01T00:00:00Z').getTime());
  assert.ok(end.getTime() < new Date('2026-09-04T00:00:00Z').getTime());
});

test('periodEndFrom falls back to one interval when the date is absent', () => {
  const monthly = periodEndFrom(undefined, 'monthly');
  const annual = periodEndFrom(undefined, 'annual');
  assert.ok(monthly.getTime() > Date.now());
  assert.ok(annual.getTime() > monthly.getTime());
});

test('periodEndFrom ignores an unparseable date rather than producing Invalid Date', () => {
  const end = periodEndFrom('not a date', 'monthly');
  assert.ok(!Number.isNaN(end.getTime()));
  assert.ok(end.getTime() > Date.now());
});
