# Content traceability and rights enforcement

What Wolly can actually do about a book that leaks, and what it cannot. Written
because the difference is easy to blur, and blurring it means promising a
rightsholder something no publisher on earth can deliver.

**The short version.** Wolly can identify which pressing a leaked file came
from, and can stop issuing new downloads within minutes. Wolly cannot delete a
file that is already on somebody's device. Nobody can. Any product that claims
otherwise is either describing a DRM container that merely refuses to open, or
is doing something to the user's computer that they did not knowingly permit.

---

## 1. Tagging: what goes into every file

Every book the press produces carries a **pressing fingerprint**, minted in
[`provenance.ts`](services/converter/src/provenance.ts) as `wolly-<uuid>` and
stored on the book record at `epubs.conversion.fingerprint`. It is written into
three independent places per format, so removing it takes deliberate effort in
each one rather than a single metadata wipe.

**In the EPUB**

| Where | What | Survives |
| --- | --- | --- |
| `content.opf` `<dc:identifier>` | `urn:wolly:<bookId>:<fingerprint>` | Re-zipping. Lost on conversion by Calibre. |
| `content.opf` `<meta property="wolly:fingerprint">` | the fingerprint | Re-zipping. Lost on conversion. |
| `toc.ncx` `dtb:uid` | the same identifier | Re-zipping. Often lost on conversion. |
| `colophon.xhtml` | a human-readable page naming the pressing | Conversion to other formats, text extraction, copy-paste |

**In the PDF**

| Where | What | Survives |
| --- | --- | --- |
| Document info `/Subject` | publisher, pressing, licence terms | Re-saving in most viewers. Stripped by `exiftool -all=`. |
| Document info `/Keywords` | fingerprint, `wolly-book-<bookId>` | Same. |
| Colophon page | the same record as printed text | Printing, re-distilling, text extraction, screenshots-plus-OCR |

The pattern worth noticing: **metadata is convenient and fragile; the colophon
page is inconvenient and durable.** Anyone who can run `exiftool` can strip the
metadata in one command. Removing a printed colophon page from a PDF, or a
colophon document from an EPUB spine, means editing the book itself. That is why
the record exists in both forms, and why the metadata is not relied on alone.

### Measured, not assumed

The table above is the result of actually attacking the files, with
`services/converter/tools/trace.js` as the reader. Reproduce it by pressing the
corpus (`npm --workspace @wolly/converter test`) and stripping the output.

| Attack | Result |
| --- | --- |
| PDF: every info-dictionary field cleared (the `exiftool -all=` move) | **ATTRIBUTED.** The colophon is rendered page text, so wiping metadata does not touch it. |
| EPUB: colophon document deleted, OPF and NCX identifiers redacted, re-zipped | **NO CALL.** Every mark is gone. |

So the two formats are not equally durable, and it would be dishonest to imply
they are. **A PDF resists a casual strip; an EPUB does not.** An EPUB is a ZIP of
separate files, and the colophon is one of them, so deleting it is a drag to the
trash. The PDF colophon is text laid into the document, and removing it means
re-typesetting the book.

This is a known limit, not a defect to fix by hiding the mark better. The
response is per-copy marking (section 2) plus the fact that a leaker who strips
an EPUB has demonstrably acted deliberately, which matters in a takedown.

### What this is not

It is not telemetry. A file cannot report where it has been. EPUB reading
systems strip scripts and PDF viewers block them, and even if they did not,
building a book that phones home when opened would be a surveillance feature
rather than a publishing one. **Tracking here means tracing, not tracking.** You
learn where a file came from when a copy surfaces, not where it currently is.

### What is deliberately not built

- **Zero-width character fingerprinting.** Hiding an identifier in invisible
  Unicode inside the prose sounds appealing and is mostly theatre: it dies to a
  single regex, and worse, ordinary format-shifting mangles it into a *different
  valid-looking* identifier, so it can accuse the wrong reader. A forensic mark
  that produces confident false positives is worse than no mark.
- **Font obfuscation keys as a fingerprint.** The EPUB font-mangling key is
  derived from the identifier, not the reverse, and it breaks for honest readers
  who re-save in Sigil.
- **Image steganography.** Books are mostly text, and the technique dies to
  re-encoding.

---

## 2. Per-copy marking (designed, not yet built)

Everything above identifies a **pressing**, which is one per book, not one per
buyer. So a leaked file today tells you *which book and which typesetting run*,
not *who downloaded it*.

Per-copy marking closes that gap, and the honest place to do it is at download
time in `getBookDownloadUrl`, not at pressing time:

```
bookCopies/{copyId}
  copyId       random UUID, the ONLY identifier written into the file
  bookId, uid  resolved server-side, never embedded
  fingerprint  the pressing this copy derives from
  issuedAt, epubSha256, pdfSha256
  revokedAt, revokedReason
```

The file carries `copyId` and nothing else. The mapping from `copyId` to a
person stays server-side, so a shared book does not leak a buyer's identity or
email to everyone who receives it. That is a deliberate privacy choice with a
real cost: an opaque id deters less than a visible name would.

**A mark identifies a copy, never a person.** Shared households, resold devices,
malware and credential theft all produce leaks traced to an account that did
nothing wrong. A fingerprint hit is an investigative lead that needs
corroboration. It must never be wired to automatic account termination.

