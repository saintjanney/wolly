'use client';

import { useEffect, useState } from 'react';
import { BackofficeService, type PlatformOverview } from '@/services/backofficeService';

const CARDS: { key: keyof PlatformOverview; label: string }[] = [
  { key: 'totalBooks', label: 'Total books' },
  { key: 'publishedBooks', label: 'Published' },
  { key: 'pendingReviews', label: 'Reviews pending' },
  { key: 'totalGenres', label: 'Genres' },
];

export function OverviewPanel() {
  const [data, setData] = useState<PlatformOverview | null>(null);

  useEffect(() => {
    BackofficeService.getOverview().then(setData).catch(() => setData(null));
  }, []);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map((card) => (
        <div key={card.key} className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-sm text-slate-500">{card.label}</div>
          <div className="text-3xl font-semibold text-slate-900 mt-2">
            {data ? data[card.key] : '—'}
          </div>
        </div>
      ))}
    </div>
  );
}
