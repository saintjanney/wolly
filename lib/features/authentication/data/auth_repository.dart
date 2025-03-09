import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class AuthRepository {
  final FirebaseAuth _firebaseAuth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  User? get currentUser => _firebaseAuth.currentUser;

  Stream<User?> get authStateChanges => _firebaseAuth.authStateChanges();

  Future<String> login({required String email, required String password}) async {
    try {
      await _firebaseAuth.signInWithEmailAndPassword(
          email: email, password: password);
      return "";
    } on FirebaseAuthException catch (e) {
      return e.message ?? "An error occurred during login";
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
          await _firebaseAuth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      User? user = userCredential.user;

      // Check if user was successfully created
      if (user != null) {
        // Add additional user information to Firestore
        await _firestore.collection('users').doc(user.uid).set({
          'first_name': name,
          'last_name': lastName,
          'email': email,
          'country_code': countryCode,
          'date_of_birth': dateOfBirth.toIso8601String(),
          'phone_number': phoneNumber,
          'createdAt': FieldValue.serverTimestamp(),
        });
      }
      return "";
    } catch (e) {
      return "Error creating user: $e";
    }
  }

  Future<String> setGenderAndBirthday({
    required String gender, 
    required String dob
  }) async {
    try {
      User? user = _firebaseAuth.currentUser;

      if (user != null) {
        await _firestore
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

  Future<String> setPersona({required String role}) async {
    try {
      User? user = _firebaseAuth.currentUser;

      if (user != null) {
        await _firestore
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

  Future<String> setContentPreferences({
    required List<String> contentPreferences
  }) async {
    try {
      User? user = _firebaseAuth.currentUser;

      if (user != null) {
        await _firestore
            .collection('users')
            .doc(user.uid)
            .update({
          "content_preferences": contentPreferences,
        });
      }
      return "";
    } catch (e) {
      return "Error updating content preferences: $e";
    }
  }

  Future<Map<String, dynamic>> fetchUserData(String uid) async {
    try {
      DocumentSnapshot<Map<String, dynamic>> user =
          await _firestore.collection('users').doc(uid).get();
      return user.data() ?? {};
    } catch (e) {
      return {};
    }
  }

  Future<void> signOut() async {
    await _firebaseAuth.signOut();
  }
} 