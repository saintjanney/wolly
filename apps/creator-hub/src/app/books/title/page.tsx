'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowRightIcon, DocumentTextIcon, PhotoIcon } from '@heroicons/react/24/outline';

import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/contexts/PageTitleContext';
import { TitleService, TitleError, COVER_ACCEPT } from '@/services/titleService';
import { ManuscriptService, ACCEPT_ATTRIBUTE, describeRejection } from '@/services/manuscriptService';
import { EditionPreview } from '@/components/book/EditionPreview';
import { computeReport, type EpubBook, type PublishingReport } from '@wolly/schema';

/** Matches the composer's network debounce. See the comment on autosave below. */
const AUTOSAVE_DELAY_MS = 5_000;

/**
 * The Title workspace, at `/books/title/?book=<id>`.
 *
 * A query parameter rather than a `/books/[bookId]/title` segment because the
 * creator-hub builds with `output: 'export'`, and a dynamic segment there needs
 * `generateStaticParams()` to enumerate ids at build time. Book ids are created
 * at runtime, so a query parameter keeps the route static while the id stays
 * dynamic. Same reasoning as the blog composer.
 *
 * SECTIONS, NOT STEPS. There is no Next button and no validation gate: an
 * author can upload a manuscript before writing a description, or the reverse,
 * and leave for a week in between. The old wizard forced an order and lost
 * everything if you stopped, which is exactly what separating upload from
 * publishing was meant to end.
 */
export default function TitlePage() {
  return (
    // useSearchParams needs a Suspense boundary under static export.
    <Suspense fallback={<div className="p-8 text-gray-500">Loading…</div>}>
      <Workspace />
    </Suspense>
  );
}

