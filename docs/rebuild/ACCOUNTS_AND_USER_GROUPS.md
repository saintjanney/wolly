# Accounts, user groups and organisation-sponsored access

Product and domain proposal, 14 November 2026. This records the user's explicit requirement for individual and organisation accounts, each with independent consumption and creator capabilities. It supersedes earlier notes that organisation/team support was deferred. Organisation licensing terms below are proposed defaults to settle before sale, not existing product behavior or a claim that every catalog product permits group use.

Release sequencing and channel commitments are defined in the [product roadmap](PRODUCT_ROADMAP.md); the [release execution plan](RELEASE_PLAN.md) requires complete creator/reader/staff journeys, supported web/Android/API evidence and domain/cohort gates. Early limited pilots do not waive the full requirements in this specification.

Scope revision: [unified titles, offers and subscriptions](CONTENT_OFFERS_AND_SUBSCRIPTIONS.md) defines blog posts as titles, source/editor authoring, mutually exclusive free/paid title classification, lifetime and/or subscription routes for paid titles, and independent grant provenance. Release order is R1 free ebooks → R2 free audio → R3 lifetime monetisation → R4 publisher teams → R5 households/minors → R6 sponsored consumption → R7 subscription programme → R8 full rollout. Earlier source inventories describe legacy behavior, not an exception to this target.

Package eligibility is explicit for each account/profile: lifetime grants remain durable, monthly periods expire only their own grants, household members need declared sharing and organisation consumption needs named-seat terms. Neither creator participation nor channel following supplies paid access. Account owners/payers manage enrollment; restricted profiles cannot buy or alter plans.

## Product definition

Wolly has **people who sign in**, **accounts they act for**, and **capabilities enabled on those accounts**. People use their own individual identity for independent sign-in and privileged actions. Additional managed readers may use scoped household profiles without independent User accounts, as defined in [reader profiles and household access](READER_PROFILES_AND_HOUSEHOLDS.md). An organisation is a shared account represented by its authorised members, never a shared username/password. An independently registered person retains one login identity and primary reader profile while acting personally or within several organisations.

| User group / account | Consumption | Creation / distribution | Who pays / receives revenue |
| --- | --- | --- | --- |
| Individual reader/listener | Own free, purchased and otherwise authorised content | No creator tools until the personal account is enrolled/enabled | Personal account pays for personal purchases |
| Individual creator | Same personal consumption as any individual | Personal creator-enabled account owns/manages its publishing workspace and may distribute/monetise approved content | Personal account is contracting seller/approved beneficiary; creation does not grant access to others' paid content |
| Organisation-sponsored member | Personal profile plus content explicitly assigned/covered by each organisation membership | No publishing permission from membership alone | Sponsoring organisation pays; personal purchases remain separate |
| Organisation consumer account | Administrators acquire permitted licenses and allocate access to eligible members | No publishing permission until organisation creator capability is enabled | Organisation is purchaser/license holder; members are readers, not personal owners of the license |
| Organisation creator account | Can also sponsor member consumption independently | Publisher/institution manages its catalog through authorised team members, with its own agreements and beneficiary | Organisation is contracting publisher/beneficiary, unless an explicit different arrangement is approved |

These are combinations of capabilities and relationships, not mutually exclusive user classes. A novelist can personally buy books, edit a publisher's catalog and read through a university's sponsored account using one identity. Organisations may consume only, publish only or do both. The organisation's industry (publisher, school, company, research institute, library, nonprofit, other) is descriptive profile metadata; it does not confer permissions or special content rights.

## Identity and account entities

```text
User (individual login + personal profile)
 ├── owns exactly one IndividualAccount
 │    ├── personal purchases/access
 │    └── optional CreatorEnrollment
 └── OrganisationMembership (zero or many)
      └── OrganisationAccount
           ├── invitations + member permission assignments
           ├── organisation purchases/licenses → member access assignments
           └── optional CreatorEnrollment → catalog, agreements and earnings

Party (credited person/organisation) ← verified account links, explicit credits
```

