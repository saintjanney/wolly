'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/contexts/PageTitleContext';
import { RightsService, RightsError } from '@/services/rightsService';
import { TitleService } from '@/services/titleService';
import {
  RIGHTS_DECLARATION_V1,
  deriveRightsBadge,
  type EpubBook,
  type RightsGrant,
  type RightsFormat,
  type RightsHolderKind,
} from '@wolly/schema';

/**
 * Rights, at `/books/rights/?book=<id>`.
 *
 * WHAT THIS SCREEN MAY NOT DO, and each is enforced by rules as well:
 *
 *  - It never says Wolly registered, certified, protected or secured anything,
 *    or that a record proves ownership. RIGHTS.md carries the full list and the
 *    permitted alternatives: recorded, your record, checked, you told us.
 *  - It never offers to take a book down. That is `epubs.rightsStatus`, a
 *    separate takedown gate, and the registry must be able neither to disable a
 *    book nor to enable one.
 *  - It never marks a claim verified. That is Wolly's, and it means a person
 *    has read the evidence.
 *
 * The declaration is signed IN THE SAME WRITE as the grant, because adding it
 * later is refused by rules, so there is no save-and-sign-later path.
 */
export default function RightsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-500">Loading…</div>}>
      <Rights />
    </Suspense>
  );
}

const FORMATS: Array<{ value: RightsFormat; label: string }> = [
  { value: 'ebook', label: 'Ebook' },
  { value: 'print', label: 'Print' },
  { value: 'audio', label: 'Audio' },
  { value: 'translation', label: 'Translation' },
  { value: 'adaptation', label: 'Film or adaptation' },
  { value: 'educational', label: 'Educational' },
  { value: 'serialization', label: 'Serialisation' },
];

const HOLDERS: Array<{ value: RightsHolderKind; label: string }> = [
  { value: 'self', label: 'I hold them' },
  { value: 'publisher', label: 'A publisher' },
  { value: 'agent', label: 'An agent' },
  { value: 'platform', label: 'Another platform' },
  { value: 'other', label: 'Someone else' },
];

const BADGE_LABEL: Record<string, string> = {
  archived: 'Archived',
  expired: 'Ended',
  expiring: 'Ending soon',
  needs_verification: 'Wolly has asked for the agreement',
  available: 'Not licensed to anyone',
  licensed: 'Licensed',
  restricted: 'Restricted',
};

