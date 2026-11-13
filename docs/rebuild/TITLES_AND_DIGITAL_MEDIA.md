# Titles, ebooks and audiobooks

Updated 13 November 2026. This is the product and architecture specification for the rebuild, not a description of shipped functionality. It refines the earlier book-centric plan. Wolly supports **electronic content only: ebooks and audiobooks**. Paperback, hardcover, printing, shipping, stock and physical fulfillment are outside the product. The existing blog remains a separate electronic publishing domain.

## Product model

A **title** is the parent work: its name, description, authors and categorisation. A **delivery** is the title's ebook or audiobook offering. An **edition** is an immutable content release of one delivery. An **asset** is a stored file with an explicit purpose and access policy. PDF and EPUB are ebook file formats; they are not separate purchasable delivery modes.

```text
Title — shared metadata, categories, contributors, shared assets
  Ebook delivery — ebook details, pricing, rights, publication state
    Working source — uploaded document + optional editable draft
    Edition v1 — approved PDF/EPUB assets and navigation
    Edition v2 — replacement awaiting approval
  Audiobook delivery — narration details, pricing, rights, publication state
    Working source — ordered chapter uploads
    Edition v1 — immutable chapter manifest, playback assets, sample
```

A title may start with no deliveries as a private draft. Create either delivery first, even without its files, and add the other at any time. For the first release enforce one ebook and one audiobook delivery per title with `UNIQUE(title_id, kind)` and `kind IN ('ebook','audiobook')`. Multiple narrations, translations and abridgements under one mode are later product work; keep language and abridgement explicit so the model can evolve. A translation should initially be a separate title with an optional related-title link.

A title is publicly discoverable only when at least one delivery is published and eligible for sale/access. Public responses expose only eligible deliveries, not a creator's unfinished audiobook. Format filters count distinct titles. Published title details are an approved metadata revision, not an in-place view of private draft edits.

## Creator Hub flow

1. **Create title.** Save name and owner immediately. Add subtitle, description, authors/contributors, language, genres/categories/subcategories, keywords/tags, audience/age range, explicit-content flag, warnings, copyright information and default artwork. Keep current supported metadata and reference data, with categorisation stored once here.
2. **Choose a delivery.** Offer “Set up ebook” and “Set up audiobook”. Either opens an independently saved draft; there is no requirement to upload an ebook before creating audio. The title overview shows each mode's status and next action, plus “Add ebook” or “Add audiobook” for an absent mode.
3. **Prepare content.** Ebook: upload a document, PDF or EPUB, optionally edit an imported document, and preview its reading rendition. Audio: add narration details, upload chapters, arrange them, listen to previews, choose artwork and a retail sample. Partial setup can be resumed without upload completion.
4. **Set commercial details.** Configure free/paid price and currency, release date, applicable electronic distribution preferences, rights territories/languages/dates, evidence and agreement for the selected delivery. Reuse current book capabilities at the correct scope; never copy an ebook's commercial consent into audio implicitly.
5. **Review and submit that delivery.** Show shared title readiness plus mode-specific blockers, exact content version, inherited/overridden assets and commercial terms. Staff approves the precise submission. Missing audio does not block a ready ebook, and missing ebook does not block ready audio.
6. **Add or revise later.** From the same title add the other delivery, replace a source, revise chapter order or edit a document draft. Keep approved releases available while the replacement is processed and reviewed. Withdrawal of one mode leaves the other intact unless a title-wide restriction applies.

The overview presents “Ebook: published / Audiobook: draft”, with per-mode price and readiness. Do not compress these into a single editable title status, price or completion percentage. A shared metadata change affecting both live modes requires review of a new title metadata revision; existing listings continue using the previously approved revision until that review completes. Each new submission binds its title revision explicitly.

## Entity definitions for the target SQL/API

These are proposed domain fields, not new Firestore documents. Concrete Go structs and generated TypeScript/Dart DTOs follow the versioned OpenAPI contract during implementation.