| Entity | Identity / relationships / invariants |
| --- | --- |
| `User` | Authenticated person, profile/preferences and sessions. Never reused as the organisation identity. Account switch does not create another user or another author credit |
| `Account` | Existing proposed `managing_accounts` expanded to `kind: individual \| organisation`; accountable subject for purchases, catalog management and financial history. Exactly one individual account per user; an organisation has many explicit memberships. Name the API resource `/accounts` and keep SQL naming consistent during implementation |
| `OrganisationProfile` | Organisation account FK, public name, type, optional private legal/billing information, representative/verification state and public Party linkage. Organisation account and credited organisation Party remain distinct |
| `AccountMembership` | Unique `(account_id,user_id)`, invited/active/suspended/removed lifecycle, activation/end timestamps, version; explicit role/capability assignments. Personal owner is seeded for individual account; additional household reader profiles are separate from management/team memberships |
| `AccountInvitation` | Organisation, invited verified destination, proposed bounded permissions, creator/expiry, hashed single-use acceptance token and state. Accept/revoke/expire atomically; possessing an email string is not membership |
| `CreatorEnrollment` | Account FK, application/terms/version, state (`not_enrolled`, `pending`, `active`, `suspended`, `closed`) and decision/history. Independent of account status and consumption. Exact activation checks follow configured programme policy |
| `AccountPermissionAssignment` | Account/membership FK and allowlisted capabilities, with optional catalog scope. Only authorised grantors can assign their permitted roles; customer roles never confer Wolly staff permissions |
| `Purchase` / `CheckoutAttempt` | Authenticated actor user, explicit purchaser account, target/offer, quantity/currency/price/terms snapshot and idempotency. Purchaser, member recipient and seller beneficiary may differ |
| `OrganisationLicense` | Organisation/purchase/approved offer, exact delivery coverage, seat capacity, permitted languages/formats/releases, start/end, retained-access and assignment policy snapshots. Membership is not a license |
| `LicenseAssignment` | License FK + active organisation membership FK, activation/end and history. Capacity consumed atomically; one active assignment per license/member, within license/membership dates and conditions |
| `EntitlementGrant` | Subject reader profile + delivery with eligible User/membership checks for organisation access, provenance to personal purchase or organisation license/assignment (or other authorised origin), validity/revocation history. Effective access considers membership/license state live; personal grants remain independent |

An individual's account is the personal billing/catalog context, not a second login identity. An organisation member's removal never deletes their User, personal profile, purchased items, credits or content owned by their personal account. Closing an organisation preserves finance/consent/catalog history and executes explicit member-access and publication policies; it is not a cascade delete.

## Household reader profiles

The [reader profiles and household access](READER_PROFILES_AND_HOUSEHOLDS.md) specification introduces a distinct consumption identity beneath an individual account: one default owner profile plus optional adult/minor profiles. Additional profiles do not require a separate paid account, independent login or email. They keep separate recommendations, progress, bookmarks and private reading state. Profile access is a scoped reading capability, not personal-account co-ownership, creator enrollment, spending authority or organisation membership.

Household access must follow explicitly permitted product/offer terms. Existing personal purchases remain owner-only unless verified sharing terms allow expansion. Named organisation licenses stay assigned to authenticated members and do not flow to household profiles. Privileged actions require the real User session; delegated profile/device sessions cannot elevate to account administration. Adult privacy, minor controls and later independence/transfer follow the profile specification.

## Permissions within an organisation

Recommended role templates map to explicit capabilities. Small organisations can assign several roles to one person; roles are not a required corporate hierarchy.

| Role template | Permitted scope | Not implied |
| --- | --- | --- |
| Owner | Account governance, ownership transfer, role assignment and closure; can explicitly assign other roles | No Wolly staff powers, unrestricted member reading history or authority to certify rights |
| Account administrator | Manage invited/active members and allowed roles, profile and access allocation | Spending, contract signing or payouts unless separately granted |
| Member | Consume assigned/covered content, maintain personal reading state | Invite others, spend organisation funds or edit catalog |
| Content curator | Select permitted content and assign existing licensed seats | New purchases or exceeding license capacity |
| Purchaser / billing manager | Approved organisation checkout, invoices/receipts and spending records | Creator payouts, contract signing, private member bookmarks or administrative role changes |
| Catalog editor | Prepare organisation-owned titles/files/metadata | Signing publishing agreements, self-approval or publishing personally owned titles without authority |
| Publishing manager / authorised signer | Submit organisation content and accept permitted programme agreements with recorded authority | Wolly moderation/rights approval or payout-destination changes |
| Creator finance manager | Organisation sales statements, verified payout settings and permitted payout operations | Access to other organisations or member private reading activity |

