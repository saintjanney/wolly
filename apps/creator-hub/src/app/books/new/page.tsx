'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/contexts/PageTitleContext';
import { TitleService, TitleError } from '@/services/titleService';
import type { EpubBook } from '@wolly/schema';

/**
 * Starting a Title, at `/books/new/`.
 *
 * THREE FIELDS, THEN A REAL DOCUMENT. The old wizard collected four screens of
 * metadata, a manuscript and a cover before it wrote anything, holding the lot
 * in a browser store that could not keep files at all. An author who closed the
 * tab lost the work. Uploading and publishing are now days apart by design, so
 * the document has to exist from the first screen; everything after this is a
 * patch on something that is already saved.
 */
export default function NewTitlePage() {
  const { user, loading: authLoading } = useAuth();
  const { setPageTitle } = usePageTitle();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [language, setLanguage] = useState('en');
  const [bookType, setBookType] = useState<NonNullable<EpubBook['type']>>('ebook');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPageTitle('Add a title', 'Start with the name on the cover');
  }, [setPageTitle]);

  // Prefill the author's own name: it is right far more often than not, and
  // they can change it. A pen name is a decision, not a default.
  useEffect(() => {
    if (user?.displayName && !authorName) setAuthorName(user.displayName);
  }, [user, authorName]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || saving) return;

    setSaving(true);
    try {
      const bookId = await TitleService.create(user.uid, { title, authorName, language, bookType });
      // Straight into the workspace. Nothing is lost from here on.
      router.push(`/books/title/?book=${encodeURIComponent(bookId)}`);
    } catch (error) {
      toast.error(error instanceof TitleError ? error.message : 'Could not start this title.');
      setSaving(false);
    }
  };

  if (authLoading) {
    return <div className="p-8 text-gray-500">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Add a title</h1>
      <p className="mt-2 text-sm text-gray-600">
        This creates your book straight away, so nothing you do next can be lost. You choose
        later whether to sell it on Wolly.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-6">
        <Field label="Title" hint="What is on the cover.">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Nkrumah&rsquo;s Daughters"
          />
        </Field>

        <Field label="Author name" hint="The name readers will see. A pen name is fine.">
          <input
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Language">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="en">English</option>
              <option value="tw">Twi</option>
              <option value="ee">Ewe</option>
              <option value="gaa">Ga</option>
              <option value="dag">Dagbani</option>
              <option value="ha">Hausa</option>
              <option value="fr">French</option>
            </select>
          </Field>

          <Field label="Format">
            <select
              value={bookType}
              onChange={(e) => setBookType(e.target.value as NonNullable<EpubBook['type']>)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ebook">Ebook</option>
              <option value="paperback">Paperback</option>
              <option value="hardcover">Hardcover</option>
            </select>
          </Field>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || !title.trim() || !authorName.trim()}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {saving ? 'Creating…' : 'Create title'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/books/')}
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-900">{label}</span>
      {hint ? <span className="mt-0.5 block text-xs text-gray-500">{hint}</span> : null}
      <div className="mt-2">{children}</div>
    </label>
  );
}
