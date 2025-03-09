import 'package:equatable/equatable.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

class AuthCheckStatusEvent extends AuthEvent {}

class AuthLoginEvent extends AuthEvent {
  final String email;
  final String password;

  const AuthLoginEvent({required this.email, required this.password});

  @override
  List<Object?> get props => [email, password];
}

class AuthSignUpEvent extends AuthEvent {
  final String email;
  final String password;
  final String firstName;
  final String lastName;
  final String countryCode;
  final String phoneNumber;
  final DateTime dateOfBirth;

  const AuthSignUpEvent({
    required this.email,
    required this.password,
    required this.firstName,
    required this.lastName,
    required this.countryCode,
    required this.phoneNumber,
    required this.dateOfBirth,
  });

  @override
  List<Object?> get props => [
        email,
        password,
        firstName,
        lastName,
        countryCode,
        phoneNumber,
        dateOfBirth,
      ];
}

class AuthSetGenderAndBirthdayEvent extends AuthEvent {
  final String gender;
  final String dob;

  const AuthSetGenderAndBirthdayEvent({
    required this.gender,
    required this.dob,
  });

  @override
  List<Object?> get props => [gender, dob];
}

class AuthSetPersonaEvent extends AuthEvent {
  final String role;

  const AuthSetPersonaEvent({required this.role});

  @override
  List<Object?> get props => [role];
}

class AuthSetContentPreferencesEvent extends AuthEvent {
  final List<String> contentPreferences;

  const AuthSetContentPreferencesEvent({required this.contentPreferences});

  @override
  List<Object?> get props => [contentPreferences];
}

class AuthSignOutEvent extends AuthEvent {} 