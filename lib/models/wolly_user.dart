import 'package:flutter/material.dart';

class WollyUser {
  final String? firstName;
  final String? lastName;
  final String? persona;
  final String? gender;
  final String? email;
  final String? phoneNumber;
  final String? photoUrl;

  final String? birthday;
  final List<dynamic> contentPreference;

  WollyUser(
      {required this.firstName,
      required this.lastName,
      required this.persona,
      required this.birthday,
      required this.contentPreference,
      required this.phoneNumber,
      required this.photoUrl,
      required this.email,
      required this.gender});

  @factory
  factory WollyUser.fromMap(Map<String, dynamic> map) {
    return WollyUser(
      firstName: map['first_name'],
      lastName: map['last_name'],
      persona: map['persona'],
      birthday: map['dob'],
      contentPreference: map['content_preferences'],
      phoneNumber: map['phone_number'],
      photoUrl: map['photoUrl'],
      email: map['email'],
      gender: map['gender'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'firstName': firstName,
      'lastName': lastName,
      'persona': persona,
      'birthday': birthday,
      'content_preferences': contentPreference,
      'phoneNumber': phoneNumber,
      'photoUrl': photoUrl,
      'email': email,
      "gender": gender
    };
  }
}
