# Titles, ebooks and audiobooks

Planning consolidated 14 November 2026. This is the product and architecture specification for the rebuild, not a description of shipped functionality. It refines the earlier book-centric plan. Wolly supports **electronic content only**. The initial catalog workflow delivers books as ebooks/audiobooks; the [content-type plan](CONTENT_TYPES_AND_CONTAINERS.md) defines future short works and periodicals without treating their issues as book editions. Paperback, hardcover, printing, shipping, stock and physical fulfillment are outside the product. Blog posts become `blog_post` titles; a blog publication remains a channel/brand, with legacy routes preserved.

Release sequencing and channel commitments are defined in the [product roadmap](PRODUCT_ROADMAP.md); the [release execution plan](RELEASE_PLAN.md) requires complete creator/reader/staff journeys, supported web/Android/API evidence and domain/cohort gates. Early limited pilots do not waive the full requirements in this specification.

Scope revision: [unified titles, offers and subscriptions](CONTENT_OFFERS_AND_SUBSCRIPTIONS.md) defines blog posts as titles, source/editor authoring, mutually exclusive free/paid title classification, lifetime and/or subscription routes for paid titles, and independent grant provenance. Release order is R1 free ebooks → R2 free audio → R3 lifetime monetisation → R4 publisher teams → R5 households/minors → R6 sponsored consumption → R7 subscription programme → R8 full rollout. Earlier source inventories describe legacy behavior, not an exception to this target.

## Product model

A **series** optionally groups distinct titles in a reading order; a trilogy has three title records, not three editions of one title. Standalone titles need no series. A **title** identifies an individual finite work across its editions and translations. Launch `workType` (`book`, plus `blog_post` by R3) covers novels, textbooks, monographs, reference works and anthology books through typed book-form metadata. Future standalone stories/articles and periodical issues use explicitly enabled type profiles; a continuing newspaper belongs to `SerialPublication`, with dated issue titles, not a book series. A **title edition** identifies a materially distinct editorial edition of that work (for example, first edition or revised second edition). A **language edition** is a particular language/translation of that title edition. A **delivery** is a specific ebook, audiobook or validated web_text product of that language edition. A **content release** is an immutable file/manifest revision of a delivery. An **asset** is a stored file with an explicit purpose and access policy. PDF and EPUB are renditions of one ebook delivery, not separate purchases.

```text
Series (optional) — trilogy/sequence metadata and ordered membership
  Title: Book 1 — individual work, authors, categorisation
    Title edition: First edition — editorial identity
      Language edition: English original — localized metadata and credits
        Ebook delivery — price, rights, publication state
          Content release 1 — immutable EPUB/PDF manifest
          Content release 2 — corrected files, separately reviewed
        Audiobook delivery — narration, price, rights, publication state
          Content release 1 — immutable ordered chapter manifest
      Language edition: Twi translation of the first edition
        Audiobook delivery — may exist without a Twi ebook
    Title edition: Revised second edition
      Language edition: English original
        Ebook delivery — separate commercial identity
  Title: Book 2 — its own editions, languages and deliveries
  Title: Book 3 — its own editions, languages and deliveries
Standalone title — same structure without series membership
```

A private draft title may have no editions or deliveries yet. The simple Creator Hub path creates a first title edition and its original-language edition automatically, then lets the creator choose ebook or audiobook without requiring files. Allow multiple title editions and multiple language editions from the first implementation; remove the earlier one-delivery-per-title limit and separate-title translation workaround. Enforce `UNIQUE(language_edition_id, kind, variant_key)` with `kind IN ('ebook','audiobook','web_text')`. This gives every language edition independent ebook/audio offerings; neither format is mandatory. Use a stable default variant key for simple setup; additional narrations or abridged/unabridged recordings get distinct delivery IDs and variant keys from the first domain model. Never use language-edition duplicates or release numbers to disguise a distinct product. The [relationship review](ENTITY_RELATIONSHIPS.md) defines credits, authority, publication snapshots and access provenance across this hierarchy.

### Identity and change rules

