'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { BlogModeration } from '@/services/backofficeService';

interface ReportedComment {
  id: string;
  path: string;
  postId: string;
  userName: string;
  body: string;
  status: string;
  reportCount: number;
}

/**
 * Comment moderation across every post.
 *
 * Hiding sets `status: 'hidden'` rather than deleting, so a decision can be
 * reversed and the record survives a dispute. The comment count on the post
 * follows automatically: a Cloud Function counts only visible comments.
 */
export function CommentsPanel() {
  const [comments, setComments] = useState<ReportedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setComments(await BlogModeration.listReportedComments());
    } catch (error) {
      console.error(error);
      toast.error('Could not load comments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const moderate = async (path: string, status: 'visible' | 'hidden') => {
    setBusy(path);
    try {
      await BlogModeration.moderateComment(path, status);
      toast.success(status === 'hidden' ? 'Comment hidden.' : 'Comment restored.');
      await load();
    } catch (error) {
      console.error(error);
      toast.error('Could not update that comment.');
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <p className="py-12 text-center text-gray-500">Loading…</p>;

  if (comments.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-gray-500">
        No reported or hidden comments.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
      {comments.map((c) => (
        <li key={c.path} className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {c.userName}
                {c.reportCount > 0 ? (
                  <span className="ml-2 text-xs text-red-700">
                    {c.reportCount} reports
                  </span>
                ) : null}
              </p>
              {/* Comments are plain text and rendered as text, never HTML. */}
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{c.body}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  c.status === 'visible'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {c.status}
              </span>
              {c.status === 'visible' ? (
                <button
                  disabled={busy === c.path}
                  onClick={() => void moderate(c.path, 'hidden')}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Hide
                </button>
              ) : (
                <button
                  disabled={busy === c.path}
                  onClick={() => void moderate(c.path, 'visible')}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Restore
                </button>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
