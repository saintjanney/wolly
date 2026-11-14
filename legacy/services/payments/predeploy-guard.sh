#!/usr/bin/env sh
# Refuses to deploy this codebase unless the Paystack secret is resolvable.
#
# The secret now lives in Secret Manager as PAYSTACK_SECRET_KEY and is bound to
# each function with `runWith({ secrets: [...] })`, so Firebase injects it at
# runtime and no .env is involved. This guard therefore checks that the secret
# still EXISTS, rather than that a local file does.
#
# It matters because the failure it prevents is silent: deploying functions that
# cannot reach Paystack does not fail at deploy time, it fails at checkout, on a
# reader trying to buy a book.
#
# An explicit PAYSTACK_SECRET_KEY in the environment also satisfies the guard,
# for a local deploy against a test key.

if [ -n "$PAYSTACK_SECRET_KEY" ]; then
  exit 0
fi

PROJECT="${FIREBASE_PROJECT:-wolly-1133d}"

if gcloud secrets versions describe latest \
     --secret=PAYSTACK_SECRET_KEY \
     --project="$PROJECT" >/dev/null 2>&1; then
  exit 0
fi

echo "" >&2
echo "REFUSING to deploy services/payments: PAYSTACK_SECRET_KEY is not available." >&2
echo "" >&2
echo "It was not found in Secret Manager for project $PROJECT, and is not set in" >&2
echo "the environment. Deploying anyway would leave checkout unable to reach" >&2
echo "Paystack, and it would fail on a reader buying a book rather than here." >&2
echo "" >&2
echo "See services/payments/README.md." >&2
echo "" >&2
exit 1
