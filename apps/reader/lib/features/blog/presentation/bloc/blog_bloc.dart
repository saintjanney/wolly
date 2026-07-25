import 'package:flutter_bloc/flutter_bloc.dart';

import 'package:wolly_mobile/features/blog/data/blog_repository.dart';
import 'package:wolly_mobile/features/blog/domain/blog_event.dart';
import 'package:wolly_mobile/features/blog/domain/blog_state.dart';

class BlogBloc extends Bloc<BlogEvent, BlogState> {
  final BlogRepository _repository;

  BlogBloc({required BlogRepository repository})
      : _repository = repository,
        super(const BlogState()) {
    on<LoadBlogFeed>(_onLoadFeed);
    on<RefreshBlogFeed>(_onRefreshFeed);
    on<OpenPost>(_onOpenPost);
  }

  Future<void> _onLoadFeed(LoadBlogFeed event, Emitter<BlogState> emit) async {
    emit(state.copyWith(feedStatus: BlogFeedStatus.loading));
    try {
      final feed = await _repository.fetchRecentPosts();
      emit(state.copyWith(feedStatus: BlogFeedStatus.loaded, feed: feed));
    } catch (e) {
      emit(state.copyWith(
        feedStatus: BlogFeedStatus.error,
        errorMessage: 'Failed to load posts: $e',
      ));
    }
  }

  Future<void> _onRefreshFeed(
      RefreshBlogFeed event, Emitter<BlogState> emit) async {
    try {
      final feed = await _repository.fetchRecentPosts();
      emit(state.copyWith(feedStatus: BlogFeedStatus.loaded, feed: feed));
    } catch (e) {
      emit(state.copyWith(
        feedStatus: BlogFeedStatus.error,
        errorMessage: 'Failed to refresh: $e',
      ));
    }
  }

  Future<void> _onOpenPost(OpenPost event, Emitter<BlogState> emit) async {
    emit(state.copyWith(
      postStatus: PostViewStatus.loading,
      openPost: event.post,
      freeHtml: '',
      paidHtml: null,
    ));

    final body = await _repository.fetchPostBody(event.post);

    switch (body.status) {
      case PostBodyStatus.ok:
        emit(state.copyWith(
          postStatus: PostViewStatus.ready,
          freeHtml: body.freeHtml,
          paidHtml: body.paidHtml,
        ));
        break;
      case PostBodyStatus.paidLocked:
        // Expected for a free reader on a paid post, not an error.
        emit(state.copyWith(
          postStatus: PostViewStatus.paywalled,
          freeHtml: body.freeHtml,
        ));
        break;
      case PostBodyStatus.error:
        emit(state.copyWith(postStatus: PostViewStatus.error));
        break;
    }
  }
}