- Series membership is optional and does not imply common ownership, rights, agreements or purchase access. Use an ordered membership table, allowing a title in more than one authorized series. Support an optional display label such as “Book 1” and non-integer ordering for prequels/interludes. Membership changes require authority over both series and title; never merge titles from matching names.
- A title edition represents an intentional editorial product, not a new upload. A substantially revised text or materially abridged adaptation must be explicitly classified before review. Titles and edition labels have stable IDs and approved metadata revisions; changing a public label cannot rewrite historical sales.
- A language edition belongs to exactly one title edition and records a validated primary language plus optional additional content languages, original/translation/bilingual role, localized title/description, translator credits and explicit source language-edition links and optional source-release provenance; multiple sources use checked joins. Allow distinct translations in the same language with different stable IDs and labels; do not enforce language alone as a unique key. Each source link must reference the same title edition, cannot be self-referential or cyclic, and does not transfer rights or ownership. A translation of a revised second edition does not replace the first edition's translation.
- A correction to ebook files, chapter order or audio recording creates a new content release under the same delivery. A new translation, a new editorial edition or a distinct narration is not an ordinary release update. Creators describe changes; staff confirms classification. A new delivery does not inherit purchases from another delivery. Prior buyers may receive approved corrections within their existing delivery under the defined access policy; new-edition upgrades and cross-language bundles require explicit future offers.
- An audiobook can exist without an ebook. Bind its language and editorial scope to its language edition and declare any adaptation/abridgement; do not claim text/audio synchronization from shared ancestry. New narration variants have separate delivery IDs and commercial identity; replacing a narrator cannot silently overwrite an existing product.
- Updating the original creates a translation-review task/notice where relevant, never automatic replacement of translated text/audio. Record which source language edition and, when available, source release informed a translation. Language, title-edition parent and delivery kind become immutable identity after submission; moving published content requires an audited correction/migration, not a generic patch.

A title is publicly discoverable only when at least one delivery is published and eligible for sale/access. Public responses expose only eligible deliveries, not a creator's unfinished audiobook. Format filters count distinct titles. Published title details are an approved metadata revision, not an in-place view of private draft edits.

Future issue/container composition and access rules follow the [content-type plan](CONTENT_TYPES_AND_CONTAINERS.md). Chapters within an uploaded book are structural parts, not independent titles unless a separately supported workflow grants them identity.

### Content-type application

At launch `workType` (`book`, plus `blog_post` by R3) and typed book form distinguish novels, academic textbooks/monographs, reference works and anthologies without changing ancestry. Genre, subject, purpose, content language and media kind remain independent. The same title workflow supports blog_post works and start-in-editor drafts; channels present those titles. Academic descriptive fields do not imply peer review, chapter-level sales or automatic math/table conversion fidelity.

Blog_post/web_text is enabled by R3; later additional story/journal-article/issue profiles reuse finite-work identity where appropriate, with their own commands/readiness/renderers. A continuing newspaper/magazine/journal is `SerialPublication`; its next dated issue is a new issue title, not a correction of an earlier work. Anthology/issue components require ordered inclusion with pinned language/revision and explicit authority; an uploaded table of contents is not a set of independently entitled products. These future structures follow E1–E4 in the content-type plan and never grant access through membership alone.

Creator Hub actions belong to an explicitly selected individual or organisation account with active creator enrollment and current editor/signer permissions. Publisher author credits, rights evidence and beneficiary identities remain distinct from invited account users. See [account and user-group specification](ACCOUNTS_AND_USER_GROUPS.md).

