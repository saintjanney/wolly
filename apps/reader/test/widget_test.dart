// Tests for the blog domain models.
//
// (Replaces the default `flutter create` counter smoke test, which referenced a
// counter widget the app never had and had been failing since the monorepo
// move.)

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:wolly_mobile/features/blog/domain/models/blog_post.dart';
import 'package:wolly_mobile/features/blog/domain/models/publication.dart';

void main() {
  group('BlogPost.fromMap', () {
    test('reads the reader-contract fields', () {
      final post = BlogPost.fromMap({
        'publicationId': 'pub1',
        'publicationSlug': 'test-kitchen',
        'authorName': 'Ama',
        'title': 'A post',
        'subtitle': 'the sub',
        'slug': 'a-post',
        'excerpt': 'summary',
        'hasPaywall': true,
        'visibility': 'paid',
        'readingTimeMinutes': 3,
        'likeCount': 5,
        'tags': ['cooking', 'notes'],
      }, id: 'post1');

      expect(post.id, 'post1');
      expect(post.publicationSlug, 'test-kitchen');
      expect(post.title, 'A post');
      expect(post.hasPaywall, isTrue);
      expect(post.visibility, PostVisibility.paid);
      expect(post.readingTimeMinutes, 3);
      expect(post.likeCount, 5);
      expect(post.tags, ['cooking', 'notes']);
    });

    test('defaults are safe when fields are missing', () {
      final post = BlogPost.fromMap({}, id: 'x');
      expect(post.title, '');
      expect(post.hasPaywall, isFalse);
      expect(post.visibility, PostVisibility.public);
      expect(post.readingTimeMinutes, 1);
      expect(post.tags, isEmpty);
      expect(post.publishedAt, isNull);
    });

    test('unknown visibility falls back to public', () {
      final post = BlogPost.fromMap({'visibility': 'nonsense'}, id: 'x');
      expect(post.visibility, PostVisibility.public);
    });

    test('publishedAt is read from a Timestamp', () {
      final now = DateTime(2026, 7, 24, 12);
      final post = BlogPost.fromMap(
        {'publishedAt': Timestamp.fromDate(now)},
        id: 'x',
      );
      expect(post.publishedAt, now);
    });
  });

  group('PostContent.fromMap', () {
    test('reads the rendered html', () {
      final content = PostContent.fromMap({'html': '<p>hi</p>'});
      expect(content.html, '<p>hi</p>');
    });

    test('missing html is empty, not null', () {
      expect(PostContent.fromMap({}).html, '');
    });
  });

  group('Publication.fromMap', () {
    test('reads slug, owner and counters', () {
      final pub = Publication.fromMap({
        'slug': 'test-kitchen',
        'ownerUserId': 'creator1',
        'name': 'The Test Kitchen',
        'tagline': 'cooking notes',
        'paidEnabled': true,
        'subscriberCount': 12,
      }, id: 'pub1');

      expect(pub.id, 'pub1');
      expect(pub.slug, 'test-kitchen');
      expect(pub.ownerUserId, 'creator1');
      expect(pub.paidEnabled, isTrue);
      expect(pub.subscriberCount, 12);
    });
  });
}
