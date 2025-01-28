import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:wolly/models/wolly_user.dart';

class ProfileProvider with ChangeNotifier {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  WollyUser? _user;

  WollyUser? get user => _user;

  void setUser(WollyUser user) {
    _user = user;
    notifyListeners();
  }

  void fetchUserData(String uid) async {
    try {
      _firestore
          .collection('users')
          .doc(uid)
          .get()
          .then((DocumentSnapshot documentSnapshot) {
        if (documentSnapshot.exists) {
          final data = documentSnapshot.data() as Map<String, dynamic>;
          final user = WollyUser.fromMap(data);
          setUser(user);
        } else {
          print('Document does not exist on the database');
        }
      });
    } catch (e) {
      print(e);
    }
    // fetch user data from firestore
    // set user data
    // notifyListeners();
  }
}
