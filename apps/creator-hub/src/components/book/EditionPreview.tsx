'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowTopRightOnSquareIcon, BookOpenIcon } from '@heroicons/react/24/outline';

import { ManuscriptService } from '@/services/manuscriptService';
import type { ConversionStatus } from '@wolly/schema';

/**
 * What the author's book actually looks like.
 *
 * IT IS THE REAL FILE. The press prints these pages from the same Chromium
 * session, and the same computed layout, as the finished PDF, so the line
 * breaks, page breaks and footers here are the ones the reader will get. An
 * approximation would be worse than showing nothing: it would make a promise
 * about the artefact that the artefact does not keep.
 *
 * RENDERED BY THE BROWSER, NOT BY A LIBRARY. pdfjs-dist is around 300KB
 * gzipped plus a worker, and this platform's authors are on Ghanaian mobile
 * data opening this screen once or twice per book. Every browser can already
 * display a PDF, so the bytes go into an <object> and the fallback is an
 * honest "open it in a new tab" rather than a spinner that never resolves.
 * If inline rendering turns out to be poor on the phones authors actually use,
 * pdf.js is the upgrade, and it is a change to this file alone.
 */

interface Props {
  bookId: string;
  conversionStatus?: ConversionStatus;
  conversionError?: string;
  /** Pages in the finished edition, so the preview can say what it is showing. */
  pageCount?: number;
}

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; url: string; pageCount: number | null }
  | { kind: 'unavailable'; message: string };

export function EditionPreview({ bookId, conversionStatus, conversionError, pageCount }: Props) {
  const [state, setState] = useState<State>({ kind: 'idle' });
  // Held in a ref so the revoke on unmount cannot miss a URL created after the
  // last render, which would leak the whole PDF in memory for the session.
  const urlRef = useRef<string | null>(null);

  const revoke = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const load = useCallback(async () => {
    revoke();
    setState({ kind: 'loading' });
    try {
      const { url, pageCount: pages } = await ManuscriptService.previewBlobUrl(bookId);
      urlRef.current = url;
      setState({ kind: 'ready', url, pageCount: pages });
    } catch (error) {
      setState({
        kind: 'unavailable',
        message: (error as Error).message || 'Wolly could not load your preview.',
      });
    }
  }, [bookId, revoke]);

  // Load when the press finishes, and reload when it presses again: a new
  // pressing means a new preview, and showing the old one would be showing the
  // author a book they have already changed.
  const fingerprint = `${bookId}:${conversionStatus}`;
  useEffect(() => {
    if (conversionStatus === 'ready') load();
    return revoke;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint]);

  if (conversionStatus === 'failed') {
    return (
      <Frame>
        <p className="text-sm text-red-700">
          {conversionError || 'Wolly could not typeset this manuscript.'}
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Upload the file again, or try saving it as .docx.
        </p>
      </Frame>
    );
  }

  if (!conversionStatus || conversionStatus === 'requested' || conversionStatus === 'processing') {
    return (
      <Frame>
        <div className="flex items-center gap-3 text-gray-600">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
          <span className="text-sm">
            {conversionStatus
              ? 'Wolly is typesetting your book. This takes about a minute.'
              : 'Upload your manuscript and Wolly will show you the finished book here.'}
          </span>
        </div>
      </Frame>
    );
  }

  if (state.kind === 'loading' || state.kind === 'idle') {
    return (
      <Frame>
        <div className="flex items-center gap-3 text-gray-600">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
          <span className="text-sm">Loading your preview…</span>
        </div>
      </Frame>
    );
  }

  if (state.kind === 'unavailable') {
    return (
      <Frame>
        <p className="text-sm text-gray-700">{state.message}</p>
        <button
          type="button"
          onClick={load}
          className="mt-3 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Try again
        </button>
      </Frame>
    );
  }

  const shown = Math.min(8, state.pageCount ?? pageCount ?? 8);
  const total = state.pageCount ?? pageCount ?? null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          <BookOpenIcon className="mr-1.5 inline h-4 w-4 align-text-bottom" />
          The first {shown} pages of your finished book
          {total ? `, of ${total}` : ''}. This is the real file, not a mock-up.
        </p>
        <a
          href={state.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          Open <ArrowTopRightOnSquareIcon className="h-4 w-4" />
        </a>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
        {/* 6x9in pages, so the box keeps that ratio and nothing is letterboxed. */}
        <object
          data={state.url}
          type="application/pdf"
          className="block h-[70vh] max-h-[820px] w-full"
          aria-label="Preview of your book"
        >
          {/* Shown only when the browser cannot display a PDF inline, which is
              most mobile browsers. Not an error: the file is fine, this
              browser just wants its own viewer. */}
          <div className="p-6 text-center">
            <p className="text-sm text-gray-700">
              Your browser cannot show the book on this page.
            </p>
            <a
              href={state.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Open the preview <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </a>
          </div>
        </object>
      </div>
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6">{children}</div>
  );
}
