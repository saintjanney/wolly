# Content types, containers and staged expansion

Planning alignment reviewed 14 November 2026; external evidence retains its original checked date.
Design proposal and source review, 13 November 2026. Wolly starts with digital books and their audiobook products while preserving the existing blog. The target includes editor-authored blog_post titles and R7 monthly packages, then expands to additional short works, periodicals and scholarly content without treating every object as a book or rebuilding identity, rights and commerce. This document extends [entity relationships](ENTITY_RELATIONSHIPS.md) and [titles and digital media](TITLES_AND_DIGITAL_MEDIA.md). Future capabilities below are planned boundaries, not implemented features or additional B0–B13 launch commitments.

The [account and user-group specification](ACCOUNTS_AND_USER_GROUPS.md) makes individual/organisation account support and independent consumption/creator capabilities core requirements. All enabled content workflows use that shared account/permission foundation; membership alone confers no rights to privately distribute or consume arbitrary content.

Release sequencing and channel commitments are defined in the [product roadmap](PRODUCT_ROADMAP.md); the [release execution plan](RELEASE_PLAN.md) requires complete creator/reader/staff journeys, supported web/Android/API evidence and domain/cohort gates. Early limited pilots do not waive the full requirements in this specification.

Scope revision: [unified titles, offers and subscriptions](CONTENT_OFFERS_AND_SUBSCRIPTIONS.md) defines blog posts as titles, source/editor authoring, mutually exclusive free/paid title classification, lifetime and/or subscription routes for paid titles, and independent grant provenance. Release order is R1 free ebooks → R2 free audio → R3 lifetime monetisation → R4 publisher teams → R5 households/minors → R6 sponsored consumption → R7 subscription programme → R8 full rollout. Earlier source inventories describe legacy behavior, not an exception to this target.

## What other platforms demonstrate

These are documented product/metadata behaviors, not claims about vendors' private database schemas. Wolly's design choices below are inferences from the sources and its own requirements.