---

## 3. Revocation: three tiers, stated precisely

### Tier 1: what Wolly does today

Implemented, live, and the only tier that is genuinely enforcement.

Every download goes through
[`getBookDownloadUrl`](services/api/src/download.ts), which checks in order:
the book is published or you own it; `rightsStatus` is not `revoked` (and not
`disputed` unless you own it); and for a paid book, that a `purchases` document
says `completed`. Only then does it mint a **15-minute v4 signed URL**.

There is no path around it. `storage.rules` denies every client read of
`converted/**`, and the bucket has no public IAM binding, so the
`storage.googleapis.com` form of those paths is not readable either. Signing
failure throws rather than falling back to a permanent URL.

Setting `rightsStatus: 'revoked'` therefore means: **nobody, including the
author, can obtain the file again.**

Its real limits, which belong in any rightsholder conversation:

- An **already-issued** signed URL keeps working until it expires. Revocation
  bites within at most 15 minutes, not instantly.
- It stops *new fetches*. Someone who downloaded once and never returns is
  permanently out of reach.

### Tier 2: what a first-party reader could add

Not built. Worth building, but it is deterrence and hygiene, not security.

The reader app would keep downloads encrypted inside its own app container,
check entitlement when a book is opened, and on revocation drop the key and
delete its own copy. An offline grace window (14 to 30 days) keeps a reader's
library working on a plane, and is by construction a hole for exactly that long.

Everything about this is best-effort. Push delivery is not guaranteed: iOS
silent notifications are throttled and never arrive after a force-quit, Android
data messages are suppressed by Doze and OEM battery managers. So the honest
description is "deleted at next successful check-in", with no deadline and no
completion receipt. A rooted device, an emulator or a patched build extracts
the key. **This raises the effort required; it does not make copying
impossible.**

### Tier 3: what is not possible at any price

- **Deleting a file the reader exported.** Once a book is in Files, Downloads,
  an email attachment, a cloud drive, a USB stick or a laptop, it is gone from
  our reach permanently.
- **Deleting anything on a device that never contacts Wolly again.**
- **Deletion through DRM.** Revocation never removes bytes. Readium LCP is
  weaker here than its reputation: the content key travels *inside* the licence
  that ships with the book, and the status-document spec says a client must not
  block access when the status server is unreachable. An offline device keeps
  reading a revoked book, and nothing in the spec requires deleting it.
- **Broad filesystem access on Android.** `MANAGE_EXTERNAL_STORAGE` is granted
  only to apps whose core function is file management. An ebook reader will not
  pass review, and applying under a false justification is a policy violation.
- **Anything that defeats a screenshot, a camera, OCR, or retyping.**

The line, stated once: **you can delete what your app wrote, on a device that
still talks to you, in a place the OS lets your app reach, at a time you cannot
guarantee. You cannot delete anything else.**

Reaching further means privileged code the user did not knowingly authorise.
Intentionally destroying data on someone's computer is the conduct the US
Computer Fraud and Abuse Act addresses at 18 U.S.C. 1030(a)(5)(A), and a terms
of service clause is a contested defence rather than a safe harbour. The Sony
BMG rootkit shipped with an EULA and still produced an FTC settlement.
Legitimate remote wipe exists only through a device owner's own MDM on enrolled
hardware, which would only ever apply if Wolly sells to institutions.

---

## 4. How to describe this, in public

**To rightsholders.** "We stop issuing download links within at most fifteen
minutes, so the book cannot be fetched again by anyone including the author, and
every copy we pressed carries an identifier that lets us trace a leaked file
back to the pressing it came from." Never "we delete all copies". Never a wipe
deadline. Never any claim that covers a file the reader exported.

**To readers.** "Access revoked." "Removed from your library." Only once Tier 2
ships, "removed from your devices the next time they connect". Never
"destroyed", "wiped" or "remotely erased".

**One legal coupling to check before launch.** California AB 2426 (in force
1 January 2025) restricts advertising digital goods with the words "buy" or
"purchase" without disclosing that access is revocable, and exempts sellers who
*cannot* revoke. Building Tier 1 puts Wolly inside its scope, which means the
purchase flow needs the disclosure. This is a lawyer question, not an
engineering one, but it is engineering that triggers it.

---

## 5. Where the code is

| Concern | File |
| --- | --- |
| Minting the fingerprint | [`services/converter/src/provenance.ts`](services/converter/src/provenance.ts) |
| Stamping the EPUB | [`services/converter/src/epub.ts`](services/converter/src/epub.ts) |
| Stamping the PDF | [`services/converter/src/pdf.ts`](services/converter/src/pdf.ts) |
| The delivery and rights gate | [`services/api/src/download.ts`](services/api/src/download.ts) |
| Denying direct reads | [`packages/firebase-config/storage.rules`](packages/firebase-config/storage.rules) |
| Stopping an author clearing their own revocation | [`packages/firebase-config/firestore.rules`](packages/firebase-config/firestore.rules) |
| Reading a mark out of a found file | [`services/converter/tools/trace.js`](services/converter/tools/trace.js) |

```bash
npm --workspace @wolly/converter run trace -- /path/to/found.epub
```
