import 'package:flutter/material.dart';

import 'package:wolly_mobile/features/blog/domain/models/blog_post.dart';

/// A post summary in the feed. Shows the teaser (title, excerpt, meta) that the
/// post document carries; never the body.
class PostCard extends StatelessWidget {
  final BlogPost post;
  final VoidCallback onTap;

  const PostCard({super.key, required this.post, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '@${post.publicationSlug}',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Colors.indigo[600],
              ),
            ),
            const SizedBox(height: 4),
            Text(
              post.title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                height: 1.25,
              ),
            ),
            if (post.excerpt.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                post.excerpt,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 14, color: Colors.grey[700], height: 1.4),
              ),
            ],
            const SizedBox(height: 8),
            Row(
              children: [
                Text(
                  post.authorName,
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
                const SizedBox(width: 8),
                Text('·', style: TextStyle(color: Colors.grey[400])),
                const SizedBox(width: 8),
                Text(
                  '${post.readingTimeMinutes} min',
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
                if (post.hasPaywall) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.amber[100],
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      'Paid',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Colors.amber[900],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
