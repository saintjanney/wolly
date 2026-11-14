import type { FirestoreTimestamp } from './firestore';
import type { RevenueBasis } from './revenue';

/**
 * A publishing contract between an author and Wolly.
 *
 * THE PUBLISH FLOW IS AN AGREEMENT, NOT A SETTINGS PAGE. Uploading a title and
 * selling it are different acts, and the product now separates them: a
 * manuscript becomes a Title the moment it is uploaded, and stays one until its
 * author decides to sell it. This document records that decision.
 *
 * DELIBERATELY NOT A RightsGrant. The registry has the vocabulary to express
 * "Wolly may sell the ebook worldwide", which is exactly the trap. That registry
 * is a record of claims Wolly does NOT verify, made by the author about third
 * parties; this is an agreement Wolly is itself a party to and is bound by.
 * Putting Wolly's own contract in the registry would mean an author editing a
 * licence could change what Wolly owes them, and would blur the one distinction
 * RIGHTS.md is most careful about.
 *
 * SERVER-WRITTEN. `signPublishingContract` is the only writer. An author who
 * could create one of these would set their own revenue share, which is the
 * defect that reached production once already through `epubs.revenueTerms`.
 */

/**
 * `pending` covers the window between signing and going live: Wolly still has
 * to review the edition. `ended` is how a contract stops, because a contract
 * that once existed is not deleted; the record of what was agreed survives it.
 */
export type ContractState = 'pending' | 'active' | 'ended';

export type ContractEndReason = 'author_withdrew' | 'wolly_ended' | 'superseded';

/**
 * What the author agreed to, stored verbatim.
 *
 * Mirrors `RightsDeclaration` on purpose, for the same reason: "they accepted"
 * is worth little without "to what words, and when". Storing the rendered text
 * rather than a version pointer means the record stays readable after the
 * wording changes, and survives the constant being edited.
 */
export interface ContractAgreement {
  acceptedBy: string;
  acceptedAt: FirestoreTimestamp;
  agreementText: string;
  agreementVersion: string;
}

export interface PublishingContract {
  id: string;
  bookId: string;
  /** Denormalised so a collection-group query works for staff. */
  authorUserId: string;

  // ── The commercial terms, FROZEN AT SIGNING ──────────────────────────────
  //
  // Copied from the platform settings at the moment the author agreed, never
  // read back from them. Staff can change what Wolly offers tomorrow; this
  // author agreed to these terms today, and changing what they signed without
  // asking them is not a configuration change, it is a different contract.
  authorShare: number;
  revenueBasis: RevenueBasis;

  /** Minor units (pesewas). Zero when the book is free. */
  priceMinor: number;
  currency: string;
  isFree: boolean;

  agreement: ContractAgreement;

  state: ContractState;
  signedAt: FirestoreTimestamp;
  /** Set when Wolly's review passes and the book goes live. */
  activatedAt?: FirestoreTimestamp | null;
  endedAt?: FirestoreTimestamp | null;
  endReason?: ContractEndReason | null;

  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

/**
 * Fields no client may write. The whole document, in practice.
 *
 * Listed rather than implied because the rules deny client writes outright and
 * a future "let the author edit the price" change would otherwise quietly
 * reopen the hole. Changing a price means signing a new contract.
 */
export const SERVER_OWNED_CONTRACT_FIELDS = [
  'authorShare',
  'revenueBasis',
  'priceMinor',
  'state',
  'signedAt',
  'activatedAt',
  'endedAt',
  'agreement',
] as const;

/**
 * The exact words an author accepts. Stored verbatim on the contract.
 *
 * DRAFT WORDING, pending review. It says only what the platform can actually
 * do, in the vocabulary RIGHTS.md permits: no claim that Wolly registers,
 * certifies, protects or secures anything, and no promise about copies already
 * downloaded, which RIGHTS.md is explicit that Wolly cannot honour.
 *
 * Replacing it is a VERSION BUMP, never an edit: contracts already signed store
 * the text they were signed against, so old records stay true.
 */
export const PUBLISHING_AGREEMENT_V1 = {
  version: 'wolly-publishing-agreement-v1',
  text:
    'I am asking Wolly to sell this book. I hold the rights to do that, and the ' +
    'details I have given are accurate to the best of my knowledge.\n\n' +
    'Wolly will make the book available to readers, take payment, and pass on my ' +
    'share of each sale at the rate shown above. That rate is fixed for this ' +
    'agreement: if Wolly changes what it offers later, my share of sales made ' +
    'under this agreement does not change.\n\n' +
    'I can withdraw the book from sale at any time. Withdrawing stops new sales ' +
    'and stops new downloads. It does not remove copies readers have already ' +
    'downloaded, and Wolly does not claim it can. I am still owed my share of ' +
    'sales already made.\n\n' +
    'Wolly does not verify who owns this work. This agreement is not a copyright ' +
    'registration and does not by itself prove ownership.',
} as const;

/** The reader-facing summary of a signed contract. Never invents a number. */
export function describeContract(contract: Pick<PublishingContract, 'authorShare' | 'revenueBasis' | 'priceMinor' | 'currency' | 'isFree'>): string {
  if (contract.isFree) return 'Free to readers. No money changes hands.';
  const price = (contract.priceMinor / 100).toFixed(2);
  const percent = Math.round(contract.authorShare * 1000) / 10;
  const suffix = contract.revenueBasis === 'net' ? ' after payment charges' : '';
  return `${contract.currency} ${price}. You keep ${percent}% of every sale${suffix}.`;
}

/**
 * Whether a contract is the one currently governing a book.
 *
 * `ended` contracts are kept, so "does this book have a contract" is never a
 * question about existence.
 */
export function isLiveContract(contract: Pick<PublishingContract, 'state'>): boolean {
  return contract.state === 'pending' || contract.state === 'active';
}
