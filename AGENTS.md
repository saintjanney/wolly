# Wolly — agent working agreement

## Branching & deploys

- Work only on `develop` or `main`. Do **not** create feature/`claude/*` branches.
- `develop` deploys to the **mock** environment; `main` deploys to **prod**.
- Web surfaces deploy to their Firebase Hosting targets; the mobile reader is
  distributed as an Android APK via Firebase App Distribution. See
  `.github/workflows/deploy.yml`.

## Commit & PR rules

- **Never** add any mention of Claude, AI, or co-authorship to git commits or
  pull requests. No `Co-Authored-By: Claude …` trailer, no "Generated with
  Claude Code" line, no AI attribution anywhere in commit messages or PR bodies.
  Write commit/PR text as a normal human author would.

## Secrets

- Never commit credentials. The Firebase service-account JSON lives only in the
  GitHub Actions secret `FIREBASE_SERVICE_ACCOUNT`.

## Schema

- Firestore document shapes are defined once in `@wolly/schema` and documented in
  `SCHEMA.md`. Change both (and the mirrored Dart models) together.
