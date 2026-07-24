'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/contexts/PageTitleContext';
import { PostEditor } from '@/components/blog/PostEditor';
import { BlogService, type ComposerDoc } from '@/services/blogService';
import type { BlogPost } from '@wolly/schema';

/**
 * The composer, at `/blog/edit?post=<id>`.
 *
 * A query parameter rather than a `/blog/[postId]/edit` segment because the
 * creator-hub builds with `output: 'export'`, and a dynamic segment there needs
 * `generateStaticParams()` to enumerate every id at build time. Post ids are
 * created at runtime, so that is impossible; a query parameter keeps the route
 * static while the id stays dynamic.
 */
export default function EditPostPage() {
  return (
    // useSearchParams needs a Suspense boundary under static export.
    <Suspense fallback={<div className="p-8 text-gray-500">Loading…</div>}>
      <Editor />
    </Suspense>
  );
}

function Editor() {
  const searchParams = useSearchParams();
  const postId = searchParams.get('post') ?? '';
  const { user, loading: authLoading } = useAuth();
  const { setPageTitle } = usePageTitle();
  const router = useRouter();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [initialDoc, setInitialDoc] = useState<ComposerDoc | null>(null);
  const [body, setBody] = useState<ComposerDoc | null>(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => setPageTitle('Edit post'), [setPageTitle]);

  useEffect(() => {
    if (authLoading || !user) return;
    if (!postId) {
      router.push('/blog');
      return;
    }
    void (async () => {
      try {
        const [loaded, doc] = await Promise.all([
          BlogService.getPost(postId),
          BlogService.getDraftDoc(postId),
        ]);
        if (!loaded) {
          toast.error('Post not found.');
          router.push('/blog');
          return;
        }
        setPost(loaded);
        setTitle(loaded.title);
        setSubtitle(loaded.subtitle ?? '');
        setInitialDoc(doc);
        setBody(doc);
      } catch (error) {
        console.error('Failed to load post', error);
        toast.error('Could not load the post.');
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, postId, router]);

  /** Autosave from the editor. Body only; metadata saves on blur. */
  const onBodyChange = useCallback(
    async (doc: ComposerDoc) => {
      setBody(doc);
      try {
        await BlogService.saveDraft(postId, { doc });
        setSavedAt(new Date());
      } catch (error) {
        console.error('Autosave failed', error);
        toast.error('Autosave failed. Your text is still on screen.');
      }
    },
    [postId],
  );

  const saveMeta = useCallback(async () => {
    if (!post) return;
    if (title === post.title && subtitle === (post.subtitle ?? '')) return;
    try {
      await BlogService.saveDraft(postId, { title, subtitle: subtitle || null });
      setPost({ ...post, title, subtitle: subtitle || null });
      setSavedAt(new Date());
    } catch (error) {
      console.error('Could not save title', error);
      toast.error('Could not save the title.');
    }
  }, [post, postId, title, subtitle]);

  const publish = async () => {
    if (!body) {
      toast.error('Write something first.');
      return;
    }
    setPublishing(true);
    try {
      await saveMeta();
      const result = await BlogService.publish(postId, body);
      toast.success(
        result.hasPaywall
          ? `Published, with a paywall. ${result.wordCount} words.`
          : `Published. ${result.wordCount} words.`,
      );
      setPost(await BlogService.getPost(postId));
    } catch (error) {
      // The callable rejects empty posts and oversized segments with messages
      // written for the author, so surface them rather than a generic failure.
      toast.error(error instanceof Error ? error.message : 'Could not publish.');
      console.error('Publish failed', error);
    } finally {
      setPublishing(false);
    }
  };

  const unpublish = async () => {
    try {
      await BlogService.unpublish(postId);
      setPost((p) => (p ? { ...p, status: 'draft' } : p));
      toast.success('Taken off the site. Content is kept.');
    } catch {
      toast.error('Could not unpublish.');
    }
  };

  if (authLoading || loading) return <div className="p-8 text-gray-500">Loading…</div>;
  if (!post) return null;

  return (
    <div className="p-6 max-w-3xl">
      <header className="mb-4 flex items-center justify-between gap-4">
        <div className="text-sm text-gray-500">
          {post.status === 'published' ? (
            <a
              href={`https://wolly-blog.web.app/@${post.publicationSlug}/${post.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline"
            >
              View live post
            </a>
          ) : (
            <span className="capitalize">{post.status}</span>
          )}
          {savedAt ? (
            <span className="ml-3 text-gray-400">Saved {savedAt.toLocaleTimeString()}</span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {post.status === 'published' ? (
            <button
              onClick={unpublish}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Unpublish
            </button>
          ) : null}
          <button
            onClick={publish}
            disabled={publishing}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {publishing ? 'Publishing…' : post.status === 'published' ? 'Update' : 'Publish'}
          </button>
        </div>
      </header>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={saveMeta}
        placeholder="Title"
        maxLength={200}
        className="w-full border-0 px-0 text-3xl font-bold tracking-tight outline-none placeholder:text-gray-300"
      />
      <input
        value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
        onBlur={saveMeta}
        placeholder="Subtitle (optional)"
        maxLength={300}
        className="mt-2 w-full border-0 px-0 text-lg text-gray-600 outline-none placeholder:text-gray-300"
      />

      <div className="mt-6">
        <PostEditor initialDoc={initialDoc} onChange={onBodyChange} />
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Everything below the paywall divider is for paid subscribers. The post is
        rendered and sanitised on the server when you publish.
      </p>
    </div>
  );
}
