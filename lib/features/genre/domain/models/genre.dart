class Genre {
  final String id;
  final String name;
  final String description;
  final int bookCount;

  Genre({
    required this.id,
    required this.name,
    this.description = '',
    this.bookCount = 0,
  });

  factory Genre.fromJson(Map<String, dynamic> json, String docId) {
    return Genre(
      id: docId,
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      bookCount: json['bookCount'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'description': description,
      'bookCount': bookCount,
    };
  }
} 