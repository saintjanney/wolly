/// A creator's blog. Mirrors `Publication` in `@wolly/schema` (see SCHEMA.md),
/// reduced to the fields the reader actually uses.
class Publication {
  final String id;

  /// URL handle, rendered as `@slug`.
  final String slug;

  /// The creator who owns this publication. Denormalised onto a subscription
  /// so the creator can query their own subscribers.
  final String ownerUserId;
  final String name;
  final String? tagline;
  final String? description;
  final String? logoUrl;
  final String? coverImageUrl;

  /// Whether this publication offers paid subscriptions at all.
  final bool paidEnabled;
  final int subscriberCount;
  final int postCount;

  const Publication({
    required this.id,
    required this.slug,
    this.ownerUserId = '',
    required this.name,
    this.tagline,
    this.description,
    this.logoUrl,
    this.coverImageUrl,
    this.paidEnabled = false,
    this.subscriberCount = 0,
    this.postCount = 0,
  });

  factory Publication.fromMap(Map<String, dynamic> map, {required String id}) {
    return Publication(
      id: id,
      slug: map['slug'] ?? '',
      ownerUserId: map['ownerUserId'] ?? '',
      name: map['name'] ?? '',
      tagline: map['tagline'],
      description: map['description'],
      logoUrl: map['logoUrl'],
      coverImageUrl: map['coverImageUrl'],
      paidEnabled: map['paidEnabled'] ?? false,
      subscriberCount: (map['subscriberCount'] ?? 0) as int,
      postCount: (map['postCount'] ?? 0) as int,
    );
  }
}
