import 'dart:io';

class BookCreation {
  final String? bookType;
  final String? language;
  final String? title;
  final String? subtitle;
  final bool isPartOfSeries;
  final String? seriesName;
  final String? editionNumber;
  final String? authorName;
  final String? contributors;
  final String? description;
  final bool ownsCopyright;
  final bool hasExplicitContent;
  final String? readingAge;
  final List<String> categories;
  final List<String> keywords;
  final File? manuscriptFile;
  final File? coverFile;
  final bool isAIGenerated;
  final String? aiUsageDescription;
  final String? aiToolUsed;
  final DateTime createdAt;

  BookCreation({
    this.bookType,
    this.language,
    this.title,
    this.subtitle,
    this.isPartOfSeries = false,
    this.seriesName,
    this.editionNumber,
    this.authorName,
    this.contributors,
    this.description,
    this.ownsCopyright = true,
    this.hasExplicitContent = false,
    this.readingAge,
    this.categories = const [],
    this.keywords = const [],
    this.manuscriptFile,
    this.coverFile,
    this.isAIGenerated = false,
    this.aiUsageDescription,
    this.aiToolUsed,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  BookCreation copyWith({
    String? bookType,
    String? language,
    String? title,
    String? subtitle,
    bool? isPartOfSeries,
    String? seriesName,
    String? editionNumber,
    String? authorName,
    String? contributors,
    String? description,
    bool? ownsCopyright,
    bool? hasExplicitContent,
    String? readingAge,
    List<String>? categories,
    List<String>? keywords,
    File? manuscriptFile,
    File? coverFile,
    bool? isAIGenerated,
    String? aiUsageDescription,
    String? aiToolUsed,
  }) {
    return BookCreation(
      bookType: bookType ?? this.bookType,
      language: language ?? this.language,
      title: title ?? this.title,
      subtitle: subtitle ?? this.subtitle,
      isPartOfSeries: isPartOfSeries ?? this.isPartOfSeries,
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
      manuscriptFile: manuscriptFile ?? this.manuscriptFile,
      coverFile: coverFile ?? this.coverFile,
      isAIGenerated: isAIGenerated ?? this.isAIGenerated,
      aiUsageDescription: aiUsageDescription ?? this.aiUsageDescription,
      aiToolUsed: aiToolUsed ?? this.aiToolUsed,
      createdAt: createdAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'bookType': bookType,
      'language': language,
      'title': title,
      'subtitle': subtitle,
      'isPartOfSeries': isPartOfSeries,
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
      'isAIGenerated': isAIGenerated,
      'aiUsageDescription': aiUsageDescription,
      'aiToolUsed': aiToolUsed,
      'createdAt': createdAt.millisecondsSinceEpoch,
    };
  }

  factory BookCreation.fromJson(Map<String, dynamic> json) {
    return BookCreation(
      bookType: json['bookType'],
      language: json['language'],
      title: json['title'],
      subtitle: json['subtitle'],
      isPartOfSeries: json['isPartOfSeries'] ?? false,
      seriesName: json['seriesName'],
      editionNumber: json['editionNumber'],
      authorName: json['authorName'],
      contributors: json['contributors'],
      description: json['description'],
      ownsCopyright: json['ownsCopyright'] ?? true,
      hasExplicitContent: json['hasExplicitContent'] ?? false,
      readingAge: json['readingAge'],
      categories: List<String>.from(json['categories'] ?? []),
      keywords: List<String>.from(json['keywords'] ?? []),
      isAIGenerated: json['isAIGenerated'] ?? false,
      aiUsageDescription: json['aiUsageDescription'],
      aiToolUsed: json['aiToolUsed'],
      createdAt: json['createdAt'] != null 
          ? DateTime.fromMillisecondsSinceEpoch(json['createdAt'])
          : null,
    );
  }

  bool get isComplete {
    return bookType != null &&
           language != null &&
           title != null &&
           title!.isNotEmpty &&
           authorName != null &&
           authorName!.isNotEmpty &&
           description != null &&
           description!.isNotEmpty &&
           categories.isNotEmpty &&
           manuscriptFile != null &&
           coverFile != null;
  }

  String get validationMessage {
    if (bookType == null) return 'Please select a book type';
    if (language == null) return 'Please select a language';
    if (title == null || title!.isEmpty) return 'Please enter a book title';
    if (authorName == null || authorName!.isEmpty) return 'Please enter an author name';
    if (description == null || description!.isEmpty) return 'Please enter a book description';
    if (categories.isEmpty) return 'Please select at least one category';
    if (manuscriptFile == null) return 'Please upload a manuscript file';
    if (coverFile == null) return 'Please upload a cover file';
    return '';
  }
} 