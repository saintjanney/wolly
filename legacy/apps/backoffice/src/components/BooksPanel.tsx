'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { BackofficeService } from '@/services/backofficeService';
import type { EpubBook, BookStatus } from '@wolly/schema';

const STATUSES: BookStatus[] = [
  'draft',
  'review',
  'approved',
  'published',
  'suspended',
  'archived',
];

const STATUS_STYLES: Record<BookStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  review: 'bg-amber-100 text-amber-800',
  approved: 'bg-sky-100 text-sky-800',
  published: 'bg-emerald-100 text-emerald-800',
  suspended: 'bg-rose-100 text-rose-800',
  archived: 'bg-slate-200 text-slate-600',
};

export function BooksPanel() {
  const [books, setBooks] = useState<EpubBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBooks(await BackofficeService.listBooks());
    } catch {
      toast.error('Failed to load books');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (book: EpubBook, status: BookStatus) => {
    setSavingId(book.id);
    try {
      await BackofficeService.setBookStatus(book.id, status);
      setBooks((prev) =>
        prev.map((b) =>
          b.id === book.id ? { ...b, status, isPublished: status === 'published' } : b,
        ),
      );
      toast.success(`"${book.title}" → ${status}`);
    } catch {
      toast.error('Update failed');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <p className="text-sm text-slate-500">Loading books…</p>;
  if (books.length === 0) return <p className="text-sm text-slate-500">No books yet.</p>;

  return (
    <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-200">
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Author</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Set status</th>
          </tr>
        </thead>
        <tbody>
          {books.map((book) => (
            <tr key={book.id} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-3 font-medium text-slate-900">{book.title}</td>
              <td className="px-4 py-3 text-slate-600">{book.author}</td>
              <td className="px-4 py-3 text-slate-600">{book.fileType}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[book.status] ?? ''}`}
                >
                  {book.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <select
                  value={book.status}
                  disabled={savingId === book.id}
                  onChange={(e) => changeStatus(book, e.target.value as BookStatus)}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
