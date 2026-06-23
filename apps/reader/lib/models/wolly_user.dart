
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

  factory WollyUser.fromMap(Map<String, dynamic> map) {
    // Read either the reader's snake_case keys or the creator-hub's camelCase
    // keys, so a profile created by either app renders correctly.
    return WollyUser(
      firstName: map['first_name'] ?? map['firstName'],
      lastName: map['last_name'] ?? map['lastName'],
      persona: map['persona'],
      // `dateOfBirth` may be a Timestamp (creator-hub); only use it as a
      // fallback when it's a plain string, to avoid a type error.
      birthday: map['dob'] ?? (map['dateOfBirth'] is String ? map['dateOfBirth'] : null),
      contentPreference:
          map['content_preferences'] ?? map['contentPreferences'] ?? <dynamic>[],
      phoneNumber: map['phone_number'] ?? map['phoneNumber'],
      photoUrl: map['photoUrl'] ?? map['photoURL'],
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
