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
# WHY THE DEFAULT IS 1. A retained revision holds its CPU reservation whether or
# not it serves traffic. Measured in europe-west2: 39 revisions reserved 51 vCPU
# while the 13 serving ones came to 17, against a quota of 20. Three rollback
# targets per service cost 34 vCPU the region does not have, and deploys then
# succeeded or failed depending on how many services a commit happened to touch.
# Raise it once the quota is raised.
#
#   ./scripts/prune-cloud-run-revisions.sh                  # dry run
#   ./scripts/prune-cloud-run-revisions.sh --apply          # delete
#   KEEP=5 ./scripts/prune-cloud-run-revisions.sh --apply
set -euo pipefail

PROJECT="${PROJECT:-wolly-1133d}"
REGION="${REGION:-europe-west2}"
KEEP="${KEEP:-1}"
APPLY=false
[ "${1:-}" = "--apply" ] && APPLY=true

echo "project=$PROJECT region=$REGION keep=$KEEP apply=$APPLY"

services=$(gcloud run services list --project "$PROJECT" --region "$REGION" \
  --format="value(metadata.name)")

total_kept=0
total_deleted=0
total_undeletable=0

for service in $services; do
  # The revision actually serving traffic. Never a deletion candidate, whatever
  # the ordering says.
  live=$(gcloud run services describe "$service" --project "$PROJECT" --region "$REGION" \
    --format="value(status.traffic[0].revisionName)" 2>/dev/null || true)

  # Newest first. `gcloud` sorts by creation timestamp when asked to.
  revisions=$(gcloud run revisions list --project "$PROJECT" --region "$REGION" \
    --service "$service" --sort-by="~metadata.creationTimestamp" \
    --format="value(metadata.name)")

  # The live revision is kept ALWAYS and counts as one of KEEP. The rest are
  # kept newest-first.
  #
  # The distinction matters after a failed deploy, which leaves a revision that
  # is newer than the live one and has never served. Ranking purely by age kept
  # those, so KEEP=1 retained two revisions for every service that had failed to
  # deploy, and each held a CPU reservation the region could not spare. A
  # revision that never served traffic is not a rollback target.
  index=0
  [ -n "$live" ] && index=1
  for revision in $revisions; do
    if [ "$revision" = "$live" ]; then
      total_kept=$((total_kept + 1))
      continue
    fi
    index=$((index + 1))
    if [ "$index" -le "$KEEP" ]; then
      total_kept=$((total_kept + 1))
      continue
    fi
    if [ "$APPLY" = true ]; then
      # Cloud Run REFUSES to delete the latest-created revision, even one that
      # failed and never served traffic. A failed deploy therefore leaves a
      # reservation that cannot be released until a newer revision succeeds,
      # which makes the next deploy likelier to fail for want of the CPU the
      # failure is holding.
      #
      # Counted honestly rather than optimistically: this reported deletions it
      # had not made, because the error was swallowed and the counter
      # incremented anyway.
      if gcloud run revisions delete "$revision" --project "$PROJECT" --region "$REGION" \
        --quiet >/dev/null 2>&1; then
        total_deleted=$((total_deleted + 1))
      else
        total_undeletable=$((total_undeletable + 1))
        echo "  could not delete $revision (probably the latest created)"
      fi
    else
      total_deleted=$((total_deleted + 1))
    fi
  done

  echo "  $service: keeping $KEEP (live: ${live:-none})"
done

if [ "$APPLY" = true ]; then
  echo "kept $total_kept, deleted $total_deleted, could not delete $total_undeletable"
else
  echo "would keep $total_kept, would delete $total_deleted (dry run; pass --apply)"
fi
