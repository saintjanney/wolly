import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class AuthProvider {
  final FirebaseAuth _firebaseAuth = FirebaseAuth.instance;

  User? get currentUser => _firebaseAuth.currentUser;
  Future<dynamic> login(
      {required String email, required String password}) async {
    try {
      await _firebaseAuth.signInWithEmailAndPassword(
          email: email, password: password);
      return "";
    } on FirebaseAuthException catch (e) {
      print("here");
      return e.message;
    }
  }

  Future<String> signUpUser({
    required String email,
    required String password,
    required String name,
    required String lastName,
    required String countryCode,
    required String phoneNumber,
    required DateTime dateOfBirth,
  }) async {
    try {
      // Create a new user
      UserCredential userCredential =
          await FirebaseAuth.instance.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      User? user = userCredential.user;

      // Check if user was successfully created
      if (user != null) {
        // Add additional user information to Firestore
        await FirebaseFirestore.instance.collection('users').doc(user.uid).set({
          'first_name': name,
          'last_name': lastName,
          'email': email,
          'country_code': countryCode,
          'date_of_birth': dateOfBirth.toIso8601String(),
          'phone_number': phoneNumber, // Additional info like role
          'createdAt': FieldValue.serverTimestamp(), // Record creation time
        });
      }
      return "";
    } catch (e) {
      return "Error creating user: $e";
    }
  }

  Future<dynamic> setGenderAndBirthday(
      {required String gender, required String dob}) async {
    try {
      // Create a new user
      User? user = _firebaseAuth.currentUser;

      // Check if user was successfully created
      if (user != null) {
        // Add additional user information to Firestore
        await FirebaseFirestore.instance
            .collection('users')
            .doc(user.uid)
            .update({
          "gender": gender,
          "dob": dob,
        });
      }
      return "";
    } catch (e) {
      return "Error setting birthday and gender: $e";
    }
  }

  Future<dynamic> setPersona({required String role}) async {
    try {
      // Create a new user
      User? user = _firebaseAuth.currentUser;

      // Check if user was successfully created
      if (user != null) {
        // Add additional user information to Firestore
        await FirebaseFirestore.instance
            .collection('users')
            .doc(user.uid)
            .update({
          "persona": role,
        });
      }
      return "";
    } catch (e) {
      return "Error updating role: $e";
    }
  }

  Future<dynamic> setContentPreferences(
      {required List<String> contentPreferences}) async {
    try {
      // Create a new user
      User? user = _firebaseAuth.currentUser;

      // Check if user was successfully created
      if (user != null) {
        // Add additional user information to Firestore
        await FirebaseFirestore.instance
            .collection('users')
            .doc(user.uid)
            .update({
          "content_preferences": contentPreferences,
        });
      }
      return "";
    } catch (e) {
      return "Error updating role: $e";
    }
  }

  Future<Map<String, dynamic>> fetchUserData(String uid) async {
    try {
      DocumentSnapshot<Map<String, dynamic>> user =
          await FirebaseFirestore.instance.collection('users').doc(uid).get();
      print(user.data());
      return user.data()!;
    } catch (e) {
      return {};
    }
  }

  Future<void> signOut() async {
    await _firebaseAuth.signOut();
  }
}
