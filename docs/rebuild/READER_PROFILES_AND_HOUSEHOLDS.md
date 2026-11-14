# Reader profiles and household access

Product/domain proposal, 14 November 2026. Personal accounts support multiple consumption profiles, including managed profiles for minors and adults without a separate account. This extends [accounts and user groups](ACCOUNTS_AND_USER_GROUPS.md), replacing the earlier assumption that all reading state is keyed only by User. It does not add another paying account type or enable household sharing of organisation licenses automatically.

Release sequencing and channel commitments are defined in the [product roadmap](PRODUCT_ROADMAP.md); the [release execution plan](RELEASE_PLAN.md) requires complete creator/reader/staff journeys, supported web/Android/API evidence and domain/cohort gates. Early limited pilots do not waive the full requirements in this specification.

Scope revision: [unified titles, offers and subscriptions](CONTENT_OFFERS_AND_SUBSCRIPTIONS.md) defines blog posts as titles, source/editor authoring, mutually exclusive free/paid title classification, lifetime and/or subscription routes for paid titles, and independent grant provenance. Release order is R1 free ebooks → R2 free audio → R3 lifetime monetisation → R4 publisher teams → R5 households/minors → R6 sponsored consumption → R7 subscription programme → R8 full rollout. Earlier source inventories describe legacy behavior, not an exception to this target.

Package eligibility is explicit for each account/profile: lifetime grants remain durable, monthly periods expire only their own grants, household members need declared sharing and organisation consumption needs named-seat terms. Neither creator participation nor channel following supplies paid access. Account owners/payers manage enrollment; restricted profiles cannot buy or alter plans.

## Product distinction and platform evidence

Netflix documents multiple profiles under one account, separate recommendations, child-focused profiles and maturity restrictions, and a separate profile-transfer feature. These behaviors inform the design, not Wolly's exact limits or access terms. [Netflix profiles](https://help.netflix.com/en/node/322532375336036), [getting started](https://help.netflix.com/en/node/102377), [kids profiles](https://help.netflix.com/en/node/114275), [maturity controls](https://help.netflix.com/en/node/114276), [profile transfers](https://help.netflix.com/en/node/122698).

Wolly should reuse that distinction between payer and reader. Its per-product book rights, purchases, private annotations and organisation licenses require explicit Wolly rules; a profile does not itself grant a license. More engagement means distinct reader experiences and continuity, not additional votes/reviews or compulsory collection of identifiable child data.

| Concept | Wolly meaning |
| --- | --- |
| User | Independently authenticated person; personal/account administration, membership and creator authority |
| Individual account | Billing and household-management context with one accountable owner; may enable creator capability |
| ReaderProfile | Separate consumption identity: display name/avatar, preferences, interests, maturity policy, progress and private notes. May exist without an independent login, email or payment method |
| Organisation membership | A verified user's role/eligibility within an organisation, not a household profile or something copied to dependents |
| Party / public profile | Public credited author/person/organisation identity; distinct from private reader profile |

```text
User → owns IndividualAccount
        ├── Primary reader profile (owner)
        ├── Additional adult reader profile
        ├── Managed minor reader profile
        └── Optional further profiles within configured limits

Account purchase → explicit sharing policy / allowed profile grants
ReaderProfile → recommendations, progress, bookmarks, history, library view
User → OrganisationMembership → named license assignment → eligible user profile
```

The owner's default profile is created with signup and seeded during migration. Additional profiles require no new paid account. Independent personal signup can remain free: inability to pay does not have to prevent an adult from having an identity, but a household profile also supports people who do not yet want or cannot operate one. An adult profile remains a consumption-only identity until an explicit independent-account claim/transfer is supported.

## Profile types and permissions

| Profile | Experience | Management and authority |
| --- | --- | --- |
| Primary owner profile | Own reading/listening state and eligible account library | Administrative authority comes from the authenticated owner session, never from selecting this profile |
| Additional adult profile | Separate tastes, recommendations, progress, bookmarks and eligible shared library | Optional profile lock/private entry; no automatic purchases, Creator Hub, org workspace, invitations, payouts or account settings |
| Managed minor profile | Age-appropriate discovery and reading/listening, independently stored progress and preferences | Guardian/owner-authorised controls, purchase exclusion, safe account/profile switching; no default public social participation or direct marketing |

