import 'package:flutter/material.dart';
import 'package:flexify/flexify.dart';
import 'package:wolly_mobile/features/library/domain/models/book.dart';

class BookRecommendationCard extends StatelessWidget {
  final Book book;
  final double width;
  final double height;

  const BookRecommendationCard({
    super.key, 
    required this.book,
    this.width = 150, 
    this.height = 220,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        Navigator.of(context, rootNavigator: true).pushNamed(
          '/book_detail',
          arguments: book,
        );
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
                child: book.coverUrl != null && book.coverUrl!.isNotEmpty
                    ? Image.network(
                        book.coverUrl!,
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
            
            // Book Details - Fixed height to prevent overflow
            Container(
              height: height.rs * 0.3, // 30% of total height for text content
              padding: EdgeInsets.all(8.rs),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Flexible( // Use Flexible to allow text to shrink if needed
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          book.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12.rt,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(height: 2.rs),
                        Text(
                          book.author ?? 'Unknown',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 10.rt,
                            color: Colors.grey[700],
                          ),
                        ),
                      ],
                    ),
                  ),
                  Row(
                    children: [
                      Icon(
                        Icons.star,
                        size: 12.rs,
                        color: Colors.amber,
                      ),
                      SizedBox(width: 2.rs),
                      Text(
                        book.rating != null ? book.rating!.toStringAsFixed(1) : '0.0',
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