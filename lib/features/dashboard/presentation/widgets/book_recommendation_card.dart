import 'package:flutter/material.dart';
import 'package:flexify/flexify.dart';
import 'package:wolly/features/dashboard/domain/models/book_recommendation.dart';
import 'package:wolly/read_book.dart';
import 'package:wolly/read_pdf.dart';
import 'package:wolly/models/book.dart';

class BookRecommendationCard extends StatelessWidget {
  final BookRecommendation recommendation;
  final double width;
  final double height;

  const BookRecommendationCard({
    super.key, 
    required this.recommendation,
    this.width = 150, 
    this.height = 220,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        // Convert to our Book model for reading
        final book = Book(
          title: recommendation.title,
          genre: recommendation.genre,
          downloadUrl: recommendation.downloadUrl,
          fileType: recommendation.fileType,
        );

        // Navigate to appropriate reader
        if (recommendation.fileType == 'pdf') {
          Navigator.of(context, rootNavigator: true).push(
            MaterialPageRoute(
              builder: (context) => ReadPDF(
                book: book,
              ),
            ),
          );
        } else {
          Navigator.of(context, rootNavigator: true).push(
            MaterialPageRoute(
              builder: (context) => ReadEpub(
                book: book,
              ),
            ),
          );
        }
      },
      child: Container(
        width: width.rs,
        height: height.rs,
        margin: EdgeInsets.all(8.rs),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12.rs),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 10.rs,
              offset: Offset(0, 5.rs),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Book Cover
            ClipRRect(
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(12.rs),
                topRight: Radius.circular(12.rs),
              ),
              child: Container(
                height: height.rs * 0.7,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                ),
                child: recommendation.coverUrl.isNotEmpty
                    ? Image.network(
                        recommendation.coverUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (ctx, obj, st) => Center(
                          child: Icon(
                            Icons.book,
                            size: 40.rs,
                            color: Colors.grey[600],
                          ),
                        ),
                      )
                    : Center(
                        child: Icon(
                          Icons.book,
                          size: 40.rs,
                          color: Colors.grey[600],
                        ),
                      ),
              ),
            ),
            
            // Book Details
            Padding(
              padding: EdgeInsets.all(8.rs),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    recommendation.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12.rt,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(height: 2.rs),
                  Text(
                    recommendation.author,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 10.rt,
                      color: Colors.grey[700],
                    ),
                  ),
                  SizedBox(height: 4.rs),
                  Row(
                    children: [
                      Icon(
                        Icons.star,
                        size: 12.rs,
                        color: Colors.amber,
                      ),
                      SizedBox(width: 2.rs),
                      Text(
                        recommendation.rating.toStringAsFixed(1),
                        style: TextStyle(
                          fontSize: 10.rt,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
} 