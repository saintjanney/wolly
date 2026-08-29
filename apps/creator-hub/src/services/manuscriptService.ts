import {
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { db, functions, storage } from '@/lib/firebase';
import type { BookConversion, ConversionStatus } from '@wolly/schema';

const EPUBS = 'epubs';

/**
 * Formats the press accepts, with the content type to store them as.
 *
 * The content type is set explicitly rather than left to the browser: Chrome
 * and Safari report an empty type for `.md`, and Storage rules match on content
 * type, so an unset value is rejected at upload with a confusing permission
 * error rather than a format one.
 */
const ACCEPTED: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  md: 'text/markdown',
  markdown: 'text/markdown',
  txt: 'text/plain',
};

export const ACCEPT_ATTRIBUTE = '.docx,.md,.markdown,.txt';

/** 50MB, matching the press's own ceiling and the Storage rule. */
const MAX_BYTES = 50 * 1024 * 1024;

export class ManuscriptError extends Error {}

/** What the press is currently doing to a book, as the UI needs it. */
export interface ManuscriptState {
  status: ConversionStatus | null;
  error: string | null;
  conversion: BookConversion | null;
  epubUrl: string | null;
  pdfUrl: string | null;
  manuscriptUrl: string | null;
}

/**
 * Checks a chosen file before anything is uploaded.
 *
 * Rejecting here rather than server-side is worth the duplication: an author
 * who picks a `.doc` or a PDF learns immediately what to do instead of waiting
 * for a 50MB upload and a failed pressing.
 */
export function describeRejection(file: File): string | null {
  const ext = file.name.toLowerCase().split('.').pop() ?? '';

  if (ext === 'doc') {
    return 'This is a legacy .doc file. Open it in Word and save as .docx, then upload again.';
  }
  if (ext === 'pdf') {
    return 'A PDF is already typeset, so there is nothing for the press to lay out. Upload the source document (.docx, .md or .txt).';
  }
  if (!(ext in ACCEPTED)) {
    return `Wolly cannot read ".${ext}" files. Upload a .docx, .md or .txt manuscript.`;
  }
  if (file.size > MAX_BYTES) {
    return 'That manuscript is larger than 50MB. Remove embedded media, or split it into volumes.';
  }
  if (file.size === 0) {
    return 'That file is empty.';
  }
  return null;
}

export class ManuscriptService {
  /**
   * Uploads a manuscript and asks the press to typeset it.
   *
   * Writing `conversionStatus: 'requested'` IS the request: the converter is a
   * Firestore trigger, not a callable, because a long book takes minutes to
   * press and would outlive a callable's client timeout. Security rules allow a
   * client to write only that one value, so this cannot be used to declare a
   * book finished.
   */
  static async submit(
    bookId: string,
    userId: string,
    file: File,
  ): Promise<void> {
    const rejection = describeRejection(file);
    if (rejection) throw new ManuscriptError(rejection);

    const ext = file.name.toLowerCase().split('.').pop() ?? '';
    const path = `books/${userId}/${bookId}/manuscript_${Date.now()}_${file.name}`;
    const fileRef = ref(storage, path);

    await uploadBytes(fileRef, file, { contentType: ACCEPTED[ext] });
    const manuscriptUrl = await getDownloadURL(fileRef);

    await updateDoc(doc(db, EPUBS, bookId), {
      manuscriptUrl,
      conversionStatus: 'requested' satisfies ConversionStatus,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Resolves a working link to a pressed edition.
   *
   * Pressed files live under `converted/`, which no client may read: the stored
   * `epubUrl` and `pdfUrl` are identifiers, not usable links. This asks the
   * server for a short-lived signed URL, which is the same gate that enforces
   * purchase entitlement and rights revocation. An owner always passes it.
   */
  static async downloadUrl(
    bookId: string,
    format: 'epub' | 'pdf',
  ): Promise<string> {
    const call = httpsCallable<
      { bookId: string; format: string },
      { url: string }
    >(functions, 'getBookDownloadUrl');
    const { data } = await call({ bookId, format });
    if (!data?.url) {
      throw new ManuscriptError('The server did not return a download link.');
    }
    return data.url;
  }

  /** Re-presses the manuscript already attached to the book. */
  static async retry(bookId: string): Promise<void> {
    await updateDoc(doc(db, EPUBS, bookId), {
      conversionStatus: 'requested' satisfies ConversionStatus,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Watches a book while it is being pressed.
   *
   * A live subscription rather than polling, because pressing takes anywhere
   * from a few seconds to a couple of minutes depending on the manuscript, and
   * an author watching a spinner deserves to see it finish the moment it does.
   */
  static watch(
    bookId: string,
    onChange: (state: ManuscriptState) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    return onSnapshot(
      doc(db, EPUBS, bookId),
      (snap) => {
        const data = snap.data() ?? {};
        onChange({
          status: (data.conversionStatus as ConversionStatus) ?? null,
          error: (data.conversionError as string) ?? null,
          conversion: (data.conversion as BookConversion) ?? null,
          epubUrl: (data.epubUrl as string) ?? null,
          pdfUrl: (data.pdfUrl as string) ?? null,
          manuscriptUrl: (data.manuscriptUrl as string) ?? null,
        });
      },
      (error) => onError?.(error),
    );
  }
}
