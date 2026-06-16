class ReadingProgress {
  final String bookId;
  final String title;
  final String coverUrl;
  final int pagesRead;
  final int totalPages;
  final DateTime lastRead;
  final double percentageComplete;

  ReadingProgress({
    required this.bookId,
    required this.title,
    required this.coverUrl,
    required this.pagesRead,
    required this.totalPages,
    required this.lastRead,
    required this.percentageComplete,
  });

  factory ReadingProgress.fromJson(Map<String, dynamic> json) {
    return ReadingProgress(
      bookId: json['bookId'] ?? '',
      title: json['title'] ?? '',
      coverUrl: json['coverUrl'] ?? '',
      pagesRead: json['pagesRead'] ?? 0,
      totalPages: json['totalPages'] ?? 0,
      lastRead: json['lastRead'] != null
          ? DateTime.fromMillisecondsSinceEpoch(json['lastRead'])
          : DateTime.now(),
      percentageComplete: json['percentageComplete'] ?? 0.0,
    );
  }
} 