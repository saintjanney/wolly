import 'package:flutter/material.dart';

/// App theme configuration
class AppTheme {
  /// Primary color of the app
  static const Color primaryColor = Colors.blue;
  
  /// Secondary color of the app
  static const Color secondaryColor = Colors.deepPurple;
  
  /// Background color of the app
  static const Color backgroundColor = Colors.white;
  
  /// Error color of the app
  static const Color errorColor = Colors.red;

  /// Light theme for the app
  static ThemeData lightTheme = ThemeData(
    colorScheme: ColorScheme.fromSeed(
      seedColor: secondaryColor,
      primary: primaryColor,
      secondary: secondaryColor,
      background: backgroundColor,
      error: errorColor,
    ),
    useMaterial3: true,
    appBarTheme: const AppBarTheme(
      backgroundColor: primaryColor,
      foregroundColor: Colors.white,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: primaryColor, width: 2),
      ),
    ),
  );
} 