import 'package:cloud_firestore/cloud_firestore.dart';

/// Platform-level book model used for author/publisher workflows
class PlatformBook {
  final String id;
  final String ownerUserId;

  // Core metadata
  final String type; // e.g., 'ebook'
  final String language;
  final String title;
  final String? subtitle;
  final String? seriesName;
  final String? editionNumber;
  final String authorName;
  final List<String> contributors;
  final String description;

  // Classification
  final bool ownsCopyright;
  final bool hasExplicitContent;
  final String? readingAge; // optional label like 'All Ages'
  final List<String> categories; // up to 3
  final List<String> keywords; // up to 5

  // Assets
  final String? coverUrl;
  final String? manuscriptUrl;

  // Status
  final bool isPublished;

  // AI provenance
  final bool aiGenerated;
  final String? aiUsageDescription;
  final String? aiToolUsed;

  // Timestamps
  final DateTime createdAt;
  final DateTime updatedAt;

  const PlatformBook({
    required this.id,
    required this.ownerUserId,
    required this.type,
    required this.language,
    required this.title,
    this.subtitle,
    this.seriesName,
    this.editionNumber,
    required this.authorName,
    this.contributors = const [],
    required this.description,
    this.ownsCopyright = true,
    this.hasExplicitContent = false,
    this.readingAge,
    this.categories = const [],
    this.keywords = const [],
    this.coverUrl,
    this.manuscriptUrl,
    this.isPublished = false,
    this.aiGenerated = false,
    this.aiUsageDescription,
    this.aiToolUsed,
    required this.createdAt,
    required this.updatedAt,
  });

  PlatformBook copyWith({
    String? id,
    String? ownerUserId,
    String? type,
    String? language,
    String? title,
    String? subtitle,
    String? seriesName,
    String? editionNumber,
    String? authorName,
    List<String>? contributors,
    String? description,
    bool? ownsCopyright,
    bool? hasExplicitContent,
    String? readingAge,
    List<String>? categories,
    List<String>? keywords,
    String? coverUrl,
    String? manuscriptUrl,
    bool? isPublished,
    bool? aiGenerated,
    String? aiUsageDescription,
    String? aiToolUsed,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return PlatformBook(
      id: id ?? this.id,
      ownerUserId: ownerUserId ?? this.ownerUserId,
      type: type ?? this.type,
      language: language ?? this.language,
      title: title ?? this.title,
      subtitle: subtitle ?? this.subtitle,
      seriesName: seriesName ?? this.seriesName,
      editionNumber: editionNumber ?? this.editionNumber,
      authorName: authorName ?? this.authorName,
      contributors: contributors ?? this.contributors,
      description: description ?? this.description,
      ownsCopyright: ownsCopyright ?? this.ownsCopyright,
      hasExplicitContent: hasExplicitContent ?? this.hasExplicitContent,
      readingAge: readingAge ?? this.readingAge,
      categories: categories ?? this.categories,
      keywords: keywords ?? this.keywords,
      coverUrl: coverUrl ?? this.coverUrl,
      manuscriptUrl: manuscriptUrl ?? this.manuscriptUrl,
      isPublished: isPublished ?? this.isPublished,
      aiGenerated: aiGenerated ?? this.aiGenerated,
      aiUsageDescription: aiUsageDescription ?? this.aiUsageDescription,
      aiToolUsed: aiToolUsed ?? this.aiToolUsed,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'ownerUserId': ownerUserId,
      'type': type,
      'language': language,
      'title': title,
      'subtitle': subtitle,
      'seriesName': seriesName,
      'editionNumber': editionNumber,
      'authorName': authorName,
      'contributors': contributors,
      'description': description,
      'ownsCopyright': ownsCopyright,
      'hasExplicitContent': hasExplicitContent,
      'readingAge': readingAge,
      'categories': categories,
      'keywords': keywords,
      'coverUrl': coverUrl,
      'manuscriptUrl': manuscriptUrl,
      'isPublished': isPublished,
      'aiGenerated': aiGenerated,
      'aiUsageDescription': aiUsageDescription,
      'aiToolUsed': aiToolUsed,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }

  static PlatformBook fromJson(Map<String, dynamic> json, {required String id}) {
    DateTime created = DateTime.now();
    DateTime updated = DateTime.now();

    final createdTs = json['createdAt'];
    if (createdTs is Timestamp) {
      created = createdTs.toDate();
    } else if (createdTs is int) {
      created = DateTime.fromMillisecondsSinceEpoch(createdTs);
    }

    final updatedTs = json['updatedAt'];
    if (updatedTs is Timestamp) {
      updated = updatedTs.toDate();
    } else if (updatedTs is int) {
      updated = DateTime.fromMillisecondsSinceEpoch(updatedTs);
    }

    return PlatformBook(
      id: id,
      ownerUserId: json['ownerUserId'] ?? '',
      type: json['type'] ?? 'ebook',
      language: json['language'] ?? 'English',
      title: json['title'] ?? '',
      subtitle: json['subtitle'],
      seriesName: json['seriesName'],
      editionNumber: json['editionNumber'],
      authorName: json['authorName'] ?? '',
      contributors: (json['contributors'] as List?)?.cast<String>() ?? const [],
      description: json['description'] ?? '',
      ownsCopyright: json['ownsCopyright'] ?? true,
      hasExplicitContent: json['hasExplicitContent'] ?? false,
      readingAge: json['readingAge'],
      categories: (json['categories'] as List?)?.cast<String>() ?? const [],
      keywords: (json['keywords'] as List?)?.cast<String>() ?? const [],
      coverUrl: json['coverUrl'],
      manuscriptUrl: json['manuscriptUrl'],
      isPublished: json['isPublished'] ?? false,
      aiGenerated: json['aiGenerated'] ?? false,
      aiUsageDescription: json['aiUsageDescription'],
      aiToolUsed: json['aiToolUsed'],
      createdAt: created,
      updatedAt: updated,
    );
  }
}

