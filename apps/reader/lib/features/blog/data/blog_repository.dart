import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import 'package:wolly_mobile/features/blog/domain/models/blog_post.dart';
import 'package:wolly_mobile/features/blog/domain/models/publication.dart';

/// The result of trying to load a post's body.
///
/// A paywall is not an error: for a free reader hitting a paid post it is the
/// expected outcome. So `paidLocked` is a first-class result, distinct from
/// `error`, and the BLoC turns it into a paywall state rather than a failure.
enum PostBodyStatus { ok, paidLocked, error }

class PostBody {
  final PostBodyStatus status;
  final String freeHtml;
  final String? paidHtml;

  const PostBody({
    required this.status,
    this.freeHtml = '',
    this.paidHtml,
  });
}

/// Data access for the blog. Plain repository; UI state is driven through the
/// BLoC, matching the reader's other features.
class BlogRepository {
  BlogRepository({FirebaseFirestore? firestore, FirebaseAuth? auth})
      : _firestore = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance;

  final FirebaseFirestore _firestore;
  final FirebaseAuth _auth;

  String? get _uid => _auth.currentUser?.uid;

  // ── Feed ───────────────────────────────────────────────────────────────

  /// Recent published posts across all publications, newest first. Used for
  /// the discovery feed until per-subscription filtering lands in Phase 2.
  Future<List<BlogPost>> fetchRecentPosts({int limit = 30}) async {
    try {
      final snap = await _firestore
          .collection('posts')
          .where('status', isEqualTo: 'published')
          .orderBy('publishedAt', descending: true)
          .limit(limit)
          .get();
      return snap.docs
          .map((d) => BlogPost.fromMap(d.data(), id: d.id))
          .where((p) => p.publicationSlug.isNotEmpty)
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<List<BlogPost>> fetchPublicationPosts(String publicationId,
      {int limit = 50}) async {
    try {
      final snap = await _firestore
          .collection('posts')
          .where('publicationId', isEqualTo: publicationId)
          .where('status', isEqualTo: 'published')
          .orderBy('publishedAt', descending: true)
          .limit(limit)
          .get();
      return snap.docs.map((d) => BlogPost.fromMap(d.data(), id: d.id)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<Publication?> fetchPublication(String publicationId) async {
    final snap =
        await _firestore.collection('publications').doc(publicationId).get();
    if (!snap.exists) return null;
    return Publication.fromMap(snap.data()!, id: snap.id);
  }

  // ── Post body, and the paywall ─────────────────────────────────────────

  /// Loads a post's body.
  ///
  /// The free segment is read first. When the post has a paywall, the paid
  /// segment read is attempted too: security rules permit it only for an active
  /// paid subscriber, so a `permission-denied` here is the EXPECTED signal that
  /// the reader should see a paywall, not a bug. That is why it maps to
  /// `paidLocked` rather than `error`.
  Future<PostBody> fetchPostBody(BlogPost post) async {
    try {
      final free = await _firestore
          .collection('posts')
          .doc(post.id)
          .collection('content')
          .doc('free')
          .get();

      final freeHtml =
          free.exists ? PostContent.fromMap(free.data()!).html : '';

      if (!post.hasPaywall) {
        return PostBody(status: PostBodyStatus.ok, freeHtml: freeHtml);
      }

      try {
        final paid = await _firestore
            .collection('posts')
            .doc(post.id)
            .collection('content')
            .doc('paid')
            .get();
        final paidHtml =
            paid.exists ? PostContent.fromMap(paid.data()!).html : '';
        return PostBody(
          status: PostBodyStatus.ok,
          freeHtml: freeHtml,
          paidHtml: paidHtml,
        );
      } on FirebaseException catch (e) {
        if (e.code == 'permission-denied') {
          // Not an error: the reader simply has not paid.
          return PostBody(status: PostBodyStatus.paidLocked, freeHtml: freeHtml);
        }
        rethrow;
      }
    } catch (_) {
      return const PostBody(status: PostBodyStatus.error);
    }
  }

  // ── Subscriptions (free tier only; paid is Phase 2 via the server) ─────

  Future<bool> isSubscribed(String publicationId) async {
    final uid = _uid;
    if (uid == null) return false;
    final doc = await _firestore
        .collection('subscriptions')
        .doc('${uid}_$publicationId')
        .get();
    return doc.exists;
  }

  /// Creates a FREE subscription. Rules permit a client to create only a free
  /// subscription for itself; anything paid is written by the server after
  /// Paystack verification (Phase 2).
  Future<void> subscribeFree(Publication publication) async {
    final uid = _uid;
    if (uid == null) return;
    await _firestore
        .collection('subscriptions')
        .doc('${uid}_${publication.id}')
        .set({
      'userId': uid,
      'publicationId': publication.id,
      'ownerUserId': publication.ownerUserId,
      'status': 'free',
      'isPaid': false,
      'cancelAtPeriodEnd': false,
      'emailOptIn': false,
      'source': 'reader',
      'createdAt': Timestamp.now(),
      'updatedAt': Timestamp.now(),
    });
  }
}
