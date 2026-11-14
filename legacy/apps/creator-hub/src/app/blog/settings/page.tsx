'use client';

import { useCallback, useEffect, useState } from 'react';
import { CurrencyDollarIcon, PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/contexts/PageTitleContext';
import { BlogService } from '@/services/blogService';
import type { Publication, Tier } from '@wolly/schema';

/**
 * Prices are held in MINOR units (pesewas for GHS) everywhere below the UI, so
 * money never touches floating point. These convert only at the edge.
 */
const toMajor = (minor: number) => (minor / 100).toFixed(2);
const toMinor = (major: string) => Math.round(parseFloat(major || '0') * 100);

interface TierDraft {
  id?: string;
  name: string;
  description: string;
  monthly: string;
  annual: string;
  benefits: string;
}

const emptyDraft: TierDraft = {
  name: 'Paid',
  description: '',
  monthly: '20.00',
  annual: '',
  benefits: '',
};

export default function BlogSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { setPageTitle } = usePageTitle();

  const [publication, setPublication] = useState<Publication | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<TierDraft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setPageTitle('Blog settings'), [setPageTitle]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const pub = await BlogService.getMyPublication(user.uid);
      setPublication(pub);
      setTiers(pub ? await BlogService.listTiers(pub.id) : []);
    } catch (error) {
      console.error('Failed to load blog settings', error);
      toast.error('Could not load your settings.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  const togglePaid = async (enabled: boolean) => {
    if (!publication) return;
    try {
      await BlogService.updatePublication(publication.id, { paidEnabled: enabled });
      setPublication({ ...publication, paidEnabled: enabled });
      toast.success(enabled ? 'Paid subscriptions on.' : 'Paid subscriptions off.');
    } catch {
      toast.error('Could not update that.');
    }
  };

  const saveTier = async () => {
    if (!publication || !draft) return;

    const monthlyPrice = toMinor(draft.monthly);
    if (monthlyPrice <= 0) {
      toast.error('Set a monthly price above zero.');
      return;
    }
    const annualPrice = draft.annual ? toMinor(draft.annual) : undefined;
    if (annualPrice !== undefined && annualPrice <= 0) {
      toast.error('An annual price must be above zero, or left blank.');
      return;
    }

    setSaving(true);
    try {
      await BlogService.saveTier(publication.id, {
        id: draft.id,
        name: draft.name.trim() || 'Paid',
        description: draft.description.trim(),
        benefits: draft.benefits
          .split('\n')
          .map((b) => b.trim())
          .filter(Boolean),
        monthlyPrice,
        annualPrice,
        currency: publication.currency ?? 'GHS',
        isDefault: tiers.length === 0,
        isActive: true,
        sortOrder: draft.id ? (tiers.find((t) => t.id === draft.id)?.sortOrder ?? 0) : tiers.length,
      });
      toast.success('Tier saved.');
      setDraft(null);
      await load();
    } catch (error) {
      console.error('Could not save tier', error);
      toast.error('Could not save the tier.');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (tierId: string) => {
    if (!publication) return;
    try {
      await BlogService.deactivateTier(publication.id, tierId);
      toast.success('Tier retired. Existing subscribers keep their access.');
      await load();
    } catch {
      toast.error('Could not retire that tier.');
    }
  };

  if (authLoading || loading) return <div className="p-8 text-gray-500">Loading…</div>;
  if (!publication) {
    return (
      <div className="p-6 text-gray-600">
        Start a blog first, then you can set up paid subscriptions.
      </div>
    );
  }

  const currency = publication.currency ?? 'GHS';

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Paid subscriptions</h1>
      <p className="mt-1 text-sm text-gray-500">
        {publication.name} · prices in {currency}
      </p>

      <section className="mt-6 rounded-lg border border-gray-200 p-5">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={publication.paidEnabled ?? false}
            onChange={(e) => togglePaid(e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span>
            <span className="font-medium">Accept paid subscriptions</span>
            <span className="mt-0.5 block text-sm text-gray-500">
              Readers can subscribe to unlock posts you put behind the paywall.
              Nobody can subscribe until this is on and a tier has a price.
            </span>
          </span>
        </label>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Tiers</h2>
          {!draft ? (
            <button
              onClick={() => setDraft({ ...emptyDraft })}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <PlusIcon className="h-4 w-4" />
              Add tier
            </button>
          ) : null}
        </div>

        {tiers.length === 0 && !draft ? (
          <p className="mt-4 rounded-lg border border-dashed border-gray-300 py-12 text-center text-gray-500">
            No tiers yet. Add one to start charging.
          </p>
        ) : null}

        <ul className="mt-4 space-y-3">
          {tiers.map((tier) => (
            <li
              key={tier.id}
              className={`rounded-lg border p-4 ${
                tier.isActive ? 'border-gray-200' : 'border-gray-200 bg-gray-50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {tier.name}
                    {!tier.isActive ? (
                      <span className="ml-2 text-xs font-normal text-gray-500">retired</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-600">
                    {currency} {toMajor(tier.monthlyPrice)}/month
                    {tier.annualPrice ? ` · ${currency} ${toMajor(tier.annualPrice)}/year` : ''}
                  </p>
                  {!tier.annualPrice ? (
                    <p className="mt-1 text-xs text-amber-700">
                      No annual price. Readers paying by mobile money cannot hold a
                      renewing card subscription, so an annual option is the only way
                      they can subscribe.
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() =>
                      setDraft({
                        id: tier.id,
                        name: tier.name,
                        description: tier.description ?? '',
                        monthly: toMajor(tier.monthlyPrice),
                        annual: tier.annualPrice ? toMajor(tier.annualPrice) : '',
                        benefits: (tier.benefits ?? []).join('\n'),
                      })
                    }
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  {tier.isActive ? (
                    <button
                      onClick={() => deactivate(tier.id)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Retire
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>

        {draft ? (
          <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50/40 p-5">
            <h3 className="font-medium">{draft.id ? 'Edit tier' : 'New tier'}</h3>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-gray-700">Name</span>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  maxLength={40}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Monthly price ({currency})
                </span>
                <input
                  value={draft.monthly}
                  onChange={(e) => setDraft({ ...draft, monthly: e.target.value })}
                  inputMode="decimal"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Annual price ({currency}, optional)
                </span>
                <input
                  value={draft.annual}
                  onChange={(e) => setDraft({ ...draft, annual: e.target.value })}
                  inputMode="decimal"
                  placeholder="e.g. 200.00"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-gray-700">
                  What subscribers get (one per line)
                </span>
                <textarea
                  value={draft.benefits}
                  onChange={(e) => setDraft({ ...draft, benefits: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={saveTier}
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save tier'}
              </button>
              <button
                onClick={() => setDraft(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <p className="mt-8 flex items-start gap-2 text-sm text-gray-500">
        <CurrencyDollarIcon className="mt-0.5 h-4 w-4 shrink-0" />
        Payments are handled by Paystack. Monthly subscriptions renew
        automatically on a card; an annual price is charged once and does not
        renew, which is how mobile money readers can subscribe.
      </p>
    </div>
  );
}
