// import 'dart:io';
// import 'package:cloud_firestore/cloud_firestore.dart';
// import 'package:file_picker/file_picker.dart';
// import 'package:firebase_storage/firebase_storage.dart';
// import 'package:flutter/material.dart';
// import 'package:wolly/models/book.dart';
// import 'package:wolly/read_book.dart';

// class WollyAdmin extends StatefulWidget {
//   @override
//   _WollyAdminState createState() => _WollyAdminState();
// }

// class _WollyAdminState extends State<WollyAdmin> {
//   bool isLoading = false;
//   bool isUpdatingPublished = false;
//   final FirebaseStorage _storage = FirebaseStorage.instance;
//   final FirebaseFirestore _firestore = FirebaseFirestore.instance;

//   Future<void> _uploadEpub() async {
//     try {
// // get file
//       final result = await FilePicker.platform
//           .pickFiles(type: FileType.custom, allowedExtensions: ['epub', 'pdf']);

//       if (result != null && result.files.isNotEmpty) {
//         final fileBytes = result.files.first.bytes;
//         final fileName = result.files.first.name;

//         setState(() {
//           isLoading = true;
//         });
//         // Upload file to Firebase Storage
//         TaskSnapshot snapshot =
//             await _storage.ref('epubs/$fileName').putData(fileBytes!);

//         // Get the download URL
//         String downloadUrl = await snapshot.ref.getDownloadURL();

//         // Save the download URL to Firestore
//         await _firestore
//             .collection('epubs')
//             .add({'url': downloadUrl, 'title': fileName, 'genre': ''});

//         setState(() {
//           isLoading = false;
//         });

//         ScaffoldMessenger.of(context)
//             .showSnackBar(const SnackBar(content: Text('Upload successful')));
//       }
//     } catch (e) {
//       setState(() {
//         isLoading = false;
//       });
//       ScaffoldMessenger.of(context)
//           .showSnackBar(SnackBar(content: Text('Upload failed: $e')));
//     }
//   }

//   Future<void> _deleteEpub(String docId, String fileName) async {
//     setState(() {
//       isLoading = true;
//     });
//     try {
//       // Delete file from Firebase Storage
//       await _storage.ref('epubs/$fileName').delete();

//       // Delete the document from Firestore
//       await _firestore.collection('epubs').doc(docId).delete();

//       ScaffoldMessenger.of(context)
//           .showSnackBar(SnackBar(content: Text('Deletion successful')));
//       setState(() {
//         isLoading = false;
//       });
//     } catch (e) {
//       setState(() {
//         isLoading = false;
//       });
//       ScaffoldMessenger.of(context)
//           .showSnackBar(SnackBar(content: Text('Deletion failed: $e')));
//     }
//   }

//   // Future<void> doWork() async{
//   //   FirebaseFirestore firestore = FirebaseFirestore.instance;

//   //   firestore.collection('epubs').get().then((value) {
//   //     value.docs.forEach((element) {
//   //       element.reference.update({'isPublished': false});
//   //     });
//   //   });
//   // }

//   Future<void> updatePublishStatus(String docId, bool isPublished) async {
//     try {
//       await _firestore
//           .collection('epubs')
//           .doc(docId)
//           .update({'isPublished': isPublished});
//     } catch (e) {
//       ScaffoldMessenger.of(context)
//           .showSnackBar(SnackBar(content: Text('Update failed: $e')));
//     }
//   }

//   String _getFileTypeFromUrl(String url) {
//     print(url);
//     if (url.contains('.pdf')) {
//       print('pdf');
//       return 'pdf';
//     } else if (url.contains('.epub')) {
//       print('epub');
//       return 'epub';
//     } else {
//       print('uknown');
//       return 'unknown';
//     }
//   }

//   @override
//   void initState() {
//     super.initState();
//     // doWork();
//   }

//   @override
//   Widget build(BuildContext context) {
//     final double screenHeight = MediaQuery.of(context).size.height;
//     final double screenWidth = MediaQuery.of(context).size.width;
//     return Scaffold(
//       floatingActionButton: TextButton.icon(
//           onPressed: _uploadEpub, label: const Text("Upload new epub/pdf")),
//       appBar: AppBar(
//         title: const Text('Wolly Creater Hub'),
//       ),
//       body: StreamBuilder(
//         stream: _firestore.collection('epubs').snapshots(),
//         builder: (context, AsyncSnapshot<QuerySnapshot> snapshot) {
//           if (!snapshot.hasData || isLoading) {
//             return const Center(child: CircularProgressIndicator());
//           } else if (snapshot.data!.docs.isEmpty) {
//             return const Center(child: Text("No epubs found"));
//           }
//           var epubs = snapshot.data!.docs;
//           return Center(
//             child: SizedBox(
//               width: screenWidth * 0.6,
//               height: screenHeight * 0.8,
//               child: ListView.builder(
//                 itemCount: epubs.length,
//                 itemBuilder: (context, index) {
//                   var epub = epubs[index];
//                   var epubName = epub['title'];
//                   var epubUrl = epub['url'];
//                   return ListTile(
//                     leading: Text("${index + 1}"),
//                     title: Text(epubName),
//                     subtitle: Padding(
//                       padding: const EdgeInsets.all(8.0),
//                       child: Row(
//                         children: [
//                           const Icon(Icons.public),
//                           const SizedBox(
//                             width: 8,
//                           ),
//                           const Text("Is published"),
//                           // isUpdatingPublished
//                           //     ? CircularProgressIndicator.adaptive()
//                           // :

//                           Checkbox(
//                               value: epub['isPublished'],
//                               onChanged: (newValue) async {
//                                 // setState(() {
//                                 //   isUpdatingPublished = true;
//                                 // });
//                                 await updatePublishStatus(
//                                     epub.id, newValue ?? false);
//                                 // setState(() {
//                                 //   isUpdatingPublished = false;
//                                 // });
//                               })
//                           // Text("Is published: ${epub['isPublished'] ?? false}"),
//                         ],
//                       ),
//                     ),
//                     trailing: IconButton(
//                       icon: const Icon(Icons.delete),
//                       onPressed: () => _deleteEpub(epub.id, epubName),
//                     ),
//                     onTap: () {
//                       Navigator.push(
//                         context,
//                         MaterialPageRoute<void>(
//                             builder: (BuildContext context) => ReadEpub(
//                                 book: Book(
//                                     title: epub['title'],
//                                     genre: epub['genre'],
//                                     downloadUrl: epub['url'],
//                                     fileType:
//                                         _getFileTypeFromUrl(epub['url'])))),
//                       );
//                     },
//                   );
//                 },
//               ),
//             ),
//           );
//         },
//       ),
//     );
//   }
// }
