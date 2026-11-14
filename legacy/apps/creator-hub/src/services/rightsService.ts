import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { db, storage } from '@/lib/firebase';
import {
  RIGHTS_DECLARATION_V1,
  proposedDefaultGrant,
  type RightsGrant,
} from '@wolly/schema';

const EPUBS = 'epubs';
const RIGHTS = 'rights';

/**
 * The rights registry, from the creator-hub.
 *
 * THREE RULES THIS SERVICE EXISTS TO KEEP, all enforced by security rules and
 * all easy to break by accident from a client:
 *
 *  1. NEVER SEND A SERVER-OWNED FIELD. `verificationState` and its four
 *     companions are Wolly's, and a rules update is rejected outright if a
 *     write touches any of them. Any code that reads a grant, changes one
 *     field and writes the whole object back will fail, so `update` here takes
 *     an explicit whitelist rather than a spread.
 *  2. THE DECLARATION IS WRITTEN WITH THE GRANT, NEVER AFTER. Adding it later
 *     puts `declaration` in `affectedKeys()`, which `declarationUnchanged()`
 *     refuses, so a save-draft-then-sign flow would produce a grant that can
 *     never be signed. There is no `createUnsigned`.
 *  3. NOTHING HERE TOUCHES `epubs.rightsStatus`. That is the takedown gate, and
 *     the registry must be able neither to disable a book nor to enable one.
 */

export class RightsError extends Error {}

/** Fields an author may change after signing. Everything else is fixed or Wolly's. */
const EDITABLE = [
  'format',
  'territories',
  'languages',
  'channels',
  'exclusivity',
  'holderKind',
  'holderName',
  'startDate',
  'endDate',
  'terms',
  'disposition',
  'evidenceRef',
] as const;

type EditableField = (typeof EDITABLE)[number];

const EVIDENCE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export class RightsService {
  static async list(bookId: string): Promise<RightsGrant[]> {
    const snap = await getDocs(collection(db, EPUBS, bookId, RIGHTS));
    return snap.docs.map((d) => ({ ...(d.data() as RightsGrant), id: d.id }));
  }

  /**
   * Records a grant and its declaration together.
   *
   * `declarationText` is the string the author was actually shown, passed in by
   * the screen rather than re-derived here, because the point of storing it is
   * that it is the same words. A screen that renders a paraphrase and stores
   * the constant would produce a record of consent to something nobody read.
   */
  static async create(
    bookId: string,
    userId: string,
    grant: Omit<RightsGrant, 'id' | 'declaration' | 'bookId' | 'ownerUserId'>,
    declarationText: string,
  ): Promise<string> {
    if (declarationText !== RIGHTS_DECLARATION_V1.text) {
      throw new RightsError(
        'The declaration stored must be the exact words shown to the author.',
      );
    }
    const created = await addDoc(collection(db, EPUBS, bookId, RIGHTS), {
      ...grant,
      // The rules check both of these against the path and the caller on
      // create, so they are set here rather than trusted from the caller.
      bookId,
      ownerUserId: userId,
      declaration: {
        declaredBy: userId,
        declaredAt: serverTimestamp(),
        declarationText,
        declarationVersion: RIGHTS_DECLARATION_V1.version,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return created.id;
  }

  /**
   * The one-tap default: "I hold everything myself."
   *
   * Worldwide and all languages, because narrowing an author's own claim on
   * their behalf is the more harmful error, and exclusivity `unknown` because
   * most authors will not know and a guess is worse than a record of not
   * knowing.
   */
  static async claimEverything(
    bookId: string,
    userId: string,
    authorName: string,
    declarationText: string,
  ): Promise<string> {
    return RightsService.create(
      bookId,
      userId,
      proposedDefaultGrant({ bookId, ownerUserId: userId, authorName }),
      declarationText,
    );
  }

  /** Changes an author may make later. Server-owned fields cannot be sent. */
  static async update(
    bookId: string,
    grantId: string,
    changes: Partial<Pick<RightsGrant, EditableField>>,
  ): Promise<void> {
    const payload: Record<string, unknown> = {};
    for (const key of EDITABLE) {
      if (key in changes) payload[key] = changes[key];
    }
    if (Object.keys(payload).length === 0) return;
    payload.updatedAt = serverTimestamp();
    await updateDoc(doc(db, EPUBS, bookId, RIGHTS, grantId), payload);
  }

  /**
   * Archiving, which is how a grant ends.
   *
   * Deletion is denied to everyone including staff: the record of what was once
   * claimed is the reason the registry exists.
   */
  static async archive(bookId: string, grantId: string): Promise<void> {
    await updateDoc(doc(db, EPUBS, bookId, RIGHTS, grantId), {
      archivedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Attaches the agreement behind a third-party claim.
   *
   * Attaching evidence stops Wolly asking; it does NOT mark the claim verified,
   * which is server-owned and means a person has actually read the file.
   */
  static async attachEvidence(
    bookId: string,
    grantId: string,
    userId: string,
    file: File,
  ): Promise<string> {
    if (!EVIDENCE_TYPES.includes(file.type)) {
      throw new RightsError('Attach the agreement as a PDF, a Word document or a photo.');
    }
    if (file.size > 20 * 1024 * 1024) {
      throw new RightsError('That file is over 20MB.');
    }
    // Keyed by owner so the storage rule can prove ownership from the path.
    const path = `rights/${userId}/${bookId}/${Date.now()}_${file.name}`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file, { contentType: file.type });
    await getDownloadURL(fileRef);
    await RightsService.update(bookId, grantId, { evidenceRef: path });
    return path;
  }
}
