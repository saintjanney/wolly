'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpTrayIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import {
  ACCEPT_ATTRIBUTE,
  ManuscriptError,
  ManuscriptService,
  describeRejection,
  type ManuscriptState,
} from '@/services/manuscriptService';

/**
 * The press, as an author sees it: hand over a manuscript, get a book back.
 *
 * Conversion runs server-side and takes from a few seconds to a couple of
 * minutes, so this subscribes to the book document rather than polling or
 * asking the author to refresh. Every state the press can be in has a screen
 * here, including failure, because a book that silently fails to convert is
 * worse than one that never started.
 */
export function ManuscriptDialog({
  bookId,
  bookTitle,
  userId,
  open,
  onClose,
}: {
  bookId: string;
  bookTitle: string;
  userId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [state, setState] = useState<ManuscriptState | null>(null);
  const [uploading, setUploading] = useState(false);
  const [watchError, setWatchError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setWatchError(null);
    const unsubscribe = ManuscriptService.watch(
      bookId,
      setState,
      (error) => {
        console.error(error);
        // Distinguished from "no manuscript yet": telling an author their book
        // has no manuscript when the read simply failed sends them to re-upload
        // work that is already there.
        setWatchError('Could not read this book\'s status.');
      },
    );
    return () => unsubscribe();
  }, [bookId, open]);

  const submit = useCallback(
    async (file: File) => {
      const rejection = describeRejection(file);
      if (rejection) {
        toast.error(rejection);
        return;
      }
      setUploading(true);
      try {
        await ManuscriptService.submit(bookId, userId, file);
        toast.success('Manuscript received. Typesetting now.');
      } catch (error) {
        console.error(error);
        toast.error(
          error instanceof ManuscriptError
            ? error.message
            : 'Could not upload that manuscript. Please try again.',
        );
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [bookId, userId],
  );

  if (!open) return null;

  const status = state?.status ?? null;
  const busy = uploading || status === 'requested' || status === 'processing';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-200 p-5">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Manuscript</h2>
            <p className="mt-0.5 truncate text-sm text-gray-500">{bookTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {watchError ? (
            <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              {watchError}
            </p>
          ) : null}

          {busy ? (
            <Working uploading={uploading} />
          ) : status === 'ready' && state ? (
            <Ready
              bookId={bookId}
              state={state}
              onReplace={() => inputRef.current?.click()}
            />
          ) : status === 'failed' ? (
            <Failed
              message={state?.error ?? 'Conversion failed.'}
              onRetry={async () => {
                try {
                  await ManuscriptService.retry(bookId);
                  toast.success('Trying again.');
                } catch {
                  toast.error('Could not start another attempt.');
                }
              }}
              onReplace={() => inputRef.current?.click()}
              hasManuscript={Boolean(state?.manuscriptUrl)}
            />
          ) : (
            <Empty onChoose={() => inputRef.current?.click()} />
          )}

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void submit(file);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function Empty({ onChoose }: { onChoose: () => void }) {
  return (
    <div className="text-center">
      <DocumentTextIcon className="mx-auto h-10 w-10 text-gray-300" />
      <p className="mt-3 font-medium">Upload your manuscript</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
        Wolly typesets it into an EPUB and a print-ready PDF, and stamps both
        with a publishing record that identifies the copy.
      </p>
      <button
        onClick={onChoose}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
      >
        <ArrowUpTrayIcon className="h-4 w-4" />
        Choose a file
      </button>
      <p className="mt-3 text-xs text-gray-400">
        Word (.docx), Markdown (.md) or plain text (.txt), up to 50MB
      </p>
    </div>
  );
}

function Working({ uploading }: { uploading: boolean }) {
  return (
    <div className="py-6 text-center">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
      <p className="mt-4 font-medium">
        {uploading ? 'Uploading your manuscript…' : 'Typesetting your book…'}
      </p>
      <p className="mt-1 text-sm text-gray-500">
        {uploading
          ? 'Keep this window open until the upload finishes.'
          : 'This takes anywhere from a few seconds to a couple of minutes. You can close this and come back.'}
      </p>
    </div>
  );
}

function Ready({
  bookId,
  state,
  onReplace,
}: {
  bookId: string;
  state: ManuscriptState;
  onReplace: () => void;
}) {
  const conversion = state.conversion;
  return (
    <div>
      <div className="flex items-start gap-3 rounded-lg bg-green-50 p-3">
        <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
        <div className="text-sm">
          <p className="font-medium text-green-900">Your book is typeset.</p>
          {conversion ? (
            <p className="mt-0.5 text-green-800">
              {conversion.chapterCount}{' '}
              {conversion.chapterCount === 1 ? 'chapter' : 'chapters'},{' '}
              {conversion.wordCount.toLocaleString()} words, from your{' '}
              {conversion.sourceFormat === 'docx'
                ? 'Word document'
                : conversion.sourceFormat === 'markdown'
                  ? 'Markdown'
                  : 'text file'}
              .
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Download bookId={bookId} format="epub" available={Boolean(state.epubUrl)} />
        <Download bookId={bookId} format="pdf" available={Boolean(state.pdfUrl)} />
      </div>

      {conversion && conversion.warnings.length > 0 ? (
        <div className="mt-4 rounded-lg bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-900">
            Worth a look before you publish
          </p>
          <ul className="mt-1 list-inside list-disc text-sm text-amber-800">
            {conversion.warnings.slice(0, 5).map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {conversion ? (
        <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
          Publishing record{' '}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-[11px]">
            {conversion.fingerprint}
          </code>
          . This identifier is written into both files, so a copy found
          elsewhere can be traced back to this pressing.
        </p>
      ) : null}

      <button
        onClick={onReplace}
        className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
      >
        Upload a revised manuscript
      </button>
    </div>
  );
}

/**
 * Fetches a link at click time rather than rendering the stored URL.
 *
 * The stored `epubUrl` / `pdfUrl` point under `converted/`, which no client can
 * read; linking to them directly would hand the author a button that 403s. The
 * server issues a signed URL valid for fifteen minutes, so it has to be
 * requested when it is about to be used rather than when the dialog renders.
 */
function Download({
  bookId,
  format,
  available,
}: {
  bookId: string;
  format: 'epub' | 'pdf';
  available: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const label = format.toUpperCase();

  if (!available) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 px-4 py-3 text-center text-sm text-gray-400">
        No {label}
      </div>
    );
  }

  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const url = await ManuscriptService.downloadUrl(bookId, format);
          window.open(url, '_blank', 'noopener,noreferrer');
        } catch (error) {
          console.error(error);
          toast.error(`Could not open the ${label}. Please try again.`);
        } finally {
          setBusy(false);
        }
      }}
      className="rounded-lg border border-gray-300 px-4 py-3 text-center text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
    >
      {busy ? 'Preparing…' : `Download ${label}`}
    </button>
  );
}

function Failed({
  message,
  onRetry,
  onReplace,
  hasManuscript,
}: {
  message: string;
  onRetry: () => void;
  onReplace: () => void;
  hasManuscript: boolean;
}) {
  return (
    <div>
      <div className="flex items-start gap-3 rounded-lg bg-red-50 p-3">
        <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        <div className="text-sm">
          <p className="font-medium text-red-900">
            Wolly could not typeset this manuscript.
          </p>
          {/* The press writes a reason an author can act on for the failures it
              can explain, and a neutral one for the failures it cannot. */}
          <p className="mt-0.5 text-red-800">{message}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-3">
        <button
          onClick={onReplace}
          className="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Upload a different file
        </button>
        {hasManuscript ? (
          <button
            onClick={onRetry}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}
