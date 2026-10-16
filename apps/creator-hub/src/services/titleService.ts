import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { db, storage } from '@/lib/firebase';
import type { EpubBook } from '@wolly/schema';

const EPUBS = 'epubs';

/**
 * A Title: a work an author has uploaded, whether or not Wolly ever sells it.
 *
 * THE DOCUMENT EXISTS FROM THE FIRST SCREEN. The old wizard held everything in
 * a Zustand store backed by localStorage and wrote one Firestore document at
 * the end, so a session that ended early lost the work, and files were dropped
 * from the draft entirely because they do not survive JSON. Splitting upload
 * from publishing makes that unacceptable rather than merely unfortunate: the
 * flows are now days apart by design.
 *
 * Everything after `create` is a patch on a document that already exists, so
 * there is no submit step to fail and nothing held only in a browser tab.
 */

export class TitleError extends Error {}

/** Cover images the press can fetch and measure. */
const COVER_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export const COVER_ACCEPT = '.jpg,.jpeg,.png,.webp';
const MAX_COVER_BYTES = 10 * 1024 * 1024;

export interface NewTitle {
  title: string;
  authorName: string;
  language: string;
  bookType: EpubBook['type'];
}

export class TitleService {
  /**
   * Creates the Title and returns its id.
   *
   * Writes only the reader-contract fields that must never be absent, plus the
   * three the author has actually given. Everything else is added later by
   * patch, so a half-finished Title is a document with gaps rather than a
   * document full of defaults nobody chose.
   */
  static async create(userId: string, input: NewTitle): Promise<string> {
    const title = input.title.trim();
    if (!title) throw new TitleError('Give your book a title to start.');

    const ref = await addDoc(collection(db, EPUBS), {
      title,
      author: input.authorName.trim(),
      authorName: input.authorName.trim(),
      ownerUserId: userId,
      language: input.language || 'en',
      type: input.bookType ?? 'ebook',

      // Reader contract. A Title is not for sale and not visible, and both of
      // those are decisions rather than defaults, so they are written now.
      isPublished: false,
      isFree: false,
      price: 0,
      currency: 'GHS',
      status: 'draft',
      rating: 0,
      reviewCount: 0,
      genre: '',
      url: '',
      fileType: 'epub',
      coverUrl: null,
      description: null,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  static async get(bookId: string): Promise<EpubBook | null> {
    const snap = await getDoc(doc(db, EPUBS, bookId));
    return snap.exists() ? ({ ...(snap.data() as EpubBook), id: snap.id }) : null;
  }

  /**
   * Patches a Title.
   *
   * Deliberately narrow: it takes a partial and writes it. It does NOT accept
   * File values, because `updateDoc` silently drops them, which is how the old
   * flow could appear to save a cover and save nothing. Files go through
   * `uploadCover` and `ManuscriptService.submit`.
   */
  static async patch(bookId: string, changes: Partial<EpubBook>): Promise<void> {
    for (const [key, value] of Object.entries(changes)) {
      if (value instanceof File || value instanceof Blob) {
        throw new TitleError(`${key} is a file and must be uploaded, not patched.`);
      }
    }
    await updateDoc(doc(db, EPUBS, bookId), { ...changes, updatedAt: serverTimestamp() });
  }

  /**
   * Uploads a cover and points the book at it.
   *
   * The press fetches this URL while pressing and records what it measured in
   * `coverMetrics`, so replacing a cover is also how an author fixes a cover
   * the press could not read.
   */
  static async uploadCover(bookId: string, userId: string, file: File): Promise<string> {
    const ext = file.name.toLowerCase().split('.').pop() ?? '';
    const contentType = COVER_TYPES[ext];
    if (!contentType) {
      throw new TitleError('Covers must be a JPEG, PNG or WebP image.');
    }
    if (file.size > MAX_COVER_BYTES) {
      throw new TitleError('That image is over 10MB. A smaller one will load faster for readers too.');
    }

    const path = `books/${userId}/${bookId}/cover_${Date.now()}_${file.name}`;
    const fileRef = ref(storage, path);
    // Content type set explicitly: Storage rules match on it, and a browser
    // that reports an empty type fails with a permission error rather than a
    // format one.
    await uploadBytes(fileRef, file, { contentType });
    const coverUrl = await getDownloadURL(fileRef);

    await updateDoc(doc(db, EPUBS, bookId), {
      coverUrl,
      coverImageUrl: coverUrl,
      updatedAt: serverTimestamp(),
    });
    return coverUrl;
  }

  /**
   * Live view of one Title, so the press and the report update as they land.
   *
   * THE ERROR CALLBACK IS NOT OPTIONAL. Without it a rules denial (signed out,
   * an expired session, somebody else's book) throws into the void and the
   * screen waits for a snapshot that will never arrive, showing "Loading" for
   * ever. That is the same swallowed permission error that once left the
   * reader's Library silently empty, and it is invisible to typecheck and to
   * the build.
   */
  static watch(
    bookId: string,
    onChange: (book: EpubBook | null) => void,
    onError: (error: Error) => void,
  ): Unsubscribe {
    return onSnapshot(
      doc(db, EPUBS, bookId),
      (snap) => {
        onChange(snap.exists() ? ({ ...(snap.data() as EpubBook), id: snap.id }) : null);
      },
      onError,
    );
  }
}
