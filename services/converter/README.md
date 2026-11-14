# Isolated conversion adapter

The storage-independent conversion implementation, fonts and quality tests are retained from the original press. `src/convert.ts` exports `convert`; no cloud trigger, SDK, database access or deployment exists here. The Go worker will eventually own validation/storage/jobs and invoke a bounded private process adapter. That process protocol is not implemented yet.

```
npm run build --workspace @wolly/converter
npm run test --workspace @wolly/converter
```

Full quality tests require Chromium (`npx puppeteer browsers install chrome` or `PUPPETEER_EXECUTABLE_PATH`), Java/EPUBCheck, and Poppler utilities. CI provisions them separately. The browser runs locally or in a private adapter process using its configured executable; the old cloud/serverless fallback has been removed. Validate the processing profile before enabling uploads. No credential or network manuscript fetch is required for pure conversion fixtures.