function Workspace() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get('book') ?? '';
  const { user, loading: authLoading } = useAuth();
  const { setPageTitle } = usePageTitle();
  const router = useRouter();

  const [book, setBook] = useState<EpubBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<PublishingReport | null>(null);
  const [busy, setBusy] = useState<'manuscript' | 'cover' | null>(null);
  const [denied, setDenied] = useState(false);

  // Local edits, so typing is never blocked on the network.
  const [draft, setDraft] = useState<{ description: string; genre: string }>({
    description: '',
    genre: '',
  });
  const dirty = useRef(false);

  useEffect(() => {
    setPageTitle(book?.title || 'Title', 'Your book, before you decide to sell it');
  }, [setPageTitle, book?.title]);

  // Live: the press writes to this document while the author watches.
  //
  // Not started until auth has resolved. A listener opened while signed out is
  // denied by rules, and an unhandled denial leaves the screen loading for ever
  // rather than saying what is wrong.
  useEffect(() => {
    if (!bookId || authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    const stop = TitleService.watch(
      bookId,
      (next) => {
        setBook(next);
        setLoading(false);
        if (next && !dirty.current) {
          setDraft({ description: next.description ?? '', genre: next.genre ?? '' });
        }
      },
      () => {
        setDenied(true);
        setLoading(false);
      },
    );
    return stop;
  }, [bookId, authLoading, user]);

  // The report runs in the browser: the engine is pure, so there is no reason
  // to wait for a server round trip to tell an author what they can already
  // see. It is a guide; the publish gate is enforced again server-side.
  useEffect(() => {
    if (!book) return setReport(null);
    setReport(
      computeReport(
        {
          book: {
            id: book.id,
            title: book.title,
            author: book.author,
            description: draft.description || book.description,
            genre: draft.genre || book.genre,
            language: book.language,
            coverUrl: book.coverUrl,
            price: book.price,
            isFree: book.isFree,
            isPublished: book.isPublished,
            hasContract: Boolean(book.activeContractId),
            conversionStatus: book.conversionStatus,
            conversion: book.conversion,
            coverMetrics: book.coverMetrics,
            previewChapters: book.previewChapters,
          },
          author: {},
          rights: [],
          review: {},
        },
        { scope: 'title' },
      ),
    );
  }, [book, draft.description, draft.genre]);

  // Autosave on a 5s trailing debounce, matching the composer. Deliberately not
  // per keystroke: every write to this document wakes the converter's trigger
  // on the same path, so a 300ms debounce would invoke a 2GiB function a
  // hundred times while somebody types a blurb.
  useEffect(() => {
    if (!bookId || !dirty.current) return;
    const id = setTimeout(async () => {
      try {
        await TitleService.patch(bookId, {
          description: draft.description,
          genre: draft.genre,
        });
        dirty.current = false;
      } catch {
        toast.error('Could not save. Your text is still here; check your connection.');
      }
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(id);
  }, [bookId, draft]);

  const edit = useCallback((changes: Partial<typeof draft>) => {
    dirty.current = true;
    setDraft((prev) => ({ ...prev, ...changes }));
  }, []);

  const onManuscript = async (file: File | undefined) => {
    if (!file || !user || !bookId) return;
    const rejection = describeRejection(file);
    if (rejection) return toast.error(rejection);
    setBusy('manuscript');
    try {
      await ManuscriptService.submit(bookId, user.uid, file);
      toast.success('Uploaded. Wolly is typesetting your book.');
    } catch (error) {
      toast.error((error as Error).message || 'Upload failed.');
    } finally {
      setBusy(null);
    }
  };

  const onCover = async (file: File | undefined) => {
    if (!file || !user || !bookId) return;
    setBusy('cover');
    try {
      await TitleService.uploadCover(bookId, user.uid, file);
      toast.success('Cover saved.');
    } catch (error) {
      toast.error(error instanceof TitleError ? error.message : 'Could not save that cover.');
    } finally {
      setBusy(null);
    }
  };

  if (authLoading || loading) return <div className="p-8 text-gray-500">Loading…</div>;
  if (!user) {
    return (
      <div className="p-8">
        <p className="text-gray-700">Sign in to open this title.</p>
      </div>
    );
  }
  if (denied) {
    return (
      <div className="p-8">
        <p className="text-gray-700">This title belongs to another account.</p>
        <button onClick={() => router.push('/books/')} className="mt-3 text-indigo-600">
          Back to your books
        </button>
      </div>
    );
  }
  if (!bookId || !book) {
    return (
      <div className="p-8">
        <p className="text-gray-700">That title could not be found.</p>
        <button onClick={() => router.push('/books/')} className="mt-3 text-indigo-600">
          Back to your books
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">{book.title}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {book.activeContractId
            ? 'This title is with Wolly.'
            : 'A title in your library. Nothing here is for sale until you decide.'}
        </p>
        {report?.score !== null && report?.score !== undefined ? (
          <p className="mt-3 text-sm text-gray-700">
            <span className="font-semibold text-gray-900">{report.score}%</span> of the work on this
            title is done.
            {report.nextSteps.length > 0 ? ' Next: ' : ' Nothing outstanding.'}
            {report.nextSteps
              .map((id) => report.checks.find((c) => c.id === id)?.headline)
              .filter(Boolean)
              .join('; ')}
          </p>
        ) : null}
      </header>

      <Section title="Your manuscript" icon={DocumentTextIcon}>
        <p className="text-sm text-gray-600">
          Word, Markdown or plain text. Wolly typesets it into a book readers can open on any
          device.
        </p>
        <label className="mt-3 inline-block">
          <input
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            className="hidden"
            onChange={(e) => onManuscript(e.target.files?.[0])}
          />
          <span className="inline-block cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            {busy === 'manuscript'
              ? 'Uploading…'
              : book.conversionStatus
                ? 'Replace manuscript'
                : 'Choose a file'}
          </span>
        </label>
      </Section>

      <Section title="Cover" icon={PhotoIcon}>
        <div className="flex items-start gap-4">
          {book.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.coverUrl}
              alt=""
              className="h-32 w-auto rounded-lg border border-gray-200 object-cover"
            />
          ) : (
            <div className="flex h-32 w-24 items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-400">
              No cover
            </div>
          )}
          <div>
            <p className="text-sm text-gray-600">
              Readers browsing on a phone see this at about the size of a stamp.
            </p>
            <label className="mt-3 inline-block">
              <input
                type="file"
                accept={COVER_ACCEPT}
                className="hidden"
                onChange={(e) => onCover(e.target.files?.[0])}
              />
              <span className="inline-block cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                {busy === 'cover' ? 'Uploading…' : book.coverUrl ? 'Replace cover' : 'Add a cover'}
              </span>
            </label>
          </div>
        </div>
      </Section>

      <Section title="How your book looks">
        <EditionPreview
          bookId={bookId}
          conversionStatus={book.conversionStatus}
          conversionError={book.conversionError}
          pageCount={book.pageCount}
        />
      </Section>

      <Section title="About the book">
        <label className="block">
          <span className="text-sm font-medium text-gray-900">Description</span>
          <span className="mt-0.5 block text-xs text-gray-500">
            What a reader sees before deciding. Saved automatically.
          </span>
          <textarea
            value={draft.description}
            onChange={(e) => edit({ description: e.target.value })}
            rows={5}
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </label>
        <label className="mt-4 block">
          <span className="text-sm font-medium text-gray-900">Genre</span>
          <input
            value={draft.genre}
            onChange={(e) => edit({ genre: e.target.value })}
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </label>
      </Section>

      <div className="mt-10 flex flex-col gap-3 border-t border-gray-200 pt-8 sm:flex-row">
        <button
          onClick={() => router.push(`/books/rights/?book=${encodeURIComponent(bookId)}`)}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          Manage rights
          <span className="mt-0.5 block text-xs font-normal text-gray-500">
            Who may do what with this work
          </span>
        </button>
        <button
          onClick={() => router.push(`/books/publish/?book=${encodeURIComponent(bookId)}`)}
          className="flex-1 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {book.activeContractId ? 'Publishing agreement' : 'Publish on Wolly'}
          <ArrowRightIcon className="ml-1.5 inline h-4 w-4" />
          <span className="mt-0.5 block text-xs font-normal text-indigo-100">
            {book.activeContractId ? 'See what you agreed' : 'Set a price and sign the agreement'}
          </span>
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
        {Icon ? <Icon className="h-5 w-5 text-gray-400" /> : null}
        {title}
      </h2>
      {children}
    </section>
  );
}
