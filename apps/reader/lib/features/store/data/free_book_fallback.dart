import 'dart:io';

import 'package:firebase_storage/firebase_storage.dart';
import 'package:path_provider/path_provider.dart';

import 'package:wolly_mobile/features/library/domain/models/book.dart';

/// Opens a FREE book when `getBookDownloadUrl` cannot be reached.
///
/// Every pressed book lives under `converted/` in Storage with no download
/// token, and the normal way to read one is to ask the server for a short-lived
/// signed URL. That server is a Cloud Function, and a Cloud Function is one
/// outage, one billing lapse or one bad deploy away from being unreachable,
/// which until now meant no book in the catalogue could be opened at all,
/// including the free ones that have nothing to protect.
///
/// This is the way around that for free books only. `storage.rules` lets any
/// signed-in reader fetch `converted/{bookId}/**` when the book's own document
/// says it is free and published, so the reader downloads the file itself
/// through the Firebase Storage SDK, which carries the reader's auth token and
/// is subject to that rule. Paid books are not covered on purpose: the file is
/// the thing being sold, and the only check that a sale happened is the one the
/// server does.
///
/// The server stays the primary path. [BookDownloadService.resolveUrl] is
/// still called first and still wins when it answers; this runs only when it
/// does not answer at all.
class FreeBookFallback {
  FreeBookFallback._();

  /// Downloads [book]'s file to the app's temporary directory and returns the
  /// local path. Throws if the book is not free, if the stored URL cannot be
  /// mapped to a Storage object, or if Storage refuses the read.
  static Future<String> download(Book book, String bookId) async {
    if (!book.isFree) {
      throw StateError('Only free books can be opened without the server.');
    }

    final path = storagePathFromUrl(book.downloadUrl);
    if (path == null) {
      throw StateError('Stored URL is not a Firebase Storage object.');
    }

    final dir = await getTemporaryDirectory();
    final extension = book.fileType == 'pdf' ? 'pdf' : 'epub';
    final file = File('${dir.path}/wolly-free-$bookId.$extension');

    await FirebaseStorage.instance.ref(path).writeToFile(file);
    return file.path;
  }
}

/// The Storage object path behind a stored book URL, or null when the URL does
/// not point into the app's bucket.
///
/// Three shapes are written to `epubs.url` today:
///
///   * `https://storage.googleapis.com/<bucket>/<path>`, by the press
///   * `https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encoded path>?…`,
///     by the creator-hub's original upload flow
///   * `gs://<bucket>/<path>`
///
/// Only the path is returned; the bucket is always the app's default bucket,
/// which is the only one the reader is configured for.
String? storagePathFromUrl(String url) {
  final uri = Uri.tryParse(url);
  if (uri == null) return null;

  if (uri.scheme == 'gs') {
    final path = uri.path.startsWith('/') ? uri.path.substring(1) : uri.path;
    return path.isEmpty ? null : path;
  }

  if (uri.host == 'storage.googleapis.com' ||
      uri.host == 'storage.cloud.google.com') {
    // /<bucket>/<path...>
    final segments = uri.pathSegments;
    if (segments.length < 2) return null;
    final path = segments.sublist(1).join('/');
    return path.isEmpty ? null : path;
  }

  if (uri.host == 'firebasestorage.googleapis.com') {
    // /v0/b/<bucket>/o/<path>, where the path arrives percent-encoded and
    // pathSegments has already decoded it.
    final segments = uri.pathSegments;
    final o = segments.indexOf('o');
    if (o < 0 || o + 1 >= segments.length) return null;
    final path = segments.sublist(o + 1).join('/');
    return path.isEmpty ? null : path;
  }

  return null;
}