| Source checked | Documented approach | Wolly inference |
| --- | --- | --- |
| [Exact Editions company history](https://ocean.exacteditions.com/history) | One platform supports magazine archives and book collections, with subscription access to their contents | A shared platform can preserve different container/access models rather than presenting everything as books in series |
| [PKP Open Journal Systems production documentation](https://github.com/pkp/pkp-docs/blob/main/learning-ojs/editorial-workflow/en/production.md) | Article publication includes contributor metadata, references, publication files and assignment to journal issues | Periodical issue/article relationships and scholarly metadata are distinct from a book's editorial editions |
| [Crossref books and chapters](https://www.crossref.org/documentation/schema-library/markup-guide-record-types/books-and-chapters/) and [record-type guides](https://www.crossref.org/documentation/schema-library/markup-guide-record-types/) | Separate models for books/chapters, journals/articles and other record types, with reusable metadata segments | Reuse common identity/credit/revision primitives, with typed metadata and workflows for each family. Crossref is a metadata registration service, not a retail platform |
| [Ghost posts](https://ghost.org/help/posts/), [pages](https://ghost.org/help/pages/) and [publishing](https://ghost.org/help/publishing-content/) | Posts cover multiple writing forms; pages have different discovery behavior, while publishing can target web, email or both | Content form, navigation and distribution channel are separate concerns. Use blog_post titles with editor-backed web_text; preserve channel navigation, safe rendering and paid access during migration |

No source implies that Wolly must implement DOI registration, journal peer review, archive subscriptions, web-native news or every supported media type at launch.

## Separate the dimensions

| Dimension | Wolly meaning | Example / storage boundary |
| --- | --- | --- |
| Work type | The editorial identity of a finite work | `book`, future `short_story`, `poem`, `essay`, `article`, `periodical_issue`; server-controlled type code, not arbitrary creator input |
| Form / purpose / subject | Descriptive classification, not a new identity hierarchy | Novel, textbook, monograph, reference work, anthology; academic audience, discipline, educational level, mystery genre. Store supported form/purpose fields and typed profiles; do not make one giant enum mixing all dimensions |
| Container relationship | How works are grouped or assembled | Series membership, periodical issue membership, anthology placement, serialized installments; each has different semantics |
| Editorial edition | Material editorial revision of one work | Second edition of a textbook; not tomorrow's newspaper issue |
| Language edition | Original, translation or bilingual realization | Two different Twi translations or a bilingual edition |
| Delivery product | Independently entitled reading/listening product | Launch ebook/audiobook variants; web_text provides editor-authored reading by R3; further kinds need their own reader contracts |
| Rendition / asset | File representation of a product's release | EPUB, PDF, audio tracks; not a genre or a new work |
| Commercial offer | What the reader buys or subscribes to | Launch one delivery; future issue subscription, collection license or bundle needs its own defined coverage |

Keep `Title` as the existing API/domain name for an independently identified finite work. It is broader than a display title string. Do not introduce another universal `Content` parent just to wrap it. The public UI can say Book, Story, Article or Issue according to enabled type. Catalog discovery can combine type-specific result cards, but commands and access rules remain typed.

At book launch, `Title.workType = book`; `book_details` stores a bounded primary form such as novel, textbook, monograph, reference or anthology. Genres, audiences and subjects remain separate joins/fields. A creator can publish an academic book with the same files/editions/commercial flow as a novel. Advanced scholarly claims/features do not follow from choosing that label.

## The structures to preserve

### Books and standalone short works

```text
Managing account (one creator may manage multiple outputs)
  Series (optional, ordered membership)
    Title: Book / future Story or Essay
      TitleEdition
        LanguageEdition
          Delivery variant (ebook or audiobook at launch)
            ContentRelease → assets
```

Series membership remains M:N, not ownership containment. A book series may group novels, scholarly volumes or other explicitly permitted work types. Membership does not change a work's type or make it available for purchase. Default validation should reject nesting periodical publications, issue archives and unrelated object types into a narrative book series.

A standalone short story has its own work identity, author credits, languages and products when short-work publishing is enabled. It does not need a dummy parent book. At launch a short-story collection can be uploaded as one anthology book; separately published stories, story pricing and anthology composition are later capabilities with their own acceptance gates.

### Newspapers, magazines and journals

```text
SerialPublication: newspaper / magazine / scholarly journal
  Optional volume grouping / labels
  Issue membership
    Title: issue dated 13 November 2026
      TitleEdition (default first editorial edition)
        LanguageEdition
          Digital issue delivery → corrected content releases
    Issue items (optional, separately modeled when enabled)
      Article work, editorial, story, image or other supported item
```

Use `SerialPublication` / `serial_publications` for the continuing publication identity. It is not a book series or the existing blog `Publication`. A serial has its own publisher/managing account, branding, descriptive languages, cadence, timezone and identifier records. Book series and serials may share helper logic for approved metadata, but retain distinct FK targets and commands.

An issue is a finite work represented by `Title(workType = periodical_issue)` with a typed `periodical_issue_details` row referencing exactly one serial publication. Issue number, optional volume label, issue date/coverage range, local edition key and stable ID identify the issue. Issue date is a calendar date; publication instant is a UTC timestamp. Do not assume one issue per date: morning/evening, regional and special issues need distinct keys. A uniqueness constraint should use `(serial_publication_id, issue_key)`, not date alone. Volume/issue labels need not be integers.

A new daily issue creates a new issue title. Repairing that issue creates a content release; a morning versus evening product is explicitly classified and labeled, not silently overwritten. Material editorial corrections may also need public correction notices. An article can be published online without an issue; do not require an artificial issue for continuous publishing.

A whole-issue PDF is a valid future first periodical delivery path. It does not imply article extraction, mobile reflow, OCR, accessibility remediation, article paywalls or a listenable edition. Those require explicit ingestion/rendering and policy work. Avoid labeling a digital newspaper product an audiobook merely because it contains a narration track. Extend delivery kinds/profile terminology only with consumer support and versioned DTOs.

### Anthologies, edited academic books and issues containing works

```text
Anthology book / edited book / issue (container work)
  Selected edition + language edition
    Ordered content placements
      Story / article / chapter work or approved text part
```

A table of contents chapter is normally a structural part of a release, not a new title. Promote a chapter/story/article to a work only when it needs independent identity, credits, reuse, citation or publication. A work may appear in multiple authorized containers through placements; it does not acquire multiple structural parents or copies of its author record.

Future typed `content_placements` bind a container language edition/composition revision to a component work's exact language edition and approved revision/release. Store role, section, order, display label, locator and inclusion-rights evidence. A container's immutable publication snapshots the exact placements. Reject cycles, foreign-authority inclusion and stale/private component references. A story's new release cannot silently update old anthology purchases. A citation/reference is not an embedded placement; links to external material need no invented local work.

A container's available file is not necessarily assembled dynamically from components. An uploaded anthology PDF may exist without separately modeled constituent works. Do not infer independent story entitlements from a contents page, or import unverified article records by filename/OCR.

### Serialized fiction

An unfinished novel released chapter by chapter is different from a series of complete novels. Future `installment_memberships` relate a parent work/language edition to ordered installments with their own publication snapshots. Define completion state, added-installment coverage, corrections, cancellation and final compiled-edition mapping before enabling it. Neither an ordinary series membership nor “update the purchased EPUB forever” defines that product's promise.

## Relationship additions and safeguards

| Relationship | Cardinality / identity | Guardrail |
| --- | --- | --- |
| Managing account → supported output types | 1:N across books, blogs and later serials | One authenticated creator can create several types; each requires its enabled capabilities and scoped permissions. No separate user per content type |
| Title → work-type profile | One allowed type profile per title; optional compatible specialist profile | Type is fixed once submitted; profile fields are schema validated. Changing type needs an audited command, not an arbitrary PATCH |
| Book → academic profile | Optional typed profile | Discipline, abstract, keywords, educational level, edition-specific references/credits and provenance where supported. Choosing “academic” is not staff verification of peer review or an accreditation claim |
| SerialPublication → issues | 1:N; an issue belongs to one serial | Explicit authority over publication and issue. Transferred/reprinted content uses links or placements, not reparenting historic issues |
| Issue / anthology → component placements | Future M:N with ordered, revision-bound joins | Separate display order from authorship, access and payout. Included content needs explicit rights; no silent cascading publication |
| Content → external identifiers | Typed scoped associations, future channel rules | Work, product, issue and serial identifiers have different scopes. Validate scheme and ownership; no blanket global ISBN field or requirement that every work has an ISBN |
| Academic work → references | Zero or more structured citations | References bind the relevant editorial/language/publication revision, not a mutable work-wide bibliography. External cited works can remain citation records |
| Work → correction/retraction notice | Typed dated decisions, future scholarly/news workflow | Preserve prior publication provenance; visibly report corrections/retractions and enforce access policy separately from destructive deletion |
| Serial / collection offer → access coverage | Future versioned coverage policy | Latest issue only, selected issue, issues during paid period, all archives and retained access after expiry are different offers; no accidental inheritance from parent membership |

Product IDs and entitlement targets remain explicit. Owning an issue can authorize its deliberately included content through the issue's protected presentation, if that offer grants it; it must not automatically grant the component's standalone product, alternative language or future revision. Conversely owning a standalone article does not grant an entire issue. Rights/access checks must constrain byte ranges and APIs so an article purchase cannot download a protected whole-issue PDF.

A container's price/royalty terms are not automatically a sum of its component prices/credits. Any multi-contributor payout needs a signed versioned allocation model and rounding/reconciliation tests before selling that offer.

## Architecture and API extension contract

Keep the Go modular monolith. Reuse identity, parties/credits, managing accounts, scoped rights, assets/jobs, approved snapshots, payment settlement, finance and audit. Use typed domain services for editorial workflows; do not add a microservice per content type or a runtime custom-schema engine.

- **Launch catalog:** add `work_type` to title identity, `book_details` for book form, and optional bounded academic descriptive metadata. Preserve the edition/language/delivery hierarchy and distinct contributor roles. Category/genre is never the workflow switch.
- **Type profiles:** Go-owned versioned profiles declare allowed metadata, source inputs, applicable readiness rules, supported renderer/delivery kinds and commercial capabilities. Enabling a type requires migrations, handlers, client forms/rendering, access policies and acceptance evidence; a creator cannot invent a schema or enable a capability by posting a type string.
- **Capability contract:** `/capabilities` distinguishes which work types/profiles are enabled for creation, reading and commerce. Reject disabled/unknown type operations with stable validation details. Both old and new clients must handle unknown result kinds safely; never deserialize an issue into an ebook merely because it has a cover URL.
- **Future periodicals:** `internal/periodicals` owns serial metadata, issue identity, optional sections and archive navigation; `internal/composition` is introduced only when reused works/placements ship. Proposed tables: `serial_publications`, `serial_metadata_revisions`, `periodical_issue_details`, then typed composition revisions/placements. Their scope adapters must integrate with the one rights/access resolver, rather than creating a bypass.
- **Routes:** keep `/titles` for enabled finite work types, with `workType`, form and subject filters. Later add explicit `/serial-publications`, `/serial-publications/{id}/issues` and creator equivalents. Use specialized issue-create commands so serial/issue/profile rows are transactional. Do not rename legacy blog `/publications` to make room or overload `/series` with unrelated kinds.
- **Consumption:** editor-authored blog_post titles use validated web_text with sanitization, canonical URLs and revisions by R3. Blog channels reference those same title/publication identities; no duplicate paid-content silo. Future journal/news article workflows still need their own editorial gates.
- **Commercial scope:** launch checks out one delivery product. R7 monthly packages extend explicit offer targets and period/grant provenance; later bundle/issue-specific promises add their own coverage with typed foreign keys and versioned coverage. Do not weaken the existing delivery constraint or reuse blog paid state as a universal access flag. New schemes need their own refund, expiry, retained access, rights and creator allocation acceptance.

An enabled label is not evidence that a workflow works. Books with equations, tables, complex footnotes or right-to-left text need format-specific fixtures; a preserved PDF can be supported while equivalent reflowable EPUB conversion remains unavailable. Avoid a universal academic-format fidelity promise.

Reader identity and maturity eligibility across every enabled type follow [reader profiles and household access](READER_PROFILES_AND_HOUSEHOLDS.md). A child-appropriate book filter does not establish safe blog/article/issue access; each profile-aware renderer/discovery/sample path must enforce the applicable policy before enablement.

## Creator and reader experience

The future creator home offers “Create book”, “Create short work”, “Create publication/issue” and existing blog authoring according to enabled capabilities. Each starts a type-specific short form under the same account. Book forms support novel/textbook/monograph/anthology choices without showing issue schedules; issue forms show date/number/edition without requesting a book's revised-edition number. Separate “add language”, “add production”, “new issue” and “correct release” actions.

Readers can discover supported types together and filter by type, subject, language and reading/listening format. Cards identify the work type and concrete purchase scope. Serial detail offers dated archive navigation; series detail offers reading order; anthology detail can expose credited contents once composition is supported. Unknown/disabled types do not appear as purchasable blank cards. Old clients receive only supported types or an explicit update-required result.

## Book-first rollout and acceptance

| Stage | Scope and required evidence |
| --- | --- |
| B1 foundation | Define finite-work identity, `work_type` (`book` initially, `blog_post` enabled with the unified editor path by R3), book form profiles and disabled-type capability contract. Record serial/issue/composition boundaries; do not build dormant future tables/handlers just to claim support |
| B3–B7 book authoring | Publish novel and academic book fixtures through existing editions/languages/deliveries. Optional metadata follows applicable rules; academic labels do not add mandatory journal fields or grant peer-review badges. Blog posts map to titles; legacy writer remains functional until verified cutover |
| B8–B13 book release | Purchases, review, cache/import and generated DTOs retain explicit type. Map verified legacy records to book; unknown format/type cases remain import exceptions. Negative tests reject unsupported new types |
| E1 standalone short works | Enable story/poem/essay profiles individually, with editorial/length policy, metadata, pricing, source/renderer/access tests and truthful discovery. Optional series without dummy parent books |
| E2 digital periodicals | Ship serial identity and issue-only PDF/other explicitly supported renditions, dated archives, issue-specific rights/purchases/revisions and read/device checks. Newspaper, magazine and journal labels do not imply scholarly workflow |
| E3 components and scholarly workflows | Enable typed article/chapter/anthology placements, version-pinned inclusion rights, article reading/citations, corrections/retractions and any claimed review workflow; no automatic component entitlement |
| E4 recurring and serialized products | Extend the R7 programme for issue/archive-specific coverage, serialized installments or advanced bundles individually with coverage, expiry/refunds, retained access and creator allocations before sale |

E1–E4 are staged proposals after the book launch, not automatic extensions of its completion criteria. Future scope may be reprioritized without changing the identity boundaries.

Required future scenarios before enabling the associated capability:

1. The same creator publishes a novel, a textbook and a blog post under one account, with typed forms and independent permissions/access. Academic-book rendering fixtures include tables, references, equations and pagination limitations.
2. A short story exists alone and in two authorized anthologies; published placements pin the selected translation/revision. Correcting the standalone story does not mutate historic collections or grant their full products.
3. A newspaper has two issues on one date with different local edition keys, plus a special issue. A new date creates a new work; fixing a PDF creates a release of that issue. Archive order is stable and timezone-aware.
4. An article is published without an issue and later placed in an issue with explicit rights and snapshot approval. Article-only access cannot retrieve the whole-issue file; issue access does not claim standalone ownership.
5. Language/format/type filters match one eligible product; cross-account assets, private components and unsupported types are excluded. Old clients do not crash or purchase unsupported content.
6. Future issue subscriptions distinguish current-period issues, archives and post-expiry access. Replay/cancellation/refund events do not silently broaden coverage. A package grants no unlisted serial access by default.
7. A corrected/retracted academic article retains source/decision history and a clear notice. Public scholarly badges require recorded workflow evidence, not a type selector. Metadata change/reuse cannot rewrite historic payout allocations.
