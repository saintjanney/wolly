'use client';

import { useState } from 'react';
import { signOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { OverviewPanel } from './OverviewPanel';
import { BooksPanel } from './BooksPanel';
import { ReviewsPanel } from './ReviewsPanel';
import { GenresPanel } from './GenresPanel';

type Tab = 'overview' | 'books' | 'reviews' | 'genres';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'books', label: 'Books' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'genres', label: 'Genres' },
];

export function Console({ user }: { user: User }) {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Wolly Backoffice</h1>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Sign out
          </button>
        </div>
        <nav className="max-w-6xl mx-auto px-6 flex gap-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`py-3 text-sm font-medium border-b-2 -mb-px ${
                tab === t.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {tab === 'overview' && <OverviewPanel />}
        {tab === 'books' && <BooksPanel />}
        {tab === 'reviews' && <ReviewsPanel />}
        {tab === 'genres' && <GenresPanel />}
      </main>
    </div>
  );
}
