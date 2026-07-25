'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon, GlobeAltIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/contexts/PageTitleContext';
import { BlogService } from '@/services/blogService';
import type { BlogPost, Publication } from '@wolly/schema';

export default function BlogPage() {
  const { user, loading: authLoading } = useAuth();
  const { setPageTitle } = usePageTitle();
  const router = useRouter();

  const [publication, setPublication] = useState<Publication | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  /**
   * Set when the posts query itself failed.
   *
   * Kept separate from an empty list because showing "No posts yet" after a
   * failed read tells the author their work is gone when it is not. That is
   * exactly what happened when the publicationId+updatedAt index was missing:
   * the publication rendered, the post list threw, and the page claimed there
   * were no posts.
   */
  const [postsError, setPostsError] = useState<string | null>(null);

  useEffect(() => setPageTitle('Blog'), [setPageTitle]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setPostsError(null);
    try {
      const pub = await BlogService.getMyPublication(user.uid);
      setPublication(pub);

      if (pub) {
        // Load posts separately: a failure here must not be reported as
        // "no publication", and must not masquerade as an empty list.
        try {
          setPosts(await BlogService.listPosts(pub.id));
        } catch (error) {
          console.error('Failed to load posts', error);
          setPosts([]);
          setPostsError(
            error instanceof Error ? error.message : 'Could not load your posts.',
          );
          toast.error('Could not load your posts. Your drafts are safe.');
        }
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Failed to load blog', error);
      toast.error('Could not load your blog.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  const createDraft = async () => {
    if (!user || !publication) return;
    try {
      const postId = await BlogService.createDraft(
        { id: publication.id, slug: publication.slug },
        { userId: user.uid, name: user.displayName || 'Author', avatarUrl: user.photoURL ?? null },
      );
      router.push(`/blog/edit?post=${postId}`);
    } catch (error) {
      console.error('Failed to create draft', error);
      toast.error('Could not create the draft.');
    }
  };

  if (authLoading || loading) {
    return <div className="p-8 text-gray-500">Loading…</div>;
  }

  if (!publication) {
    return <NoPublicationYet onCreated={load} />;
  }

  return (
    <div className="p-6 max-w-4xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{publication.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            wolly.app/@{publication.slug} · {publication.subscriberCount} subscribers
          </p>
        </div>
        <button
          onClick={createDraft}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4" />
          New post
        </button>
      </header>

      <section className="mt-8">
        {postsError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-8 text-center">
            <p className="font-medium text-red-800">Could not load your posts.</p>
            <p className="mt-1 text-sm text-red-700">
              Nothing has been lost; this is a read failure, not missing data.
            </p>
            <button
              onClick={load}
              className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100"
            >
              Try again
            </button>
          </div>
        ) : posts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 py-16 text-center text-gray-500">
            No posts yet. Write your first one.
          </p>
        ) : (
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
            {posts.map((post) => (
              <li key={post.id}>
                <button
                  onClick={() => router.push(`/blog/edit?post=${post.id}`)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block truncate font-medium">{post.title}</span>
                    <span className="mt-0.5 block truncate text-sm text-gray-500">
                      {post.excerpt || 'No excerpt yet'}
                    </span>
                  </span>

                  {post.hasPaywall ? (
                    <LockClosedIcon className="h-4 w-4 shrink-0 text-amber-600" title="Has a paywall" />
                  ) : null}

                  <StatusBadge status={post.status} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: BlogPost['status'] }) {
  const styles: Record<string, string> = {
    published: 'bg-green-100 text-green-800',
    draft: 'bg-gray-100 text-gray-700',
    scheduled: 'bg-blue-100 text-blue-800',
    unlisted: 'bg-purple-100 text-purple-800',
    archived: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.draft}`}>
      {status}
    </span>
  );
}

/** First-run: a creator has no publication yet. */
function NoPublicationYet({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await BlogService.createPublication(user.uid, { name, handle });
      toast.success('Publication created.');
      onCreated();
    } catch (error) {
      // The handle race and the too-short case both surface as thrown errors
      // from the transaction; show the real message rather than a generic one.
      toast.error(error instanceof Error ? error.message : 'Could not create the publication.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-lg">
      <GlobeAltIcon className="h-10 w-10 text-indigo-600" />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Start your blog</h1>
      <p className="mt-2 text-gray-600">
        Publish posts to the web and to readers in the Wolly app. Your handle is
        permanent, so pick one you will still like later.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Publication name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            placeholder="The Test Kitchen"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Handle</span>
          <div className="mt-1 flex items-center rounded-lg border border-gray-300 px-3 py-2">
            <span className="text-gray-500">wolly.app/@</span>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              required
              minLength={3}
              maxLength={40}
              pattern="[A-Za-z0-9\-]+"
              placeholder="test-kitchen"
              className="flex-1 bg-transparent outline-none"
            />
          </div>
        </label>

        <button
          type="submit"
          disabled={saving || !name || handle.length < 3}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create publication'}
        </button>
      </form>
    </div>
  );
}
