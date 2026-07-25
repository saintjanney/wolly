import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_widget_from_html_core/flutter_widget_from_html_core.dart';
import 'package:url_launcher/url_launcher.dart';

import 'package:wolly_mobile/features/blog/domain/blog_event.dart';
import 'package:wolly_mobile/features/blog/domain/blog_state.dart';
import 'package:wolly_mobile/features/blog/domain/models/blog_post.dart';
import 'package:wolly_mobile/features/blog/presentation/bloc/blog_bloc.dart';

/// Reads a single post. Reuses the feed's BlogBloc so the open-post state lives
/// in one place; dispatches [OpenPost] on init to load the body.
class PostReaderScreen extends StatefulWidget {
  final BlogPost post;
  final BlogBloc bloc;

  const PostReaderScreen({super.key, required this.post, required this.bloc});

  @override
  State<PostReaderScreen> createState() => _PostReaderScreenState();
}

class _PostReaderScreenState extends State<PostReaderScreen> {
  @override
  void initState() {
    super.initState();
    widget.bloc.add(OpenPost(widget.post));
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: widget.bloc,
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          backgroundColor: Colors.white,
          foregroundColor: Colors.black,
          elevation: 0,
        ),
        body: BlocBuilder<BlogBloc, BlogState>(
          builder: (context, state) {
            // Guard against a stale build while a different post is opening.
            if (state.openPost?.id != widget.post.id) {
              return const Center(child: CircularProgressIndicator());
            }
            return _PostBody(post: widget.post, state: state);
          },
        ),
      ),
    );
  }
}

class _PostBody extends StatelessWidget {
  final BlogPost post;
  final BlogState state;

  const _PostBody({required this.post, required this.state});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '@${post.publicationSlug}',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Colors.indigo[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            post.title,
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              height: 1.2,
            ),
          ),
          if (post.subtitle != null && post.subtitle!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              post.subtitle!,
              style: TextStyle(fontSize: 18, color: Colors.grey[600], height: 1.3),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Text(post.authorName, style: TextStyle(color: Colors.grey[700])),
              const SizedBox(width: 8),
              Text('·', style: TextStyle(color: Colors.grey[400])),
              const SizedBox(width: 8),
              Text('${post.readingTimeMinutes} min read',
                  style: TextStyle(color: Colors.grey[600])),
            ],
          ),
          const Divider(height: 32),

          ..._buildContent(context),
        ],
      ),
    );
  }

  List<Widget> _buildContent(BuildContext context) {
    switch (state.postStatus) {
      case PostViewStatus.none:
      case PostViewStatus.loading:
        return const [
          Padding(
            padding: EdgeInsets.only(top: 40),
            child: Center(child: CircularProgressIndicator()),
          ),
        ];

      case PostViewStatus.error:
        return [
          Padding(
            padding: const EdgeInsets.only(top: 24),
            child: Text(
              'This post could not be loaded.',
              style: TextStyle(color: Colors.grey[600]),
            ),
          ),
        ];

      case PostViewStatus.ready:
        return [
          _Html(state.freeHtml),
          if (state.paidHtml != null && state.paidHtml!.isNotEmpty)
            _Html(state.paidHtml!),
        ];

      case PostViewStatus.paywalled:
        return [
          _Html(state.freeHtml),
          const SizedBox(height: 8),
          _PaywallCard(slug: post.publicationSlug),
        ];
    }
  }
}

/// Renders server-sanitised post HTML. The HTML originates from services/api's
/// allowlist renderer, so the tag set is closed and known.
class _Html extends StatelessWidget {
  final String html;

  const _Html(this.html);

  @override
  Widget build(BuildContext context) {
    return HtmlWidget(
      html,
      textStyle: const TextStyle(fontSize: 17, height: 1.6),
      onTapUrl: (url) async {
        final uri = Uri.tryParse(url);
        if (uri == null) return false;
        return launchUrl(uri, mode: LaunchMode.externalApplication);
      },
    );
  }
}

/// Shown in place of a post's paid segment. There is nothing hidden beneath it:
/// the paid HTML was never sent, because the rules denied the read.
class _PaywallCard extends StatelessWidget {
  final String slug;

  const _PaywallCard({required this.slug});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 16),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        children: [
          Text(
            'THIS POST IS FOR PAID SUBSCRIBERS',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'Subscribe to @$slug to keep reading',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {
              // Paid checkout is Phase 2 (Paystack via the server). Surface the
              // intent rather than pretending it works.
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Paid subscriptions are coming soon.'),
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.indigo[600],
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 12),
            ),
            child: const Text('Subscribe'),
          ),
        ],
      ),
    );
  }
}
