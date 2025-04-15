import 'package:flutter/material.dart';

class MockAuthProvider {
  // Mock user is always signed in for simplicity
  bool _isSignedIn = true;

  Future<dynamic> login({required String email, required String password}) async {
    // Always succeed in mock implementation
    await Future.delayed(const Duration(seconds: 1)); // Simulate network delay
    _isSignedIn = true;
    return "";
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
    // Always succeed in mock implementation
    await Future.delayed(const Duration(seconds: 1)); // Simulate network delay
    _isSignedIn = true;
    return "";
  }

  Future<dynamic> setGenderAndBirthday({required String gender, required String dob}) async {
    // Always succeed in mock implementation
    await Future.delayed(const Duration(milliseconds: 500)); // Simulate network delay
    return "";
  }

  Future<dynamic> setPersona({required String role}) async {
    // Always succeed in mock implementation
    await Future.delayed(const Duration(milliseconds: 500)); // Simulate network delay
    return "";
  }

  Future<dynamic> setContentPreferences({required List<String> contentPreferences}) async {
    // Always succeed in mock implementation
    await Future.delayed(const Duration(milliseconds: 500)); // Simulate network delay
    return "";
  }

  Future<Map<String, dynamic>> fetchUserData(String uid) async {
    // Return mock user data
    await Future.delayed(const Duration(milliseconds: 500)); // Simulate network delay
    return {
      'first_name': 'John',
      'last_name': 'Doe',
      'email': 'john.doe@example.com',
      'country_code': '+1',
      'phone_number': '1234567890',
      'dob': '1990-01-01',
      'gender': 'Male',
      'persona': 'Reader',
      'content_preferences': [
        'Science Fiction',
        'Fantasy',
        'Mystery',
        'Biography',
        'Self-Help',
      ],
    };
  }

  Future<void> signOut() async {
    // Simulate sign out
    await Future.delayed(const Duration(milliseconds: 500)); // Simulate network delay
    _isSignedIn = false;
  }
} 