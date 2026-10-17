import 'package:flutter_test/flutter_test.dart';
import 'package:wolly_mobile/features/store/data/free_book_fallback.dart';

void main() {
  group('storagePathFromUrl', () {
    test('maps the press URL on storage.googleapis.com to the object path', () {
      expect(
        storagePathFromUrl(
          'https://storage.googleapis.com/wolly-1133d.appspot.com/converted/book1/abc123/book.epub',
        ),
        'converted/book1/abc123/book.epub',
      );
    });

    test('decodes a firebasestorage download URL and drops the query', () {
      expect(
        storagePathFromUrl(
          'https://firebasestorage.googleapis.com/v0/b/wolly-1133d.appspot.com/o/books%2Fuid%2Fbook1%2Fmanuscript.epub?alt=media&token=t',
        ),
        'books/uid/book1/manuscript.epub',
      );
    });

    test('accepts a gs:// URL', () {
      expect(
        storagePathFromUrl('gs://wolly-1133d.appspot.com/converted/book1/abc/book.pdf'),
        'converted/book1/abc/book.pdf',
      );
    });

    test('returns null for anything outside Storage', () {
      expect(storagePathFromUrl('https://example.com/book.epub'), isNull);
      expect(storagePathFromUrl('https://storage.googleapis.com/bucket-only'), isNull);
      expect(storagePathFromUrl('not a url'), isNull);
      expect(storagePathFromUrl(''), isNull);
    });
  });
}