Commercial setup selects one title-wide classification, **free or paid**, applied to its delivery products. Paid content then enables lifetime purchase, subscription/library access, or both with independent required terms; free full-content and paid routes cannot coexist. Staff publication freezes the commercial-policy revision. Bounded samples of paid content are previews, not free full-content offers. Follow the [commercial truth table and transition rules](CONTENT_OFFERS_AND_SUBSCRIPTIONS.md#free-versus-paid-then-paid-offer-selection).

## Creator Hub flow

1. **Create title.** Save name and owner immediately. Add authors, categories, audience and shared metadata. Optionally create/join an authorized series and set reading order. Standalone publishing never requires series setup.
2. **Choose edition and language.** Default to “First edition” and the creator's selected content language. Advanced controls add a revised title edition or a translation of a selected edition, with localized metadata, translator/source credits and independent rights evidence. App interface language is separate from content language.
3. **Choose a delivery.** Set up ebook or audiobook independently, without requiring files. Overview groups title editions, then language editions, then delivery status and next action; absent siblings add no readiness blockers.
4. **Prepare content.** Ebook: upload document/PDF/EPUB, optionally edit an imported document, and preview. Audio: add credits, upload/order chapters, preview, choose artwork and a retail sample. Resume partial setup independently.
5. **Set commercial details and submit.** Price, currency, release date, rights and agreement belong to the selected delivery. Review binds approved title, title-edition and language-edition metadata revisions plus exact content release and terms. Staff approval publishes only that delivery.
6. **Add or revise later.** Choose “Add language”, “Add edition”, “Add ebook/audiobook” or “Correct existing content” explicitly. Keep approved releases available while replacements are reviewed. Withdrawal of a delivery leaves its siblings intact unless a restriction explicitly covers them.

Show, for example, “First edition / Twi / Audiobook: published” and “Second edition / English / Ebook: draft”, with individual prices/readiness. Shared metadata changes require review; live listings keep their previously approved snapshots until approval. Do not collapse publication state, price or completion into one title-wide field.

## Entity definitions for the target SQL/API

These are proposed domain fields, not new Firestore documents. Concrete Go structs and generated TypeScript/Dart DTOs follow the versioned OpenAPI contract during implementation.

| Entity | Required identity and important fields |
| --- | --- |
| `Series` / `SeriesMembership` | Series ID, owner, approved metadata revision, title ID, ordering key and optional volume label; unique series/title membership, authorized changes, no entitlement inheritance |
| `Party` / managing account / scoped credit | Credited person or organization, explicit verified user claims/memberships and typed contributor credits; catalog management, authorship, rights holding and beneficiary are independent roles, as defined in the relationship review |
| `Title` / `TitleMetadataRevision` | Work ID, server-validated `workType` (book initially; blog_post by R3), managing-account ID (legacy owner mapped explicitly), draft/approved revision references, name, authors, categories, audience, shared assets, optimistic version and archive state; immutable submitted snapshots |
| `BookDetails` / academic descriptive profile | Title PK/FK with matching book work type; supported primary form (novel/textbook/monograph/reference/anthology), subject/audience and optional typed descriptive academic metadata. Does not imply peer review, chapter commerce or journal workflows |
| `TitleEdition` / `TitleEditionMetadataRevision` | ID, title ID, editorial label/number, description of changes, optional predecessor within the same title, draft/approved metadata references; independent identity from file updates |
| `LanguageEdition` / `LanguageEditionMetadataRevision` | ID, title-edition ID, primary/additional language tags, original/translation/bilingual role, distinct translation label, localized title/description, translator/contributor credits, source language-edition/release provenance, draft/approved metadata references |
| `Delivery` | ID, language-edition ID, kind (`ebook`, `audiobook` or validated `web_text`), immutable variant key and revisioned display label, version, workflow/availability state, working revision and `currentPublicationRevisionId`; derive `publishedReleaseId` from that snapshot or enforce pointer agreement; versioned offer references for free/lifetime/package participation and release date/distribution settings |
| `EbookDetails` / `AudiobookDetails` / `WebTextDetails` | Delivery PK/FK with matching kind; optional format-specific ISBN; ebook source/draft details or audio narrator/producer, abridgement, narration disclosure and recording copyright. Language derives from the language edition; web_text binds sanitized structured editor revisions and renderer version; measured metrics belong to content releases |
| `ManuscriptDraft` | ID, delivery ID, immutable original source, sanitized editor document/schema version, optimistic version and saved draft revisions; only document ingestion creates editable content |
| `ContentRelease` | ID, delivery ID, immutable manifest, source revision/hash, generation-input metadata references for provenance, processor version, metrics and timestamps; processing state distinct from approval |
| `PublicationRevision` | Immutable selected content release plus approved title/title-edition/language-edition metadata, artwork/credits, price and agreement versions; current pointer belongs to the delivery. Multiple publication revisions may reference unchanged content |
| `AudioChapter` | Stable ID, delivery ID, label, section kind, working position and source version; each release snapshots ordered IDs, output assets and durations |
| `Asset` | Storage identity/version, owner, MIME/bytes/checksum, validation, visibility and retention; typed series/title/title-edition/language-edition/delivery/release bindings, never raw URLs as identities |
| Offer / agreement / review / sale | Exact title, title-edition, language-edition, delivery, content-release and approved metadata revision IDs, rights/price revisions and frozen terms; server derives and validates ancestry |
| Purchase / entitlement | Delivery ID defines access; ancestry IDs support grouping/history. Approved corrections within the same delivery follow access policy; no implied cross-language, cross-edition, cross-format or series grant |

Use common delivery rows and typed detail tables. Enforce `UNIQUE(language_edition_id, kind, variant_key)` and matching kind/ancestry through foreign keys and transactional commands. Derive title ancestry through the parent chain; any denormalized IDs must be constrained to match it. Do not require one language edition per language: alternative authorized translations are valid. Keep ISBN optional and attached to the specific language/format product; reject reuse across distinct delivery products. External identifier/channel rules remain adapter-specific.

### Asset scope and inheritance

Store artwork/promotional material through typed title, title-edition, language-edition and delivery bindings; samples and supplements remain delivery-specific. Content-release assets include the exact validated source/output files and manifest. A binding must belong to the authorized title tree, with explicit asset-use authority, and its role must be allowed at that scope. Evidence remains private in the rights domain.

Resolve eligible artwork in order: delivery override, language-edition artwork, title-edition artwork, approved title default. Never inherit a cover in the wrong language without explicit approval. Ebook covers may use portrait artwork; audiobook artwork must be square. An unsuitable title default is a readiness blocker until the creator uploads an override or approves a generated square composition; do not silently stretch or crop it. Inheritance applies to metadata/artwork only where explicitly supported. Never inherit prices, rights approval, audio chapters, ebook files, samples or purchase access across modes.

Freeze resolved artwork/metadata asset versions in each reviewed release/listing submission. Editing shared artwork must not change an already approved release or make a private file public. Title attachments remain owner-only unless deliberately approved for public display. Delivery supplements such as an audio companion PDF require that delivery's access; a companion PDF does not create or grant an ebook delivery.

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
- Persist leases/retries and manifest fingerprints. A late chapter job cannot replace a newer upload. Content-release readiness means all required chapters and derived files are ready in the confirmed order, not just the first uploaded file. Compute duration server-side from the final ordered assets, excluding sample/supplements.
- Let the creator choose an excerpt from a validated chapter for a generated sample, or upload an excerpt for review. Propose 1–5 minutes, capped at the full runtime for shorter works. Store provenance/selection, duration and approval. A public sample contains only its deliberate excerpt; its endpoint cannot seek into a private master.
- Freeze chapter order/labels, durations, resolved artwork, credits and sample in the submitted release. A chapter replacement or reordering after publication creates a new release requiring review. Retain the approved manifest for existing playback and bookmark resolution.

### Listening and access

The title page offers “Read” and/or “Listen”, with delivery-specific prices, ownership and previews. Buying an ebook grants no audiobook entitlement, and vice versa. Start with free, lifetime-purchase and explicit R7 package offers on deliveries in supported currencies; credits/advanced bundles remain deferred; eligible audio can participate in the R7 monthly package programme.

Flutter adds chapter navigation, play/pause, seek/skip, playback speed, sleep timer, background playback, headset/lock-screen controls, resume and explicit offline downloads. These are new client work, not features supplied by the Go API. Keep reading and listening positions separate. Listening state uses reader profile + delivery + release + stable chapter ID + position milliseconds, completion and server revision. Validate position against measured duration. Never guess a page-to-audio mapping; synchronized read-along is deferred.

Authorize the manifest and every playable asset/range request or short-lived link using the delivery entitlement and rights state. A public playlist must not expose private chapter URLs. Expired links renew through authorization; source masters are never retail downloads. Background seeking and offline playback need explicit device checks. Cache by account/delivery/release/asset hash; downloaded files cannot be remotely erased. Keep old-release progress usable, and require a tested mapping or explicit restart choice when chapter structure changes.

Reader access additionally follows [reader profiles and household access](READER_PROFILES_AND_HOUSEHOLDS.md): adult/minor profiles have separate state; explicit sharing grants do not bypass maturity checks. Include reviewed suitability/missing-classification state in publication readiness for minor availability. A named organisation license never becomes household-wide by changing profiles.

## Publication, rights and commerce invariants

- Delivery workflow: `draft -> review -> approved -> published`, with explicit changes-requested, suspend, withdraw and archive commands. Processing (`queued/processing/ready/failed`) is separate. Publication requires a reviewed release, approved title revision, active delivery agreement, valid pricing and permitted rights. A publication revision binds the exact content and approved listing facts; metadata-only updates can reference unchanged content. Preserve the earlier staff activation transaction.
- Readiness retains `title` versus `listing` scopes but requires a delivery ID for listing checks. Shared checks are computed from the bound title revision; document, PDF, EPUB and audio rules select only applicable checks. An absent or incomplete sibling delivery contributes no blocker or denominator weight.
- Agreements and offers bind a delivery and release. Enforce at most one pending/active agreement **per delivery**, not per title. Rights scopes may target title, title edition, language edition or delivery; broader grants cover descendants only when format, language, territory and date terms explicitly permit them; a format-specific dispute/takedown affects that delivery, and a title-wide restriction affects all descendants. Author declarations do not grant staff verification powers.
- Freeze title/title-edition/language-edition metadata revisions, delivery, release, price/currency, share, rights scope and agreement in every checkout/sale. Record each authorized grant with purchase/manual/free provenance, deriving one effective entitlement per reader-profile/delivery with authenticated member checks for organisation assignments; settle purchases with payment idempotency and overpayment recovery from the existing plan. Approved release updates can remain available under that delivery entitlement; cross-mode grants require a separately defined offer.
- Ordinary withdrawal stops new sales; access for existing buyers follows the approved policy independently. All new audio streams/downloads use the same rights/availability resolver as ebook delivery. Refunds and payouts retain historical delivery/release/terms instead of relying on current title fields.
- Aggregate creator earnings by title with delivery breakdowns and currency separation. Count title discovery, ebook downloads, listening starts, completion and paid sales as distinct defined events; do not treat chapter HTTP requests as sales or completed listens. Keep existing review behavior at title scope initially, with optional delivery context for new reviews.

## Migration and implementation acceptance

The current Firestore `EpubBook` is a combined record; `BookType` includes physical values, and its converter metadata is ebook-specific. That is historical compatibility, not the target schema. This planning change deliberately leaves runtime shapes untouched. Any transitional Firestore shape change must update `@wolly/schema`, `SCHEMA.md` and mirrored Dart models together. SQL/API implementation uses coordinated migrations and generated/verified transport types.

Import a validated legacy ebook record as one title, first title edition, original-language edition and ebook delivery, source/release/assets and an explicit legacy-ID map. Preserve the legacy book ID as title identity where possible, and map old purchases/progress/contracts to the ebook delivery and exact release/terms. EPUB and PDF outputs of one pressing are assets of the same ebook delivery. Never create an audiobook entitlement from an old book purchase by inference.

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

### Series, editions and languages acceptance — B1, B3–B8 and B13

1. Create a three-title series and a standalone title; reorder membership without altering title identities, purchases or publication state. Deny membership changes without authority over both resources.
2. Under one title create first and revised second title editions. Add English original and Twi translation under the first; publish Twi audio without a Twi ebook. Add a second authorized Twi translation with a distinct identity/label.
3. Filter by language and format together: Twi + ebook cannot match English ebook plus Twi audio. Expose only approved eligible combinations and retain distinct-title counts. Show series order and explicit edition/language/format selection.
4. Correct an ebook typo or audio chapter under the same delivery, preserving approved release/history and old locators. New editorial editions and translations use new IDs and do not inherit purchases. Test explicit restart/mapping when locators change.
5. Update original-language content and flag dependent translations for review without modifying them. Reject cyclic/cross-edition source links and mismatched ancestor IDs, assets without explicit use authority, or edited submitted identity fields.
6. Exercise rights restrictions at language-edition and title-edition scopes as well as delivery/title scope. Buying or refunding one delivery leaves other languages, editions, formats and series volumes unaffected. Freeze full ancestry and metadata in contracts/sales.
7. Import one legacy record into the full default hierarchy without duplicates. Unknown language is an explicit review exception, never guessed; grouping similar titles into series/translations requires verified evidence and authorization.
