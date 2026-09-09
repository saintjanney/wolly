'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/contexts/PageTitleContext';
import { PublishService, PublishError } from '@/services/publishService';
import { TitleService } from '@/services/titleService';
import {
  PUBLISHING_AGREEMENT_V1,
  describeTerms,
  splitSale,
  type EpubBook,
  type PublishingContract,
  type RevenueTerms,
} from '@wolly/schema';

/**
 * Publishing on Wolly, at `/books/publish/?book=<id>`.
 *
 * THE PRICING PAGE LIVES HERE AND NOWHERE ELSE. It used to be step three of
 * uploading a book, so every author was asked for a price before they had
 * decided to sell anything. Product's instruction was to decouple the two, and
 * this screen is the only place a price is ever asked for.
 *
 * IT IS AN AGREEMENT, NOT A SETTINGS FORM. The author is shown the terms, the
 * exact words, and what a sale actually pays them, and the signature is what
 * creates the contract. The server signs it: this screen cannot write the terms
 * and does not try.
 */
export default function PublishPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-500">Loading…</div>}>
      <Publish />
    </Suspense>
  );
}

function Publish() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get('book') ?? '';
  const { user, loading: authLoading } = useAuth();
  const { setPageTitle } = usePageTitle();
  const router = useRouter();

  const [book, setBook] = useState<EpubBook | null>(null);
  const [terms, setTerms] = useState<RevenueTerms | null>(null);
  const [contracts, setContracts] = useState<PublishingContract[]>([]);
  const [loading, setLoading] = useState(true);

  const [isFree, setIsFree] = useState(false);
  const [price, setPrice] = useState('');
  const [signed, setSigned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<Array<{ check: string; message: string }>>([]);

  useEffect(() => {
    setPageTitle('Publish on Wolly', 'Set a price and sign the agreement');
  }, [setPageTitle]);

  const load = useCallback(async () => {
    if (!bookId) return;
    const [b, t, history] = await Promise.all([
      TitleService.get(bookId),
      PublishService.currentTerms(bookId),
      PublishService.history(bookId),
    ]);
    setBook(b);
    setTerms(t);
    setContracts(history);
    if (b?.isFree) setIsFree(true);
    if (b?.price) setPrice(String(b.price));
    setLoading(false);
  }, [bookId]);

  useEffect(() => {
    load();
  }, [load]);

  const sign = async () => {
    if (!signed || saving || !bookId) return;
    setSaving(true);
    setProblems([]);
    try {
      await PublishService.sign({
        bookId,
        isFree,
        priceMinor: isFree ? 0 : Math.round(Number(price) * 100),
      });
      toast.success('Agreement signed. Wolly will review your edition.');
      await load();
    } catch (error) {
      if (error instanceof PublishError && error.problems.length > 0) {
        setProblems(error.problems);
        toast.error('A few things still need doing.');
      } else {
        toast.error((error as Error).message || 'Could not record the agreement.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) return <div className="p-8 text-gray-500">Loading…</div>;
  if (!book || !terms) return <div className="p-8 text-gray-700">That title could not be found.</div>;
  if (!user) return <div className="p-8 text-gray-700">Sign in to publish.</div>;

  const active = contracts.find((c) => c.state !== 'ended');

  if (active) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-xl border border-green-200 bg-green-50 p-6">
          <h1 className="flex items-center gap-2 text-lg font-semibold text-green-900">
            <CheckCircleIcon className="h-5 w-5" />
            {active.state === 'pending' ? 'Signed, with Wolly' : 'On sale'}
          </h1>
          <p className="mt-2 text-sm text-green-900">
            {active.isFree
              ? 'Free to readers. No money changes hands.'
              : `${active.currency} ${(active.priceMinor / 100).toFixed(2)}. You keep ${Math.round(active.authorShare * 1000) / 10}% of every sale${active.revenueBasis === 'net' ? ' after payment charges' : ''}.`}
          </p>
          {active.state === 'pending' ? (
            <p className="mt-3 text-sm text-green-800">
              Wolly is reading your edition before it goes on sale. Nothing more is needed from you.
            </p>
          ) : null}
        </div>

        <details className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <summary className="cursor-pointer text-sm font-medium text-gray-900">
            What you agreed, and when
          </summary>
          <p className="mt-3 whitespace-pre-line text-sm text-gray-700">
            {active.agreement?.agreementText}
          </p>
        </details>

        <button
          onClick={() => router.push(`/books/title/?book=${encodeURIComponent(bookId)}`)}
          className="mt-8 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          Back to the title
        </button>
      </div>
    );
  }

  const priceMinor = isFree ? 0 : Math.round(Number(price || 0) * 100);
  // The example uses a zero fee, so it never implies a Paystack charge Wolly
  // has not measured. On the gross basis it is exact either way.
  const example = priceMinor > 0
    ? splitSale({ grossMinor: priceMinor, providerFeeMinor: 0, terms })
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Publish on Wolly</h1>
        <p className="mt-2 text-sm text-gray-600">
          {book.title}. This is where you agree to let Wolly sell your book. Until you sign,
          nothing about it is for sale.
        </p>
      </header>

      {problems.length > 0 ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <ExclamationTriangleIcon className="h-5 w-5" />
            Before Wolly can sell this
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {problems.map((p) => (
              <li key={p.check}>{p.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Your price</h2>

        <label className="mt-4 flex items-center gap-3">
          <input
            type="checkbox"
            checked={isFree}
            onChange={(e) => setIsFree(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm text-gray-800">Give this book away free</span>
        </label>

        {!isFree ? (
          <label className="mt-4 block">
            <span className="text-sm font-medium text-gray-900">Price</span>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-gray-500">{book.currency || 'GHS'}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-40 rounded-lg border border-gray-300 px-3 py-2"
                placeholder="20.00"
              />
            </div>
          </label>
        ) : null}

        <div className="mt-5 rounded-lg bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-900">{describeTerms(terms)}</p>
          {example ? (
            <p className="mt-1.5 text-sm text-gray-600">
              On a {book.currency || 'GHS'} {(priceMinor / 100).toFixed(2)} sale, you receive{' '}
              <span className="font-medium text-gray-900">
                {book.currency || 'GHS'} {(example.authorEarningsMinor / 100).toFixed(2)}
              </span>
              .
            </p>
          ) : null}
          {isFree ? (
            <p className="mt-1.5 text-sm text-gray-600">No money changes hands on a free book.</p>
          ) : null}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">The agreement</h2>
        {/* Rendered verbatim, and the same string is sent back with the
            signature and stored on the contract. A summary here would make the
            stored record a record of consent to something nobody read. */}
        <p className="mt-3 whitespace-pre-line text-sm text-gray-700">
          {PUBLISHING_AGREEMENT_V1.text}
        </p>

        <label className="mt-5 flex items-start gap-3">
          <input
            type="checkbox"
            checked={signed}
            onChange={(e) => setSigned(e.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <span className="text-sm font-medium text-gray-900">
            I have read this and I agree.
          </span>
        </label>

        <button
          onClick={sign}
          disabled={!signed || saving || (!isFree && !(Number(price) > 0))}
          className="mt-5 w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {saving ? 'Recording…' : 'Sign and send to Wolly'}
        </button>
      </section>

      <button
        onClick={() => router.push(`/books/title/?book=${encodeURIComponent(bookId)}`)}
        className="mt-8 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        Back to the title
      </button>
    </div>
  );
}
