#!/usr/bin/env sh
# Refuses to deploy this codebase unless the Paystack secret is available.
#
# PAYSTACK_SECRET_KEY exists only in the deployed function environment. It was
# set from a .env at the original deploy, and that file is not in this repo and
# must never be. Deploying from here without providing it would replace working
# functions with ones that cannot reach Paystack, breaking live checkout, and it
# would fail at request time rather than at deploy time.
#
# Provide the secret deliberately to deploy:
#   PAYSTACK_SECRET_KEY=... npx firebase-tools deploy --only functions:payments
#
# Note that deploys are normally scoped to functions:api precisely so this
# codebase is left alone (see .github/workflows/deploy.yml).

if [ -z "$PAYSTACK_SECRET_KEY" ] && [ ! -f "services/payments/.env" ]; then
  echo "" >&2
  echo "REFUSING to deploy services/payments: PAYSTACK_SECRET_KEY is not set." >&2
  echo "" >&2
  echo "Deploying without it would break live Paystack checkout, because the" >&2
  echo "secret lives only in the currently-deployed function environment." >&2
  echo "See services/payments/README.md." >&2
  echo "" >&2
  exit 1
fi
