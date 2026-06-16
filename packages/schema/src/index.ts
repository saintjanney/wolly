/**
 * @wolly/schema — canonical Firestore document schema for the Wolly platform.
 *
 * Single source of truth for the shapes of documents stored in Firestore.
 * The web apps (creator-hub, backoffice) import these types directly; the
 * Flutter reader mirrors them in Dart (see SCHEMA.md at the repo root).
 */

export * from './firestore';
export * from './epub';
export * from './genre';
export * from './user';
export * from './review';
export * from './purchase';
export * from './social';
