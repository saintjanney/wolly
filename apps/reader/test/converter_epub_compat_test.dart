/// Does the reader actually open what the press produces?
///
/// epubcheck proves a book is valid EPUB. That is necessary but not sufficient:
/// the reader opens books with `epubx` (via `epub_view`), whose parser is
/// stricter than the specification in some places and looser in others. A book
/// can be spec-valid and still fail to open here, which is the failure the
/// reader would show as "this book could not be loaded".
///
/// Reads the artefacts written by `npm --workspace @wolly/converter run test`.
/// SKIPS when they are absent, so running the Flutter suite alone never fails
/// for lack of them, and a skip is visible rather than a silent pass.
///
///   cd services/converter && npm test     # writes test/out/*.epub
///   cd apps/reader && flutter test        # this file validates them
library;

import 'dart:io';

import 'package:epubx/epubx.dart';
import 'package:flutter_test/flutter_test.dart';

/// services/converter/test/out, relative to apps/reader.
final _outDir = Directory('../../services/converter/test/out');

void main() {
  final books = _outDir.existsSync()
      ? _outDir
          .listSync()
          .whereType<File>()
          .where((f) => f.path.endsWith('.epub'))
          .toList()
      : <File>[];

  if (books.isEmpty) {
    test('converter output is available', () {}, skip: 'No pressed books in ${_outDir.path}. Run `npm --workspace @wolly/converter run test` first.');
    return;
  }

  group('books pressed by @wolly/converter open in the reader', () {
    for (final file in books) {
      final name = file.uri.pathSegments.last;

      test('$name parses, and exposes chapters and content', () async {
        final book = await EpubReader.readBook(file.readAsBytesSync());

        expect(book.Title, isNotNull, reason: 'title missing from $name');
        expect(book.Author, isNotNull, reason: 'author missing from $name');

        // The reader paginates by chapter; zero chapters renders a blank book.
        final chapters = book.Chapters ?? [];
        expect(chapters, isNotEmpty, reason: '$name has no chapters');

        // Every chapter must carry real HTML, not an empty shell.
        for (final chapter in chapters) {
          expect(
            (chapter.HtmlContent ?? '').trim(),
            isNotEmpty,
            reason: 'chapter "${chapter.Title}" of $name is empty',
          );
        }

        // Content files must be readable: epub_view renders these directly.
        expect(book.Content, isNotNull);
        expect(book.Content?.Html, isNotEmpty, reason: '$name exposes no HTML');
      });
    }

    test('the novel keeps its structure and provenance', () async {
      final novel = books.where((f) => f.path.endsWith('novel.epub'));
      if (novel.isEmpty) {
        markTestSkipped('novel.epub not present');
        return;
      }
      final book = await EpubReader.readBook(novel.first.readAsBytesSync());

      final titles = (book.Chapters ?? []).map((c) => c.Title?.trim()).toList();
      expect(
        titles.where((t) => t != null && t.contains('Chapter One')),
        isNotEmpty,
        reason: 'chapter titles did not survive: $titles',
      );

      // The colophon is the human-readable half of the provenance record. If it
      // is missing here, it is missing from the copy a reader could pass on.
      final allHtml = (book.Content?.Html?.values ?? [])
          .map((f) => f.Content ?? '')
          .join();
      expect(allHtml, contains('Colophon'));
      expect(
        RegExp(r'wolly-[0-9a-f-]{36}').hasMatch(allHtml),
        isTrue,
        reason: 'no pressing fingerprint found in the book body',
      );

      // Images must survive packaging: a dropped image is a silently wrong book.
      expect(book.Content?.Images, isNotEmpty, reason: 'images were lost');
    });
  });
}
