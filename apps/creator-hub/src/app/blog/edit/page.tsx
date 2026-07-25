'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/contexts/PageTitleContext';
import { PostEditor, docIsEmpty } from '@/components/blog/PostEditor';
import { BlogService, type ComposerDoc } from '@/services/blogService';
import type { BlogPost } from '@wolly/schema';

/** Debounce for the draft network write, not for local state. */
const AUTOSAVE_DELAY_MS = 5_000;

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
  /**
   * The live document. A ref, not state: Publish reads it, and it must never be
   * a render behind what the author has typed.
   */
  const bodyRef = useRef<ComposerDoc | null>(null);
  /** Mirrors "is there anything to publish", purely to drive the button. */
  const [hasBody, setHasBody] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        bodyRef.current = doc;
        setHasBody(!docIsEmpty(doc));
      } catch (error) {
        console.error('Failed to load post', error);
        toast.error('Could not load the post.');
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, postId, router]);

  /** Writes the current body to the draft. Safe to call at any time. */
  const flushDraft = useCallback(async () => {
    const doc = bodyRef.current;
    if (!doc) return;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    try {
      await BlogService.saveDraft(postId, { doc });
      setSavedAt(new Date());
    } catch (error) {
      console.error('Autosave failed', error);
      toast.error('Could not save your draft. Your text is still on screen.');
    }
  }, [postId]);

  /**
   * Every keystroke updates `bodyRef` immediately and schedules a save.
   *
   * The body lives in a ref rather than state because Publish reads it. It was
   * previously debounced state, so clicking Publish before the debounce elapsed
   * saw `null` and was rejected with "Write something first" even though the
   * author had clearly written something. A ref is always current, so Publish
   * cannot depend on render timing.
   *
   * Only the network write is debounced.
   */
  const onBodyChange = useCallback(
    (doc: ComposerDoc) => {
      bodyRef.current = doc;
      setHasBody(!docIsEmpty(doc));

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void flushDraft();
      }, AUTOSAVE_DELAY_MS);
    },
    // flushDraft is stable via its own ref usage; postId is the only real dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [postId],
  );

  // Flush a pending save when leaving, so navigating away cannot drop the last
  // few seconds of typing.
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        const doc = bodyRef.current;
        if (doc) void BlogService.saveDraft(postId, { doc });
      }
    };
  }, [postId]);

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
    // Flush any pending draft write first, then publish what is on screen NOW.
    await flushDraft();
    const doc = bodyRef.current;
    if (docIsEmpty(doc)) {
      toast.error('Write something first.');
      return;
    }
    setPublishing(true);
    try {
      await saveMeta();
      const result = await BlogService.publish(postId, doc!);
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
            disabled={publishing || !hasBody}
            title={hasBody ? undefined : 'Write something to publish'}
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
