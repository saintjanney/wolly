import 'package:flexify/flexify.dart';
import 'package:flutter/material.dart';
import 'package:wolly_mobile/features/library/domain/models/book.dart';
import 'package:wolly_mobile/read_book.dart';
import 'package:wolly_mobile/read_pdf.dart';

class LibraryItem extends StatefulWidget {
  final int index;
  final Book book;

  LibraryItem({
    super.key,
    required this.index,
    required this.book,
  });

  @override
  State<LibraryItem> createState() => _LibraryItemState();
}

class _LibraryItemState extends State<LibraryItem> {

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.symmetric(horizontal: 16.rs, vertical: 8.rs),
      elevation: 2,
      child: ListTile(
        contentPadding: EdgeInsets.all(16.rs),
        leading: Container(
          width: 50.rs,
          height: 70.rs,
          decoration: BoxDecoration(
            color: Colors.blue.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8.rs),
          ),
          child: Icon(
            widget.book.fileType == 'pdf' ? Icons.picture_as_pdf : Icons.menu_book,
            color: Colors.blue[700],
            size: 24.rs,
          ),
        ),
        title: Text(
          widget.book.title,
          style: TextStyle(
            fontSize: 16.rt,
            fontWeight: FontWeight.bold,
            color: Colors.grey[800],
          ),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (widget.book.author != null) ...[
              SizedBox(height: 4.rs),
              Text(
                'by ${widget.book.author}',
                style: TextStyle(
                  fontSize: 14.rt,
                  color: Colors.grey[600],
                ),
              ),
            ],
            SizedBox(height: 8.rs),
            Row(
              children: [
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 8.rs, vertical: 4.rs),
                  decoration: BoxDecoration(
                    color: Colors.blue[100],
                    borderRadius: BorderRadius.circular(12.rs),
                  ),
                  child: Text(
                    widget.book.genre.isNotEmpty ? widget.book.genre : 'General',
                    style: TextStyle(
                      fontSize: 12.rt,
                      color: Colors.blue[700],
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                SizedBox(width: 8.rs),
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 8.rs, vertical: 4.rs),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(12.rs),
                  ),
                  child: Text(
                    widget.book.fileType.toUpperCase(),
                    style: TextStyle(
                      fontSize: 12.rt,
                      color: Colors.grey[700],
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
            if (widget.book.percentageComplete != null && widget.book.percentageComplete! > 0) ...[
              SizedBox(height: 8.rs),
              Row(
                children: [
                  Icon(
                    Icons.bookmark,
                    size: 16.rs,
                    color: Colors.green[600],
                  ),
                  SizedBox(width: 4.rs),
                  Text(
                    '${(widget.book.percentageComplete! * 100).toInt()}% read',
                    style: TextStyle(
                      fontSize: 12.rt,
                      color: Colors.green[600],
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            IconButton(
              onPressed: () {
                if (widget.book.fileType == 'pdf') {
                  Navigator.of(context, rootNavigator: true).push(
                    MaterialPageRoute(
                      builder: (context) => ReadPDF(
                        book: widget.book,
                      ),
                    ),
                  );
                } else {
                  Navigator.of(context, rootNavigator: true).push(
                    MaterialPageRoute(
                      builder: (context) => ReadEpub(
                        book: widget.book,
                      ),
                    ),
                  );
                }
              },
              icon: Icon(
                Icons.play_arrow,
                color: Colors.blue[700],
                size: 24.rs,
              ),
              tooltip: 'Read Book',
            ),
            if (widget.book.rating != null) ...[
              SizedBox(height: 4.rs),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.star,
                    size: 14.rs,
                    color: Colors.amber,
                  ),
                  SizedBox(width: 2.rs),
                  Text(
                    widget.book.rating!.toStringAsFixed(1),
                    style: TextStyle(
                      fontSize: 12.rt,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
