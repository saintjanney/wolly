class BookRecommendation {
  final String id;
  final String title;
  final String author;
  final String coverUrl;
  final String genre;
  final String description;
  final String fileType; // 'epub' or 'pdf'
  final String downloadUrl;
  final double rating; // 0.0 to 5.0

  BookRecommendation({
    required this.id,
    required this.title,
    required this.author,
    required this.coverUrl,
    required this.genre,
    required this.description,
    required this.fileType,
    required this.downloadUrl,
    required this.rating,
  });

  factory BookRecommendation.fromJson(Map<String, dynamic> json) {
    return BookRecommendation(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      author: json['author'] ?? '',
      coverUrl: json['coverUrl'] ?? '',
      genre: json['genre'] ?? '',
      description: json['description'] ?? '',
      fileType: json['fileType'] ?? 'epub',
      downloadUrl: json['downloadUrl'] ?? '',
      rating: (json['rating'] ?? 0.0).toDouble(),
    );
  }
} 