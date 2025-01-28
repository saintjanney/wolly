class Book {
  String title;
  String genre;
  String downloadUrl;
  String fileType;

  Book({
    required this.title,
    required this.genre,
    required this.downloadUrl,
    required this.fileType,
  });

  factory Book.fromJson(Map<String, dynamic> json) {
    return Book(
      title: json['title'],
      genre: json['genre'],
      downloadUrl: json['url'],
      fileType: json['fileType'],
    );
  }
}
