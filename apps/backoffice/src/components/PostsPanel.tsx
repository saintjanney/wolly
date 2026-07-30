'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { BlogModeration } from '@/services/backofficeService';
import type { BlogPost } from '@wolly/schema';

/**
 * Blog post moderation.
 *
 * Removing a post does not delete it. `moderationStatus: 'removed'` clears
 * `isPubliclyReadable`, which is the single field security rules check, so the
 * post disappears from every reader and feed at once while the author's work
 * still exists and the decision stays reversible.
 */
export function PostsPanel() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'flagged' | 'all'>('flagged');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPosts(await BlogModeration.listPosts(filter));
    } catch (error) {
      console.error(error);
      toast.error('Could not load posts.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const moderate = async (
    postId: string,
    status: 'ok' | 'flagged' | 'removed',
  ) => {
    setBusy(postId);
    try {
      await BlogModeration.moderatePost(postId, status);
      toast.success(
        status === 'removed'
          ? 'Post removed from public view. Nothing was deleted.'
          : status === 'flagged'
            ? 'Post flagged for review.'
            : 'Post restored.',
      );
      await load();
    } catch (error) {
      console.error(error);
      toast.error('Could not update that post.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        {(['flagged', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              filter === f
                ? 'bg-gray-900 text-white'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {f === 'flagged' ? 'Needs review' : 'All posts'}
          </button>
        ))}
        <button
          onClick={() => void load()}
          className="ml-auto rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="py-12 text-center text-gray-500">Loading…</p>
      ) : posts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-gray-500">
          {filter === 'flagged' ? 'Nothing needs review.' : 'No posts yet.'}
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {posts.map((post) => (
            <li key={post.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{post.title}</p>
                  <p className="mt-0.5 truncate text-sm text-gray-500">
                    @{post.publicationSlug} · {post.authorName} · {post.status}
                    {post.reportCount > 0 ? ` · ${post.reportCount} reports` : ''}
                  </p>
                  {post.excerpt ? (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                      {post.excerpt}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      post.moderationStatus === 'removed'
                        ? 'bg-red-100 text-red-800'
                        : post.moderationStatus === 'flagged'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {post.moderationStatus}
                  </span>

                  {post.moderationStatus !== 'removed' ? (
                    <button
                      disabled={busy === post.id}
                      onClick={() => void moderate(post.id, 'removed')}
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      disabled={busy === post.id}
                      onClick={() => void moderate(post.id, 'ok')}
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
      )}
    </div>
  );
}