function Rights() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get('book') ?? '';
  const { user, loading: authLoading } = useAuth();
  const { setPageTitle } = usePageTitle();
  const router = useRouter();

  const [book, setBook] = useState<EpubBook | null>(null);
  const [grants, setGrants] = useState<RightsGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    format: 'print' as RightsFormat,
    holderKind: 'publisher' as RightsHolderKind,
    holderName: '',
    territories: 'WORLD',
    endDate: '',
    summary: '',
  });
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    setPageTitle('Rights', 'Who may do what with this work');
  }, [setPageTitle]);

  const reload = useCallback(async () => {
    if (!bookId) return;
    const [b, g] = await Promise.all([TitleService.get(bookId), RightsService.list(bookId)]);
    setBook(b);
    setGrants(g);
    setLoading(false);
  }, [bookId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const claimEverything = async () => {
    if (!user || !book || saving) return;
    setSaving(true);
    try {
      await RightsService.claimEverything(
        bookId,
        user.uid,
        book.author || book.authorName || '',
        RIGHTS_DECLARATION_V1.text,
      );
      toast.success('Recorded.');
      await reload();
    } catch (error) {
      toast.error(error instanceof RightsError ? error.message : 'Could not record that.');
    } finally {
      setSaving(false);
    }
  };

  const addGrant = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || saving || !signed) return;
    setSaving(true);
    try {
      await RightsService.create(
        bookId,
        user.uid,
        {
          format: form.format,
          territories: form.territories.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean),
          languages: ['ALL'],
          channels: ['other'],
          exclusivity: 'unknown',
          holderKind: form.holderKind,
          holderName: form.holderName.trim(),
          startDate: null,
          endDate: form.endDate || null,
          disposition: form.holderKind === 'self' ? 'available' : 'licensed',
          terms: form.summary ? { summary: form.summary } : undefined,
        },
        RIGHTS_DECLARATION_V1.text,
      );
      toast.success('Recorded.');
      setAdding(false);
      setSigned(false);
      setForm({ ...form, holderName: '', endDate: '', summary: '' });
      await reload();
    } catch (error) {
      toast.error(error instanceof RightsError ? error.message : 'Could not record that.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) return <div className="p-8 text-gray-500">Loading…</div>;
  if (!book) return <div className="p-8 text-gray-700">That title could not be found.</div>;

  const live = grants.filter((g) => !g.archivedAt);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Rights</h1>
        <p className="mt-2 text-sm text-gray-600">
          {book.title}. Wolly records what you tell it here. It does not check it, and this is
          not a copyright registration.
        </p>
      </header>

      {live.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900">Do you hold every right yourself?</h2>
          <p className="mt-2 text-sm text-gray-600">
            Most self-published authors do. One tap records that, worldwide and in every language,
            and you can add exceptions afterwards.
          </p>
          <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            {RIGHTS_DECLARATION_V1.text}
          </p>
          <button
            onClick={claimEverything}
            disabled={saving}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-300"
          >
            {saving ? 'Recording…' : 'I agree, record this'}
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {live.map((grant) => {
            const badge = deriveRightsBadge(grant);
            return (
              <li key={grant.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      {FORMATS.find((f) => f.value === grant.format)?.label ?? grant.format}
                      {' rights'}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {grant.holderKind === 'self' ? 'You hold these' : `Held by ${grant.holderName}`}
                      {grant.territories?.length ? ` in ${grant.territories.join(', ')}` : ''}
                      {grant.endDate ? `, until ${grant.endDate}` : ''}
                    </p>
                    {grant.terms?.summary ? (
                      <p className="mt-1 text-sm text-gray-500">{grant.terms.summary}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                    {BADGE_LABEL[badge] ?? badge}
                  </span>
                </div>
                {badge === 'needs_verification' ? (
                  <p className="mt-3 text-sm text-gray-600">
                    You told us someone else holds these. Attaching the agreement means Wolly stops
                    asking. Wolly does not check what it says.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          className="mt-5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Record another arrangement
        </button>
      ) : (
        <form onSubmit={addGrant} className="mt-5 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-base font-semibold text-gray-900">Record an arrangement</h2>
          <p className="mt-1 text-sm text-gray-600">
            For example: a publisher holds print rights in Nigeria until 2027.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-900">Which rights</span>
              <select
                value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value as RightsFormat })}
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                {FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-900">Who holds them</span>
              <select
                value={form.holderKind}
                onChange={(e) => setForm({ ...form, holderKind: e.target.value as RightsHolderKind })}
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                {HOLDERS.map((h) => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
            </label>

            {form.holderKind !== 'self' ? (
              <label className="block">
                <span className="text-sm font-medium text-gray-900">Their name</span>
                <input
                  value={form.holderName}
                  onChange={(e) => setForm({ ...form, holderName: e.target.value })}
                  required
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
            ) : null}

            <label className="block">
              <span className="text-sm font-medium text-gray-900">Where</span>
              <span className="mt-0.5 block text-xs text-gray-500">
                Country codes, or WORLD.
              </span>
              <input
                value={form.territories}
                onChange={(e) => setForm({ ...form, territories: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="NG, GH"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-900">Until</span>
              <span className="mt-0.5 block text-xs text-gray-500">
                Leave blank if there is no end date.
              </span>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="text-sm font-medium text-gray-900">Anything worth noting</span>
            <input
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Signed 2024, renews yearly"
            />
          </label>

          {/* The exact words are rendered here and stored verbatim. A paraphrase
              would make the stored record a record of consent to something the
              author never read. */}
          <label className="mt-5 flex items-start gap-3 rounded-lg bg-gray-50 p-3">
            <input
              type="checkbox"
              checked={signed}
              onChange={(e) => setSigned(e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span className="text-sm text-gray-700">{RIGHTS_DECLARATION_V1.text}</span>
          </label>

          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={!signed || saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-300"
            >
              {saving ? 'Recording…' : 'Record this'}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setSigned(false); }}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <button
        onClick={() => router.push(`/books/title/?book=${encodeURIComponent(bookId)}`)}
        className="mt-8 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        Back to the title
      </button>
    </div>
  );
}
