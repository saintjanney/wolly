# @wolly/payments

Paystack functions for **one-off book purchases**. Two HTTP endpoints:

- `initializePaystackCheckout` — verifies the caller's ID token, looks up the
  book, creates a `purchases/{uid}_{bookId}` document with `status: 'pending'`,
  and returns a Paystack authorization URL.
- `verifyPaystackPayment` — calls Paystack's `/transaction/verify`, checks the
  amount matches the pending purchase, and only then writes `status: 'completed'`.

Both run as v1 functions in **us-central1** on the **nodejs22** runtime.

## Provenance (read this before changing anything)

This source was **not originally in the repo**. The functions were deployed on
2026-07-23 from outside version control, and were discovered live in the project
on 2026-07-24. The source here was recovered from the Cloud Functions source
bucket (`gs://gcf-sources-550264739666-us-central1/`), at the exact versions
then serving traffic (`initializePaystackCheckout` v5, `verifyPaystackPayment`
v4). It is byte-for-byte what is deployed, minus the `.env`.

Two consequences:

1. **It is not wired into CI, and deploys are scoped away from it.** The
   `functions:api` scope in `.github/workflows/deploy.yml` and `npm run deploy`
   exists specifically so an unscoped deploy cannot delete these. Do not add
   `functions:payments` to a deploy step until the points below are settled,
   or a deploy could replace a working payment path.
2. **Redeploying requires the secret.** `PAYSTACK_SECRET_KEY` lives only in the
   deployed Functions environment (and, historically, a `.env` that is NOT in
   this repo and must never be). Set it with `firebase functions:secrets` or
   the environment config before any redeploy, or checkout will break.

## Known gap (Phase 2)

The **shipped reader does not call these functions.** It still uses the older
client-side path: `paystack_service.dart` launches a `checkout.paystack.com`
URL and `purchase_repository.dart` writes the purchase document directly with
no `status` field and no server verification. That path is unverified, and the
`purchases` security rule still permits a client to create a completed-looking
purchase.

Closing that is Phase 2 work and has a clear shape, because the server side
already exists here:

1. Point the reader at `initializePaystackCheckout` / `verifyPaystackPayment`
   instead of the direct URL + client write.
2. Tighten the `purchases` rule so a client may create only a `pending`
   purchase (or none), and `status: 'completed'` is Admin-SDK-only, matching how
   `subscriptions.isPaid` is already gated.
3. The blog's paid subscriptions reuse this same verify-then-write pattern, so
   treat these two functions as the reference implementation.
