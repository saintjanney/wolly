'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { useAuth } from './AuthProvider';
import { SignInDialog } from './SignInDialog';
import { clientDb } from '@/lib/firebase-client';

interface CommentView {
  id: string;
  userId: string;
  userName: string;
  body: string;
  isAuthorReply: boolean;
  createdAt: Date | null;
}

/**
 * Likes and comments under a post.
 *
 * Client-side on purpose: the post itself is server rendered for SEO, but
 * engagement is per-reader, changes constantly, and must run under the reader's
 * own identity so security rules apply. Counters are not written here; rules
 * forbid it and Cloud Functions maintain them.
 */
export function PostEngagement({
  postId,
  publicationId,
  publicationOwnerId,
  initialLikeCount,
}: {
  postId: string;
  publicationId: string;
  publicationOwnerId: string;
  initialLikeCount: number;
}) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [comments, setComments] = useState<CommentView[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [signInFor, setSignInFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    try {
      const snap = await getDocs(
        query(
          collection(clientDb(), 'posts', postId, 'comments'),
          where('status', '==', 'visible'),
          orderBy('createdAt', 'desc'),
        ),
      );
      setComments(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: data.userId,
            userName: data.userName ?? 'Reader',
            body: data.body ?? '',
            isAuthorReply: data.isAuthorReply === true,
            createdAt: data.createdAt?.toDate?.() ?? null,
          };
        }),
      );
    } catch (e) {
      // Comments failing must not take the post down with them.
      console.error('could not load comments', e);
    }
  }, [postId]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  useEffect(() => {
    if (!user) {
      setLiked(false);
      return;
    }
    void getDoc(doc(clientDb(), 'posts', postId, 'likes', user.uid))
      .then((s) => setLiked(s.exists()))
      .catch(() => setLiked(false));
  }, [user, postId]);

  const toggleLike = async () => {
    if (!user) {
      setSignInFor('Sign in to like this post.');
      return;
    }
    const ref = doc(clientDb(), 'posts', postId, 'likes', user.uid);
    // Optimistic: the counter is eventually corrected by the trigger anyway.
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      if (next) await setDoc(ref, { createdAt: serverTimestamp() });
      else await deleteDoc(ref);
    } catch {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  };

  const submitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      setSignInFor('Sign in to comment.');
      return;
    }
    const body = draft.trim();
    if (!body) return;

    setBusy(true);
    setError(null);
    try {
      await addDoc(collection(clientDb(), 'posts', postId, 'comments'), {
        postId,
        publicationId,
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Reader',
        userAvatarUrl: user.photoURL ?? null,
        parentId: null,
        body: body.slice(0, 2000),
        // Rules require these to start at zero; the server owns them after.
        likeCount: 0,
        reportCount: 0,
        status: 'visible',
        isAuthorReply: user.uid === publicationOwnerId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setDraft('');
      await loadComments();
    } catch (e) {
      console.error('comment failed', e);
      // The most likely cause is the publication restricting comments to
      // subscribers, so say that rather than something generic.
      setError('Could not post that. You may need to subscribe to comment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-12 border-t border-[var(--wolly-rule)] pt-8">
      <div className="flex items-center gap-4">
        <button
          onClick={() => void toggleLike()}
          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
            liked
              ? 'border-[var(--wolly-accent)] bg-indigo-50 text-[var(--wolly-accent)]'
              : 'border-[var(--wolly-rule)] text-[var(--wolly-muted)] hover:bg-gray-50'
          }`}
          aria-pressed={liked}
        >
          <span aria-hidden>{liked ? '♥' : '♡'}</span>
          {likeCount} {likeCount === 1 ? 'like' : 'likes'}
        </button>
        <span className="text-sm text-[var(--wolly-muted)]">
          {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
        </span>
      </div>

      <form onSubmit={submitComment} className="mt-6">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder={user ? 'Leave a comment…' : 'Sign in to join the conversation'}
          className="w-full rounded-lg border border-[var(--wolly-rule)] px-3 py-2 text-sm"
        />
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="rounded-lg bg-[var(--wolly-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            {busy ? 'Posting…' : 'Post comment'}
          </button>
        </div>
      </form>

      <ul className="mt-8 space-y-6">
        {comments.map((c) => (
          <li key={c.id}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{c.userName}</span>
              {c.isAuthorReply ? (
                <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-700">
                  author
                </span>
              ) : null}
              {c.createdAt ? (
                <span className="text-xs text-[var(--wolly-muted)]">
                  {c.createdAt.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              ) : null}
            </div>
            {/* Plain text, rendered as text. Comments are never HTML. */}
            <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-gray-800">
              {c.body}
            </p>
          </li>
        ))}
      </ul>

      <SignInDialog
        open={signInFor !== null}
        reason={signInFor ?? undefined}
        onClose={() => setSignInFor(null)}
      />
    </section>
  );
}