Selecting an adult profile is not an age check, and selecting the owner profile is not authentication. A minor cannot escape restrictions by editing their own type, creating a new adult profile, requesting another profile ID or calling download/playback APIs directly. Changes to profile type, maturity settings, new profiles, access credentials or administrative context require owner/authorised guardian verification.

Start with owner-managed minors; support additional guardian grants explicitly if needed, never infer guardianship from an organisation role or shared surname. Product age bands, guardian eligibility/consent requirements and country-specific account rules must be defined before launching minor profiles. Record policy version and the authorised management action; collect minimum necessary age/consent information, not a mandatory exact birth date by default. Do not claim the model establishes legal compliance by itself.

## Recommended access model

Personal purchases remain owned by the purchaser account. A versioned offer policy determines whether access is owner-only, household-shareable, or explicitly assigned to selected profiles, with any capacity/concurrency/device/offline terms. Each profile receives an attributable grant or access projection; merely existing on the account grants no additional rights.

- For eligible new purchases, show household coverage before payment. Existing personal purchases remain owner-only unless their verified terms permit broader access; do not broaden them by migration inference.
- Personal household grants and organisation-sponsored grants are distinct. A named organisation license assigned to a User is consumable only by that authenticated member through an eligible own profile; it is not inherited by every profile under their personal account.
- Keep one account license/purchase and one sale, not a purchase per profile. Separate progress and recommendations do not multiply payments, royalty counts or review weight. Concurrency and profile-count limits are policy, not hardcoded Netflix numbers.
- A profile may access multiple valid personal/household grants. Removing one source or refunding one purchase must preserve independent valid access. Evaluate maturity eligibility separately even when the account has paid.
- Account administration, creator tools and organisation roles continue to require a User session with permission. Managed adult/minor profiles cannot sign publishing contracts, receive payouts, accept staff privileges or impersonate the sponsor's membership.
- Household sharing of monthly package content, future newspaper archives, series bundles or other commercial scopes needs explicit compatible offer policy; do not make personal profile membership a universal subscription pass.

## Minor experience and access checks

Define a versioned Wolly maturity/age-suitability policy and owner-managed blocked-title lists. Existing audience/explicit-content fields are useful inputs, not proof that all content has a reviewed child-suitability rating. Missing/conflicting classification should be unavailable to managed minors until reviewed under the applicable policy, without hiding it from otherwise eligible adult readers.

Apply profile restrictions to catalog/search, recommendations, covers/descriptions, samples, direct links, asset delivery, audio manifests, downloads and future blog/article content. Do not implement filtering only in the UI. Cache entries include profile/policy version and are invalidated when restrictions change; a shared device must not show cached adult metadata/history in a minor profile. Publicly exposed adult metadata outside authenticated profile contexts cannot be guaranteed inaccessible elsewhere; state that product boundary accurately.

For initial minor profiles, disable public reviews/comments, messaging, uploads, creator applications, payments and targeted marketing. They can read/listen and maintain private progress. Future educational/guardian reporting and social participation need explicit age/purpose/policy support before enablement. A guardian may receive disclosed progress/completion controls; private note access is not automatically implied. Decide guardian visibility separately from adult privacy and record it in the feature contract.

Adult managed profiles should have separate browsing/reading state and optional lock. Account owners manage billing, profile availability and recoverability; do not promise full confidentiality from a person who controls the account/devices or can reset profile access. Avoid an owner-facing screen exposing adult notes/history by default. Adults needing stronger autonomy should be able to move toward an independent identity with explicit transfer consent.

## Sessions and devices

An authorised user can select accessible profiles in a session, but profile selection never supplies management authority. Support optional bounded profile/device access sessions for members who should not receive the owner's credentials. Pair a reader device from an authenticated owner/authorised session, bind it to one allowed profile and issue restricted credentials that cannot become an owner/admin token. Refresh preserves that scope; profile switching/lock escape is server authorised, with owner reauthentication where required.

A short profile PIN is an entry control, not the owner's full account credential or a substitute for scoped server sessions. Hash stored secrets, throttle attempts, support revocation and do not place an owner refresh token on a child-only device. Log the real authenticated principal: User session where known, or delegated ProfileSession with its issuing User as provenance. Do not falsely attribute every dependent's reading event to the owner as the human actor.