Require at least one active owner; transfer ownership explicitly before the last owner leaves or is removed. All privileged changes are audited and checked against current membership and permissions. Creator Hub access needs active account creator capability plus the user's publishing permission; an employee does not need personal creator enrollment to work for a creator-enabled organisation.

## Individual and organisation journeys

**Individual:** sign up → personal profile/account → browse/read/listen → buy personally if desired → opt into creator programme → satisfy applicable terms/readiness → create and distribute under personal account. No need for a separate creator login.

**Organisation setup:** an authenticated person creates an organisation → becomes initial owner → supplies profile and applicable representative/billing details → invites members → members accept through their own identities. A new empty organisation does not inherit the founder's personal books, credits, purchases or creator enrollment.

**Sponsored consumption:** authorised purchaser selects an organisation-license offer → checkout explicitly identifies organisation, coverage and capacity → verified settlement creates that organisation's license → curator/admin assigns eligible members → users see which access is sponsored. Membership alone neither buys content nor authorises charges.

**Organisation publishing:** owner/authorised representative opts the account into creator programme → programme enabled under recorded terms → permitted editors prepare catalog → authorised signer submits/accepts agreements → Wolly staff completes its review → earnings accrue to frozen organisation beneficiary. A publisher uploading an author's work records author credits and required distribution authority; membership does not establish ownership of the manuscript.

Internal/private distribution and public marketplace distribution are different audience capabilities. Public approved distribution is the existing launch publishing model. Institution-only content requires explicit audience/eligibility scopes in discovery, assets and entitlements before enablement; do not simulate it with an unlisted URL or assume organisation membership makes public catalog content private.

## Sponsored access model and recommended first scope

Start with explicit **named-member licenses for selected delivery products**, purchased by the organisation and assigned within capacity. This is a proposed commercial default, not permission to resell an ordinary personal ebook purchase to many members. Offer availability must depend on publisher/Wolly terms that permit organisational licensing.

- A license records organisation, product coverage, seat count, term and whether/how seats can be reassigned. No automatic access to all Wolly content, sibling translations/narrations, complete series or future editions.
- License scope and capacity can be supported in the first organisation flow without implementing a wallet, recurring institution plan, seat borrowing, IP access, campus SSO or unlimited catalog subscription. Those are separate product decisions.
- Account membership consumes no content seat by itself. Active assignments consume seats under the frozen policy. Removal/suspension ends organisation-derived eligibility for new requests; another independent personal or organisational grant may still permit access.
- Organisation membership changes do not trigger automatic purchases. The first version uses explicit authorised checkout; delegated per-member spending/budgets require additional controls before enablement.
- An intentional extra-seat purchase or license expansion is not automatically a duplicate payment. Its unique approved offer/quantity/action distinguishes it from replay or a second payment for the same intended transaction. Lock capacity/assignment changes and prevent concurrent over-allocation.
- Preserve private user progress, annotations and listening history. Recommended default: administrators see membership, assigned capacity and billing; aggregate usage may be offered with a defined policy. Individual-level monitoring needs an explicit purpose, disclosure and authorised feature, not an assumption based on paying the bill.
- Display personal versus sponsored access in library/purchase UX. Organisation receipts belong to the purchaser account, while the member library shows access, not a personal purchase. Removing sponsorship does not promise deletion of files already downloaded; define offline validity/revalidation for protected caches before selling time-limited access.

## Security, privacy and finance boundaries

Every mutation records both **actor user** and **account acted for**. A client-supplied `accountId` is a context selection, never proof of authority. Recheck membership/permission server-side for each action, including pending-job execution and finance state changes. Cache keys include user, authorised account context where relevant, product/release and grant scope; context switch clears stale privileged views.

Reader preferences/progress belong to the reader profile, not the paying organisation; User-level membership and personal administration remain separately scoped. A user may receive the same delivery through multiple grants; recompute effective access when any membership/license/assignment changes rather than revoking unrelated access. Private user content must never be included in an organisation export merely because that user is a member. Do not send the organisation roster, personal library or internal agreements to public creator-profile DTOs.

