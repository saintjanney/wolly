import type { FirestoreTimestamp } from './firestore';

/**
 * A document in the `users` collection.
 *
 * NOTE: historically the two apps wrote this document with different key
 * conventions — the Flutter reader used snake_case (`first_name`, `dob`,
 * `content_preferences`) while the creator-hub uses camelCase. Both shapes are
 * captured here so consumers can read either. New writes should prefer the
 * camelCase creator fields; the snake_case reader fields are marked legacy.
 * Reconciling existing user docs is tracked separately from the book contract.
 */
export interface WollyUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;

  // Creator-hub profile (camelCase, preferred)
  firstName?: string;
  lastName?: string;
  bio?: string;
  penName?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    facebook?: string;
  };
  country?: string;
  timezone?: string;
  language?: string;
  currency?: string;
  notificationSettings?: {
    emailMarketing: boolean;
    salesUpdates: boolean;
    platformUpdates: boolean;
    weeklyDigest: boolean;
  };

  // Shared onboarding / reader preferences
  onboardingCompleted?: boolean;
  /** Genre doc ids the user prefers (used for reader recommendations). */
  genre_prefs?: string[];

  // Legacy reader profile (snake_case) — read-only compatibility
  /** @deprecated use firstName */
  first_name?: string;
  /** @deprecated use lastName */
  last_name?: string;
  /** Date of birth (legacy reader key). */
  dob?: string;
  gender?: string;
  persona?: string;
  phoneNumber?: string;
  content_preferences?: string[];

  // Platform stats (creator-hub)
  totalRevenue?: number;
  totalBooks?: number;
  totalSales?: number;
  averageRating?: number;

  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
  lastLoginAt?: FirestoreTimestamp;
}
