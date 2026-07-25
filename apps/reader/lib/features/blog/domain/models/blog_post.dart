import 'package:cloud_firestore/cloud_firestore.dart';

/// Post visibility. Mirrors `PostVisibility` in `@wolly/schema`.
enum PostVisibility { public, subscribers, paid, tiers }

PostVisibility _visibilityFrom(String? raw) {
  switch (raw) {
    case 'subscribers':
      return PostVisibility.subscribers;
    case 'paid':
      return PostVisibility.paid;
    case 'tiers':
      return PostVisibility.tiers;
    default:
      return PostVisibility.public;
  }
}

/// A blog post's metadata. Mirrors `BlogPost` in `@wolly/schema` (see
/// SCHEMA.md), reduced to what the reader renders. The body is NOT here: it
/// lives in the `content` subcollection and is loaded separately, which is what
/// lets the paywall be enforced by security rules.
class BlogPost {
  final String id;
  final String publicationId;
  final String publicationSlug;
  final String authorName;
  final String? authorAvatarUrl;

  final String title;
  final String? subtitle;
  final String slug;
  final String excerpt;
  final String? coverImageUrl;

  final PostVisibility visibility;

  /// Whether a paid segment exists. When true and the reader lacks access, the
  /// `paid` content read is denied by rules and the UI shows a paywall.
  final bool hasPaywall;

  final int readingTimeMinutes;
  final int likeCount;
  final int commentCount;
  final List<String> tags;
  final String? genre;
  final DateTime? publishedAt;

  const BlogPost({
    required this.id,
    required this.publicationId,
    required this.publicationSlug,
    required this.authorName,
    this.authorAvatarUrl,
    required this.title,
    this.subtitle,
    required this.slug,
    required this.excerpt,
    this.coverImageUrl,
    this.visibility = PostVisibility.public,
    this.hasPaywall = false,
    this.readingTimeMinutes = 1,
    this.likeCount = 0,
    this.commentCount = 0,
    this.tags = const [],
    this.genre,
    this.publishedAt,
  });

  factory BlogPost.fromMap(Map<String, dynamic> map, {required String id}) {
    final ts = map['publishedAt'];
    return BlogPost(
      id: id,
      publicationId: map['publicationId'] ?? '',
      publicationSlug: map['publicationSlug'] ?? '',
      authorName: map['authorName'] ?? 'Unknown',
      authorAvatarUrl: map['authorAvatarUrl'],
      title: map['title'] ?? '',
      subtitle: map['subtitle'],
      slug: map['slug'] ?? '',
      excerpt: map['excerpt'] ?? '',
      coverImageUrl: map['coverImageUrl'],
      visibility: _visibilityFrom(map['visibility'] as String?),
      hasPaywall: map['hasPaywall'] ?? false,
      readingTimeMinutes: (map['readingTimeMinutes'] ?? 1) as int,
      likeCount: (map['likeCount'] ?? 0) as int,
      commentCount: (map['commentCount'] ?? 0) as int,
      tags: (map['tags'] as List?)?.whereType<String>().toList() ?? const [],
      genre: map['genre'],
      publishedAt: ts is Timestamp ? ts.toDate() : null,
    );
  }
}

/// The rendered body of one segment of a post (`free` or `paid`). The reader
/// displays `html`, which was rendered and sanitised server-side.
class PostContent {
  final String html;

  const PostContent({required this.html});

  factory PostContent.fromMap(Map<String, dynamic> map) {
    return PostContent(html: map['html'] ?? '');
  }
}
