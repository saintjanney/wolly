import 'package:equatable/equatable.dart';

import 'package:wolly_mobile/features/blog/domain/models/blog_post.dart';

abstract class BlogEvent extends Equatable {
  const BlogEvent();

  @override
  List<Object?> get props => [];
}

/// Load the discovery feed.
class LoadBlogFeed extends BlogEvent {}

class RefreshBlogFeed extends BlogEvent {}

/// Open a post: loads its body, applying the paywall.
class OpenPost extends BlogEvent {
  final BlogPost post;

  const OpenPost(this.post);

  @override
  List<Object?> get props => [post.id];
}
