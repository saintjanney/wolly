import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'package:wolly_mobile/features/blog/data/blog_repository.dart';
import 'package:wolly_mobile/features/blog/domain/blog_event.dart';
import 'package:wolly_mobile/features/blog/domain/blog_state.dart';
import 'package:wolly_mobile/features/blog/presentation/bloc/blog_bloc.dart';
import 'package:wolly_mobile/features/blog/presentation/screens/post_reader_screen.dart';
import 'package:wolly_mobile/features/blog/presentation/widgets/post_card.dart';

/// The blog discovery feed as a standalone screen (its own Scaffold + app bar).
/// Use [BlogFeedBody] instead when embedding inside an existing Scaffold, e.g.
/// a bottom-navigation tab, to avoid a doubled app bar.
class BlogFeedScreen extends StatelessWidget {
  const BlogFeedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Read', style: TextStyle(fontWeight: FontWeight.w700)),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: const BlogFeedBody(),
    );
  }
}

/// The feed content, without a Scaffold. Provides its own BlogBloc, so it can be
/// dropped anywhere without wiring at the app root.
class BlogFeedBody extends StatelessWidget {
  const BlogFeedBody({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => BlogBloc(repository: BlogRepository())..add(LoadBlogFeed()),
      child: const _BlogFeedView(),
    );
  }
}

class _BlogFeedView extends StatelessWidget {
  const _BlogFeedView();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<BlogBloc, BlogState>(
        builder: (context, state) {
          switch (state.feedStatus) {
            case BlogFeedStatus.initial:
            case BlogFeedStatus.loading:
              return const Center(child: CircularProgressIndicator());
            case BlogFeedStatus.error:
              return _Message(
                text: state.errorMessage ?? 'Something went wrong.',
                onRetry: () => context.read<BlogBloc>().add(LoadBlogFeed()),
              );
            case BlogFeedStatus.loaded:
              if (state.feed.isEmpty) {
                return const _Message(text: 'No posts yet. Check back soon.');
              }
              return RefreshIndicator(
                onRefresh: () async =>
                    context.read<BlogBloc>().add(RefreshBlogFeed()),
                child: ListView.separated(
                  itemCount: state.feed.length,
                  separatorBuilder: (_, __) => Divider(
                    height: 1,
                    color: Colors.grey[200],
                  ),
                  itemBuilder: (context, i) {
                    final post = state.feed[i];
                    return PostCard(
                      post: post,
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => PostReaderScreen(
                            post: post,
                            bloc: context.read<BlogBloc>(),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              );
          }
        },
    );
  }
}

class _Message extends StatelessWidget {
  final String text;
  final VoidCallback? onRetry;

  const _Message({required this.text, this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(text, style: TextStyle(color: Colors.grey[600])),
          if (onRetry != null) ...[
            const SizedBox(height: 12),
            TextButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ],
      ),
    );
  }
}
