#!/usr/bin/env bash

# Build an Android App Bundle (AAB) and upload it to Firebase App Distribution
#
# Usage:
#   scripts/build_android_distribution.sh \
#     [--notes "Release notes..."] \
#     [--testers "email1,email2"] \
#     [--groups "qa,android"]
#
# Environment variables (override defaults):
#   FIREBASE_PROJECT_ID: Firebase project id (defaults to value in firebase.json)
#   FIREBASE_ANDROID_APP_ID: Firebase Android app id for App Distribution
#   RELEASE_NOTES: Release notes text
#   TESTERS: Comma separated tester emails
#   GROUPS: Comma separated tester groups
#   ARTIFACT_PATH: Path to the built AAB (auto-detected if not provided)
#
# Prereqs:
#   - Flutter SDK installed and on PATH
#   - Firebase CLI installed (`npm i -g firebase-tools`) and logged in (`firebase login`)
#   - You have access to the Firebase project and App Distribution app id

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

echo "[build] Repository root: $REPO_ROOT"

# Defaults (can be overridden by env vars or flags)
PROJECT_ID=${FIREBASE_PROJECT_ID:-"wolly-1133d"}
APP_ID=${FIREBASE_ANDROID_APP_ID:-"1:550264739666:android:8d14c44e68dc0795d8cc8b"}
RELEASE_NOTES=${RELEASE_NOTES:-"Automated build $(date '+%Y-%m-%d %H:%M:%S')"}
TESTERS=${TESTERS:-""}
GROUPS=${GROUPS:-""}
UPLOAD_ONLY=${UPLOAD_ONLY:-"true"}

# Parse simple flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    --notes)
      RELEASE_NOTES="$2"; shift 2;;
    --testers)
      TESTERS="$2"; shift 2;;
    --groups)
      GROUPS="$2"; shift 2;;
    --distribute)
      UPLOAD_ONLY="false"; shift 1;;
    *)
      echo "Unknown flag: $1"; exit 1;;
  esac
done

echo "[check] Flutter version:"; flutter --version || (echo "Flutter not found on PATH" && exit 1)
command -v firebase >/dev/null 2>&1 || { echo "Firebase CLI not found. Install with: npm i -g firebase-tools"; exit 1; }

echo "[build] Running flutter pub get"
flutter pub get

echo "[build] Building release AAB"
flutter build appbundle --release

# Determine AAB path
ARTIFACT_PATH=${ARTIFACT_PATH:-"build/app/outputs/bundle/release/app-release.aab"}
if [[ ! -f "$ARTIFACT_PATH" ]]; then
  echo "[error] AAB not found. Looked for: $ARTIFACT_PATH"
  exit 1
fi

echo "[deploy] Uploading $ARTIFACT_PATH to Firebase App Distribution"
CMD=(firebase appdistribution:distribute "$ARTIFACT_PATH" --app "$APP_ID" --project "$PROJECT_ID" --release-notes "$RELEASE_NOTES")

if [[ -n "$TESTERS" && "$UPLOAD_ONLY" == "false" ]]; then
  # Normalize testers CSV (strip spaces)
  TESTERS=$(echo "$TESTERS" | tr -d ' ')
  CMD+=(--testers "$TESTERS")
fi

# Validate and normalize groups by alias before distributing
if [[ -n "$GROUPS" && "$UPLOAD_ONLY" == "false" ]]; then
  RAW_GROUPS=$(echo "$GROUPS" | tr '[:upper:]' '[:lower:]' | tr -d ' ')
  IFS=',' read -r -a REQ_GROUPS <<< "$RAW_GROUPS"
  echo "[info] Fetching available tester groups to validate aliases..."
  set +e
  GROUPS_JSON=$(firebase appdistribution:tester-groups:list --app "$APP_ID" --project "$PROJECT_ID" --json 2>/dev/null)
  set -e
  VALID_GROUPS=()
  if [[ -n "$GROUPS_JSON" ]]; then
    # Extract alias values from json without jq
    ALIASES=$(echo "$GROUPS_JSON" | grep -o '"alias":"[^"]*"' | sed 's/"alias":"\([^\"]*\)"/\1/g' | tr '[:upper:]' '[:lower:]')
    for g in "${REQ_GROUPS[@]}"; do
      if echo "$ALIASES" | grep -q "^$g$\|^$g\>\|\<$g$"; then
        VALID_GROUPS+=("$g")
      else
        echo "[warn] Group alias '$g' not found. It will be ignored."
      fi
    done
  else
    echo "[warn] Could not fetch tester groups (no JSON). Proceeding without validation."
    VALID_GROUPS=("$RAW_GROUPS")
  fi

  if [[ ${#VALID_GROUPS[@]} -gt 0 ]]; then
    GROUPS_ARG=$(IFS=','; echo "${VALID_GROUPS[*]}")
    CMD+=(--groups "$GROUPS_ARG")
  else
    echo "[warn] No valid groups resolved from '$GROUPS'. Skipping group distribution."
  fi
fi

# If in upload-only mode (or neither testers nor groups provided), do not distribute
if [[ "$UPLOAD_ONLY" == "true" || ( -z "$TESTERS" && -z "$GROUPS" ) ]]; then
  echo "[info] Upload-only: release will be available in the console but not auto-distributed."
fi

echo "[deploy] Command: ${CMD[*]}"

# Try to distribute AAB. If the project is not linked to Google Play, fall back to APK distribution.
set +e
OUTPUT=$("${CMD[@]}" 2>&1)
STATUS=$?
set -e
echo "$OUTPUT"

if [[ $STATUS -ne 0 ]]; then
  if echo "$OUTPUT" | grep -qi "not linked to a Google Play account"; then
    echo "[warn] Firebase project is not linked to Google Play. Falling back to APK distribution."
    echo "[build] Building universal APK"
    flutter build apk --release
    APK_PATH="build/app/outputs/flutter-apk/app-release.apk"
    if [[ ! -f "$APK_PATH" ]]; then
      echo "[error] APK fallback failed; $APK_PATH not found"; exit 1
    fi
    FB_CMD=(firebase appdistribution:distribute "$APK_PATH" --app "$APP_ID" --project "$PROJECT_ID" --release-notes "$RELEASE_NOTES")
    if [[ "$UPLOAD_ONLY" == "false" ]]; then
      if [[ -n "$TESTERS" ]]; then FB_CMD+=(--testers "$TESTERS"); fi
      if [[ -n "$GROUPS" ]]; then FB_CMD+=(--groups "$GROUPS"); fi
    else
      echo "[info] Upload-only fallback: not distributing APK to testers/groups."
    fi
    echo "[deploy] Fallback command: ${FB_CMD[*]}"
    "${FB_CMD[@]}"
    echo "[done] APK uploaded to App Distribution (fallback)."
    exit 0
  else
    echo "[error] Distribution failed."; exit $STATUS
  fi
fi

echo "[done] Build uploaded to App Distribution."

