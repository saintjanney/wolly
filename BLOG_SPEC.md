# Wolly Blog: feature specification

Status: **decisions settled, ready for Phase 0**. Author: platform.
Date: 2026-07-24. Open questions and their resolutions are in §14.

Wolly today publishes **books**. This spec adds **blog posts** as a second
first-class content type: creators write and publish them from the creator-hub,
readers consume them on a new public website and inside the Flutter reader, and
creators can monetise them with free and paid subscriptions.

The target is feature parity with [Substack](https://substack.com/features) on
the things that matter for a writing-and-subscription business: publish, send,
paywall, get paid, grow. Section 3 is honest about what parity does and does not
include.

---

## 1. What I found in the live database first

Before designing anything I audited the production Firestore
(`wolly-1133d`) with the admin service account. **Several findings change the
plan, and two are outright blockers.** Everything in this section is observed,
not inferred.

### 1.1 Live collection inventory

| Collection | Docs | Notes |
|---|---:|---|
| `books` | 3 | Dead. The pre-`epubs` collection. Still has live rules. |
| `countries` | 25 | Rich reference data (currency, tax, ISBN agency, payment methods). |
| `creator_wallets` | 1 | A single **empty** document. |
| `epubs` | 49 | The book catalog. See 1.3. |
| `genres` | 27 | 20 fully-formed, 7 with only `name`/`bookCount`/`updatedAt`. |
| `payment_methods` | 2 | `display_name` only. |
| `payment_schedules` | 2 | snake_case keys. |
| `supported_currencies` | 1 | snake_case keys. |
| `users` | 14 | See 1.4. |

**`reviews`, `purchases`, `reading_progress`, `bookmarks`, `follows` and
`payouts` do not exist.** They are defined in `@wolly/schema`, documented in
`SCHEMA.md`, covered by deployed security rules, and read by shipped reader
code, but no document has ever been written to any of them. The payout service
added in `d334d03` is deriving history from an empty collection.

Firebase Auth has **8 users**, all `password` provider.

### 1.2 BLOCKER: the repo's security rules are far behind production

`packages/firebase-config/firestore.rules` (what CI deploys) and the ruleset
actually live in production (created 2026-03-18) have diverged badly.

Production has rules the repo file does **not** contain at all:

- an `isAdmin()` helper (reads `users/{uid}.isAdmin`)
- `epubs`, `purchases`, `reading_progress`, `follows`, `bookmarks`, `genres`,
  `payouts`
- admin read/update grants on `books` and `epubs` for moderation

The repo file still contains only the dead `books` block and a handful of
reference collections.

**`npm run deploy` runs `firebase deploy`, which would push the repo file and
remove every access rule the reader and creator-hub depend on.** The reader
would lose all book, purchase and progress access immediately. This has to be
fixed before any blog work touches rules, and it is the reason Phase 0 exists.

`packages/firebase-config/firestore.indexes.json` has the same problem in a
milder form: its only entry indexes the dead `books` collection. Every composite
index production actually uses was created out-of-band and is not in version
control.

### 1.3 BLOCKER: 48 of 49 books are unowned, and most look pirated

Only one `epubs` document satisfies the reader contract in `SCHEMA.md`. The
other 48 carry **only** `title`, `url`, `isPublished`, `genre`, with no
`ownerUserId`, `author`, `coverUrl`, `price`, `fileType`, `rating`.

That is the technical half. The other half is worse: **27 of the 48 have
`z-lib.org` in their filename**, and most of the remainder are in-copyright
commercial titles: Yaa Gyasi's *Homegoing*, Chimamanda Ngozi Adichie, four
Priscilla Shirer titles, Don Norman, Goldratt, Marty Cagan, Steve Blank, Cal
Newport. All 48 are `isPublished: true` and are being served by the live reader
right now, and because none has an `ownerUserId`, no creator on Wolly owns any
of them or earns anything from them.

This reads like development seed data that reached production. Regardless of
intent, the live catalog is currently ~48 pirated commercial ebooks plus one
real creator book, and **a paid subscription business cannot be built on top of
that.** It is a legal exposure, not a data-quality issue.

Three consequences:

- Phase 0 unpublishes all 48
  (`apps/creator-hub/scripts/unpublish-unowned-epubs.js`, dry-run by default).
  This is reversible and deletes nothing; what replaces them is a business
  decision. *Alice's Adventures in Wonderland* is already in the catalog and is
  genuinely public domain, so a Project Gutenberg seed is a legitimate refill.
- A validation rule must refuse `isPublished: true` on any document without an
  `ownerUserId`, so this cannot recur, for books or for posts.
- The deployed rule `allow read: if isAuthenticated() && isOwner(resource.data.ownerUserId)`
  evaluates against a missing field on those docs. Reads still succeed via the
  `isPublished == true` clause, but no ownership-scoped feature works on them.
  **The blog model must not repeat this.** Every consumer field gets a
  non-optional writer and a backfill, or it does not go in the contract.

### 1.4 `users` has drifted from `@wolly/schema` in both directions

Fields live in **every** user document that `@wolly/schema` does not declare:

`dateOfBirth` (Timestamp), `countryOfResidence`, `selectedGenres`,
`customGenres`, `specialties`, `writingExperience`, `onboardingStep`,
`onboardingCompletedAt`, `publishedBooks`, `currency_id`, `paymentInfo`,
`preferences`, `phone_number`

Fields `@wolly/schema` declares that exist in **zero** documents:

`genre_prefs`, `dob`, `content_preferences`, `contentPreferences`, `photoURL`,
`socialLinks`, `first_name`/`last_name` (the last pair does exist, alongside the
camelCase versions, so that part of the known divergence is real).

This means a live bug: `WollyUser.fromMap` in the reader reads
`content_preferences ?? contentPreferences ?? []`, so **reader content
preferences are always empty**. The real data is in `selectedGenres`. The
camelCase/snake_case reconciliation in `4b242b2` fixed the name fields but
missed this one.

The blog needs per-reader topic interests for its feed. It should read
`selectedGenres`, and `@wolly/schema` should be corrected to describe the
documents that actually exist.

### 1.5 BLOCKER: payments are not verified

`PurchaseRepository.recordPurchase` writes the purchase document **client-side,
immediately after launching a Paystack checkout URL**, with no confirmation the
payment succeeded. The deployed rule permits it:

```
allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
```

Any authenticated user can grant themselves any paid book by writing one
document. For one-off book sales this is revenue leakage. **For recurring
subscriptions it is disqualifying**: renewals happen off-device and there is no
client present to write anything. Paid blog subscriptions require a server that
verifies Paystack webhooks. This is the single largest piece of new
infrastructure in this spec.

Related, lower severity: `AppConfig.paystackPublicKey` is a hardcoded `pk_live_`
key and `paystackCurrency` is hardcoded `GHS`. Publishable keys are meant to be
public so this is not a credential leak, but it means the `develop` → mock
environment transacts against live money, and every price is Ghana cedis
regardless of the buyer's country, despite `countries` holding per-country
currency data.

### 1.6 There is no server tier anywhere in this platform

Every surface talks to Firestore directly with a client SDK. There are no Cloud
Functions, no API routes, no Admin SDK usage outside one-off scripts in
`apps/creator-hub/scripts/`.

A blog cannot work this way. Section 4 covers what has to change.

### 1.7 Two more constraints for a public website

- **Firestore rules require authentication for everything.** Not one rule
  permits an unauthenticated read. A public blog is read by logged-out humans
  and by search-engine crawlers that cannot authenticate.
- **Storage rules grant no public read.** `/books/{userId}/{bookId}/{fileName}`
  requires `request.auth.uid == userId`; the "public read for published books"
  branch is literally `false`. Blog cover art and inline images must be publicly
  fetchable. (Existing book covers render today only because
  `getDownloadURL()` tokens bypass rules, a fragile pattern not to extend.)

---

## 2. Product shape

### 2.1 The unit is a publication, not a user

Substack's atom is the **publication**, a named thing with its own branding,
domain, subscriber list and price, which a person subscribes to. It is not the
author. One author can run several; a publication can outlive the author's
other work.

Wolly should adopt the same atom. Modelling posts as "belonging to a creator"
would work for week one and then block tiers, custom domains, sections,
co-authors and per-publication email lists forever.

**Decided:** model many, ship one. The data model permits many publications per
creator from day one; the creator-hub UI exposes exactly one, created on demand
the first time an author opens the blog composer, with no publication switcher.
This is free optionality. Going one-to-many later would be a migration of every
post, subscription and URL on the platform.

### 2.2 Surfaces

| Surface | Role in blog | Status |
|---|---|---|
| **creator-hub** (Next.js) | Compose, schedule, publish, paywall, see stats, manage subscribers | exists, extend |
| **`apps/blog`** (Next.js SSR) | Public reading website, SEO, RSS, subscribe & pay | **new** |
| **reader** (Flutter) | Blog feed, post reader, subscriptions, comments | exists, extend |
| **backoffice** (Next.js) | Moderate posts & comments, handle reports | exists, extend |
| **`services/api`** | Paystack webhooks, email sending, scheduled publish | **new** |

### 2.3 Why a separate web surface

Yes, build it. The creator-hub is an authenticated static-export SPA for
authors; the blog site is an anonymous, SEO-critical, server-rendered site for
readers. Different rendering model, different auth posture, different
performance budget, different audience. Bolting the second onto the first would
compromise both.

---

## 3. Scope: what "at par with Substack" means here

Substack has roughly 200 discrete features. Parity on all of them is a multi-year
programme. This spec targets **the subscription-publishing core**, in four
phases, and explicitly defers the rest.

**In scope (Phases 1–3)**
Rich-text composer · drafts, autosave, scheduling · cover images and inline
media · free/paid/tiered post visibility with partial paywalls · publication
homepage, archive, about page · SEO (SSR, JSON-LD, sitemaps, OG) · RSS ·
free and paid subscriptions with monthly/annual pricing · email newsletter on
publish · welcome emails · one-click unsubscribe · threaded comments with tier
gating · likes · in-app blog feed and reader · subscriber management ·
creator analytics · staff moderation.

**Deferred (Phase 4+)**, each a real product in itself:
podcast hosting and private RSS feeds · native video and live streaming · AI
voiceover · Notes/restacks social layer · custom domains · direct messaging ·
group and gift subscriptions · referral programme · imports from
WordPress/Ghost/Medium · headline A/B testing · drip campaigns · publication
recommendation network.

**Never (out of character for Wolly)**: cross-publication ad marketplace.

---

## 4. Architecture

### 4.1 The server tier (new)

```
apps/blog/                     Next.js, SSR + ISR, deployed to Firebase App Hosting
  app/[pub]/page.tsx             publication homepage
  app/[pub]/p/[slug]/page.tsx    post page (SSR, paywall enforced server-side)
  app/[pub]/archive/page.tsx     archive
  app/[pub]/about/page.tsx       about
  app/[pub]/subscribe/page.tsx   pricing & checkout
  app/[pub]/rss.xml/route.ts     feed
  app/sitemap.xml/route.ts       sitemap index
  app/api/...                    subscribe, comment, like (Admin SDK)

services/api/                  Cloud Functions v2
  paystackWebhook              charge.success, subscription.*, invoice.* → subscriptions
  onPostPublish                Firestore trigger → enqueue newsletter send
  sendNewsletterBatch          fan-out email delivery
  publishScheduledPosts        Cloud Scheduler, every 5 min
  onCommentWrite               denormalised counters, moderation queue
  emailWebhook                 delivery/bounce/complaint events → suppression list
```

**Why App Hosting and not the existing static-export Hosting.** The two current
web surfaces build to `out/` and deploy as static files. A blog cannot: posts
publish continuously, so pages must render on demand for correct SEO, and the
paywall must be enforced before HTML leaves the server. Firebase App Hosting
runs Next.js SSR on Cloud Run and is the supported path. This means `apps/blog`
gets its own deploy job; it will not fit the existing `web` job in
`deploy.yml`.

### 4.2 Read paths and where the paywall is enforced

The paywall is enforced **twice, deliberately**, because two clients read
content by two different mechanisms.

| Client | Reads via | Paywall enforced by |
|---|---|---|
| Blog website | Admin SDK, server-side, in the Next.js route | Server code, before HTML is emitted |
| Flutter reader | Firestore client SDK | **Security rules** |
| Creator-hub | Firestore client SDK (own posts) | Ownership rules |

Server-side reads on the website are what let logged-out readers and crawlers
see public posts without opening Firestore to anonymous access. Nothing in the
rules needs to change for anonymous read.

To keep the two enforcement points from drifting, the access decision lives in
one exported function in `@wolly/schema`
(`resolvePostAccess(post, subscription, now)`), the server calls it directly,
and the rules mirror it with a test suite (`@firebase/rules-unit-testing`) that
asserts identical verdicts across a shared fixture table.

---

## 5. Data model

All new shapes go in `@wolly/schema` (`packages/schema/src/blog.ts`), are
documented in `SCHEMA.md`, and are mirrored in Dart, in the same commit, per
the existing contract rule.

### 5.1 `publications`

Root collection. Doc id is an auto-id; `slug` is the URL key.

```ts
interface Publication {
  id: string;
  /**
   * Unique handle. Rendered as `@slug` in URLs (see §10) and shared with the
   * creator's profile identity, so `@ama` is the same person's books and posts.
   * Immutable after first publish.
   */
  slug: string;
  ownerUserId: string;
  name: string;
  tagline?: string;
  description?: string;

  logoUrl?: string | null;
  coverImageUrl?: string | null;
  faviconUrl?: string | null;
  theme?: {
    accentColor?: string;
    backgroundColor?: string;
    fontFamily?: string;
    layout?: 'profile' | 'magazine' | 'newspaper';
  };

  // Discovery: reuses the existing genres collection (see 5.8)
  primaryGenre?: string;           // genres doc id
  tags?: string[];

  socialLinks?: { twitter?: string; instagram?: string; linkedin?: string; website?: string };

  // Monetisation
  paidEnabled: boolean;
  currency: string;                // ISO 4217; from users.currency, default GHS
  paystackSubaccountCode?: string;

  // Email
  senderName?: string;
  senderReplyTo?: string;
  welcomeEmailBody?: string | null;

  // Denormalised counters (maintained by Cloud Functions)
  subscriberCount: number;
  paidSubscriberCount: number;
  postCount: number;

  status: 'active' | 'suspended' | 'archived';
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}
```

`slug` uniqueness is enforced by a `publication_slugs/{slug}` reservation
document written in the same transaction (Firestore has no unique constraint).

### 5.2 `publications/{pubId}/tiers`

```ts
interface Tier {
  id: string;
  name: string;                    // "Paid", "Founding member"
  description?: string;
  benefits?: string[];
  monthlyPrice: number;            // minor units, e.g. pesewas
  annualPrice?: number;
  currency: string;
  isDefault: boolean;
  isActive: boolean;
  paystackPlanCodeMonthly?: string;
  paystackPlanCodeAnnual?: string;
  sortOrder: number;
}
```

### 5.3 `posts`: metadata

Root collection, not a subcollection. A root collection is what makes the
cross-publication discovery feed, platform search and staff moderation queries
possible with ordinary queries, and it matches how `epubs` is modelled.

**The body is not in this document.** Post metadata is listed constantly (feeds,
archives, search results, email digests); bodies are large. Keeping them apart
keeps list reads cheap and is what makes the rules-level paywall possible.

```ts
interface BlogPost {
  id: string;
  publicationId: string;
  publicationSlug: string;         // denormalised for URL building without a join
  ownerUserId: string;
  authorName: string;              // denormalised for render
  authorAvatarUrl?: string | null;

  type: 'article' | 'page';        // 'podcast' | 'video' reserved for Phase 4
  title: string;
  subtitle?: string | null;
  slug: string;                    // unique within publication
  excerpt: string;                 // auto-derived, manually overridable; meta description + email preheader
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;

  // Access control
  visibility: 'public' | 'subscribers' | 'paid' | 'tiers';
  allowedTierIds?: string[];       // only when visibility === 'tiers'
  hasPaywall: boolean;             // true when a paid segment exists

  // Lifecycle
  status: 'draft' | 'scheduled' | 'published' | 'unlisted' | 'archived';
  publishAt?: FirestoreTimestamp | null;   // set when scheduled
  publishedAt?: FirestoreTimestamp | null;

  // Discovery
  genre?: string;                  // genres doc id; shares the reader's browse UI
  tags?: string[];

  // Derived
  wordCount: number;
  readingTimeMinutes: number;
  contentVersion: number;          // bumped on every body write; cache key

  // Email
  sendAsNewsletter: boolean;
  emailSendId?: string | null;

  // Denormalised counters
  viewCount: number;
  likeCount: number;
  commentCount: number;

  // Moderation
  moderationStatus: 'ok' | 'flagged' | 'removed';
  moderationNotes?: string[];
  reportCount: number;

  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}
```

### 5.4 `posts/{postId}/content/{segment}`: the body, split at the paywall

Exactly two documents, ids `free` and `paid`:

```ts
interface PostContent {
  segment: 'free' | 'paid';
  format: 'tiptap-json-v1';
  doc: object;                     // TipTap/ProseMirror JSON, canonical
  html: string;                    // sanitised, pre-rendered; what clients display
  plainText: string;               // search index + word count
  updatedAt: FirestoreTimestamp;
}
```

**This split is the core design decision of the spec.** Because the paid body is
a separate document, Firestore security rules can gate it on an active
subscription. The paywall is enforced by the database itself, so the Flutter
reader needs no server round-trip and cannot be bypassed by a modified client.
A post with no paywall simply has no `paid` document.

**Why store both JSON and HTML.** JSON is the canonical, safe, transformable
form and is what the composer round-trips. HTML is render-ready: the website
injects it directly, and Flutter renders it with `flutter_widget_from_html`
rather than requiring a ProseMirror renderer in Dart. HTML is generated and
sanitised server-side on save, never trusted from the client, using the same
allowlist for both consumers.

Firestore's 1 MB document limit caps a segment at roughly 150,000 words, far
beyond any post. The writer rejects oversized segments with a clear error rather
than silently truncating.

`posts/{postId}/revisions/{revisionId}` stores prior versions, capped at 25 per
post, pruned by the trigger that writes them.

### 5.5 `subscriptions`

Root collection. **Document id is `${userId}_${publicationId}`**, which is deterministic,
so a security rule can resolve it with one `get()` and no query. This follows the
convention already used by `reading_progress`, `purchases` and `follows`.

```ts
interface Subscription {
  userId: string;
  publicationId: string;
  ownerUserId: string;             // denormalised: creator, for their queries

  status: 'free' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
  isPaid: boolean;                 // denormalised; the single flag rules check
  tierId?: string | null;
  plan?: 'monthly' | 'annual' | null;

  currentPeriodEnd?: FirestoreTimestamp | null;  // rules compare against request.time
  cancelAtPeriodEnd: boolean;

  // Paystack linkage: written only by the webhook handler
  paystackCustomerCode?: string;
  paystackSubscriptionCode?: string;
  paystackEmailToken?: string;
  lastPaymentAt?: FirestoreTimestamp | null;
  lastPaymentReference?: string;

  // Email preferences
  emailOptIn: boolean;
  emailConfirmedAt?: FirestoreTimestamp | null;   // double opt-in
  unsubscribedAt?: FirestoreTimestamp | null;

  source?: string;                 // attribution: 'web' | 'reader' | 'import' | referrer
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}
```

`isPaid` and `currentPeriodEnd` are **writable only by the Admin SDK**. Rules
deny every client write to those fields; a reader may only create a free
subscription for themselves and toggle their own email preferences.

### 5.6 `posts/{postId}/comments`

```ts
interface PostComment {
  id: string;
  postId: string;
  publicationId: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string | null;
  parentId?: string | null;        // one level of threading
  body: string;                    // plain text + safe inline links, not rich HTML
  likeCount: number;
  status: 'visible' | 'hidden' | 'removed';
  reportCount: number;
  isAuthorReply: boolean;          // publication owner badge
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}
```

A subcollection, with a collection-group index so the backoffice can moderate
across all posts. Who may comment is governed by
`publications/{pubId}.commentAccess: 'everyone' | 'subscribers' | 'paid'`.

### 5.7 Likes, reactions and counters

`posts/{postId}/likes/{userId}`: the document id is the uid, so a like is idempotent
and unlikeable with no query and no duplicate risk. The document body is just
`{ createdAt }`.

`likeCount` on the parent post is maintained by an `onWrite` Cloud Function. At
Wolly's current scale a plain `FieldValue.increment` is correct; a distributed
counter is only warranted past ~1 write/sec on a single post, which is a Phase 4
concern.

### 5.8 Discovery reuses `genres`

The `genres` collection already has 27 documents and the Flutter reader already
has a genre browse UI. Blog posts get a `genre` field holding a **`genres` doc
id**, exactly like `epubs.genre`. That means one browse surface returns both a
creator's books and their posts, which is the whole argument for putting blogs
inside Wolly rather than beside it.

Two changes to `genres`:

- add `contentTypes: ('book' | 'post')[]` so a genre can be scoped
- rename the denormalised `bookCount` usage to sit alongside a new `postCount`

Free-form `tags[]` on posts covers blog-native tagging that is too granular for
the genre list. Tags are strings, not documents, until there is a reason
otherwise.

### 5.9 Email

```
publications/{pubId}/email_sends/{sendId}
  postId, subject, status: 'queued'|'sending'|'sent'|'failed',
  recipientCount, deliveredCount, openCount, clickCount,
  bounceCount, complaintCount, unsubscribeCount,
  startedAt, completedAt

email_suppressions/{emailHash}          // root; sha256 of lowercased address
  reason: 'bounce'|'complaint'|'unsubscribe'|'manual', createdAt
```

The suppression list is global and checked before every send. It is keyed by
hash so the collection is not a harvestable address list.

### 5.10 Analytics

`posts/{postId}/stats/{YYYY-MM-DD}`: daily rollups of
`views, uniqueViews, reads, emailOpens, emailClicks, subscribesAttributed`.
Written by the API tier, never the client, so the numbers cannot be inflated
from a browser. The creator dashboard reads a date range; `posts.viewCount` is
the running total for cheap list rendering.

---

## 6. Security rules

Full proposed additions. These are **added to a rules file that has first been
resynchronised with production** (Phase 0), never to the current repo file.

```js
// ── helpers ────────────────────────────────────────────────────────────────
function pubOf(pubId) {
  return get(/databases/$(database)/documents/publications/$(pubId)).data;
}
function ownsPublication(pubId) {
  return isAuthenticated() && pubOf(pubId).ownerUserId == request.auth.uid;
}
function subOf(pubId) {
  return get(/databases/$(database)/documents/subscriptions/$(request.auth.uid + '_' + pubId));
}
function hasActivePaidSub(pubId) {
  let path = /databases/$(database)/documents/subscriptions/$(request.auth.uid + '_' + pubId);
  return isAuthenticated()
    && exists(path)
    && get(path).data.isPaid == true
    && get(path).data.currentPeriodEnd > request.time;
}
function hasAnySub(pubId) {
  return isAuthenticated()
    && exists(/databases/$(database)/documents/subscriptions/$(request.auth.uid + '_' + pubId));
}

// ── publications ───────────────────────────────────────────────────────────
match /publications/{pubId} {
  allow read: if isAuthenticated() && resource.data.status == 'active';
  allow read: if ownsPublication(pubId) || isAdmin();
  allow create: if isAuthenticated()
    && request.resource.data.ownerUserId == request.auth.uid
    && request.resource.data.subscriberCount == 0
    && request.resource.data.paidSubscriberCount == 0;
  allow update: if ownsPublication(pubId)
    // counters are server-maintained
    && request.resource.data.subscriberCount == resource.data.subscriberCount
    && request.resource.data.paidSubscriberCount == resource.data.paidSubscriberCount;
  allow update: if isAdmin();
  allow delete: if false;          // archive instead

  match /tiers/{tierId} {
    allow read: if isAuthenticated();
    allow write: if ownsPublication(pubId);
  }
  match /email_sends/{sendId} {
    allow read: if ownsPublication(pubId) || isAdmin();
    allow write: if false;         // Admin SDK only
  }
}

// ── posts ──────────────────────────────────────────────────────────────────
match /posts/{postId} {
  // Metadata (title, excerpt, cover) is readable for any live post; this is
  // the teaser. The body is separately gated below.
  allow read: if isAuthenticated()
    && resource.data.status == 'published'
    && resource.data.moderationStatus != 'removed';
  allow read: if isAuthenticated() && resource.data.ownerUserId == request.auth.uid;
  allow read: if isAdmin();

  allow create: if isAuthenticated()
    && request.resource.data.ownerUserId == request.auth.uid
    && ownsPublication(request.resource.data.publicationId)
    && request.resource.data.viewCount == 0
    && request.resource.data.likeCount == 0
    && request.resource.data.commentCount == 0
    && request.resource.data.reportCount == 0;

  allow update: if isAuthenticated()
    && resource.data.ownerUserId == request.auth.uid
    // counters and moderation state are server-maintained
    && request.resource.data.viewCount == resource.data.viewCount
    && request.resource.data.likeCount == resource.data.likeCount
    && request.resource.data.commentCount == resource.data.commentCount
    && request.resource.data.reportCount == resource.data.reportCount
    && request.resource.data.moderationStatus == resource.data.moderationStatus;
  allow update: if isAdmin();
  allow delete: if isAuthenticated() && resource.data.ownerUserId == request.auth.uid;

  // ── the paywall ──────────────────────────────────────────────────────────
  match /content/{segment} {
    function post() {
      return get(/databases/$(database)/documents/posts/$(postId)).data;
    }
    // Free segment: readable by anyone who can read the post, subject to the
    // post's own visibility setting.
    allow read: if segment == 'free'
      && isAuthenticated()
      && post().status == 'published'
      && (
        post().visibility == 'public'
        || hasAnySub(post().publicationId)
        || hasActivePaidSub(post().publicationId)
      );
    // Paid segment: active paid subscription required, full stop.
    allow read: if segment == 'paid'
      && hasActivePaidSub(post().publicationId);
    // Author and staff always read both.
    allow read: if isAuthenticated() && post().ownerUserId == request.auth.uid;
    allow read: if isAdmin();

    allow write: if isAuthenticated() && post().ownerUserId == request.auth.uid;
  }

  match /revisions/{revisionId} {
    allow read, write: if isAuthenticated()
      && get(/databases/$(database)/documents/posts/$(postId)).data.ownerUserId == request.auth.uid;
  }

  match /likes/{userId} {
    allow read: if isAuthenticated();
    allow create, delete: if isAuthenticated() && request.auth.uid == userId;
    allow update: if false;
  }

  match /comments/{commentId} {
    allow read: if isAuthenticated() && resource.data.status == 'visible';
    allow read: if isAdmin();
    allow create: if isAuthenticated()
      && request.resource.data.userId == request.auth.uid
      && request.resource.data.status == 'visible'
      && request.resource.data.likeCount == 0
      && request.resource.data.reportCount == 0;
    allow update: if isAuthenticated()
      && resource.data.userId == request.auth.uid
      && request.resource.data.status == resource.data.status;
    allow update, delete: if isAdmin();
    allow delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
  }

  match /stats/{day} {
    allow read: if isAuthenticated()
      && get(/databases/$(database)/documents/posts/$(postId)).data.ownerUserId == request.auth.uid;
    allow read: if isAdmin();
    allow write: if false;         // Admin SDK only
  }
}

// ── subscriptions ──────────────────────────────────────────────────────────
match /subscriptions/{subId} {
  allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
  allow read: if isAuthenticated() && resource.data.ownerUserId == request.auth.uid;
  allow read: if isAdmin();

  // A reader may create only a FREE subscription for themselves.
  allow create: if isAuthenticated()
    && subId == request.auth.uid + '_' + request.resource.data.publicationId
    && request.resource.data.userId == request.auth.uid
    && request.resource.data.isPaid == false
    && request.resource.data.status == 'free'
    && !('currentPeriodEnd' in request.resource.data)
    && !('paystackSubscriptionCode' in request.resource.data);

  // A reader may change only their own email preferences. Everything that
  // grants access is Admin-SDK-only, written by the Paystack webhook.
  allow update: if isAuthenticated()
    && resource.data.userId == request.auth.uid
    && request.resource.data.diff(resource.data).affectedKeys()
         .hasOnly(['emailOptIn', 'unsubscribedAt', 'updatedAt']);

  allow delete: if false;          // unsubscribe sets status, never deletes
}

match /email_suppressions/{hash} {
  allow read, write: if false;     // Admin SDK only
}
```

Note the rules read `subscriptions` via `get()`, which costs a document read per
evaluation and counts against the 10-`get()` per-request limit. The paid-content
path uses two. Comfortable.

### 6.1 Storage rules

```js
// Public blog media: published post images must be fetchable by anyone,
// including search-engine crawlers.
match /blog/{pubId}/{allPaths=**} {
  allow read: if true;
  allow write: if request.auth != null
    && firestore.get(/databases/(default)/documents/publications/$(pubId)).data.ownerUserId == request.auth.uid
    && request.resource.size < 10 * 1024 * 1024
    && request.resource.contentType.matches('image/(jpeg|png|webp|gif|avif)');
  allow delete: if request.auth != null
    && firestore.get(/databases/(default)/documents/publications/$(pubId)).data.ownerUserId == request.auth.uid;
}
```

Uploads are additionally resized and stripped of EXIF by a Storage-triggered
function before they are referenced in a post.

### 6.2 Required composite indexes

```
posts:  publicationId ASC, status ASC, publishedAt DESC
posts:  publicationId ASC, slug ASC
posts:  status ASC, publishedAt DESC                        // global feed
posts:  status ASC, genre ASC, publishedAt DESC             // genre browse
posts:  ownerUserId ASC, updatedAt DESC                     // hub "my posts"
posts:  status ASC, moderationStatus ASC, createdAt DESC    // backoffice queue
posts:  status ASC, publishAt ASC                           // scheduled publisher
subscriptions:  publicationId ASC, status ASC, createdAt DESC
subscriptions:  publicationId ASC, isPaid ASC, currentPeriodEnd DESC
subscriptions:  userId ASC, updatedAt DESC                  // reader's feed sources
comments (collection group):  status ASC, createdAt DESC
comments (collection group):  reportCount DESC, createdAt DESC
```

All of these go into `firestore.indexes.json`, which, per 1.2, must first be
made to describe reality.

---

## 7. Subscriptions and payments

### 7.1 Flow

1. Reader hits the paywall on web or in the app and picks a tier and interval.
2. Client calls `POST /api/subscribe` with `{ publicationId, tierId, plan }`.
3. Server creates or reuses a Paystack customer, initialises a **subscription**
   against the tier's plan code, and returns the authorisation URL.
4. Reader completes checkout on Paystack.
5. **Paystack calls `paystackWebhook`.** The handler verifies the
   `x-paystack-signature` HMAC-SHA512 against the secret key, then writes
   `subscriptions/{uid}_{pubId}` with `isPaid: true`, `status: 'active'` and
   `currentPeriodEnd`.
6. Access is live everywhere at once: rules for the app, server read for the web.

Renewals, failures and cancellations arrive as `subscription.disable`,
`invoice.payment_failed` and `invoice.update`, and are the only thing that ever
changes `isPaid`. **No client writes it, ever.** That is the fix for 1.5.

A reconciliation job runs nightly against the Paystack API to correct any state
a dropped webhook left stale, and expires subscriptions whose
`currentPeriodEnd` has passed.

### 7.2 Why Paystack, and the constraint it imposes

**Decided: Paystack.** This is not really a choice. Stripe does not support
Ghana as a merchant country; a Ghanaian entity can only reach Stripe by
incorporating in the US or UK and banking there. Restructuring the company to
change payment processor is not a trade worth making. Revisit only if
international card revenue independently justifies a foreign entity.

Constraints that follow:

- Paystack supports subscriptions natively (plans + automatic renewal) but
  **recurring charges work only with card and, in Nigeria, direct debit**.
  Mobile money, the dominant Ghanaian method, is one-off only. A meaningful
  share of the audience therefore cannot hold an auto-renewing subscription.
  **Mitigation:** support a "pay for 12 months up front" one-off purchase that
  writes the same `subscriptions` document with a 12-month `currentPeriodEnd`
  and `cancelAtPeriodEnd: true`. The access model is identical; only the
  renewal mechanism differs. This should ship in Phase 2, not be deferred.
- Currency is per-publication and drawn from `countries`/`supported_currencies`
  rather than hardcoded, fixing the second half of 1.5.
- Payouts to creators reuse the existing `payoutService` and the platform
  revenue-share fields already on the creator model.

### 7.3 Reader identity

Substack's growth loop depends on subscribing with nothing but an email address.
Wolly currently offers password auth only, to 8 users.

Phase 2 adds **Firebase email-link (passwordless) sign-in** as the primary
subscribe path on the website: enter email → receive link → account created and
subscription attached. Password sign-in stays for creators. Anonymous auth
covers "read the free post, decide later", with account linking on subscribe so
no reading history is lost.

---

## 8. Email newsletter

Every published post can be emailed to the publication's subscribers. This is
half of what Substack is, and it is the part most likely to be underestimated.

**Decided: Resend.** Postmark's transactional streams are not for bulk
newsletters (a newsletter would sit on their separate Broadcast product), and
SES's cost advantage is irrelevant at Wolly's scale: 1,000 subscribers × 4 posts
a month is 4,000 emails, so SES saves about $19.60 against Resend and costs
weeks of reputation management to earn it. Resend covers broadcast and
transactional together, handles RFC 8058 one-click unsubscribe, and its free
tier covers launch. If volume ever justifies SES, the DKIM/SPF/DMARC domain
setup and domain reputation carry over; only the sending IPs need warming.

**Non-negotiable requirements**, all enforced by Gmail and Yahoo for bulk
senders since 2024, with Gmail hard-rejecting non-compliant mail since November
2025:

- SPF, DKIM and DMARC aligned on the sending domain
- `List-Unsubscribe` **and** `List-Unsubscribe-Post` for RFC 8058 one-click
  unsubscribe, honoured within 2 days
- spam complaint rate held under 0.3%
- double opt-in on subscribe (`emailConfirmedAt`), which also stops the
  subscriber list becoming a spam vector

**Sending.** `onPostPublish` creates the `email_sends` document and enqueues
batches to Cloud Tasks; `sendNewsletterBatch` sends in chunks of 500 with
per-recipient unsubscribe tokens, skipping anyone in `email_suppressions`. Paid
posts send the free segment plus a subscribe call-to-action to free subscribers,
and the full body to paid ones, the same `resolvePostAccess` decision as
everywhere else. Delivery, bounce and complaint webhooks feed
`email_suppressions` and the send's counters.

**Per-creator sending domains** are a Phase 4 concern; until then all mail goes
from a Wolly-owned domain with the creator's name in the `From` display and
their address in `Reply-To`, which is what a shared-domain platform can safely do.

---

## 9. Creator-hub: authoring

New route group `apps/creator-hub/src/app/blog/`:

- `/blog`: post list with status filters, search, per-post stats
- `/blog/new`, `/blog/[postId]/edit`: the composer
- `/blog/settings`: publication identity, theme, tiers, email settings
- `/blog/subscribers`: subscriber table, revenue per subscriber, CSV export
- `/blog/stats`: views, reads, email performance, growth, churn

**Composer.** TipTap, matching the research on canonical storage format.
Required blocks: headings, lists, blockquote, code with syntax highlighting,
image with caption and alt text, embeds (YouTube, X, Spotify) via oEmbed,
horizontal rule, button/CTA, footnotes, and the **paywall divider**, the marker
that splits the body into the `free` and `paid` segments on save.

Autosave to `posts/{id}/revisions` every 10 seconds when dirty. Draft state
lives on the post document with `status: 'draft'`, so a draft is a post and
publishing is a status change, never a copy.

On publish the hub calls `POST /api/posts/{id}/publish`, which is where excerpt
derivation, HTML rendering, sanitisation, word count, reading time, slug
uniqueness and the newsletter enqueue happen. **None of that runs on the
client**. It is exactly the class of logic that produced the 48 malformed
`epubs` documents when it was left to the writer.

A new service `apps/creator-hub/src/services/blogService.ts` mirrors the shape
and conventions of `bookService.ts`, importing collection names from
`@wolly/schema` rather than hardcoding strings.

---

## 10. Public website (`apps/blog`)

**URLs. Decided: the public blog lives on the primary apex domain, with
publications namespaced by `@handle`.**

```
wolly.app/@{handle}                homepage
wolly.app/@{handle}/{postSlug}     post
wolly.app/@{handle}/archive        archive
wolly.app/@{handle}/about          about
wolly.app/@{handle}/subscribe      pricing
wolly.app/@{handle}/rss.xml        feed
wolly.app/discover                 cross-publication discovery
```

with `creator.wolly.app` for the hub and `staff.wolly.app` for the backoffice.
(Substitute whatever the real apex is; the repo currently references no custom
domain at all; every surface is on `*.web.app`.)

Three reasons for this shape:

- **There is no existing domain authority anywhere**, so this is greenfield and
  the only question is where authority should accumulate for the next decade.
  Consolidating reader-facing content on one apex beats splitting it across a
  separate `wolly.blog`, which would start at zero and stay there.
- **`@handle` cannot collide with product routes** and is an established
  convention readers already understand from Medium, YouTube and Threads.
- **The handle unifies creator identity.** `@ama` is the same person's books and
  posts, which is the entire argument for building blogs inside Wolly rather
  than beside it.

Custom domains in Phase 4 map `theirdomain.com/{postSlug}` onto the same
documents, changing nothing in Firestore.

**Rendering.** SSR with ISR. Posts revalidate on a tag keyed by
`contentVersion`, so an edit invalidates exactly one page. Paywalled posts render
the free segment plus a subscribe card; the paid HTML is never sent to a browser
that has not paid for it. Paywalled pages are marked `no-store` for authenticated
readers and cached only in their free form.

**SEO.** Server-rendered HTML, per-post `<title>`/meta description from
`excerpt`, canonical URLs, Open Graph and Twitter cards with a dynamically
generated OG image, `Article` JSON-LD (with `isAccessibleForFree: false` and
`hasPart`/`cssSelector` on paywalled posts, which is Google's supported way to
declare a paywall without being penalised for cloaking), a sitemap index
partitioned by publication, and per-publication RSS carrying the free segment
with a "read more" link, mirroring Substack's own truncation convention.

---

## 11. Flutter reader

New feature module, following the existing `data` / `domain` / `presentation`
layering and strict BLoC discipline required by `CLAUDE.md`:

```
lib/features/blog/
  data/          blog_repository.dart, subscription_repository.dart
  domain/        models/ (blog_post.dart, publication.dart, subscription.dart)
                 blog_event.dart, blog_state.dart
  presentation/  bloc/blog_bloc.dart
                 screens/ blog_feed_screen.dart, post_reader_screen.dart,
                          publication_screen.dart, subscribe_screen.dart
                 widgets/ post_card.dart, paywall_card.dart, comment_thread.dart
```

- **Feed**: posts from publications the reader subscribes to, plus recommended
  posts matching their `selectedGenres` (see 1.4, which is the field that
  actually holds interests).
- **Post reader**: renders `content.html` with `flutter_widget_from_html`, using
  the existing `ReaderSettingsCubit` so font size and theme carry over from the
  book reader.
- **Paywall**: when the `paid` content read is denied by rules, the BLoC emits a
  paywall state rather than an error. This is a design requirement, not error
  handling; the denial is the expected path for a free reader.
- **Subscribe**: free subscription writes directly; paid goes through the API
  and Paystack. Note iOS: Apple requires In-App Purchase for digital
  subscriptions consumed in-app. The Android APK is the current distribution
  target, so this is a Phase 4 problem, but it will need solving before an App
  Store release and it will change the payment path on that platform.

New dependencies: `flutter_widget_from_html`, `cached_network_image`,
`firebase_messaging` (post notifications), `share_plus`.

`SCHEMA.md` gains a blog section and the Dart models mirror it, same commit,
per the standing contract.

---

## 12. Backoffice

Two new panels alongside `BooksPanel` and `ReviewsPanel`:

- **PostsPanel**: queue of posts with `moderationStatus: 'flagged'` or
  `reportCount > 0`; approve, hide, remove; suspend a publication.
- **CommentsPanel**: collection-group query over reported comments; hide,
  remove, ban a commenter from a publication.

Both use the existing `isAdmin()` rules helper that is already deployed (and, per
1.2, already missing from the repo).

---

## 13. Delivery plan

### Phase 0: unblock — **COMPLETE** (2026-07-24)

Landed in `35577e3` and `20129e4`, and deployed:

- Security rules resynchronised and **deployed**. The live ruleset was fetched
  back and byte-compared against the repo: they match. `npm run deploy` is now
  safe; it was not before.
- All 32 composite indexes **deployed** and present live. One orphan remains,
  `books [ownerUserId, updatedAt]`, left in place because removing it needs
  `--force`, which deletes everything absent from the file.
- The 48 unowned books are unpublished, reversibly.
- `@wolly/schema` corrected against the live database; the reader's
  topic-interest bug fixed.

The original checklist follows, for the record.

### Phase 0 checklist (as originally written)

1. **Unpublish the 48 unowned books.** Run
   `apps/creator-hub/scripts/unpublish-unowned-epubs.js` (dry-run by default;
   `--apply` to write, `--revert --apply` to undo). It touches only documents
   with no `ownerUserId`, sets `isPublished: false`, stamps
   `unpublishedReason`, and deletes nothing. Verified against production
   2026-07-24: 48 targets, 27 shadow-library-flagged, the 1 real creator book
   correctly untouched.
2. **Resynchronise the security rules.** Pull the deployed ruleset into
   `packages/firebase-config/firestore.rules`, diff it, delete the dead `books`
   block, and add a `@firebase/rules-unit-testing` suite so the repo file can
   never silently fall behind production again. Until this lands,
   `npm run deploy` is unsafe to run.
3. Export the real composite indexes into `firestore.indexes.json`.
4. Correct `@wolly/schema`'s `WollyUser` to describe the documents that exist;
   fix the reader to read `selectedGenres` instead of the non-existent
   `content_preferences`.
5. Add the `isPublished` ⇒ `ownerUserId` validation rule, for `epubs` and
   `posts` alike.
6. Export and delete the dead `books` collection (3 documents) and its rules
   block.
7. Decide what refills the reader catalog (Project Gutenberg seed, or ship with
   one book and recruit creators).

### Phase 1: publish and read

Publications, posts, content split, composer, `apps/blog` with SSR/SEO/RSS,
reader feed and post reader, App Hosting deploy pipeline. Free posts only, no
email, no money.

### Phase 2: subscribe and monetise

Tiers, subscriptions, Paystack webhooks and the annual-prepay path, paywall
enforcement on both sides, email-link auth, newsletter delivery with full
deliverability compliance, subscriber management.

### Phase 3: community and growth

Comments, likes, discovery feed, creator analytics dashboard, moderation panels,
push notifications.

### Phase 4: parity polish

Custom domains, podcast and video post types, Notes, imports, referrals, group
and gift subscriptions, iOS IAP.

---

## 14. Decisions

Settled 2026-07-24. Each is reflected in the section noted.

| # | Decision | Outcome | Where |
|---|---|---|---|
| 1 | Payment provider | **Paystack.** Stripe does not support Ghana as a merchant country; annual-prepay becomes a first-class path so mobile-money users can subscribe at all. | §7.2 |
| 2 | Publication scope | **Model many, ship one.** Schema supports multiple publications per creator; the hub exposes one, no switcher. | §2.1, §5.1 |
| 3 | Blog domain | **Primary apex, `@handle` namespaced.** `wolly.app/@{handle}/{postSlug}`; hub on `creator.`, backoffice on `staff.`. No separate `wolly.blog`. | §10 |
| 4 | Email provider | **Resend.** Broadcast + transactional in one, RFC 8058 handled, free tier covers launch; SES's cost edge is worth ~$20/month at this scale. | §8 |
| 5 | Legacy cleanup | **Unpublish the 48 unowned `epubs`** (reversible, script written); export and delete the dead `books` collection. Catalog refill still open. | §1.3, §13 |
| 6 | Free-tier reading | **Logged-out reading allowed.** Needs no rules change given server-side Admin SDK reads; a forced-registration wall would make the whole SSR/SEO/RSS investment unrecoverable. Attribution via a first-party anonymous ID reconciled at signup. | §4.2, §10 |

### Still open

- **What refills the reader catalog** once the 48 are unpublished (Phase 0,
  item 7). This is a content and business call, not a technical one.
- **iOS distribution timing.** Apple requires In-App Purchase for digital
  subscriptions consumed in-app, which changes the payment path on that
  platform. Deferred to Phase 4 because Android APK is the current distribution
  target, but it must be settled before any App Store release (§11).
