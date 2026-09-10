#!/usr/bin/env bash
#
# Delete Cloud Run revisions beyond the newest few, per service.
#
# WHY THIS EXISTS. Cloud Run does not garbage-collect revisions. Every deploy
# leaves the previous one behind, and every retained revision keeps its CPU
# reservation against the region's `Total allowable CPU per project per region`
# quota. Thirteen services and a few months of deploys reached 661 revisions in
# europe-west2, which exhausted the quota and made the functions deploy fail
# outright, including for functions that had not changed.
#
# That failure is confusing because it names CPU, so it reads as a capacity
# problem. It is not: the platform serves 49 books to 14 users. It is an
# accounting problem, and the accumulated revisions are the account.
#
# A retry loop was added to the deploy workflow to ride the error out. Retrying
# a quota that only grows does not help, and it turned one clear failure into
# three slow ones, which is part of why this went unfound for so long.
#
# SAFETY. A revision serving traffic is never deleted, checked explicitly rather
# than assumed from ordering. KEEP is per service and counts from the newest, so
# the live revision plus KEEP-1 rollback targets always survive.
#
#   ./scripts/prune-cloud-run-revisions.sh                  # dry run
#   ./scripts/prune-cloud-run-revisions.sh --apply          # delete
#   KEEP=5 ./scripts/prune-cloud-run-revisions.sh --apply
set -euo pipefail

PROJECT="${PROJECT:-wolly-1133d}"
REGION="${REGION:-europe-west2}"
KEEP="${KEEP:-3}"
APPLY=false
[ "${1:-}" = "--apply" ] && APPLY=true

echo "project=$PROJECT region=$REGION keep=$KEEP apply=$APPLY"

services=$(gcloud run services list --project "$PROJECT" --region "$REGION" \
  --format="value(metadata.name)")

total_kept=0
total_deleted=0

for service in $services; do
  # The revision actually serving traffic. Never a deletion candidate, whatever
  # the ordering says.
  live=$(gcloud run services describe "$service" --project "$PROJECT" --region "$REGION" \
    --format="value(status.traffic[0].revisionName)" 2>/dev/null || true)

  # Newest first. `gcloud` sorts by creation timestamp when asked to.
  revisions=$(gcloud run revisions list --project "$PROJECT" --region "$REGION" \
    --service "$service" --sort-by="~metadata.creationTimestamp" \
    --format="value(metadata.name)")

  index=0
  for revision in $revisions; do
    index=$((index + 1))
    if [ "$index" -le "$KEEP" ] || [ "$revision" = "$live" ]; then
      total_kept=$((total_kept + 1))
      continue
    fi
    total_deleted=$((total_deleted + 1))
    if [ "$APPLY" = true ]; then
      # A revision can fail to delete if something still references it. That is
      # not worth failing the whole run over, so it is reported and skipped.
      gcloud run revisions delete "$revision" --project "$PROJECT" --region "$REGION" \
        --quiet >/dev/null 2>&1 || echo "  could not delete $revision"
    fi
  done

  echo "  $service: $index revisions, keeping $KEEP (live: ${live:-none})"
done

if [ "$APPLY" = true ]; then
  echo "kept $total_kept, deleted $total_deleted"
else
  echo "would keep $total_kept, would delete $total_deleted (dry run; pass --apply)"
fi
