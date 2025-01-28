import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

class LuminUtll {
  // Function to format a DateTime object to "8th August 2019"
  static String formatDate(DateTime date) {
    // Define the day suffix
    String getDaySuffix(int day) {
      if (day >= 11 && day <= 13) return 'th';
      switch (day % 10) {
        case 1:
          return 'st';
        case 2:
          return 'nd';
        case 3:
          return 'rd';
        default:
          return 'th';
      }
    }

    // Get the day, month, and year from the DateTime object
    final day = date.day;
    final month = DateFormat('MMMM').format(date); // e.g., August
    final year = date.year;

    // Format the date without the time
    String output = '$day${getDaySuffix(day)} $month $year';
    print(output);
    return output;
  }

  static DateTime parseCustomDate(String dateString) {
    // Define the month mapping
    Map<String, int> months = {
      'January': 1,
      'February': 2,
      'March': 3,
      'April': 4,
      'May': 5,
      'June': 6,
      'July': 7,
      'August': 8,
      'September': 9,
      'October': 10,
      'November': 11,
      'December': 12,
    };

    // Split the input string by spaces
    List<String> parts = dateString.split(' ');

    // Extract the day, month, and year
    int day = int.parse(
        parts[0].replaceAll(RegExp(r'\D'), '')); // Remove "th", "st", etc.
    String monthString = parts[1];
    int year = int.parse(parts[2]);

    // Get the month number
    int month = months[monthString]!;

    print(DateTime(year, month, day).toString());
    return DateTime(year, month, day);
  }

  static String formatCurrency(double amount, {String currencyCode = "GHS"}) {
    final formatCurrency = NumberFormat.currency(
      symbol: currencyCode,
      locale: 'en_GH', // Assuming 'en_GH' locale for Ghana
      decimalDigits: 2, // Number of decimal places
    );
    return formatCurrency.format(amount);
  }

  static String? validateName(String name) {
    if (name.isEmpty) {
      return "Please enter your name";
    }
    return null;
  }

  static String? validateEmail(String email) {
    if (email.isEmpty) {
      return 'Please enter your email';
    }
    final emailRegex = RegExp(r'^[^@]+@[^@]+\.[^@]+');
    if (!emailRegex.hasMatch(email)) {
      return 'Please enter a valid email';
    }
    return null;
  }

  static String? validatePassword(String password) {
    if (password.isEmpty) {
      return 'Please enter your password';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return null;
  }

  static String? validateConfirmPassword(
      String password, String confirmPassword) {
    if (confirmPassword.isEmpty) {
      return 'Please confirm your password';
    }
    if (confirmPassword != password) {
      return 'Passwords do not match';
    }
    return null;
  }
}

class CurrencyInputFormatter extends TextInputFormatter {
  final String currencySymbol;

  CurrencyInputFormatter({this.currencySymbol = "GHS"});

  @override
  TextEditingValue formatEditUpdate(
      TextEditingValue oldValue, TextEditingValue newValue) {
    // If the new value is empty, return the new value
    if (newValue.text.isEmpty) {
      return newValue.copyWith(text: '');
    }

    // Remove all non-digit characters
    String value = newValue.text.replaceAll(RegExp(r'[^\d]'), '');

    // If there's nothing left after removing non-digit characters, return the old value
    if (value.isEmpty) {
      return oldValue;
    }

    // Parse the value to an integer
    int newValueAsInt = int.parse(value);

    // Format the number as currency
    final formatter = NumberFormat.currency(
      locale: 'en_GH',
      symbol: "$currencySymbol ",
      decimalDigits: 2,
    );

    // Apply the currency format
    String newText = formatter.format(newValueAsInt / 100);

    // Return the new TextEditingValue with the formatted currency string
    return TextEditingValue(
      text: newText,
      selection: TextSelection.collapsed(offset: newText.length),
    );
  }

  double getAmount(String formattedValue) {
    // Remove the currency symbol and other non-numeric characters
    String numericString = formattedValue
        .replaceAll(currencySymbol, '')
        .replaceAll(RegExp(r'[^\d.]'), '');

    // Parse the numeric string to a double
    return double.parse(numericString);
  }
}

class EmailInputFormatter extends TextInputFormatter {
  String _email = '';

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final RegExp emailRegex = RegExp(r'^[a-zA-Z0-9@._-]*$');

    if (emailRegex.hasMatch(newValue.text)) {
      _email = newValue.text; // Update the email string
      return newValue;
    } else {
      return oldValue;
    }
  }

  // Method to get the formatted email address
  String getEmail() {
    return _email;
  }
}

class PhoneNumberInputFormatter extends TextInputFormatter {
  String _phoneNumber = '';

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    String digitsOnly = newValue.text.replaceAll(RegExp(r'\D'), '');

    if (digitsOnly.length > 10) {
      digitsOnly = digitsOnly.substring(0, 10);
    }

    String formatted = '';

    if (digitsOnly.isNotEmpty) {
      formatted += digitsOnly.substring(0, digitsOnly.length.clamp(0, 3));
    }
    if (digitsOnly.length >= 4) {
      formatted += '-${digitsOnly.substring(3, digitsOnly.length.clamp(3, 6))}';
    }
    if (digitsOnly.length >= 7) {
      formatted +=
          '-${digitsOnly.substring(6, digitsOnly.length.clamp(6, 10))}';
    }

    _phoneNumber = formatted; // Update the phone number string

    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }

  // Method to get the formatted phone number
  String getPhoneNumber() {
    return _phoneNumber;
  }
}
