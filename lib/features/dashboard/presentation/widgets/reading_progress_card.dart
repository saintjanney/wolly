import 'package:flutter/material.dart';
import 'package:flexify/flexify.dart';
import 'package:intl/intl.dart';
import 'package:wolly/features/dashboard/domain/models/reading_progress.dart';
import 'package:wolly/read_book.dart';
import 'package:wolly/read_pdf.dart';
import 'package:wolly/models/book.dart';

class ReadingProgressCard extends StatelessWidget {
  final ReadingProgress progress;
  final double width;
  final double height;

  const ReadingProgressCard({
    super.key, 
    required this.progress,
    this.width = 300, 
    this.height = 120,
  });

  String _formatLastRead(DateTime lastRead) {
    final now = DateTime.now();
    final difference = now.difference(lastRead);
    
    if (difference.inDays > 0) {
      return '${difference.inDays} ${difference.inDays == 1 ? 'day' : 'days'} ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours} ${difference.inHours == 1 ? 'hour' : 'hours'} ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes} ${difference.inMinutes == 1 ? 'minute' : 'minutes'} ago';
    } else {
      return 'Just now';
    }
  }

  @override
  Widget build(BuildContext context) {
    final fileType = _determineFileType(progress.title);
    
    return GestureDetector(
      onTap: () {
        // Create book model to continue reading
        final book = Book(
          title: progress.title,
          genre: '',
          downloadUrl: '',  // This would need to be populated from a repository
          fileType: fileType,
        );
        
        // Navigate to appropriate reader
        if (fileType == 'pdf') {
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
        margin: EdgeInsets.symmetric(horizontal: 16.rs, vertical: 8.rs),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16.rs),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 8.rs,
              offset: Offset(0, 2.rs),
            ),
          ],
        ),
        child: Row(
          children: [
            // Book Cover
            ClipRRect(
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(16.rs),
                bottomLeft: Radius.circular(16.rs),
              ),
              child: Container(
                width: 80.rs,
                height: double.infinity,
                color: Colors.grey[300],
                child: progress.coverUrl.isNotEmpty
                    ? Image.network(
                        progress.coverUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (ctx, obj, st) => Center(
                          child: Icon(
                            Icons.book,
                            size: 30.rs,
                            color: Colors.grey[600],
                          ),
                        ),
                      )
                    : Center(
                        child: Icon(
                          Icons.book,
                          size: 30.rs,
                          color: Colors.grey[600],
                        ),
                      ),
              ),
            ),
            
            // Book Details & Progress
            Expanded(
              child: Padding(
                padding: EdgeInsets.all(12.rs),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Title and Last Read
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          progress.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 14.rt,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(height: 4.rs),
                        Text(
                          'Last read: ${_formatLastRead(progress.lastRead)}',
                          style: TextStyle(
                            fontSize: 10.rt,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                    
                    // Progress Bar and Page Count
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Progress percentage text
                        Text(
                          '${(progress.percentageComplete * 100).toInt()}% Complete',
                          style: TextStyle(
                            fontSize: 10.rt,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        SizedBox(height: 4.rs),
                        // Progress bar
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4.rs),
                          child: LinearProgressIndicator(
                            value: progress.percentageComplete,
                            minHeight: 6.rs,
                            backgroundColor: Colors.grey[200],
                            valueColor: AlwaysStoppedAnimation<Color>(
                              Theme.of(context).primaryColor,
                            ),
                          ),
                        ),
                        SizedBox(height: 4.rs),
                        // Page count
                        Text(
                          'Page ${progress.pagesRead} of ${progress.totalPages}',
                          style: TextStyle(
                            fontSize: 10.rt,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            
            // Continue Reading Icon
            Container(
              padding: EdgeInsets.all(12.rs),
              child: Icon(
                Icons.play_circle_outline,
                size: 24.rs,
                color: Theme.of(context).primaryColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  // Helper method to determine file type from title
  // In a real app, this would come from the repository
  String _determineFileType(String title) {
    if (title.toLowerCase().endsWith('.pdf')) {
      return 'pdf';
    } else {
      return 'epub'; // Default to epub
    }
  }
} 