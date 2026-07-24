import type { FirestoreTimestamp } from './firestore';

/**
 * A document in the `users` collection.
 *
 * Corrected on 2026-07-24 against the live database AND against what each app
 * actually writes. It had drifted in both directions, omitting a dozen fields
 * present in every document while declaring `dob` and `content_preferences`,
 * which nothing writes.
 *
 * The two apps disagree about this document in three ways beyond naming. All
 * three are captured here rather than silently resolved, because both writers
 * are live:
 *
 *  1. TOPIC INTERESTS. The reader writes `genre_prefs`; the creator-hub writes
 *     `selectedGenres`. Both are genre document ids and mean the same thing.
 *     The reader gates its onboarding on `genre_prefs`, so a user created by
 *     the hub is sent back through onboarding in the reader even though they
 *     already chose genres. Read both; prefer `selectedGenres` when writing.
 *  2. DATE OF BIRTH. The reader writes `date_of_birth` as an ISO 8601 STRING;
 *     the creator-hub writes `dateOfBirth` as a Timestamp. Different names and
 *     different types, so they cannot be reconciled by a rename.
 *  3. COUNTRY. The reader writes `country_code` (a dialling/ISO code from
 *     signup); the hub writes `country` and `countryOfResidence`.
 *
 * The plain camelCase/snake_case split (`first_name`/`firstName` and friends)
 * is kept in sync by `apps/creator-hub/scripts/reconcile-user-fields.js`.
 */
export interface WollyUser {
  uid: string;
  email: string;
  displayName?: string;
  /** Note the capitalisation: this mirrors Firebase Auth's own `photoURL`. */
  photoURL?: string;

  // ── Identity ─────────────────────────────────────────────────────────────
  firstName?: string;
  lastName?: string;
  penName?: string;
  bio?: string;
  /** Longer author biography, written by the creator-hub settings page. */
  authorBio?: string;
  website?: string;
  phoneNumber?: string;
  /** Creator-hub: a Timestamp. See also legacy `date_of_birth` (a string). */
  dateOfBirth?: FirestoreTimestamp;
  gender?: string;
  countryOfResidence?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    facebook?: string;
  };

  // ── Preferences ──────────────────────────────────────────────────────────
  /**
   * Genre **document ids** the user picked during onboarding — creator-hub's
   * name for it, and the one to prefer when writing. The reader writes the same
   * concept to {@link WollyUser.genre_prefs}; read both.
   */
  selectedGenres?: string[];
  /** Free-text interests the user typed that are not in the genre catalog. */
  customGenres?: string[];
  /** Creator specialities, chosen during creator onboarding. */
  specialties?: string[];
  writingExperience?: string;
  preferences?: {
    theme?: string;
    dateFormat?: string;
    timeFormat?: string;
  };

  // ── Locale & commerce ────────────────────────────────────────────────────
  country?: string;
  timezone?: string;
  language?: string;
  currency?: string;
  /** Document id into `supported_currencies`. */
  currency_id?: string;
  paymentInfo?: {
    payment_option?: string;
    payout_schedule?: string;
    payment_details?: Record<string, unknown>;
  };

  notificationSettings?: {
    emailMarketing: boolean;
    salesUpdates: boolean;
    platformUpdates: boolean;
    weeklyDigest: boolean;
  };

  // ── Onboarding ───────────────────────────────────────────────────────────
  onboardingCompleted?: boolean;
  onboardingStep?: number;
  onboardingCompletedAt?: FirestoreTimestamp;

  // ── Platform stats ───────────────────────────────────────────────────────
  totalRevenue?: number;
  totalBooks?: number;
  totalSales?: number;
  publishedBooks?: number;
  averageRating?: number;

  // ── Access control ───────────────────────────────────────────────────────
  /** Read by the `isAdmin()` security-rules helper. */
  isAdmin?: boolean;
  /** Gates whether other authenticated users may read this profile. */
  publicProfile?: boolean;

  // ── Reader-written fields ────────────────────────────────────────────────
  // The Flutter reader writes these. The first three are kept in sync with
  // their camelCase twins by reconcile-user-fields.js; the last three have no
  // twin because they differ in type or meaning, not just in spelling.
  /** @deprecated use {@link WollyUser.firstName} */
  first_name?: string;
  /** @deprecated use {@link WollyUser.lastName} */
  last_name?: string;
  /** @deprecated use {@link WollyUser.phoneNumber} */
  phone_number?: string;
  /**
   * Genre document ids, written by the reader's onboarding. Same meaning as
   * {@link WollyUser.selectedGenres}. The reader's auth gate keys off this
   * field's presence to decide whether to show onboarding.
   */
  genre_prefs?: string[];
  /**
   * ISO 8601 date STRING, written by reader signup. Distinct from
   * {@link WollyUser.dateOfBirth}, which is a Timestamp.
   */
  date_of_birth?: string;
  /** Country/dialling code captured at reader signup. */
  country_code?: string;

  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
  lastLoginAt?: FirestoreTimestamp;
}
