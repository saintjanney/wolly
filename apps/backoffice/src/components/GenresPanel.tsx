'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { BackofficeService } from '@/services/backofficeService';
import type { Genre } from '@wolly/schema';

export function GenresPanel() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setGenres(await BackofficeService.listGenres());
    } catch {
      toast.error('Failed to load genres');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await BackofficeService.addGenre(name);
      setName('');
      toast.success('Genre added');
      await load();
    } catch {
      toast.error('Could not add genre');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <form onSubmit={add} className="flex gap-2 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New genre name"
          className="flex-1 max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
        >
          Add
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-slate-500">Loading genres…</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {genres.map((genre) => (
            <div key={genre.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-medium text-slate-900">{genre.name}</div>
                {genre.description && (
                  <div className="text-xs text-slate-500">{genre.description}</div>
                )}
              </div>
              <div className="text-xs text-slate-400">{genre.bookCount ?? 0} books</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