| Entity | Required identity and important fields |
| --- | --- |
| `Title` | `id`, server-owned `ownerUserId`, draft/approved metadata revision references, version, timestamps, archive state |
| `TitleMetadataRevision` | `id`, `titleId`, name/subtitle, descriptions, ordered author/contributor references, primary language, categories/genres, keywords/tags, audience, content flags, copyright, shared asset bindings; immutable submitted snapshots |
| `Delivery` | `id`, `titleId`, `kind: ebook \| audiobook`, version, workflow state, separate availability state, `workingRevisionId`, `publishedEditionId`; free/paid price version, currency, release date and distribution preferences |
| `EbookDetails` | `deliveryId` PK/FK to an ebook delivery, edition label/number, optional ebook ISBN, source kind, working source asset/draft references; measured word/page/chapter counts belong to the resulting edition and may be unknown |
| `AudiobookDetails` | `deliveryId` PK/FK to an audiobook delivery, edition label, optional audio-specific ISBN, language, ordered narrator/producer credits, `abridgement: unabridged \| abridged`, narration method/disclosure, recording copyright holder/year; duration is measured from the edition |
| `ManuscriptDraft` | `id`, `deliveryId`, original immutable source asset, sanitized editor document and schema version, optimistic version, immutable saved revisions; only document ingestion creates an editable draft |
| `Edition` | `id`, `deliveryId`, mode-specific immutable manifest, source revision/hash, title metadata revision, processor/version, measured metrics, creation time; processing state is separate from publication approval |
| `AudioChapter` | Stable logical chapter `id`, `deliveryId`, label, section kind (`opening_credits`, `chapter`, `closing_credits`, `other`), working position and immutable source asset version. Each edition snapshots ordered IDs, positions, labels, output asset IDs and durations |
| `Asset` | `id`, storage key/version, owner, MIME, bytes, checksum, processing/validation result, visibility and retention. Explicit title/delivery/edition bindings supply role and scope; raw URLs are not identities |
| `DeliveryOffer` / agreement / review | Delivery ID, title revision, edition ID, rights and price revisions, immutable terms/consent, reviewer and decision history |
| Purchase / entitlement / sale | Title ID for grouping, **delivery ID for purchased scope**, purchased edition and frozen terms; entitlement can authorize subsequent approved editions of that same delivery according to access policy |

Use a common delivery row and separate `ebook_details` / `audiobook_details` tables. Enforce matching kinds and same-title/delivery relationships with constraints or transactional commands. Do not put narration fields, manuscript locators, physical trim sizes and arbitrary format booleans into one universal book record. Optional ISBNs are per delivery; a supplied audiobook ISBN must not reuse an ebook ISBN. Wolly IDs allow creators to draft/publish without assuming they already possess an ISBN; external channel requirements are adapter-specific.

### Asset scope and inheritance

Store title-level artwork/promotional material and delivery-level covers, samples and supplements through typed bindings. Edition assets include the exact validated source/output files and manifest. A binding must belong to the same owner/title tree, and its role must be allowed at that scope. Evidence remains private in the rights domain.

Resolve an eligible delivery override first, otherwise the approved title default. Ebook covers may use portrait artwork; audiobook artwork must be square. An unsuitable title default is a readiness blocker until the creator uploads an override or approves a generated square composition; do not silently stretch or crop it. Inheritance applies to metadata/artwork only where explicitly supported. Never inherit prices, rights approval, audio chapters, ebook files, samples or purchase access across modes.

Freeze resolved artwork/metadata asset versions in each reviewed edition/listing submission. Editing shared artwork must not change an already approved release or make a private file public. Title attachments remain owner-only unless deliberately approved for public display. Delivery supplements such as an audio companion PDF require that delivery's access; a companion PDF does not create or grant an ebook delivery.

## Ebook ingestion, editing and preview

| Input | Workflow | Reader-facing result |
| --- | --- | --- |
| `.docx` | Preserve upload, import into a structured editor draft, show any unsupported formatting; creator may edit or continue directly to conversion | Convert a frozen draft/source revision to EPUB and PDF, then preview using the consumption renderers |
| `.doc` | Accept into a bounded legacy Word conversion job, produce a DOCX/editor import; report unsupported/password-protected or failed files explicitly | Same as DOCX after successful conversion; this is additional adapter work, not present support |
| `.pdf` | Validate and preserve immutable bytes; no content editor; replace by uploading a new source version | Read-only paginated PDF preview and PDF delivery; no automatic reflow, OCR or EPUB promise |
| `.epub` | Validate package/navigation and sanitize or isolate active content and external resources; preserve source | Read-only reflowable EPUB preview and EPUB delivery; no content editor or automatic PDF promise |
| Existing Markdown/text | Preserve compatible imports into the structured draft/conversion flow | Existing EPUB/PDF output support remains |

“Document” includes DOCX and legacy DOC; distinguish their actual support in the UI. The current press accepts DOCX/Markdown/text only. Legacy DOC ingestion, the editor and direct PDF/EPUB ingestion are explicit rebuild additions. A legacy Word adapter may require an isolated office-conversion process alongside the existing converter.

Editing changes a canonical structured draft, not the original Word file. Autosave uses optimistic versions and conflict recovery. A deliberate generate/preview action freezes a revision for conversion; background autosave must not launch a full press on every keystroke. Preserve original uploads and draft history; do not promise round-trip Word layout fidelity or DOCX export without implementing it.