Record buyer account and seller beneficiary separately. A publisher organisation may buy another publisher's products; these are different ledger/authority roles. Organisation catalog sales freeze that organisation's agreement/beneficiary terms; membership or ownership transfers do not rewrite historical sales. Existing personal completed purchases remain personal through migration unless an explicit supported transfer programme says otherwise.

Creator programme suspension stops the relevant creator actions/listings under approved policy, not automatically sponsored reading or personal login. Account security suspension, license expiry, member suspension and content-rights takedown are separate axes; the access resolver evaluates each applicable scope. Personal app persona/profile labels never grant these permissions.

## Decisions before dependent features are enabled

| Decision | Proposed default / point of resolution |
| --- | --- |
| Organisation pricing/coverage | Named-member licenses per selected delivery; agree publisher eligibility, price, capacity and term before B8 sponsored sales |
| Seat reassignment / leaving member | Explicit assignment history and configured cooldown/limits; no assumed perpetual personal ownership. Set policy before B8/B13 |
| Licence expiry/refunds/closure | Freeze retained-access and partial-refund/capacity effects in offers. End new sponsored access only as policy states; resolve before sale |
| Internal/private institutional publishing | Separate audience feature; public distribution first, no implied internal-only support |
| Creator activation and representative authority | Versioned individual/organisation programme terms and readiness; configured verification before signing/payout, without presenting verification as copyright certification |
| Budgets and member self-checkout | Explicit purchaser-authorised checkout first; wallets, monthly spend and automatic reimbursement deferred |
| Reporting and offline use | Private annotations/progress by default; define aggregate analytics and protected offline revalidation policy before institution rollout |
| Organisation billing versus creator finance | Separate permissions, receipts, destinations and reports even when the same account consumes and publishes |

## Rebuild dependencies and acceptance

This requirement promotes organisation account/membership, creator enrollment and sponsored consumption into the target book-release scope. It is an explicit scope expansion; B0 remains unchanged. Use small personal-only learning slices first, but do not claim full target completion without organisation flows.

- **B1–B2:** account kinds, profiles, personal-account uniqueness, membership/role constraints, invitation lifecycle, active-owner invariant, server-authorised context and independent creator enrollment states.
- **B3–B4:** personal and sponsored library/access DTOs, grant-aware resolver, reader-profile-owned reading state and private account context handling; seed licensed fixtures without performing payments early.
- **B5–B7:** creator-enabled personal/organisation workspaces, scoped editor/signer authority, account-owned catalog, rights/consent, organisation beneficiary and staff review boundaries.
- **B8–B9:** buyer-account/actor distinction, approved organisation-license checkout, seat assignments/capacity and expiry/refund semantics, independent grants, account-scoped billing versus creator earnings/payouts.
- **B10–B13:** account-aware blog/creator permissions without automatic book subscription grants; migration, account switching, organisation finance reconciliation and cross-surface acceptance. Institution-wide blog subscriptions need explicit offers and remain separate from book licenses.

Required demonstrations:

1. One person signs in, buys personally, joins two organisations, and switches context without exposing rosters, content drafts, billing or finance across accounts.
2. A consuming-only organisation sponsors a member without enabling creator tools; a publisher enables creator capability without buying a consumption plan. A member works in organisation Creator Hub without personal creator activation.
3. Invite/accept/revoke/expire races are safe; a changed email alone grants no membership. Role escalation and removal of last owner fail; publishing permission never grants Wolly staff approval.
4. Buy permitted capacity for one exact delivery, race seat assignments, and deny excess/cross-organisation grants. Retry payment once; intentional extra capacity is handled as a new approved action.
5. Remove a sponsored member and expire/refund a license; reject new sponsored requests while preserving that person's independent personal purchases, annotations and other valid grants. Test download/link/offline limitations explicitly.
6. Editors cannot sign organisation agreements or change payouts; signers cannot approve themselves as Wolly staff. Correct publisher/author credits and frozen beneficiary persist after membership/management changes.
7. Organisation administrator cannot inspect private member reading/notes or export unrelated personal data. Creator suspension does not automatically disable independent consumption.
8. Migrate existing users to personal accounts, Party mappings and original grants; create no inferred organisations from an email domain. Re-import without duplicate memberships, licenses, grants or financial allocations.
