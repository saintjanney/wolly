/// Utility class for form validation functions
class Validators {
  /// Validates if a string is not empty
  static bool validateNotEmpty(String? value) {
    return value != null && value.isNotEmpty;
  }

  /// Validates if a string is a valid email
  static bool validateEmail(String? value) {
    if (value == null || value.isEmpty) return false;
    const emailPattern = r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$';
    final regExp = RegExp(emailPattern);
    return regExp.hasMatch(value);
  }

  /// Validates if a string is a valid phone number (10 digits)
  static bool validatePhoneNumber(String? value) {
    if (value == null || value.isEmpty) return false;
    return value.length == 10 && int.tryParse(value) != null;
  }

  /// Validates if a password is at least 6 characters long
  static bool validatePassword(String? value) {
    return value != null && value.length >= 6;
  }

  /// Validates if two passwords match
  static bool validatePasswordsMatch(String? password, String? confirmPassword) {
    return password != null && confirmPassword != null && password == confirmPassword;
  }

  /// Validates if a date is before a minimum date
  static bool validateDateBefore(DateTime? date, DateTime minimumDate) {
    return date != null && date.isBefore(minimumDate);
  }
} 