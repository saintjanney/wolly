import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:internet_file/internet_file.dart';
import 'package:internet_file/storage_io.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;

/// A utility class for downloading files from the internet
class FileDownloader {
  /// Downloads a file from the internet and returns the bytes
  /// 
  /// [url] The URL of the file to download
  /// [onProgress] Optional callback for download progress
  static Future<Uint8List> downloadFile({
    required String url,
    Function(double progress)? onProgress,
  }) async {
    try {
      final bytes = await InternetFile.get(
        url,
        progress: (receivedLength, contentLength) {
          final percentage = receivedLength / contentLength;
          if (onProgress != null) {
            onProgress(percentage);
          }
          if (kDebugMode) {
            print('Download progress: ${(percentage * 100).toStringAsFixed(2)}%');
          }
        },
      );
      return bytes;
    } catch (e) {
      if (kDebugMode) {
        print('Error downloading file: $e');
      }
      rethrow;
    }
  }

  /// Downloads a file from the internet and saves it to the device's storage
  /// 
  /// [url] The URL of the file to download
  /// [filename] The name to save the file as
  /// [onProgress] Optional callback for download progress
  /// Returns the path to the saved file
  static Future<String> downloadAndSaveFile({
    required String url,
    required String filename,
    Function(double progress)? onProgress,
  }) async {
    try {
      final storageIO = InternetFileStorageIO();
      final appDir = await getApplicationDocumentsDirectory();
      final filePath = path.join(appDir.path, filename);
      
      await InternetFile.get(
        url,
        storage: storageIO,
        storageAdditional: storageIO.additional(
          filename: filename,
          location: appDir.path,
        ),
        progress: (receivedLength, contentLength) {
          final percentage = receivedLength / contentLength;
          if (onProgress != null) {
            onProgress(percentage);
          }
          if (kDebugMode) {
            print('Download progress: ${(percentage * 100).toStringAsFixed(2)}%');
          }
        },
      );
      
      return filePath;
    } catch (e) {
      if (kDebugMode) {
        print('Error downloading and saving file: $e');
      }
      rethrow;
    }
  }
} 