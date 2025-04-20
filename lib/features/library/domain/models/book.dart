import 'package:wolly/features/genre/domain/models/genre.dart';

class Book {
  String title;
  String genre;
  String downloadUrl;
  String fileType;
  bool isPublished;
  String? coverUrl;
  String? author;
  int? pagesRead;
  int? totalPages;
  DateTime? lastRead;
  double? percentageComplete;
  String? description;
  double? rating;
  
  Book({
    required this.title,
    required this.genre,
    required this.downloadUrl,
    required this.fileType,
    this.isPublished = false,
    this.coverUrl,
    this.author,
    this.pagesRead,
    this.totalPages,
    this.lastRead,
    this.percentageComplete,
    this.description,
    this.rating,
  });

  factory Book.fromJson(Map<String, dynamic> json) {
    return Book(
      title: json['title'],
      genre: json['genre'],
      downloadUrl: json['url'],
      fileType: json['fileType'],
      isPublished: json['isPublished'] ?? false,
      coverUrl: json['coverUrl'],
      author: json['author'],
      pagesRead: json['pagesRead'],
      totalPages: json['totalPages'],
      lastRead: json['lastRead'] != null ? DateTime.fromMillisecondsSinceEpoch(json['lastRead']) : null,
      percentageComplete: json['percentageComplete']?.toDouble(),
      description: json['description'],
      rating: json['rating']?.toDouble(),
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'genre': genre,
      'url': downloadUrl,
      'fileType': fileType,
      'isPublished': isPublished,
      'coverUrl': coverUrl,
      'author': author,
      'pagesRead': pagesRead,
      'totalPages': totalPages,
      'lastRead': lastRead?.millisecondsSinceEpoch,
      'percentageComplete': percentageComplete,
      'description': description,
      'rating': rating,
    };
  }
  
  // Update reading progress
  void updateReadingProgress(int currentPage) {
    pagesRead = currentPage;
    lastRead = DateTime.now();
    
    if (totalPages != null && totalPages! > 0) {
      percentageComplete = pagesRead! / totalPages!;
    }
  }
  
  // Check if this book is in progress
  bool get isInProgress => pagesRead != null && pagesRead! > 0 && percentageComplete != null && percentageComplete! < 1.0;
  
  // Check if this book is completed
  bool get isCompleted => percentageComplete != null && percentageComplete! >= 1.0;
} 