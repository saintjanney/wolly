import 'package:flutter/material.dart';
import 'package:wolly/models/wolly_user.dart';

class MockProfileProvider with ChangeNotifier {
  WollyUser? _user;

  WollyUser? get user => _user;

  MockProfileProvider() {
    // Initialize with mock data
    _loadMockUser();
  }

  void _loadMockUser() {
    // Create a mock user with fixed data
    _user = WollyUser(
      firstName: 'John',
      lastName: 'Doe',
      persona: 'Reader',
      birthday: '1990-01-01',
      contentPreference: [
        'Science Fiction',
        'Fantasy',
        'Mystery',
        'Biography',
        'Self-Help'
      ],
      phoneNumber: '+1234567890',
      photoUrl: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
      email: 'john.doe@example.com',
      gender: 'Male',
    );
    notifyListeners();
  }

  void fetchUserData(String uid) async {
    // In a mock implementation, we simply use the already loaded mock data
    // No need to fetch anything - data is already set in the constructor
    // This is just to maintain the same API as the real ProfileProvider
    notifyListeners();
  }
} 