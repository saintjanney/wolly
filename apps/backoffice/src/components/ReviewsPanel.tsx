'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { BackofficeService } from '@/services/backofficeService';
import type { Review, ReviewStatus } from '@wolly/schema';

const FILTERS: (ReviewStatus | 'all')[] = ['pending', 'approved', 'rejected', 'flagged', 'all'];

export function ReviewsPanel() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<ReviewStatus | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReviews(await BackofficeService.listReviews(filter));
    } catch {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const moderate = async (
    review: Review,
    decision: 'approved' | 'rejected' | 'flagged',
  ) => {
    setBusyId(review.id);
    try {
      await BackofficeService.moderateReview(review.id, review.bookId, decision);
      setReviews((prev) => prev.filter((r) => r.id !== review.id || filter === 'all'));
      toast.success(`Review ${decision}`);
    } catch {
      toast.error('Moderation failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
              filter === f ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-slate-500">No {filter === 'all' ? '' : filter} reviews.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium text-slate-900">
                  {review.title || 'Untitled review'}{' '}
                  <span className="text-amber-500">{'★'.repeat(Math.round(review.rating))}</span>
                </div>
                <span className="text-xs text-slate-400 capitalize">{review.status}</span>
              </div>
              <p className="text-sm text-slate-600 mt-1">{review.content}</p>
              <div className="text-xs text-slate-400 mt-2">
                by {review.userName} · book {review.bookId}
              </div>
              {review.status === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <button
                    disabled={busyId === review.id}
                    onClick={() => moderate(review, 'approved')}
                    className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    disabled={busyId === review.id}
                    onClick={() => moderate(review, 'rejected')}
                    className="rounded-lg bg-rose-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-rose-700 disabled:opacity-60"
                  >
                    Reject
                  </button>
                  <button
                    disabled={busyId === review.id}
                    onClick={() => moderate(review, 'flagged')}
                    className="rounded-lg bg-amber-500 text-white px-3 py-1.5 text-xs font-medium hover:bg-amber-600 disabled:opacity-60"
                  >
                    Flag
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