The preview uses EPUB reading/navigation for reflowable content and page rendering for PDF. Font size applies to EPUB; PDF zoom does not imply reflow. Owner full-content preview is private; public ebook samples are separate bounded assets. PDF/EPUB uploads can still have editable listing metadata and replacement uploads without editable file content.

Readiness rules depend on source kind. Imported PDF/EPUB should not fail because a Wolly typesetting job or document heading signal is absent. Require valid readable content, correct artwork/metadata, permitted rights and commercial readiness; distinguish unknown page/word counts from zero. Retain bounded source/cover limits from the earlier plan initially, adding decompressed-package, PDF-page, editor-document and processing-time limits as configuration.

## Audiobook management proposal

### Platform evidence and Wolly choices

Sources checked 13 November 2026. These platforms inform Wolly's design; their commercial schemes and delivery restrictions are not automatically Wolly policy.

| Platform evidence | Proposed Wolly behavior |
| --- | --- |
| [Spotify for Authors upload guidance](https://support.spotify.com/pw/authors/article/uploading-audiobooks/) supports MP3/WAV/FLAC, square cover art, a sample and named chapters | Accept those chapter source formats first, provide explicit chapter titles/order, square artwork and a sample workflow |
| [Apple audiobook specification](https://help.apple.com/itc/audiobooksspec/en.lproj/static.html) packages an audiobook with audio tracks, artwork and metadata, and supports booklet assets | Publish an immutable ordered playback manifest plus protected supplements; keep a delivery distinct from its tracks |
| [Apple formatting guidance](https://help.apple.com/itc/audiobooksstyleguide/en.lproj/static.html) distinguishes author/narrator credits and requires metadata/artwork/content consistency | Collect narrator credits independently from title authors and include matching artwork/credits checks in staff review |
| [Audible/ACX submission requirements](https://help.acx.com/s/article/what-are-the-acx-audio-submission-requirements) use separate chapter/section files, opening/closing credits, a short retail sample and audio-quality checks | Provide chapter-based preparation, credit sections, a 1–5 minute preview proposal and automated checks followed by a human listening review |

Wolly does not require an Amazon ebook listing, reproduce Spotify listening allowances or Audible credits, or promise external distribution. If distribution adapters are added, validate each channel's current technical and commercial profile separately. Platform limits differ; avoid one universal “Apple/Spotify/Audible compliant” badge.

### Preparation and processing

- Save narrator(s), publisher/producer, language, abridgement, recording copyright and narration method. Store human/synthetic/mixed narration explicitly; permitted methods and disclosure are policy decisions before audio publication. There is no automatic ebook-to-audio generation in this scope.
- Support resumable multi-file MP3/WAV/FLAC upload, progress, individual retry, rename, reorder, replace and delete of draft chapters. File names may suggest an order, but the creator confirms it. A section can span multiple chapters with clear continuation labels. Single-container M4B ingestion and automatic splitting are later additions.
- Inspect actual codecs, decodeability, measured duration, sample rate/channels, clipping, peak/loudness and silence/noise indicators. Configure acceptance thresholds in a versioned Wolly audio profile before implementation; manual listening covers intelligibility, truncation, mismatched credits and quality problems that probes cannot prove. A failed chapter blocks audio publication and shows actionable diagnostics.
- Use isolated media probe/transcode jobs with CPU, memory, disk and elapsed-time limits. Configure per-file bytes, total delivery bytes/duration and chapter-count limits for audio independently from the 50 MiB manuscript limit. Preserve masters; derive broadly supported AAC/M4A playback files with seeking/range support. Record processor profile and output checksums; validate on supported Android devices before committing to the encoding profile.
- Persist leases/retries and manifest fingerprints. A late chapter job cannot replace a newer upload. Edition readiness means all required chapters and derived files are ready in the confirmed order, not just the first uploaded file. Compute duration server-side from the final ordered assets, excluding sample/supplements.
- Let the creator choose an excerpt from a validated chapter for a generated sample, or upload an excerpt for review. Propose 1–5 minutes, capped at the full runtime for shorter works. Store provenance/selection, duration and approval. A public sample contains only its deliberate excerpt; its endpoint cannot seek into a private master.
- Freeze chapter order/labels, durations, resolved artwork, credits and sample in the submitted edition. A chapter replacement or reordering after publication creates a new edition requiring review. Retain the approved manifest for existing playback and bookmark resolution.

### Listening and access

The title page offers “Read” and/or “Listen”, with delivery-specific prices, ownership and previews. Buying an ebook grants no audiobook entitlement, and vice versa. Start with independent free/one-off paid deliveries in supported currencies; bundles, credits and time-based audio subscriptions are deferred.

Flutter adds chapter navigation, play/pause, seek/skip, playback speed, sleep timer, background playback, headset/lock-screen controls, resume and explicit offline downloads. These are new client work, not features supplied by the Go API. Keep reading and listening positions separate. Listening state uses user + delivery + edition + stable chapter ID + position milliseconds, completion and server revision. Validate position against measured duration. Never guess a page-to-audio mapping; synchronized read-along is deferred.

Authorize the manifest and every playable asset/range request or short-lived link using the delivery entitlement and rights state. A public playlist must not expose private chapter URLs. Expired links renew through authorization; source masters are never retail downloads. Background seeking and offline playback need explicit device checks. Cache by account/delivery/edition/asset hash; downloaded files cannot be remotely erased. Keep old-edition progress usable, and require a tested mapping or explicit restart choice when chapter structure changes.

## Publication, rights and commerce invariants

- Delivery workflow: `draft -> review -> approved -> published`, with explicit changes-requested, suspend, withdraw and archive commands. Processing (`queued/processing/ready/failed`) is separate. Publication requires a reviewed edition, approved title revision, active delivery agreement, valid pricing and permitted rights. Preserve the earlier staff activation transaction.
- Readiness retains `title` versus `listing` scopes but requires a delivery ID for listing checks. Shared checks are computed from the bound title revision; document, PDF, EPUB and audio rules select only applicable checks. An absent or incomplete sibling delivery contributes no blocker or denominator weight.
- Agreements and offers bind a delivery and edition. Enforce at most one pending/active agreement **per delivery**, not per title. A title-wide rights grant may cover both modes only if its declared scope explicitly does; a format-specific dispute/takedown affects that delivery, and a title-wide restriction affects both. Author declarations do not grant staff verification powers.
- Freeze title revision, delivery, edition, price/currency, share, rights scope and agreement in every checkout/sale. Grant once per user/delivery with payment idempotency and overpayment recovery from the existing plan. Approved edition updates can remain available under that delivery entitlement; cross-mode grants require a separately defined offer.
- Ordinary withdrawal stops new sales; access for existing buyers follows the approved policy independently. All new audio streams/downloads use the same rights/availability resolver as ebook delivery. Refunds and payouts retain historical delivery/edition/terms instead of relying on current title fields.
- Aggregate creator earnings by title with delivery breakdowns and currency separation. Count title discovery, ebook downloads, listening starts, completion and paid sales as distinct defined events; do not treat chapter HTTP requests as sales or completed listens. Keep existing review behavior at title scope initially, with optional delivery context for new reviews.

## Migration and implementation acceptance

The current Firestore `EpubBook` is a combined record; `BookType` includes physical values, and its converter metadata is ebook-specific. That is historical compatibility, not the target schema. This planning change deliberately leaves runtime shapes untouched. Any transitional Firestore shape change must update `@wolly/schema`, `SCHEMA.md` and mirrored Dart models together. SQL/API implementation uses coordinated migrations and generated/verified transport types.

Import a validated legacy ebook record as one title plus ebook delivery, source/edition/assets and an explicit legacy-ID map. Preserve the legacy book ID as title identity where possible, and map old purchases/progress/contracts to the ebook delivery and exact edition/terms. EPUB and PDF outputs of one pressing are assets of the same ebook delivery. Never create an audiobook entitlement from an old book purchase by inference.

Legacy `type: audiobook` without verified audio assets is an import exception or private audio draft after review, not a playable release. Paperback/hardcover records and trim/paper/binding metadata remain archived in source snapshots for reconciliation; they do not become physical products or automatically publish as ebooks. Do not merge similarly named legacy records without ownership/content verification. Preserve financial history for unsupported records and resolve customer access explicitly before cutover.

Required demonstrations, linked to B5–B8 and B13:

1. Save an empty title; set up audio first with no ebook or audio files; resume it later. Publish an audio-only title through review.
2. Publish an ebook, then draft and publish audio under the same title without changing the ebook's access, price, progress or approved assets.
3. Import DOC/DOCX, edit a draft and preview a frozen rendition; stale autosave conflicts visibly. Upload PDF/EPUB and preview read-only without document-edit controls.
4. Retry interrupted chapter uploads/transcodes; reorder/replace a chapter; prove an obsolete job cannot change the latest draft or approved playback manifest.
5. Test artwork inheritance/overrides and wrong-owner asset substitution. Unsuitable shared artwork blocks audio only. Public samples never expose masters or full content.
6. Buy each mode separately, replay payment notifications, refund one purchase and verify access to the other is unaffected. Withdraw/dispute only one mode, then exercise a title-wide restriction.
7. Resume audio after app restart, seek across chapters, change speed, use background controls, expire and renew delivery links, download and reopen offline, switch accounts and recover stale multi-device progress.
8. Re-import legacy books/purchases/contracts without duplicates; reconcile financial totals and exceptions for physical/audio metadata. No unsupported physical option appears in new Creator Hub forms, API enums or catalog filters.
