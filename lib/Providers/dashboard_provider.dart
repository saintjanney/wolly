import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:typed_data';

class WollyEpub {
  String name;
  String url;
  Uint8List data;
  WollyEpub({required this.name, required this.url, required this.data});
}

class DashboardProvider with ChangeNotifier {
  bool dataLoadStarted = false;
  bool dataLoadComplete = false;
  List<WollyEpub> allBooks = [];

  Future<Uint8List> downloadEpubFile(String url) async {
    try {
      // Perform a GET request to the download URL
      final response = await http.get(Uri.parse(url));

      // Check if the request was successful
      if (response.statusCode == 200) {
        // Return the response body as a Uint8List
        return response.bodyBytes;
      } else {
        print('Failed to download file. Status code: ${response.statusCode}');
        return Uint8List(0);
      }
    } catch (e) {
      // Handle any errors
      print('Error downloading file: $e');
      return Uint8List(0);
    }
  }

  Future<void> fetchData() async {
    if (!dataLoadStarted) {
      try {
        FirebaseFirestore firestore = FirebaseFirestore.instance;
        QuerySnapshot<Map<String, dynamic>> rawDocs =
            await firestore.collection('epubs').get();
        for (var v in rawDocs.docs) {
          Uint8List data = await downloadEpubFile(v.data()["url"]);
          allBooks.add(WollyEpub(
              name: v.data()["name"],
              url: v.data()["url"],
              data: await downloadEpubFile(v.data()["url"])));
          if (!dataLoadStarted) {
            dataLoadStarted = true;
          }
          notifyListeners();
        }
        dataLoadComplete = true;
        notifyListeners();
      } catch (e) {
        print(e);
      }
    }
  }
}