Keep active account, active reader profile, and privileged user authority explicit in API/client context. A submitted profile ID is a requested target; the server verifies the session's access to it. Profile-specific reading state, local files/cache indexes, notifications and recommendations must be isolated on shared devices. Already exported unprotected files cannot be remotely recalled; protected offline validity/revalidation, restricted catalog caches and expired/revoked access require device tests before household/minor launch.

## Proposed entities and constraints

| Entity | Relationships / invariants |
| --- | --- |
| `ReaderProfile` | Exactly one individual-account parent; kind primary/adult/minor, display identity, lifecycle and policy revision; optional verified User association. At most one active primary profile per personal account; no organisation/team/creator rights embedded here |
| `ProfileAccessGrant` | Explicit User/session authority to use/manage profile, capability and lifecycle. Default owner management seeded; another adult's independent association requires verified claim/acceptance, never email-name matching |
| `ProfilePolicyRevision` / controls | Submitted settings version, age/maturity band, blocked works, guardian/owner action and relevant consent/policy references; profile cannot loosen its own effective controls |
| `ProfileSession` / device credentials | Scoped profile, issuing authorised User, device, allowed actions, expiry/revocation, refresh family; no account-admin permission, no owner credential copied |
| `HouseholdAccessPolicy` / grant origin | Offer/purchase policy snapshot and eligible account/profile scope. Effective profile grants retain purchase/assignment provenance; no unchecked polymorphic FK |
| Profile reading state | Progress, bookmarks, recommendations, preference/history keyed by profile + delivery + release + locator kind, with independent conflict versions. User-level account settings stay User-scoped |
| Profile transfer request | Explicit source profile, target verified personal account/User, approval/consent and resumable/audited mapping; no silent merge of notes/history or automatic transfer of licenses |

Migration creates the default owner reader profile for each verified personal account and maps existing reading state exactly once. A validated organisation-member grant is attributed only to that member's eligible own profile, not new dependents. Preserve original User IDs in import/audit mappings; author Party IDs, creator enrollment and purchases do not become reader-profile identities. Organisation employee reading state can reference an own profile while organisation administrators gain no extra inspection rights.

Profile counts, device/concurrent-use limits, caregiver changes, profile archival/deletion and data retention are configured explicitly. Deleting a profile must not refund/reassign purchases, erase audit evidence or delete the User. Deletion removes/retains profile data through a defined process and revokes its sessions; account ownership requires separate commands.

## Growing into an independent account

Plan an explicit claim/transfer flow for an adult or an eligible former minor who later creates a personal account. Preserve selected progress, preferences, saved items and notes with consent; do not automatically copy the sponsor's receipts, payment methods, creator identity, organisation memberships or household license rights. Recheck access at destination and define collisions if that account already has progress for the same product. Never automatically lift restrictions on a birthday, infer a new email, or hand over account management. Minor-to-adult transition and data release require the configured eligibility/consent process.

Netflix's transfer feature demonstrates continuity but its transfer eligibility is Netflix policy; Wolly must define its own. Initial launch may support guided/manual audited transfer before self-service, but should preserve stable provenance so future independence does not require discarding a reading history.

## Milestones and acceptance

This is a required target capability alongside the account model; personal learning slices can begin with the default profile, but full profile support needs the following evidence:

- **B1–B2:** reader-profile identity and restricted principal contracts; default profile and owner management; adult/minor creation, controls, locks, paired device/profile sessions and privilege separation.
- **B3–B4:** profile-scoped library/progress/recommendations/bookmarks, age-suitable discovery and safe profile switching; organisation-license access remains named-member-only.
- **B5–B7:** content suitability inputs/review state and policy revision snapshots; reader profile never substitutes for creator/signer User authority.
- **B8–B9:** explicit household offer coverage and capacity/concurrency policy, one-payment attribution, refund/independent-grant handling; no minor/profile self-checkout.
- **B10–B13:** profile-aware blog eligibility without automatic subscription expansion, public engagement restrictions, default-profile import, data/transfer policy, privacy and shared-device/offline walkthroughs.

Required demonstrations: two adults/minor reading the same eligible product keep separate positions/notes/recommendations; minor direct-link/sample/offline/profile-switch attempts respect restrictions; delegated adult cannot open creator/admin/billing/org tools; named organisation seat cannot be consumed by a dependent; a purchase grants only declared household coverage; refund/profile removal preserves unrelated grants; one account purchase never creates duplicate royalties/review votes; adult privacy is represented accurately; policy changes clear stale content across devices; default-profile import/transfer retries preserve history without inventing purchase ownership.
