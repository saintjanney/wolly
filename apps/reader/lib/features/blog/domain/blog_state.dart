import 'package:equatable/equatable.dart';

import 'package:wolly_mobile/features/blog/domain/models/blog_post.dart';

enum BlogFeedStatus { initial, loading, loaded, error }

/// How the currently-open post's body loaded.
///
/// `paywalled` is deliberately distinct from `error`: it is the expected state
/// for a free reader on a paid post, not a failure. The screen renders the free
/// portion plus a subscribe card for it.
enum PostViewStatus { none, loading, ready, paywalled, error }

class BlogState extends Equatable {
  final BlogFeedStatus feedStatus;
  final List<BlogPost> feed;
  final String? errorMessage;

  // The post currently open in the reader.
  final PostViewStatus postStatus;
  final BlogPost? openPost;
  final String freeHtml;
  final String? paidHtml;

  const BlogState({
    this.feedStatus = BlogFeedStatus.initial,
    this.feed = const [],
    this.errorMessage,
    this.postStatus = PostViewStatus.none,
    this.openPost,
    this.freeHtml = '',
    this.paidHtml,
  });

  BlogState copyWith({
    BlogFeedStatus? feedStatus,
    List<BlogPost>? feed,
    String? errorMessage,
    PostViewStatus? postStatus,
    BlogPost? openPost,
    String? freeHtml,
    String? paidHtml,
  }) {
    return BlogState(
      feedStatus: feedStatus ?? this.feedStatus,
      feed: feed ?? this.feed,
      errorMessage: errorMessage,
      postStatus: postStatus ?? this.postStatus,
      openPost: openPost ?? this.openPost,
      freeHtml: freeHtml ?? this.freeHtml,
      paidHtml: paidHtml,
    );
  }

  @override
  List<Object?> get props => [
        feedStatus,
        feed,
        errorMessage,
        postStatus,
        openPost?.id,
        freeHtml,
        paidHtml,
      ];
}
